import { UK_ONLY_MESSAGE, isUkDeliveryPostcode } from '@/lib/uk-shipping'
import { GIFT_CARD_PRODUCT_HANDLE } from '@/lib/constants'

export async function getNonUkDeliveryError(
  cartId: string,
  medusaUrl: string,
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${medusaUrl}/store/carts/${cartId}?fields=*shipping_address,*shipping_methods,*items`,
      { headers },
    )
    if (!res.ok) {
      console.error('[uk-delivery-guard] cart lookup failed:', res.status)
      return null
    }
    const { cart } = await res.json()
    // Gift-card-only carts are emailed, not delivered - nothing to check.
    const lines: any[] = cart?.items ?? []
    if (
      lines.length > 0 &&
      lines.every((i) => i?.product_handle === GIFT_CARD_PRODUCT_HANDLE)
    ) {
      return null
    }
    const addr = cart?.shipping_address
    if (!addr) return null
    const isPickup = (cart?.shipping_methods ?? []).some((m: any) =>
      /pickup|store|collect/i.test(m?.name ?? ''),
    )
    if (isPickup) return null
    const cc = String(addr.country_code ?? '').toLowerCase()
    if (cc !== 'gb' || !isUkDeliveryPostcode(addr.postal_code)) {
      return UK_ONLY_MESSAGE
    }
    return null
  } catch (err) {
    console.error('[uk-delivery-guard] check failed:', err)
    return null
  }
}
