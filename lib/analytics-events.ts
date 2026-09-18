declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
    __gadsId?: string | null
    __gadsConversionLabel?: string | null
  }
}

function fireGtagEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }
  window.gtag('event', eventName, params)
}

// Pushes a standard GA4 Enhanced Ecommerce event onto window.dataLayer, in the
// {event: 'x', ecommerce: {...}} shape that Google Tag Manager's "Custom Event"
// triggers and built-in ecommerce variables expect. This is independent of
// fireGtagEvent() above (which drives the dashboard's own gtag.js pixel) — it
// exists purely so tags configured inside GTM can listen for these events too.
// Per Google's recommendation, we clear out any previous `ecommerce` object
// before pushing a new one, so values don't leak between events.
// https://developers.google.com/tag-platform/tag-manager/datalayer
function fireDataLayerEvent(
  eventName: string,
  ecommerce: Record<string, any>,
) {
  if (typeof window === 'undefined' || !window.dataLayer) return
  window.dataLayer.push({ ecommerce: null })
  window.dataLayer.push({
    event: eventName,
    ecommerce,
  })
}

// Fires the same event to Facebook Pixel, if the pixel has been loaded
// (i.e. a Facebook Pixel ID is set in Dashboard > Settings > Marketing).
// The eventId is passed as fbq's `eventID` option so Meta can deduplicate
// this browser-side call against the server-side Conversions API call we
// send alongside it (see sendCapiEvent below).
function fireFbqEvent(
  eventName: string,
  params: Record<string, any>,
  eventId: string,
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return
  }
  window.fbq('track', eventName, params, { eventID: eventId })
}

// Fires a Google Ads conversion, if a Google Ads ID + conversion label are set.
function fireGoogleAdsConversion(
  value: number,
  currency: string,
  orderId: string,
) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }
  if (!window.__gadsId || !window.__gadsConversionLabel) return
  window.gtag('event', 'conversion', {
    send_to: `${window.__gadsId}/${window.__gadsConversionLabel}`,
    value,
    currency,
    // Prevents Google Ads from double-counting the same order if the
    // confirmation page is refreshed or revisited via back button.
    transaction_id: orderId,
  })
}

function makeEventId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

interface CapiParams {
  value?: number
  currency?: string
  contentIds?: string[]
  contents?: { id: string; quantity?: number; itemPrice?: number }[]
  contentName?: string
  contentType?: string
  email?: string
  phone?: string
}

// Sends the same event to our server, which forwards it to Meta's
// Conversions API (see app/api/store/facebook-capi/route.ts). This is
// fire-and-forget: it must never block the UI or throw, and it silently
// no-ops server-side if no Pixel ID/token is configured yet.
async function sendCapiEvent(
  eventName: string,
  eventId: string,
  params: CapiParams,
): Promise<{ sent: boolean; reason?: string }> {
  if (typeof window === 'undefined') return { sent: false, reason: 'no window' }
  try {
    const body = {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      ...params,
    }
    const res = await fetch('/api/store/facebook-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    const data = await res.json().catch(() => null)
    return { sent: !!data?.sent, reason: data?.reason }
  } catch {
    // Tracking should never break the page.
    return { sent: false, reason: 'network error' }
  }
}

// --- Google Ads Enhanced Conversions ------------------------------------
// Google matches conversions to logged-in Google accounts using hashed
// customer email/phone, which meaningfully improves match rate (and
// therefore Smart Bidding quality) over value+currency alone. We hash
// client-side with the Web Crypto API and pass the digests to gtag via
// `gtag('set', 'user_data', ...)` before firing the conversion event, per:
// https://support.google.com/google-ads/answer/13258081

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeEmailForHash(email: string): string {
  return email.trim().toLowerCase()
}

// Google expects E.164 (leading + and country code) before hashing.
function normalizePhoneForHash(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/[^0-9]/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

async function setGoogleEnhancedConversionData(email?: string, phone?: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  if (!email && !phone) return
  if (typeof crypto === 'undefined' || !crypto.subtle) return
  try {
    const userData: Record<string, string> = {}
    if (email) {
      userData.sha256_email_address = await sha256Hex(
        normalizeEmailForHash(email),
      )
    }
    if (phone) {
      userData.sha256_phone_number = await sha256Hex(
        normalizePhoneForHash(phone),
      )
    }
    if (Object.keys(userData).length) {
      window.gtag('set', 'user_data', userData)
    }
  } catch (err) {
    console.error('[analytics] failed to hash enhanced conversion data:', err)
  }
}

export function trackViewItem(params: {
  itemId: string
  itemName: string
  price: number
  currency?: string
}) {
  const currency = params.currency ?? 'GBP'
  const eventId = makeEventId()
  fireGtagEvent('view_item', {
    currency,
    value: params.price,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
      },
    ],
  })
  fireDataLayerEvent('view_item', {
    currency,
    value: params.price,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
      },
    ],
  })
  fireFbqEvent(
    'ViewContent',
    {
      content_ids: [params.itemId],
      content_name: params.itemName,
      content_type: 'product',
      currency,
      value: params.price,
    },
    eventId,
  )
  sendCapiEvent('ViewContent', eventId, {
    value: params.price,
    currency,
    contentIds: [params.itemId],
    contentName: params.itemName,
    contentType: 'product',
  })
}

export function trackViewCart(params: {
  value: number
  currency?: string
  items: {
    itemId: string
    itemName: string
    price: number
    quantity: number
  }[]
}) {
  const currency = params.currency ?? 'GBP'
  fireGtagEvent('view_cart', {
    currency,
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
  // No Facebook equivalent requested for this one — Meta's checklist only
  // asked for ViewContent/AddToCart/InitiateCheckout/Purchase.
}

export function trackAddToCart(params: {
  itemId: string
  itemName: string
  price: number
  quantity: number
  currency?: string
}) {
  const currency = params.currency ?? 'GBP'
  const value = params.price * params.quantity
  const eventId = makeEventId()
  fireGtagEvent('add_to_cart', {
    currency,
    value,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  })
  fireDataLayerEvent('add_to_cart', {
    currency,
    value,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  })
  fireFbqEvent(
    'AddToCart',
    {
      content_ids: [params.itemId],
      content_name: params.itemName,
      currency,
      value,
    },
    eventId,
  )
  sendCapiEvent('AddToCart', eventId, {
    value,
    currency,
    contentIds: [params.itemId],
    contentName: params.itemName,
    contents: [
      { id: params.itemId, quantity: params.quantity, itemPrice: params.price },
    ],
  })
}

export function trackBeginCheckout(params: {
  value: number
  currency?: string
  items: {
    itemId: string
    itemName: string
    price: number
    quantity: number
  }[]
  email?: string
  phone?: string
}) {
  const currency = params.currency ?? 'GBP'
  const eventId = makeEventId()
  fireGtagEvent('begin_checkout', {
    currency,
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
  fireDataLayerEvent('begin_checkout', {
    currency,
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
  fireFbqEvent(
    'InitiateCheckout',
    {
      content_ids: params.items.map((i) => i.itemId),
      currency,
      value: params.value,
      num_items: params.items.length,
    },
    eventId,
  )
  sendCapiEvent('InitiateCheckout', eventId, {
    value: params.value,
    currency,
    contentIds: params.items.map((i) => i.itemId),
    contents: params.items.map((i) => ({
      id: i.itemId,
      quantity: i.quantity,
      itemPrice: i.price,
    })),
    email: params.email,
    phone: params.phone,
  })
}

// Call this on the order-confirmation step once an order is successfully placed.
// Call this on the order-confirmation step once an order is successfully placed.
export async function trackPurchase(params: {
  orderId: string
  value: number
  currency?: string
  items: {
    itemId: string
    itemName: string
    price: number
    quantity: number
  }[]
  email?: string
  phone?: string
}) {
  const currency = params.currency ?? 'GBP'
  const eventId = makeEventId()

  // Enhanced Conversions: hand Google hashed customer data before firing
  // the conversion so it can be matched to a Google account for bidding.
  void setGoogleEnhancedConversionData(params.email, params.phone)

  fireGtagEvent('purchase', {
    transaction_id: params.orderId,
    currency,
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
  fireDataLayerEvent('purchase', {
    transaction_id: params.orderId,
    currency,
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
  fireFbqEvent(
    'Purchase',
    {
      content_ids: params.items.map((i) => i.itemId),
      currency,
      value: params.value,
      num_items: params.items.length,
    },
    eventId,
  )
  const capiResult = await sendCapiEvent('Purchase', eventId, {
    value: params.value,
    currency,
    contentIds: params.items.map((i) => i.itemId),
    contents: params.items.map((i) => ({
      id: i.itemId,
      quantity: i.quantity,
      itemPrice: i.price,
    })),
    email: params.email,
    phone: params.phone,
  })

  const googleAdsAttempted =
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    !!window.__gadsId &&
    !!window.__gadsConversionLabel

  fireGoogleAdsConversion(params.value, currency, params.orderId)

  logMarketingEvent({
    orderId: params.orderId,
    eventName: 'Purchase',
    value: params.value,
    currency,
    metaCapiSent: capiResult.sent,
    metaCapiReason: capiResult.reason,
    googleAdsAttempted,
  })
}

// Logs a marketing event onto the related order's metadata, purely so it
// shows up in Dashboard > Marketing Events. This is separate from — and
// does NOT replace — checking Meta Events Manager or Google Ads directly:
// Google Ads never confirms receipt back to our server, so
// `googleAdsAttempted` only means the browser fired the call, not that
// Google counted it.
function logMarketingEvent(payload: {
  orderId: string
  eventName: string
  value: number
  currency: string
  metaCapiSent: boolean
  metaCapiReason?: string
  googleAdsAttempted: boolean
}) {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/store/marketing-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Logging must never break checkout.
  }
}