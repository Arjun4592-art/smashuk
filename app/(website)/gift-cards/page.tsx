import { notFound } from 'next/navigation';
import { getProduct, normalizeProduct } from '@/lib/api/store';
import GiftCardPurchaseClient from './GiftCardPurchaseClient';
import type { Metadata } from 'next';
import { SITE_NAME, GIFT_CARD_PRODUCT_HANDLE } from '@/lib/constants';
export const metadata: Metadata = {
  title: `Gift Cards | ${SITE_NAME}`,
  description: `${SITE_NAME} gift cards — pick an amount, use it on anything in-store or online.`
};
export const dynamic = 'force-dynamic';
export default async function GiftCardsPage() {
  const raw = await getProduct(GIFT_CARD_PRODUCT_HANDLE);
  if (!raw) {
    notFound();
  }
  const product = normalizeProduct(raw);
  return <GiftCardPurchaseClient product={product} variants={raw.variants ?? []} />;
}
