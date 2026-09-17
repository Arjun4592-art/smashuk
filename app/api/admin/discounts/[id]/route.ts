import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

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
    const res = await fetch(
      `${MEDUSA_URL}/admin/promotions/${id}?fields=*rules,*application_method,*campaign,*campaign.budget`,
      {
        headers: { Authorization: authorization },
      },
    )
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

    const { status, campaign, ...rest } = body

    const promotionPayload: any = {
      code: rest.code,
      type: rest.type ?? 'standard',
      is_automatic: rest.is_automatic ?? false,
      application_method: rest.application_method,
    }
    if (rest.rules?.length > 0) promotionPayload.rules = rest.rules
    if (campaignId) promotionPayload.campaign_id = campaignId

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
    let campaignId: string | undefined
    try {
      const lookupRes = await fetch(
        `${MEDUSA_URL}/admin/promotions/${id}?fields=id,campaign.id`,
        { headers: { Authorization: authorization } },
      )
      if (lookupRes.ok) {
        const lookupData = await safeJson(
          lookupRes,
          'app/api/admin/discounts/[id]/route.ts DELETE lookup',
        )
        campaignId = lookupData?.promotion?.campaign?.id
      }
    } catch (lookupErr: any) {
      console.warn(
        '[API] discount DELETE campaign lookup failed:',
        lookupErr.message,
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })
    if (res.status !== 204 && res.status !== 200) {
      const data = await safeJson(
        res,
        'app/api/admin/discounts/[id]/route.ts DELETE',
      )
      return NextResponse.json(
        { error: data.message ?? 'Failed to delete discount' },
        { status: res.status },
      )
    }

    if (campaignId) {
      try {
        const campaignRes = await fetch(
          `${MEDUSA_URL}/admin/campaigns/${campaignId}?fields=id,promotions.id`,
          { headers: { Authorization: authorization } },
        )
        if (campaignRes.ok) {
          const campaignData = await safeJson(
            campaignRes,
            'app/api/admin/discounts/[id]/route.ts DELETE campaign check',
          )
          const remainingPromotions = campaignData?.campaign?.promotions ?? []
          if (remainingPromotions.length === 0) {
            await fetch(`${MEDUSA_URL}/admin/campaigns/${campaignId}`, {
              method: 'DELETE',
              headers: { Authorization: authorization },
            })
          }
        }
      } catch (cleanupErr: any) {
        console.warn(
          '[API] discount DELETE campaign cleanup failed:',
          cleanupErr.message,
        )
      }
    }

    return NextResponse.json({ deleted: true })
  } catch (err: any) {
    console.error('[API] discount DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
