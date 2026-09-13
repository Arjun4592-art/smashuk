import crypto from 'crypto'
import { medusaServiceFetch } from './medusa-service-token'

const GRAPH_API_VERSION = 'v21.0'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

// Meta requires lowercased/trimmed email and digits-only phone before
// hashing — see:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export function hashEmail(email?: string | null): string | undefined {
  if (!email) return undefined
  const normalized = normalizeEmail(email)
  return normalized ? sha256(normalized) : undefined
}

export function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const normalized = normalizePhone(phone)
  return normalized ? sha256(normalized) : undefined
}

interface CapiContentItem {
  id: string
  quantity?: number
  itemPrice?: number
}

export interface CapiEventParams {
  eventName: string
  eventId: string
  eventSourceUrl: string
  actionSource?: 'website'
  value?: number
  currency?: string
  contentIds?: string[]
  contents?: CapiContentItem[]
  contentName?: string
  contentType?: string
  email?: string | null
  phone?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  userAgent?: string | null
}

let cachedFbSettings:
  { pixelId: string; accessToken: string } | null | undefined

// Cached per server instance so we don't hit Medusa on every tracking call.
async function getFacebookSettings(): Promise<{
  pixelId: string
  accessToken: string
} | null> {
  if (cachedFbSettings !== undefined) return cachedFbSettings
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const meta = stores?.[0]?.metadata ?? {}
    const pixelId = meta.facebook_pixel_id?.trim()
    const accessToken = meta.facebook_access_token?.trim()
    if (!pixelId || !accessToken) {
      cachedFbSettings = null
      return null
    }
    cachedFbSettings = { pixelId, accessToken }
    return cachedFbSettings
  } catch (err) {
    console.error('[facebook-capi] failed to load pixel settings:', err)
    return null
  }
}

// Call this whenever marketing settings are saved so a newly-entered pixel
// ID / token takes effect immediately instead of waiting for a restart.
export function invalidateFacebookCapiCache() {
  cachedFbSettings = undefined
}

// Sends one event to Meta's Conversions API. Uses the SAME event_id that the
// matching browser-side fbq() call used, so Meta deduplicates the two and
// doesn't double-count the conversion. Server-side delivery isn't affected
// by ad blockers or Safari ITP, so it recovers conversions the pixel misses.
export async function sendFacebookCapiEvent(
  params: CapiEventParams,
): Promise<{ sent: boolean; reason?: string }> {
  const settings = await getFacebookSettings()
  if (!settings) {
    return {
      sent: false,
      reason: 'Facebook Pixel ID / access token not configured',
    }
  }

  const userData: Record<string, any> = {}
  const hashedEmail = hashEmail(params.email)
  const hashedPhone = hashPhone(params.phone)
  if (hashedEmail) userData.em = [hashedEmail]
  if (hashedPhone) userData.ph = [hashedPhone]
  if (params.fbp) userData.fbp = params.fbp
  if (params.fbc) userData.fbc = params.fbc
  if (params.clientIp) userData.client_ip_address = params.clientIp
  if (params.userAgent) userData.client_user_agent = params.userAgent

  const customData: Record<string, any> = {}
  if (params.value !== undefined) customData.value = params.value
  if (params.currency) customData.currency = params.currency
  if (params.contentIds?.length) customData.content_ids = params.contentIds
  if (params.contents?.length) {
    customData.contents = params.contents.map((c) => ({
      id: c.id,
      quantity: c.quantity ?? 1,
      item_price: c.itemPrice,
    }))
  }
  if (params.contentName) customData.content_name = params.contentName
  if (params.contentType) customData.content_type = params.contentType

  const body = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.eventSourceUrl,
        action_source: params.actionSource ?? 'website',
        user_data: userData,
        custom_data: customData,
      },
    ],
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${settings.pixelId}/events?access_token=${encodeURIComponent(
        settings.accessToken,
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(
        '[facebook-capi] Meta rejected event:',
        res.status,
        errText.slice(0, 500),
      )
      return { sent: false, reason: `Meta returned ${res.status}` }
    }
    return { sent: true }
  } catch (err: any) {
    console.error('[facebook-capi] request failed:', err)
    return { sent: false, reason: err?.message ?? 'network error' }
  }
}
