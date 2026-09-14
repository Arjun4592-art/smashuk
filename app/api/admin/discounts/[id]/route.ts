import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

// ─── GET /api/admin/discounts/[id] ───────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      headers: { Authorization: authorization },
    })
    const data = await safeJson(
      res,
      'app/api/admin/discounts/[id]/route.ts GET',
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to fetch discount' },
        { status: res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] discount GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── PATCH /api/admin/discounts/[id] ─────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // ── 1. Campaign upsert ──────────────────────────────────────────────────
    let campaignId: string | undefined

    if (body.campaign) {
      const { id: existingCampaignId, ...campaignFields } = body.campaign

      if (existingCampaignId) {
        try {
          const campaignRes = await fetch(
            `${MEDUSA_URL}/admin/campaigns/${existingCampaignId}`,
            {
              method: 'POST',
              headers: {
                Authorization: authorization,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(campaignFields),
            },
          )
          const campaignData = await safeJson(
            campaignRes,
            'app/api/admin/discounts/[id]/route.ts PATCH campaign update',
          )
          campaignId = campaignData?.campaign?.id ?? existingCampaignId
        } catch (campaignErr: any) {
          console.warn('[API] campaign update failed:', campaignErr.message)
          campaignId = existingCampaignId
        }
      } else {
        try {
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
            'app/api/admin/discounts/[id]/route.ts PATCH campaign create',
          )
          campaignId = campaignData?.campaign?.id
        } catch (campaignErr: any) {
          console.warn('[API] campaign create failed:', campaignErr.message)
        }
      }
    }

    // ── 2. Build promotion patch payload ────────────────────────────────────
    const { status, campaign, ...rest } = body

    const promotionPayload: any = {
      code: rest.code,
      type: rest.type ?? 'standard',
      is_automatic: rest.is_automatic ?? false,
      application_method: rest.application_method,
    }
    if (rest.rules?.length > 0) promotionPayload.rules = rest.rules
    if (campaignId) promotionPayload.campaign_id = campaignId

    // ── 3. PATCH the promotion ──────────────────────────────────────────────
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promotionPayload),
    })
    const data = await safeJson(
      res,
      'app/api/admin/discounts/[id]/route.ts PATCH promotion',
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to update discount' },
        { status: res.status },
      )
    }

    // ── 4. Sync status separately ───────────────────────────────────────────
    if (status !== undefined) {
      try {
        await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        })
      } catch (statusErr: any) {
        console.warn('[API] status sync failed:', statusErr.message)
      }
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] discount PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── DELETE /api/admin/discounts/[id] ────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })
    if (res.status === 204 || res.status === 200) {
      return NextResponse.json({ deleted: true })
    }
    const data = await safeJson(
      res,
      'app/api/admin/discounts/[id]/route.ts DELETE',
    )
    return NextResponse.json(
      { error: data.message ?? 'Failed to delete discount' },
      { status: res.status },
    )
  } catch (err: any) {
    console.error('[API] discount DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
