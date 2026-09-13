import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

// Medusa stores rule values as either plain scalars (right after create) or
// as `{ id, value }` objects once they come back from the API — normalize
// both shapes to a flat array of strings.
function normalizeRuleValues(values: any[] | undefined): string[] {
  return (values ?? []).map((v) => (v && typeof v === 'object' ? v.value : v))
}

function compareNumeric(
  operator: string,
  actual: number,
  target: number,
): boolean {
  switch (operator) {
    case 'gte':
      return actual >= target
    case 'gt':
      return actual > target
    case 'lte':
      return actual <= target
    case 'lt':
      return actual < target
    case 'eq':
      return actual === target
    case 'ne':
      return actual !== target
    default:
      // Unknown operator — don't block on something we don't understand.
      return true
  }
}

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const code = params.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Missing coupon code' }, { status: 400 })
  }

  // Order context the POS cart already has at the point of applying a
  // coupon — used to check the promotion's rules/campaign window, since POS
  // orders don't go through a real Medusa cart (see `/store/carts/:id/promotions`
  // on the website checkout).
  const subtotalParam = params.get('subtotal')
  const quantityParam = params.get('quantity')
  const customerId = params.get('customerId')?.trim() || undefined
  const orderSubtotal =
    subtotalParam != null ? Number(subtotalParam) : undefined
  const orderQuantity =
    quantityParam != null ? Number(quantityParam) : undefined

  try {
    const listRes = await medusaServiceFetch(
      `/admin/promotions?code=${encodeURIComponent(code)}&limit=1`,
    )
    if (!listRes.ok) {
      const err = await safeJson(listRes)
      return NextResponse.json(
        { error: err.message ?? 'Coupon lookup failed' },
        { status: listRes.status },
      )
    }
    const listData = await safeJson(listRes)
    const promoSummary = listData.promotions?.[0]
    if (
      !promoSummary ||
      promoSummary.code?.toUpperCase() !== code ||
      promoSummary.status !== 'active'
    ) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    // The list endpoint doesn't reliably include rules/campaign, so fetch
    // the full promotion the same way the dashboard discount editor does.
    const detailRes = await medusaServiceFetch(
      `/admin/promotions/${promoSummary.id}`,
    )
    if (!detailRes.ok) {
      const err = await safeJson(detailRes)
      return NextResponse.json(
        { error: err.message ?? 'Coupon lookup failed' },
        { status: detailRes.status },
      )
    }
    const detailData = await safeJson(detailRes)
    const promo = detailData.promotion ?? promoSummary

    const method = promo.application_method
    if (!method || !['percentage', 'fixed'].includes(method.type)) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    // --- Campaign date window ---
    const now = Date.now()
    const campaign = promo.campaign
    if (campaign?.starts_at && now < new Date(campaign.starts_at).getTime()) {
      return NextResponse.json(
        { valid: false, reason: 'not_started' },
        { status: 200 },
      )
    }
    if (campaign?.ends_at && now > new Date(campaign.ends_at).getTime()) {
      return NextResponse.json(
        { valid: false, reason: 'expired' },
        { status: 200 },
      )
    }

    // --- Rule checks ---
    // NOTE: `specific_product`, `specific_category` and `first_order` rules
    // can't be verified here yet — POS orders don't build a real cart, so we
    // don't have per-line-item data or order history at this point. Those
    // rule types are intentionally skipped (not enforced) rather than
    // rejecting every coupon that happens to use them. Fully covering them
    // needs the bigger fix: routing POS checkout through a real Medusa cart
    // and its `/store/carts/:id/promotions` endpoint, same as the website.
    const rules: any[] = promo.rules ?? []
    let needsCustomerGroupCheck = false
    let customerGroupSatisfied = false

    for (const rule of rules) {
      const values = normalizeRuleValues(rule.values)

      if (rule.attribute === 'subtotal') {
        const target = Number(values[0])
        const actual = orderSubtotal ?? 0
        if (
          Number.isFinite(target) &&
          !compareNumeric(rule.operator, actual, target)
        ) {
          return NextResponse.json(
            { valid: false, reason: 'min_amount' },
            { status: 200 },
          )
        }
      }

      if (rule.attribute === 'quantity') {
        const target = Number(values[0])
        const actual = orderQuantity ?? 0
        if (
          Number.isFinite(target) &&
          !compareNumeric(rule.operator, actual, target)
        ) {
          return NextResponse.json(
            { valid: false, reason: 'min_quantity' },
            { status: 200 },
          )
        }
      }

      if (rule.attribute === 'customer.groups.id') {
        needsCustomerGroupCheck = true
        if (!customerId || customerId.startsWith('local-')) {
          // No real Medusa customer attached to the sale (either no
          // customer selected, or a POS-only walk-in) — can't satisfy a
          // customer-group-restricted coupon.
          continue
        }
        try {
          const custRes = await medusaServiceFetch(
            `/admin/customers/${customerId}?fields=id,*groups`,
          )
          if (custRes.ok) {
            const custData = await safeJson(custRes)
            const groupIds: string[] = (custData.customer?.groups ?? []).map(
              (g: any) => g.id,
            )
            if (groupIds.some((id) => values.includes(id))) {
              customerGroupSatisfied = true
            }
          }
        } catch (groupErr) {
          console.error('[POS] Coupon customer-group lookup failed:', groupErr)
        }
      }
    }

    if (needsCustomerGroupCheck && !customerGroupSatisfied) {
      return NextResponse.json(
        { valid: false, reason: 'customer_group' },
        { status: 200 },
      )
    }

    return NextResponse.json({
      valid: true,
      code,
      type: method.type as 'percentage' | 'fixed',
      value: method.value,
    })
  } catch (err: any) {
    console.error('[POS] Coupon validate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
