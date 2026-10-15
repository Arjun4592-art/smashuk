'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'
import {
  createCart,
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from '@/lib/api/store'
import { GIFT_CARD_PRODUCT_HANDLE } from '@/lib/constants'
import { trackAddToCart } from '@/lib/analytics-events'
import { isMailInMeta } from '@/lib/mail-in'
import {
  configKeyOf,
  getLinkedItems,
  isMergedStringAddon,
  isStringAddon,
  itemKey,
} from '@/lib/cart-links'
export interface CartItem {
  product: Product
  quantity: number
  variant?: {
    id: string
    size?: string
    color?: string
  }
  discount?: number
  metadata?: Record<string, any>
}
interface CartState {
  cartId: string | null
  items: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  discountAmount: number
  couponCode: string | null
  itemCount: number
  giftCards: {
    code: string
    amount: number
  }[]
  giftCardTotal: number
  taxRate: number
  setCartId: (id: string) => void
  setTaxRate: (rate: number) => void
  addItem: (
    product: Product,
    quantity?: number,
    variant?: CartItem['variant'],
    metadata?: Record<string, any>,
    discountPerUnit?: number,
  ) => void
  /**
   * Adds every line of ONE mail-in booking. The lines are written to the
   * Medusa cart one after another (never in parallel) and, if any of them is
   * refused, the whole booking is rolled back and the error is thrown, so the
   * storefront cart can never show lines that Medusa does not have.
   */
  addMailInBooking: (
    lines: {
      product: Product
      quantity: number
      variant: CartItem['variant']
      metadata: Record<string, any>
    }[],
  ) => Promise<void>
  /** Removes every line of one mail-in booking. */
  removeMailInBooking: (bookingId: string) => Promise<void>
  removeItem: (
    productId: string,
    variantId?: string,
    configKey?: string,
  ) => void
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
    configKey?: string,
  ) => void
  applyCoupon: (code: string) => Promise<{
    success: boolean
    error?: string
  }>
  removeCoupon: () => Promise<void>
  applyGiftCard: (code: string) => Promise<{
    success: boolean
    error?: string
  }>
  removeGiftCard: (code: string) => Promise<void>
  clearCart: () => void
  syncFromMedusa: (medusaCart: any) => void
}
function findMedusaLine(
  medusaCart: any,
  variantId: string,
  metadata?: Record<string, any> | null,
) {
  let lines: any[] = (medusaCart?.items ?? []).filter(
    (li: any) => li.variant_id === variantId,
  )
  // Two mail-in bookings can hold the same variant (e.g. the delivery
  // product): the booking id tells them apart.
  const bookingId = metadata?.mail_in_booking
  if (bookingId) {
    const mine = lines.filter(
      (li: any) => li.metadata?.mail_in_booking === bookingId,
    )
    if (mine.length > 0) lines = mine
  }
  if (lines.length <= 1) return lines[0]
  const want = configKeyOf(metadata)
  return lines.find((li: any) => configKeyOf(li.metadata) === want) ?? lines[0]
}
const FREE_SHIPPING_THRESHOLD = 80
const SHIPPING_COST = 4.99
const DEFAULT_TAX_RATE = 0.2
// NOTE: `product.price` is the VAT-INCLUSIVE selling price shown to the customer
// (required for UK consumer sales under the Price Marking Order 2004). VAT is
// therefore extracted FROM the total for display purposes only — it is never
// added on top, so the customer never pays more than the price shown on the PDP.
function computeTotals(
  items: CartItem[],
  discountAmount: number,
  giftCardTotal: number = 0,
  taxRate: number = DEFAULT_TAX_RATE,
) {
  const subtotal = items.reduce(
    (s, i) => s + (i.product.price - (i.discount ?? 0)) * i.quantity,
    0,
  )
  const physicalItems = items.filter(
    (i) => i.product.slug !== GIFT_CARD_PRODUCT_HANDLE,
  )
  const physicalSubtotal = physicalItems.reduce(
    (s, i) => s + (i.product.price - (i.discount ?? 0)) * i.quantity,
    0,
  )
  // Mail-in bookings already include their own round-trip shipping (the
  // "Mail-in Stringing Shipping" line), so they never attract the standard
  // delivery charge and do not count towards the free-shipping threshold.
  const shippableItems = physicalItems.filter((i) => !isMailInMeta(i.metadata))
  const shippableSubtotal = shippableItems.reduce(
    (s, i) => s + (i.product.price - (i.discount ?? 0)) * i.quantity,
    0,
  )
  const shipping =
    shippableItems.length === 0 || shippableSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST
  const taxable = Math.max(0, subtotal - discountAmount)
  // preTax is the VAT-inclusive amount the customer is actually charged (goods + shipping)
  const preTax = taxable + shipping
  // VAT portion already baked into preTax, shown for transparency only
  // Selling a gift card is not a VAT-able supply (VAT is charged when the card
  // is spent on goods) - same rule as the POS - so keep gift card lines out of
  // the VAT base.
  const giftCardLines = items
    .filter((i) => i.product.slug === GIFT_CARD_PRODUCT_HANDLE)
    .reduce((s, i) => s + (i.product.price - (i.discount ?? 0)) * i.quantity, 0)
  const vatBase = Math.max(0, preTax - giftCardLines)
  const tax = Math.round((vatBase - vatBase / (1 + taxRate)) * 100) / 100
  const total = Math.max(0, preTax - giftCardTotal)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  return {
    subtotal,
    shipping,
    tax,
    total,
    itemCount,
  }
}
// Adds a line to the Medusa cart. If the saved cart id no longer exists in the
// backend (DB reset, deleted cart, old browser state), create a fresh cart and
// retry once instead of failing. Returns the cart id that was actually used.
async function addToCartSafe(
  cartId: string,
  variantId: string,
  quantity: number,
  metadata: Record<string, any> | undefined,
  onNewCart: (id: string) => void,
): Promise<string> {
  try {
    await addToCart(cartId, variantId, quantity, metadata)
    return cartId
  } catch (e: any) {
    if (!/cart.*not found/i.test(e?.message ?? '')) throw e
    const created = await createCart()
    const freshId = created?.id ?? null
    if (!freshId) throw new Error('Could not create a cart.')
    onNewCart(freshId)
    await addToCart(freshId, variantId, quantity, metadata)
    return freshId
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      discountAmount: 0,
      couponCode: null,
      itemCount: 0,
      giftCards: [],
      giftCardTotal: 0,
      taxRate: DEFAULT_TAX_RATE,
      setCartId: (id) =>
        set({
          cartId: id,
        }),
      setTaxRate: (rate) =>
        set((state) => ({
          taxRate: rate,
          ...computeTotals(
            state.items,
            state.discountAmount,
            state.giftCardTotal,
            rate,
          ),
        })),
      addItem: (product, quantity = 1, variant, metadata, discountPerUnit) => {
        set((state) => {
          const incomingKey = configKeyOf(metadata)
          const existingIndex = state.items.findIndex(
            (i) =>
              i.product.id === product.id &&
              i.variant?.id === variant?.id &&
              itemKey(i) === incomingKey,
          )
          let newItems: CartItem[]
          if (existingIndex >= 0) {
            newItems = state.items.map((item, i) =>
              i === existingIndex
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    discount: item.discount ?? discountPerUnit,
                  }
                : item,
            )
          } else {
            newItems = [
              ...state.items,
              {
                product,
                quantity,
                variant,
                metadata,
                discount: discountPerUnit,
              },
            ]
          }
          return {
            items: newItems,
            ...computeTotals(
              newItems,
              state.discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }
        })
        trackAddToCart({
          itemId: variant?.id ?? product.id,
          itemName: product.name ?? 'Product',
          price: product.price - (discountPerUnit ?? 0),
          quantity,
        })
        const variantId = variant?.id ?? (product as any).variants?.[0]?.id
        if (variantId) {
          ;(async () => {
            try {
              let id = get().cartId
              if (!id) {
                const newCart = await createCart()
                id = newCart?.id ?? null
                if (id)
                  set({
                    cartId: id,
                  })
              }
              if (id) {
                await addToCartSafe(id, variantId, quantity, metadata, (n) =>
                  set({ cartId: n }),
                )
              }
            } catch (err) {
              console.error('Failed to sync cart with backend:', err)
            }
          })()
        }
      },
      addMailInBooking: async (lines) => {
        // 1. Make sure ONE cart exists before anything is added.
        let cartId = get().cartId
        if (!cartId) {
          const created = await createCart()
          cartId = created?.id ?? null
          if (!cartId) throw new Error('Could not create a cart.')
          set({ cartId })
        }
        // 2. Write to Medusa first, one line at a time. Medusa locks the
        //    cart while it changes, so parallel calls fail at random.
        const added: { variantId: string; metadata: Record<string, any> }[] = []
        try {
          for (const l of lines) {
            const variantId = l.variant?.id
            if (!variantId) throw new Error('A booking item has no variant.')
            cartId = await addToCartSafe(
              cartId,
              variantId,
              l.quantity,
              l.metadata,
              (n) => set({ cartId: n }),
            )
            added.push({ variantId, metadata: l.metadata })
          }
        } catch (err) {
          // Roll back what did go in, so Medusa and the cart stay identical.
          try {
            const medusaCart = await getCart(cartId)
            for (const a of added) {
              const li = findMedusaLine(medusaCart, a.variantId, a.metadata)
              if (li) await removeFromCart(cartId, li.id)
            }
          } catch {}
          throw err
        }
        // 3. Only now show the booking in the storefront cart.
        set((state) => {
          const newItems = [
            ...state.items,
            ...lines.map((l) => ({
              product: l.product,
              quantity: l.quantity,
              variant: l.variant,
              metadata: l.metadata,
            })),
          ]
          return {
            items: newItems,
            ...computeTotals(
              newItems,
              state.discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }
        })
        for (const l of lines) {
          trackAddToCart({
            itemId: l.variant?.id ?? l.product.id,
            itemName: l.product.name ?? 'Product',
            price: l.product.price,
            quantity: l.quantity,
          })
        }
      },
      removeMailInBooking: async (bookingId) => {
        const targets = get().items.filter(
          (i) =>
            isMailInMeta(i.metadata) &&
            String(i.metadata?.mail_in_booking ?? '') === bookingId,
        )
        if (targets.length === 0) return
        set((state) => {
          const newItems = state.items.filter((i) => !targets.includes(i))
          return {
            items: newItems,
            ...computeTotals(
              newItems,
              state.discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }
        })
        const cartId = get().cartId
        if (!cartId) return
        try {
          const medusaCart = await getCart(cartId)
          for (const t of targets) {
            const variantId = t.variant?.id
            if (!variantId) continue
            const li = findMedusaLine(medusaCart, variantId, t.metadata)
            if (li) await removeFromCart(cartId, li.id)
          }
        } catch (err) {
          console.error('Failed to remove mail-in booking from cart:', err)
        }
      },
      removeItem: (productId, variantId, configKey) => {
        const state0 = get()
        const removedItem = state0.items.find(
          (i) =>
            i.product.id === productId &&
            i.variant?.id === variantId &&
            (configKey === undefined || itemKey(i) === configKey),
        )
        // A string service that belongs to a racket cannot be removed on its
        // own: it goes away only when its racket is removed.
        if (removedItem && isMergedStringAddon(removedItem, state0.items))
          return
        const linked = removedItem
          ? getLinkedItems(removedItem, state0.items)
          : []
        const targets = removedItem ? [removedItem, ...linked] : []
        const toRemove = targets
          .map((t) => ({
            variantId: (t.variant?.id ??
              (t.product as any)?.variants?.[0]?.id) as string | undefined,
            metadata: t.metadata,
          }))
          .filter(
            (t): t is { variantId: string; metadata: any } => !!t.variantId,
          )
        set((state) => {
          const newItems = state.items.filter((i) => !targets.includes(i))
          return {
            items: newItems,
            ...computeTotals(
              newItems,
              state.discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }
        })
        const cartId = get().cartId
        if (cartId && toRemove.length > 0) {
          ;(async () => {
            try {
              const medusaCart = await getCart(cartId)
              for (const t of toRemove) {
                const lineItem = findMedusaLine(
                  medusaCart,
                  t.variantId,
                  t.metadata,
                )
                if (lineItem) {
                  await removeFromCart(cartId, lineItem.id)
                }
              }
            } catch (err) {
              console.error(
                'Failed to sync item removal with backend cart:',
                err,
              )
            }
          })()
        }
      },
      updateQuantity: (productId, quantity, variantId, configKey) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId, configKey)
          return
        }
        const state0 = get()
        const targetItem = state0.items.find(
          (i) =>
            i.product.id === productId &&
            i.variant?.id === variantId &&
            (configKey === undefined || itemKey(i) === configKey),
        )
        // A merged string service follows its racket's quantity.
        if (targetItem && isMergedStringAddon(targetItem, state0.items)) return
        const linked = targetItem
          ? getLinkedItems(targetItem, state0.items)
          : []
        const ratio =
          targetItem && targetItem.quantity > 0
            ? quantity / targetItem.quantity
            : 1
        const linkedQty = new Map(
          linked.map((l) => [
            l,
            isStringAddon(l)
              ? quantity
              : Math.max(1, Math.round(l.quantity * ratio)),
          ]),
        )
        const backendUpdates: {
          variantId: string
          quantity: number
          metadata?: Record<string, any>
        }[] = []
        const effectiveVariantId =
          variantId ?? (targetItem?.product as any)?.variants?.[0]?.id
        if (effectiveVariantId)
          backendUpdates.push({
            variantId: effectiveVariantId,
            quantity,
            metadata: targetItem?.metadata,
          })
        linked.forEach((l) => {
          const vid = l.variant?.id ?? (l.product as any)?.variants?.[0]?.id
          if (vid)
            backendUpdates.push({
              variantId: vid,
              quantity: linkedQty.get(l) as number,
              metadata: l.metadata,
            })
        })
        set((state) => {
          const newItems = state.items.map((i) => {
            if (i === targetItem) return { ...i, quantity }
            const lq = linkedQty.get(i)
            return lq !== undefined ? { ...i, quantity: lq } : i
          })
          return {
            items: newItems,
            ...computeTotals(
              newItems,
              state.discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }
        })
        const cartId = get().cartId
        if (cartId && backendUpdates.length > 0) {
          ;(async () => {
            try {
              const medusaCart = await getCart(cartId)
              for (const u of backendUpdates) {
                const lineItem = findMedusaLine(
                  medusaCart,
                  u.variantId,
                  u.metadata,
                )
                if (lineItem) {
                  await updateCartItem(cartId, lineItem.id, u.quantity)
                }
              }
            } catch (err) {
              console.error(
                'Failed to sync quantity change with backend cart:',
                err,
              )
            }
          })()
        }
      },
      applyCoupon: async (code) => {
        const cartId = get().cartId
        if (!cartId) {
          return {
            success: false,
            error: 'Add an item to your cart before applying a code.',
          }
        }
        try {
          const res = await fetch('/api/store/cart/promotions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cartId,
              code,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            return {
              success: false,
              error: data.error ?? 'Invalid or expired coupon code',
            }
          }
          const discountAmount = data.cart?.discount_total ?? 0
          set((state) => ({
            couponCode: code.trim().toUpperCase(),
            discountAmount,
            ...computeTotals(
              state.items,
              discountAmount,
              state.giftCardTotal,
              state.taxRate,
            ),
          }))
          return {
            success: true,
          }
        } catch (err) {
          console.error('[cartStore] applyCoupon failed:', err)
          return {
            success: false,
            error: 'Something went wrong — try again.',
          }
        }
      },
      removeCoupon: async () => {
        const { cartId, couponCode } = get()
        set((state) => ({
          couponCode: null,
          discountAmount: 0,
          ...computeTotals(state.items, 0, state.giftCardTotal, state.taxRate),
        }))
        if (cartId && couponCode) {
          try {
            await fetch('/api/store/cart/promotions', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cartId,
                code: couponCode,
              }),
            })
          } catch (err) {
            console.error('[cartStore] removeCoupon failed:', err)
          }
        }
      },
      applyGiftCard: async (code) => {
        const cartId = get().cartId
        if (!cartId) {
          return {
            success: false,
            error: 'Add an item to your cart before applying a gift card.',
          }
        }
        const upperCode = code.trim().toUpperCase()
        const existingEntry = get().giftCards.find((g) => g.code === upperCode)
        if (existingEntry && existingEntry.amount > 0) {
          return {
            success: false,
            error: 'That gift card is already applied',
          }
        }
        try {
          const res = await fetch('/api/store/cart/gift-cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cartId,
              code: upperCode,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            return {
              success: false,
              error: data.error ?? 'Invalid or expired gift card',
            }
          }
          const creditLines: any[] = data.cart?.credit_lines ?? []
          const giftCards = creditLines
            .filter((cl) => !cl.reference || cl.reference === 'gift-card')
            .map((cl) => ({
              code: cl.metadata?.gift_card_code ?? upperCode,
              amount: cl.amount ?? 0,
            }))
          const giftCardTotal = giftCards.reduce((s, g) => s + g.amount, 0)
          const ourEntry = giftCards.find((g) => g.code === upperCode)
          if (!ourEntry || ourEntry.amount <= 0) {
            return {
              success: false,
              error: 'This gift card has no remaining balance.',
            }
          }
          set((state) => ({
            giftCards,
            giftCardTotal,
            ...computeTotals(
              state.items,
              state.discountAmount,
              giftCardTotal,
              state.taxRate,
            ),
          }))
          return {
            success: true,
          }
        } catch (err) {
          console.error('[cartStore] applyGiftCard failed:', err)
          return {
            success: false,
            error: 'Something went wrong — try again.',
          }
        }
      },
      removeGiftCard: async (code) => {
        const cartId = get().cartId
        const upperCode = code.trim().toUpperCase()
        if (!cartId) return
        try {
          const res = await fetch('/api/store/cart/gift-cards', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cartId,
              code: upperCode,
            }),
          })
          const data = await res.json().catch(() => ({}))
          const creditLines: any[] = data.cart?.credit_lines ?? []
          const giftCards = creditLines
            .filter((cl) => !cl.reference || cl.reference === 'gift-card')
            .map((cl) => ({
              code: cl.metadata?.gift_card_code ?? upperCode,
              amount: cl.amount ?? 0,
            }))
          const giftCardTotal = giftCards.reduce((s, g) => s + g.amount, 0)
          set((state) => ({
            giftCards,
            giftCardTotal,
            ...computeTotals(
              state.items,
              state.discountAmount,
              giftCardTotal,
              state.taxRate,
            ),
          }))
        } catch (err) {
          console.error('[cartStore] removeGiftCard failed:', err)
        }
      },
      clearCart: () =>
        set({
          cartId: null,
          items: [],
          subtotal: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          discountAmount: 0,
          couponCode: null,
          itemCount: 0,
          giftCards: [],
          giftCardTotal: 0,
        }),
      syncFromMedusa: (medusaCart: any) => {
        if (!medusaCart) return
        set({
          cartId: medusaCart.id,
        })
      },
    }),
    {
      name: 'medusa-cart',
      partialize: (state) => ({
        cartId: state.cartId,
        items: state.items,
        discountAmount: state.discountAmount,
        couponCode: state.couponCode,
        giftCards: state.giftCards,
        giftCardTotal: state.giftCardTotal,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const totals = computeTotals(
          state.items,
          state.discountAmount,
          state.giftCardTotal,
          state.taxRate,
        )
        state.subtotal = totals.subtotal
        state.shipping = totals.shipping
        state.tax = totals.tax
        state.total = totals.total
        state.itemCount = totals.itemCount
      },
    },
  ),
)
