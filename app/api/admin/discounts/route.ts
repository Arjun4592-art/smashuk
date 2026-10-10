import { NextRequest, NextResponse } from 'next/server'
import { getChannelIds, channelRule } from '@/lib/api/sales-channels'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
// Store prices are VAT-inclusive, so a fixed £ discount must be too, otherwise
// Medusa adds VAT on top of it (e.g. £14 -> £16.80). Enforced server-side so
// no client can create a fixed promotion that over-discounts.
function withTaxInclusiveFixed(method: any) {
  if (method && method.type === 'fixed' && method.is_tax_inclusive == null) {
    return { ...method, is_tax_inclusive: true }
  }
  return method
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }
  try {
    // Request campaign + rules fields so the list page can show dates/maxUses
    // without a follow-up per-item detail fetch.
    const url =
      `${MEDUSA_URL}/admin/promotions` +
      `?limit=${limit}&offset=${offset}` +
      `&fields=*rules,*application_method,*campaign,*campaign.budget`
    const res = await fetch(url, { headers: { Authorization: authorization } })
    const data = await safeJson(res, 'app/api/admin/discounts/route.ts')
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] discounts error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }
  try {
    const body = await req.json()

    // ── 1. Create campaign (if dates / description / max-uses are set) ──────
    let campaignId: string | undefined
    if (body.campaign) {
      const { id: _ignored, ...campaignFields } = body.campaign // strip any accidental id
      // Medusa 2.x requires a unique campaign_identifier when creating a
      // campaign, otherwise: "Invalid request: Field 'campaign_identifier' is required".
      if (!campaignFields.campaign_identifier) {
        campaignFields.campaign_identifier = `${String(
          campaignFields.name ?? body.code ?? 'campaign',
        )
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${Date.now()}`
      }
      const campaignRes = await fetch(`${MEDUSA_URL}/admin/campaigns`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignFields),
      })
      const campaignData = await safeJson(
        campaignRes,
        'app/api/admin/discounts/route.ts POST campaign',
      )
      if (!campaignRes.ok) {
        // Surface the campaign error clearly rather than silently continuing
        // and creating a promotion with no campaign attached.
        return NextResponse.json(
          { error: campaignData.message ?? 'Failed to create campaign' },
          { status: campaignRes.status },
        )
      }
      campaignId = campaignData?.campaign?.id
    }

    // ── 2. Create promotion ──────────────────────────────────────────────────
    const promotionPayload: any = {
      code: body.code,
      type: body.type ?? 'standard',
      is_automatic: body.is_automatic ?? false,
      application_method: withTaxInclusiveFixed(body.application_method),
    }
    const createRules: any[] = [...(body.rules ?? [])]
    if (body.applies_to === 'online' || body.applies_to === 'store') {
      const ids = await getChannelIds((path) =>
        fetch(`${MEDUSA_URL}${path}`, {
          headers: { Authorization: authorization },
        }),
      )
      const rule = channelRule(body.applies_to, ids)
      if (!rule) {
        return NextResponse.json(
          {
            error:
              'Could not find the Website / Store sales channel to limit this discount to.',
          },
          { status: 400 },
        )
      }
      createRules.push(rule)
    }
    if (createRules.length > 0) promotionPayload.rules = createRules
    if (campaignId) promotionPayload.campaign_id = campaignId

    const res = await fetch(`${MEDUSA_URL}/admin/promotions`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promotionPayload),
    })
    const data = await safeJson(
      res,
      'app/api/admin/discounts/route.ts POST promotion',
    )
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })

    // ── 3. Sync status (Medusa v2 requires a separate call) ──────────────────
    // body.status comes from buildPromotionPayload() as 'active' | 'inactive'.
    if (body.status && data?.promotion?.id) {
      try {
        await fetch(`${MEDUSA_URL}/admin/promotions/${data.promotion.id}`, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: body.status }),
        })
      } catch (statusErr: any) {
        console.warn('[API] status sync failed:', statusErr.message)
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[API] discount create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}