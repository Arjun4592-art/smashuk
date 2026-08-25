import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
export async function GET(req: NextRequest) {
  const {
    searchParams
  } = new URL(req.url);
  const limit = searchParams.get('limit') ?? '20';
  const offset = searchParams.get('offset') ?? '0';
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Missing Authorization header'
    }, {
      status: 401
    });
  }
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res, 'app/api/admin/discounts/route.ts');
    if (!res.ok) return NextResponse.json({
      error: data.message
    }, {
      status: res.status
    });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] discounts error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Missing Authorization header'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    let campaignId: string | undefined;
    if (body.campaign) {
      try {
        const campaignRes = await fetch(`${MEDUSA_URL}/admin/campaigns`, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: body.campaign.name,
            ...(body.campaign.description ? {
              description: body.campaign.description
            } : {}),
            ...(body.campaign.starts_at ? {
              starts_at: body.campaign.starts_at
            } : {}),
            ...(body.campaign.ends_at ? {
              ends_at: body.campaign.ends_at
            } : {}),
            ...(body.campaign.budget ? {
              budget: body.campaign.budget
            } : {})
          })
        });
        const campaignData = await safeJson(campaignRes, 'app/api/admin/discounts/route.ts');
        campaignId = campaignData?.campaign?.id;
      } catch (campaignErr: any) {
        console.warn('[API] campaign create failed:', campaignErr.message);
      }
    }
    const promotionPayload: any = {
      code: body.code,
      type: body.type ?? 'standard',
      is_automatic: body.is_automatic ?? false,
      application_method: body.application_method
    };
    if (body.rules?.length > 0) promotionPayload.rules = body.rules;
    if (campaignId) promotionPayload.campaign_id = campaignId;
    const res = await fetch(`${MEDUSA_URL}/admin/promotions`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionPayload)
    });
    const data = await safeJson(res, 'app/api/admin/discounts/route.ts');
    if (!res.ok) return NextResponse.json({
      error: data.message
    }, {
      status: res.status
    });
    if (body.status === 'active' && data?.promotion?.id) {
      try {
        await fetch(`${MEDUSA_URL}/admin/promotions/${data.promotion.id}`, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'active'
          })
        });
      } catch (statusErr: any) {
        console.warn('[API] status update failed:', statusErr.message);
      }
    }
    return NextResponse.json(data, {
      status: 201
    });
  } catch (err: any) {
    console.error('[API] discount create error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
