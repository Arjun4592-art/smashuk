import { NextResponse } from 'next/server'
import { getPublicMarketingSettings } from '@/lib/marketing-settings-public'

// Public, read-only endpoint. Only returns IDs that are safe to sit in
// client-side JS (pixel/measurement IDs). The Facebook access token
// (used server-side for Conversions API) is intentionally NEVER returned here.
// The logic lives in lib/marketing-settings-public.ts, shared with the root
// layout (which now reads it on the server).
export async function GET() {
  try {
    const settings = await getPublicMarketingSettings()
    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    })
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
