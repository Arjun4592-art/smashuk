// Marketing / tracking keys from environment variables.
// Server-side only (no NEXT_PUBLIC_ prefix needed), so a rebuild is not required:
// edit .env.local / .env.production on the server, then `pm2 restart <app> --update-env`.
//
// Rule: if an env var is set, it WINS over the value saved in the dashboard.
// If it is empty/unset, the dashboard (store.metadata) value is used as before.

export type MarketingKeys = {
  gaMeasurementId: string
  googleAdsId: string
  googleAdsConversionLabel: string
  facebookPixelId: string
  facebookAccessToken: string
  gtmId: string
  tiktokPixelId: string
  pinterestTagId: string
  snapchatPixelId: string
  microsoftUetId: string
  linkedinPartnerId: string
  clarityId: string
  hotjarId: string
}

const env = (name: string) => (process.env[name] ?? '').trim()

export function getMarketingEnv(): MarketingKeys {
  return {
    gaMeasurementId: env('GA_MEASUREMENT_ID'),
    googleAdsId: env('GOOGLE_ADS_ID'),
    googleAdsConversionLabel: env('GOOGLE_ADS_CONVERSION_LABEL'),
    facebookPixelId: env('FACEBOOK_PIXEL_ID'),
    facebookAccessToken: env('FACEBOOK_ACCESS_TOKEN'),
    gtmId: env('GTM_ID'),
    tiktokPixelId: env('TIKTOK_PIXEL_ID'),
    pinterestTagId: env('PINTEREST_TAG_ID'),
    snapchatPixelId: env('SNAPCHAT_PIXEL_ID'),
    microsoftUetId: env('MICROSOFT_UET_ID'),
    linkedinPartnerId: env('LINKEDIN_PARTNER_ID'),
    clarityId: env('CLARITY_ID'),
    hotjarId: env('HOTJAR_ID'),
  }
}

// env value if present, otherwise the dashboard (metadata) value.
export function pick(envValue: string, metaValue: unknown): string {
  if (envValue) return envValue
  return typeof metaValue === 'string' ? metaValue.trim() : ''
}
