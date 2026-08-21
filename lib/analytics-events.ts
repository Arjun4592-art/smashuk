// Small wrapper around gtag's ecommerce events so the Live View dashboard
// (app/api/admin/analytics/live/route.ts) has real add_to_cart /
// begin_checkout events to report on, instead of always reading 0.
//
// GA4's Enhanced Measurement does NOT send these automatically — they only
// fire if the site explicitly calls gtag('event', ...), which is what
// these helpers do.

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

function fireGtagEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }
  window.gtag('event', eventName, params)
}

export function trackAddToCart(params: {
  itemId: string
  itemName: string
  price: number
  quantity: number
  currency?: string
}) {
  fireGtagEvent('add_to_cart', {
    currency: params.currency ?? 'GBP',
    value: params.price * params.quantity,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  })
}

export function trackBeginCheckout(params: {
  value: number
  currency?: string
  items: { itemId: string; itemName: string; price: number; quantity: number }[]
}) {
  fireGtagEvent('begin_checkout', {
    currency: params.currency ?? 'GBP',
    value: params.value,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  })
}
