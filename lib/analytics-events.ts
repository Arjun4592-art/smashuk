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
// Fires the same event to Facebook Pixel, if the pixel has been loaded
// (i.e. a Facebook Pixel ID is set in Dashboard > Settings > Marketing).
function fireFbqEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return
  }
  window.fbq('track', eventName, params)
}
// Fires a Google Ads conversion, if a Google Ads ID + conversion label are set.
function fireGoogleAdsConversion(value: number, currency: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }
  if (!window.__gadsId || !window.__gadsConversionLabel) return
  window.gtag('event', 'conversion', {
    send_to: `${window.__gadsId}/${window.__gadsConversionLabel}`,
    value,
    currency,
  })
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
  fireFbqEvent('AddToCart', {
    content_ids: [params.itemId],
    content_name: params.itemName,
    currency,
    value,
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
}) {
  const currency = params.currency ?? 'GBP'
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
  fireFbqEvent('InitiateCheckout', {
    content_ids: params.items.map((i) => i.itemId),
    currency,
    value: params.value,
    num_items: params.items.length,
  })
}
// Call this on the order-confirmation step once an order is successfully placed.
export function trackPurchase(params: {
  orderId: string
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
  fireFbqEvent('Purchase', {
    content_ids: params.items.map((i) => i.itemId),
    currency,
    value: params.value,
    num_items: params.items.length,
  })
  fireGoogleAdsConversion(params.value, currency)
}
