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

export interface CartItem {
  product: Product
  quantity: number
  variant?: { id: string; size?: string; color?: string }
  discount?: number
  // Per-item extras like a stringing booking's date/time/tension notes —
  // stored locally too (not just sent to Medusa) so the cart/checkout
  // review screens can actually show what the customer booked before they
  // pay, instead of it only surfacing after the order is placed.
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
  // Gift cards stack (unlike coupons, which replace) — the loyalty plugin
  // lets multiple gift cards be applied to one cart, each as its own
  // credit line. giftCardTotal is the sum of those credit lines' amounts,
  // taken straight from Medusa's own cart.credit_lines — the same total
  // that flows into the Stripe charge.
  giftCards: { code: string; amount: number }[]
  giftCardTotal: number
  // Real VAT rate from Medusa's tax-region config (see
  // /api/admin/store-settings), fetched once on app load by Navbar.tsx.
  // Defaults to 20% until that fetch resolves so nothing shows £0 tax in
  // the meantime — previously this was a hardcoded VAT_RATE=0.2 constant
  // that never reflected the actual Medusa tax setup, so the VAT shown at
  // checkout could silently drift from whatever region/rate is configured.
  taxRate: number

  setCartId: (id: string) => void
  setTaxRate: (rate: number) => void
  addItem: (
    product: Product,
    quantity?: number,
    variant?: CartItem['variant'],
    metadata?: Record<string, any>,
  ) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void
  // BUG FIX: this used to be `(code: string, discount: number) => void` —
  // the caller (cart/page.tsx) looked `discount` up from a hardcoded
  // client-side map and this function just stored that number locally. It
  // never touched the real Medusa cart, so Stripe/Medusa always charged
  // the FULL price regardless of what discount was shown on screen. Now
  // async: it calls the real promotions API, and only updates local state
  // if Medusa actually accepted the code — returning a result so the UI
  // can show a real error for an invalid/expired code.
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>
  removeCoupon: () => Promise<void>
  applyGiftCard: (code: string) => Promise<{ success: boolean; error?: string }>
  removeGiftCard: (code: string) => Promise<void>
  clearCart: () => void
  syncFromMedusa: (medusaCart: any) => void
}

const FREE_SHIPPING_THRESHOLD = 80 // £80 — direct pounds (not pence)
const SHIPPING_COST = 4.99 // £4.99
const DEFAULT_TAX_RATE = 0.2 // fallback until /api/admin/store-settings resolves

function computeTotals(
  items: CartItem[],
  discountAmount: number,
  giftCardTotal: number = 0,
  taxRate: number = DEFAULT_TAX_RATE,
) {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  // Gift cards are digital/emailed — they never incur shipping and don't
  // count toward the free-shipping threshold. Shipping is £0 whenever the
  // cart has no physical (non-gift-card) items at all, and is otherwise
  // based only on the physical-items subtotal reaching the threshold.
  const physicalItems = items.filter(
    (i) => i.product.slug !== GIFT_CARD_PRODUCT_HANDLE,
  )
  const physicalSubtotal = physicalItems.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  )
  const shipping =
    physicalItems.length === 0 || physicalSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST
  const taxable = Math.max(0, subtotal - discountAmount)
  const tax = Math.round(taxable * taxRate * 100) / 100
  // Gift cards apply to the payable total (post-tax), same as Medusa nets
  // its credit_lines against cart.total — they don't reduce the taxable base.
  const total = Math.max(0, taxable + shipping + tax - giftCardTotal)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  return { subtotal, shipping, tax, total, itemCount }
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

      setCartId: (id) => set({ cartId: id }),

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

      addItem: (product, quantity = 1, variant, metadata) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.product.id === product.id && i.variant?.id === variant?.id,
          )
          let newItems: CartItem[]
          if (existingIndex >= 0) {
            newItems = state.items.map((item, i) =>
              i === existingIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          } else {
            newItems = [
              ...state.items,
              { product, quantity, variant, metadata },
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

        // Keep a real Medusa cart in sync in the background so that cartId
        // is always available when the user reaches checkout — without
        // this, "quick add" buttons only updated local UI state and
        // checkout would fail with "Cart not found".
        const variantId = variant?.id ?? (product as any).variants?.[0]?.id
        if (variantId) {
          ;(async () => {
            try {
              let id = get().cartId
              if (!id) {
                const newCart = await createCart()
                id = newCart?.id ?? null
                if (id) set({ cartId: id })
              }
              if (id) {
                await addToCart(id, variantId, quantity, metadata)
              }
            } catch (err) {
              console.error('Failed to sync cart with backend:', err)
            }
          })()
        }
      },

      // BUG FIX: this used to only update local Zustand state — it never
      // touched the real Medusa cart at all (unlike addItem, which already
      // synced in the background). That meant the moment a customer
      // removed an item on /cart, the local UI and the real Medusa cart
      // diverged: the item vanished from the screen, but Medusa's cart
      // still held it. Checkout's own cart-validation effect only rebuilds
      // the cart when Medusa's cart is completely EMPTY, so a cart with
      // one stale leftover item sailed straight through — the customer
      // could end up charged (via Stripe/Medusa `complete`) for an item
      // they had explicitly removed from their cart. Now mirrors addItem's
      // pattern: update local state immediately for a responsive UI, then
      // sync the real cart in the background by finding the matching
      // Medusa line item (matched on variant_id, same as how it was added)
      // and deleting it there too.
      removeItem: (productId, variantId) => {
        const state0 = get()
        const removedItem = state0.items.find(
          (i) => i.product.id === productId && i.variant?.id === variantId,
        )
        const effectiveVariantId =
          variantId ?? (removedItem?.product as any)?.variants?.[0]?.id

        set((state) => {
          const newItems = state.items.filter(
            (i) => !(i.product.id === productId && i.variant?.id === variantId),
          )
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
        if (cartId && effectiveVariantId) {
          ;(async () => {
            try {
              const medusaCart = await getCart(cartId)
              const lineItem = (medusaCart?.items ?? []).find(
                (li: any) => li.variant_id === effectiveVariantId,
              )
              if (lineItem) {
                await removeFromCart(cartId, lineItem.id)
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

      // BUG FIX: same issue as removeItem above — quantity changes on
      // /cart only ever updated local state, never the real Medusa cart.
      // A customer dropping a quantity from 3 to 1 would see "1" on
      // screen but still be charged for 3 at checkout, since Medusa's own
      // cart (what Stripe/`complete` actually bills) was never told about
      // the change. Now syncs the real line item's quantity in the
      // background the same way removeItem does.
      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        const state0 = get()
        const targetItem = state0.items.find(
          (i) => i.product.id === productId && i.variant?.id === variantId,
        )
        const effectiveVariantId =
          variantId ?? (targetItem?.product as any)?.variants?.[0]?.id

        set((state) => {
          const newItems = state.items.map((i) =>
            i.product.id === productId && i.variant?.id === variantId
              ? { ...i, quantity }
              : i,
          )
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
        if (cartId && effectiveVariantId) {
          ;(async () => {
            try {
              const medusaCart = await getCart(cartId)
              const lineItem = (medusaCart?.items ?? []).find(
                (li: any) => li.variant_id === effectiveVariantId,
              )
              if (lineItem) {
                await updateCartItem(cartId, lineItem.id, quantity)
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId, code }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            return {
              success: false,
              error: data.error ?? 'Invalid or expired coupon code',
            }
          }
          // discount_total comes straight from Medusa's own cart — the same
          // total the Stripe payment session/collection is built from — so
          // what's shown here now matches what's actually charged.
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
          return { success: true }
        } catch (err) {
          console.error('[cartStore] applyCoupon failed:', err)
          return { success: false, error: 'Something went wrong — try again.' }
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
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cartId, code: couponCode }),
            })
          } catch (err) {
            console.error('[cartStore] removeCoupon failed:', err)
          }
        }
      },

      // Gift cards stack, unlike coupons — applying a second one adds to
      // giftCards[] rather than replacing. giftCardTotal is recomputed from
      // the real cart's credit_lines returned by the plugin's endpoint, so
      // it always matches what Medusa will actually deduct at payment time.
      applyGiftCard: async (code) => {
        const cartId = get().cartId
        if (!cartId) {
          return {
            success: false,
            error: 'Add an item to your cart before applying a gift card.',
          }
        }
        const upperCode = code.trim().toUpperCase()
        // Only block as "already applied" if that entry actually carries a
        // real balance. A stale/phantom £0 entry (e.g. persisted in the
        // browser from before this fix existed) would otherwise permanently
        // block ever retrying that code — this lets it self-heal by falling
        // through to a fresh server check instead.
        const existingEntry = get().giftCards.find((g) => g.code === upperCode)
        if (existingEntry && existingEntry.amount > 0) {
          return { success: false, error: 'That gift card is already applied' }
        }
        try {
          const res = await fetch('/api/store/cart/gift-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId, code: upperCode }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            return {
              success: false,
              error: data.error ?? 'Invalid or expired gift card',
            }
          }
          // credit_lines is what the plugin creates when a gift card is
          // applied — sum them for the total, and keep the raw list so each
          // applied code can be shown/removed individually.
          //
          // BUG FIX: Medusa's actual reference value is 'gift-card' (hyphen)
          // — confirmed from a live response — but this filter was checking
          // for 'gift_card' (underscore), so every real gift-card credit
          // line was silently thrown away here. giftCards ended up empty,
          // giftCardTotal stayed 0, and a card with a genuine £30 balance
          // looked like it had none — even though Medusa's own cart.total
          // (server-side) already correctly reflected the £30 off.
          const creditLines: any[] = data.cart?.credit_lines ?? []
          const giftCards = creditLines
            .filter((cl) => !cl.reference || cl.reference === 'gift-card')
            .map((cl) => ({
              code: cl.metadata?.gift_card_code ?? upperCode,
              amount: cl.amount ?? 0,
            }))
          const giftCardTotal = giftCards.reduce((s, g) => s + g.amount, 0)

          // BUG FIX: a fully-redeemed / zero-balance gift card still comes
          // back from Medusa as a 200 OK (it's a valid code), but either
          // contributes no credit_line at all or one worth £0. The old code
          // treated that as a normal success — the UI then showed "Gift
          // card already applied to cart" with no discount anywhere in the
          // Order Summary, which looked broken/confusing. Surface it as
          // what it actually is: nothing left to redeem.
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
          return { success: true }
        } catch (err) {
          console.error('[cartStore] applyGiftCard failed:', err)
          return { success: false, error: 'Something went wrong — try again.' }
        }
      },

      removeGiftCard: async (code) => {
        const cartId = get().cartId
        const upperCode = code.trim().toUpperCase()
        if (!cartId) return
        try {
          const res = await fetch('/api/store/cart/gift-cards', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId, code: upperCode }),
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

      // Sync from the Medusa cart (after checkout)
      syncFromMedusa: (medusaCart: any) => {
        if (!medusaCart) return
        set({ cartId: medusaCart.id })
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
      // BUG FIX: subtotal/shipping/tax/total/itemCount are derived values
      // and were never persisted, so after a page reload they reset to 0
      // while `items` (which IS persisted) stayed populated — causing the
      // checkout page to show correct per-line prices but £0.00 totals.
      // Recompute them immediately after the persisted state rehydrates.
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