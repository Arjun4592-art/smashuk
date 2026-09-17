import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  customerHasPriorOrders,
  isFirstOrderRule,
} from '@/lib/api/customer-order-history'

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

    const rules: any[] = promo.rules ?? []
    let needsCustomerGroupCheck = false
    let customerGroupSatisfied = false
    let needsFirstOrderCheck = false

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

      if (isFirstOrderRule(rule)) {
        needsFirstOrderCheck = true
      }
    }

    if (needsCustomerGroupCheck && !customerGroupSatisfied) {
      return NextResponse.json(
        { valid: false, reason: 'customer_group' },
        { status: 200 },
      )
    }

    if (needsFirstOrderCheck) {
      if (!customerId || customerId.startsWith('local-')) {
        return NextResponse.json(
          { valid: false, reason: 'first_order' },
          { status: 200 },
        )
      }
      const hasOrders = await customerHasPriorOrders(customerId)
      if (hasOrders) {
        return NextResponse.json(
          { valid: false, reason: 'first_order' },
          { status: 200 },
        )
      }
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
