import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {
      message: text.slice(0, 300),
    }
  }
}
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader)
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    const data = await safeJson(res)
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader)
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  try {
    const body = await req.json()
    // The promotion update endpoint only accepts a `campaign_id` reference,
    // not a nested campaign object like the create endpoint's helper route
    // does. Forwarding `body.campaign` as-is (previous behaviour) caused
    // every edit of a discount with campaign details (description, dates,
    // usage limit) to fail with a generic error. Mirror what
    // /api/admin/discounts (POST) does: create/update the campaign
    // separately, then link it via campaign_id.
    const { campaign, rules, ...promotionBody } = body
    if (campaign) {
      const campaignFields = {
        name: campaign.name,
        ...(campaign.description ? { description: campaign.description } : {}),
        ...(campaign.starts_at ? { starts_at: campaign.starts_at } : {}),
        ...(campaign.ends_at ? { ends_at: campaign.ends_at } : {}),
        ...(campaign.budget ? { budget: campaign.budget } : {}),
      }
      if (campaign.id) {
        // Existing campaign — update it in place rather than creating a
        // duplicate with the same name.
        const campaignRes = await fetch(
          `${MEDUSA_URL}/admin/campaigns/${campaign.id}`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(campaignFields),
          },
        )
        if (!campaignRes.ok) {
          const campaignErr = await safeJson(campaignRes)
          return NextResponse.json(
            {
              error:
                campaignErr.message ??
                campaignErr.title ??
                'Failed to update discount campaign details',
            },
            {
              status: campaignRes.status,
            },
          )
        }
        promotionBody.campaign_id = campaign.id
      } else {
        // No campaign existed yet — create one and link it.
        const campaignRes = await fetch(`${MEDUSA_URL}/admin/campaigns`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaignFields),
        })
        const campaignData = await safeJson(campaignRes)
        if (!campaignRes.ok) {
          return NextResponse.json(
            {
              error:
                campaignData.message ??
                campaignData.title ??
                'Failed to create discount campaign',
            },
            {
              status: campaignRes.status,
            },
          )
        }
        promotionBody.campaign_id = campaignData?.campaign?.id
      }
    }
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promotionBody),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.message ?? data.title ?? 'Failed to update discount',
        },
        {
          status: res.status,
        },
      )
    }
    // The promotion update endpoint (POST /admin/promotions/:id) doesn't
    // accept a `rules` field the way create does — that's what caused the
    // "Unrecognized fields: 'rules'" error. Conditions (min order amount,
    // min quantity, customer groups, first order, ...) live on separate
    // PromotionRule records and are managed through their own batch
    // endpoint. We always fully resync them here: delete whatever rules
    // currently exist on the promotion, then recreate from the form's
    // current rule list (which may be empty if the admin removed every
    // condition) — this keeps the saved state matching exactly what the
    // form showed, rather than leaving stale conditions behind.
    {
      try {
        const existingRes = await fetch(
          `${MEDUSA_URL}/admin/promotions/${id}?fields=rules.id`,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          },
        )
        const existingData = await safeJson(existingRes)
        const existingRuleIds: string[] = (existingData?.promotion?.rules ?? [])
          .map((r: any) => r.id)
          .filter(Boolean)
        const targetRules = Array.isArray(rules) ? rules : []
        if (existingRuleIds.length > 0 || targetRules.length > 0) {
          const rulesRes = await fetch(
            `${MEDUSA_URL}/admin/promotions/${id}/rules/batch`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...(targetRules.length > 0
                  ? {
                      create: targetRules.map((r: any) => ({
                        attribute: r.attribute,
                        operator: r.operator,
                        values: r.values,
                      })),
                    }
                  : {}),
                ...(existingRuleIds.length > 0
                  ? { delete: existingRuleIds }
                  : {}),
              }),
            },
          )
          if (!rulesRes.ok) {
            const rulesErr = await safeJson(rulesRes)
            return NextResponse.json(
              {
                error:
                  rulesErr.message ??
                  rulesErr.title ??
                  'Discount saved, but its conditions (min order, customer groups, etc.) failed to update',
              },
              {
                status: rulesRes.status,
              },
            )
          }
        }
      } catch (rulesCatchErr: any) {
        return NextResponse.json(
          {
            error:
              rulesCatchErr.message ??
              'Discount saved, but its conditions failed to update',
          },
          {
            status: 500,
          },
        )
      }
    }
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader)
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    const data = await safeJson(res)
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
