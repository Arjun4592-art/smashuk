import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
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
      application_method: body.application_method,
    }
    if (body.rules?.length > 0) promotionPayload.rules = body.rules
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
