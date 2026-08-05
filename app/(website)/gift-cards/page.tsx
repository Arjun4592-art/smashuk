import { notFound } from 'next/navigation'
import { getProduct, normalizeProduct } from '@/lib/api/store'
import GiftCardPurchaseClient from './GiftCardPurchaseClient'
import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/constants'

// Handle of the gift card product created in Medusa Admin (Products → the
// one whose variants are the denominations: £10/£25/£50/etc). If you gave
// it a different handle when creating it in Admin, update this constant to
// match — everything else on this page is driven off it.
const GIFT_CARD_PRODUCT_HANDLE = 'gift-card-product'

export const metadata: Metadata = {
  title: `Gift Cards | ${SITE_NAME}`,
  description: `${SITE_NAME} gift cards — pick an amount, use it on anything in-store or online.`,
}

export default async function GiftCardsPage() {
  const raw = await getProduct(GIFT_CARD_PRODUCT_HANDLE)

  if (!raw) {
    // The gift card product hasn't been created in Medusa Admin yet.
    notFound()
  }

  const product = normalizeProduct(raw)

  return (
    <GiftCardPurchaseClient product={product} variants={raw.variants ?? []} />
  )
}
