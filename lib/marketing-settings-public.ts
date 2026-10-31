import 'server-only'
import { unstable_cache } from 'next/cache'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { getMarketingEnv, pick } from '@/lib/api/marketing-env'
import type { MarketingSettings } from '@/components/providers/MarketingPixels'

/**
 * Public tracking IDs (pixel / measurement IDs only - the Facebook Conversions
 * API access token is never exposed here).
 *
 * Previously the browser fetched /api/store/marketing-settings after hydration
 * on EVERY first visit and only then injected the analytics scripts. Reading
 * them on the server instead puts the scripts in the first HTML (earlier, more
 * accurate tracking) and removes one request + one Medusa admin call per
 * visitor. Results are cached for 5 minutes.
 *
 * The cached function THROWS on failure: unstable_cache doesn't cache a thrown
 * error, so a brief Medusa blip can't switch tracking off for 5 minutes.
 */
const load = unstable_cache(
  async (): Promise<MarketingSettings> => {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const meta = stores?.[0]?.metadata ?? {}
    const e = getMarketingEnv()
    const enabled = meta.tracking_enabled !== false
    const id = (envVal: string, metaVal: unknown) =>
      enabled ? pick(envVal, metaVal) || null : null
    return {
      gaMeasurementId: id(e.gaMeasurementId, meta.ga_measurement_id),
      googleAdsId: id(e.googleAdsId, meta.google_ads_id),
      googleAdsConversionLabel: id(
        e.googleAdsConversionLabel,
        meta.google_ads_conversion_label,
      ),
      facebookPixelId: id(e.facebookPixelId, meta.facebook_pixel_id),
      gtmId: id(e.gtmId, meta.gtm_id),
      tiktokPixelId: id(e.tiktokPixelId, meta.tiktok_pixel_id),
      pinterestTagId: id(e.pinterestTagId, meta.pinterest_tag_id),
      snapchatPixelId: id(e.snapchatPixelId, meta.snapchat_pixel_id),
      microsoftUetId: id(e.microsoftUetId, meta.microsoft_uet_id),
      linkedinPartnerId: id(e.linkedinPartnerId, meta.linkedin_partner_id),
      clarityId: id(e.clarityId, meta.clarity_id),
      hotjarId: id(e.hotjarId, meta.hotjar_id),
    }
  },
  ['public-marketing-settings'],
  { revalidate: 300 },
)

export async function getPublicMarketingSettings(): Promise<MarketingSettings> {
  return load()
}

/** For the root layout: undefined => the client falls back to its own fetch. */
export async function getPublicMarketingSettingsSafe(): Promise<
  MarketingSettings | undefined
> {
  try {
    return await load()
  } catch (err) {
    console.error(
      '[marketing-settings] server load failed:',
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}
