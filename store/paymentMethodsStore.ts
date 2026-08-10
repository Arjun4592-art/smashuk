'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// NOTE: For PCI-DSS compliance, raw card numbers/CVVs must never touch our
// own servers or storage — they should be tokenized directly with the
// payment provider (e.g. Stripe Elements / SetupIntent) at checkout time.
// This store only keeps a display-friendly label so returning customers can
// see "which card to use" — it is not a substitute for real card storage.
export interface SavedPaymentMethod {
  id: string
  brand: string // e.g. 'Visa', 'Mastercard', 'PayPal'
  last4?: string
  expiry?: string // MM/YY
  label: string // e.g. 'Personal Visa'
  isDefault?: boolean
}

interface PaymentMethodsState {
  methods: SavedPaymentMethod[]
  add: (method: Omit<SavedPaymentMethod, 'id'>) => void
  remove: (id: string) => void
  setDefault: (id: string) => void
}

export const usePaymentMethodsStore = create<PaymentMethodsState>()(
  persist(
    (set) => ({
      methods: [],

      add: (method) =>
        set((state) => ({
          methods: [
            ...state.methods,
            { ...method, id: `pm_${Date.now()}` },
          ],
        })),

      remove: (id) =>
        set((state) => ({
          methods: state.methods.filter((m) => m.id !== id),
        })),

      setDefault: (id) =>
        set((state) => ({
          methods: state.methods.map((m) => ({
            ...m,
            isDefault: m.id === id,
          })),
        })),
    }),
    {
      name: 'smash-payment-methods',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
