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

// GET: returns saved marketing/tracking IDs for the settings screen.
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const res = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    )
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.message ?? 'Failed to load store',
        },
        {
          status: res.status,
        },
      )
    }
    const store = data.stores?.[0]
    if (!store) {
      return NextResponse.json(
        {
          error: 'No store found',
        },
        {
          status: 404,
        },
      )
    }
    const meta = store.metadata ?? {}
    return NextResponse.json({
      storeId: store.id,
      marketing: {
        gaMeasurementId: meta.ga_measurement_id ?? '',
        googleAdsId: meta.google_ads_id ?? '',
        googleAdsConversionLabel: meta.google_ads_conversion_label ?? '',
        facebookPixelId: meta.facebook_pixel_id ?? '',
        facebookAccessToken: meta.facebook_access_token ?? '',
        gtmId: meta.gtm_id ?? '',
        tiktokPixelId: meta.tiktok_pixel_id ?? '',
        pinterestTagId: meta.pinterest_tag_id ?? '',
        snapchatPixelId: meta.snapchat_pixel_id ?? '',
        microsoftUetId: meta.microsoft_uet_id ?? '',
        linkedinPartnerId: meta.linkedin_partner_id ?? '',
        clarityId: meta.clarity_id ?? '',
        hotjarId: meta.hotjar_id ?? '',
        trackingEnabled: meta.tracking_enabled !== false,
      },
    })
  } catch (err: any) {
    console.error('[API] marketing-settings GET error:', err)
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

// POST: saves marketing/tracking IDs into store metadata. Nothing else here changes.
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const body = await req.json()
    const { storeId, marketing } = body
    if (!storeId) {
      return NextResponse.json(
        {
          error: 'storeId required',
        },
        {
          status: 400,
        },
      )
    }
    const currentRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    )
    const currentData = await safeJson(currentRes)
    const currentMetadata = currentRes.ok
      ? (currentData.stores?.[0]?.metadata ?? {})
      : {}
    const payload = {
      metadata: {
        ...currentMetadata,
        ga_measurement_id: marketing?.gaMeasurementId?.trim() ?? '',
        google_ads_id: marketing?.googleAdsId?.trim() ?? '',
        google_ads_conversion_label:
          marketing?.googleAdsConversionLabel?.trim() ?? '',
        facebook_pixel_id: marketing?.facebookPixelId?.trim() ?? '',
        facebook_access_token: marketing?.facebookAccessToken?.trim() ?? '',
        gtm_id: marketing?.gtmId?.trim() ?? '',
        tiktok_pixel_id: marketing?.tiktokPixelId?.trim() ?? '',
        pinterest_tag_id: marketing?.pinterestTagId?.trim() ?? '',
        snapchat_pixel_id: marketing?.snapchatPixelId?.trim() ?? '',
        microsoft_uet_id: marketing?.microsoftUetId?.trim() ?? '',
        linkedin_partner_id: marketing?.linkedinPartnerId?.trim() ?? '',
        clarity_id: marketing?.clarityId?.trim() ?? '',
        hotjar_id: marketing?.hotjarId?.trim() ?? '',
        tracking_enabled: marketing?.trackingEnabled !== false,
      },
    }
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.message ?? 'Failed to save marketing settings',
        },
        {
          status: res.status,
        },
      )
    }
    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    console.error('[API] marketing-settings POST error:', err)
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
