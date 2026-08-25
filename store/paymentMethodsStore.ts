'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4?: string;
  expiry?: string;
  label: string;
  isDefault?: boolean;
}
interface PaymentMethodsState {
  methods: SavedPaymentMethod[];
  add: (method: Omit<SavedPaymentMethod, 'id'>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
}
export const usePaymentMethodsStore = create<PaymentMethodsState>()(persist(set => ({
  methods: [],
  add: method => set(state => ({
    methods: [...state.methods, {
      ...method,
      id: `pm_${Date.now()}`
    }]
  })),
  remove: id => set(state => ({
    methods: state.methods.filter(m => m.id !== id)
  })),
  setDefault: id => set(state => ({
    methods: state.methods.map(m => ({
      ...m,
      isDefault: m.id === id
    }))
  }))
}), {
  name: 'smash-payment-methods',
  storage: createJSONStorage(() => localStorage)
}));
