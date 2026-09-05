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
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
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
  const shipping =
    physicalItems.length === 0 || physicalSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST
  const taxable = Math.max(0, subtotal - discountAmount)
  // preTax is the VAT-inclusive amount the customer is actually charged (goods + shipping)
  const preTax = taxable + shipping
  // VAT portion already baked into preTax, shown for transparency only
  const tax = Math.round((preTax - preTax / (1 + taxRate)) * 100) / 100
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
          const existingIndex = state.items.findIndex(
            (i) => i.product.id === product.id && i.variant?.id === variant?.id,
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
                await addToCart(id, variantId, quantity, metadata)
              }
            } catch (err) {
              console.error('Failed to sync cart with backend:', err)
            }
          })()
        }
      },
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
              ? {
                  ...i,
                  quantity,
                }
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
