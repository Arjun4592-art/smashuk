'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';
import { getWishlist, saveWishlist, getProductsByIds, normalizeProduct } from '@/lib/api/store';
interface WishlistState {
  items: Product[];
  hydrated: boolean;
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  clear: () => void;
  hydrateFromServer: () => Promise<void>;
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(items: Product[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveWishlist(items.map(p => p.id)).catch(err => console.error('[wishlist] failed to sync to Medusa:', err));
  }, 500);
}
export const useWishlistStore = create<WishlistState>()(persist((set, get) => ({
  items: [],
  hydrated: false,
  toggle: product => {
    set(state => {
      const exists = state.items.some(p => p.id === product.id);
      const items = exists ? state.items.filter(p => p.id !== product.id) : [...state.items, product];
      scheduleSave(items);
      return {
        items
      };
    });
  },
  remove: productId => {
    set(state => {
      const items = state.items.filter(p => p.id !== productId);
      scheduleSave(items);
      return {
        items
      };
    });
  },
  isWishlisted: productId => get().items.some(p => p.id === productId),
  clear: () => {
    scheduleSave([]);
    set({
      items: []
    });
  },
  hydrateFromServer: async () => {
    try {
      const ids = await getWishlist();
      if (ids.length === 0) {
        set({
          hydrated: true
        });
        return;
      }
      const localIds = new Set(get().items.map(p => p.id));
      const missingIds = ids.filter(id => !localIds.has(id));
      const fetched = missingIds.length ? (await getProductsByIds(missingIds)).map(normalizeProduct) : [];
      set(state => {
        const byId = new Map(state.items.map(p => [p.id, p]));
        fetched.forEach(p => byId.set(p.id, p));
        const merged = ids.map(id => byId.get(id)).filter(Boolean) as Product[];
        return {
          items: merged,
          hydrated: true
        };
      });
    } catch (err) {
      console.error('[wishlist] failed to hydrate from Medusa:', err);
      set({
        hydrated: true
      });
    }
  }
}), {
  name: 'smash-wishlist',
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({
    items: state.items
  })
}));
