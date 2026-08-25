import { NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

// Public, read-only endpoint. Only returns IDs that are safe to sit in
// client-side JS (pixel/measurement IDs). The Facebook access token
// (used server-side for Conversions API) is intentionally NEVER returned here.
export async function GET() {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const meta = stores?.[0]?.metadata ?? {}
    const enabled = meta.tracking_enabled !== false
    return NextResponse.json(
      {
        gaMeasurementId: enabled ? meta.ga_measurement_id || null : null,
        googleAdsId: enabled ? meta.google_ads_id || null : null,
        googleAdsConversionLabel: enabled
          ? meta.google_ads_conversion_label || null
          : null,
        facebookPixelId: enabled ? meta.facebook_pixel_id || null : null,
        gtmId: enabled ? meta.gtm_id || null : null,
        tiktokPixelId: enabled ? meta.tiktok_pixel_id || null : null,
        pinterestTagId: enabled ? meta.pinterest_tag_id || null : null,
        snapchatPixelId: enabled ? meta.snapchat_pixel_id || null : null,
        microsoftUetId: enabled ? meta.microsoft_uet_id || null : null,
        linkedinPartnerId: enabled ? meta.linkedin_partner_id || null : null,
        clarityId: enabled ? meta.clarity_id || null : null,
        hotjarId: enabled ? meta.hotjar_id || null : null,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      },
    )
  } catch (err) {
    console.error(
      '[marketing-settings] public GET failed, tracking disabled:',
      err,
    )
    return NextResponse.json({
      gaMeasurementId: null,
      googleAdsId: null,
      googleAdsConversionLabel: null,
      facebookPixelId: null,
      gtmId: null,
      tiktokPixelId: null,
      pinterestTagId: null,
      snapchatPixelId: null,
      microsoftUetId: null,
      linkedinPartnerId: null,
      clarityId: null,
      hotjarId: null,
    })
  }
}
