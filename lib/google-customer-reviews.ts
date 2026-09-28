// Google Customer Reviews (GCR) helpers — client side only.
// Docs: https://support.google.com/merchants/answer/7105655 (badge)
//       https://support.google.com/merchants/answer/7106244 (survey opt-in)
//
// Both the badge and the opt-in need Google's platform.js. This loader makes
// sure it is only injected once, no matter which of the two asks for it first.

export const GOOGLE_MERCHANT_ID = Number(
  process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID ?? '408134094',
)

declare global {
  interface Window {
    gapi?: any
  }
}

let gapiPromise: Promise<any> | null = null

export function loadGapi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'))
  if (window.gapi?.load) return Promise.resolve(window.gapi)
  if (!gapiPromise) {
    gapiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://apis.google.com/js/platform.js'
      s.async = true
      s.defer = true
      s.onload = () => resolve(window.gapi)
      s.onerror = () => {
        gapiPromise = null
        reject(new Error('Could not load Google platform.js'))
      }
      document.head.appendChild(s)
    })
  }
  return gapiPromise
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) left--
  }
  return d
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// GCR needs the date the customer should have the order (YYYY-MM-DD). It is
// only used to decide when to send the survey email, so a close estimate from
// the shipping method name is enough.
export function estimateDeliveryDate(
  shippingMethodName: string,
  isPickup: boolean,
  from: Date = new Date(),
): string {
  let businessDays = 3
  if (isPickup) businessDays = 1
  else if (/24|next.?day|special/i.test(shippingMethodName)) businessDays = 1
  else if (/first|48/i.test(shippingMethodName)) businessDays = 2
  return toIsoDate(addBusinessDays(from, businessDays))
}

export async function renderSurveyOptIn(params: {
  orderId: string
  email: string
  deliveryCountry: string
  estimatedDeliveryDate: string
}): Promise<void> {
  const gapi = await loadGapi()
  gapi.load('surveyoptin', () => {
    gapi.surveyoptin.render({
      merchant_id: GOOGLE_MERCHANT_ID,
      order_id: params.orderId,
      email: params.email,
      delivery_country: params.deliveryCountry,
      estimated_delivery_date: params.estimatedDeliveryDate,
    })
  })
}

export async function renderRatingBadge(
  position: 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' = 'BOTTOM_LEFT',
): Promise<HTMLElement> {
  const gapi = await loadGapi()
  const container = document.createElement('div')
  document.body.appendChild(container)
  gapi.load('ratingbadge', () => {
    gapi.ratingbadge.render(container, {
      merchant_id: GOOGLE_MERCHANT_ID,
      position,
    })
  })
  return container
}
