'use client'

import { useEffect } from 'react'
import {
  renderRatingBadge,
  renderSurveyOptIn,
} from '@/lib/google-customer-reviews'

// Floating "Google Customer Reviews" badge. Bottom-left so it doesn't sit on
// top of the chat widget (bottom-right). Mounted once in the website layout.
export function GoogleReviewBadge() {
  useEffect(() => {
    let container: HTMLElement | null = null
    let cancelled = false
    renderRatingBadge('BOTTOM_LEFT')
      .then((el) => {
        if (cancelled) el.remove()
        else container = el
      })
      .catch(() => {})
    return () => {
      cancelled = true
      container?.remove()
    }
  }, [])
  return null
}

// Order-confirmation opt-in. Render this once the order is actually placed.
// Google shows its own "get a review request email" dialog.
export function GoogleSurveyOptIn(props: {
  orderId: string
  email: string
  deliveryCountry: string
  estimatedDeliveryDate: string
}) {
  const { orderId, email, deliveryCountry, estimatedDeliveryDate } = props
  useEffect(() => {
    if (!orderId || !email) return
    renderSurveyOptIn({
      orderId,
      email,
      deliveryCountry,
      estimatedDeliveryDate,
    }).catch(() => {})
  }, [orderId, email, deliveryCountry, estimatedDeliveryDate])
  return null
}
