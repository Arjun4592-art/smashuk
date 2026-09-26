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
      const localItems = get().items;
      const localIds = new Set(localItems.map(p => p.id));
      const serverIdSet = new Set(ids);
      const missingIds = ids.filter(id => !localIds.has(id));
      const fetched = missingIds.length ? (await getProductsByIds(missingIds)).map(normalizeProduct) : [];
      set(state => {
        const byId = new Map(state.items.map(p => [p.id, p]));
        fetched.forEach(p => byId.set(p.id, p));
        // Union with the server list, never replace with it: an item added
        // on this device just before a refresh (before the 500ms debounced
        // save fired) — or one whose save silently failed — still exists
        // locally even though the server hasn't recorded it yet. Building
        // `merged` from `ids` alone used to drop any such item the moment
        // this ran, which looked exactly like "wishlist items don't save".
        const merged = [...ids.map(id => byId.get(id)).filter(Boolean), ...state.items.filter(p => !serverIdSet.has(p.id))] as Product[];
        return {
          items: merged,
          hydrated: true
        };
      });
      // Push any local-only items (from the case above) back to the server
      // so they aren't lost again on the next hydrate.
      const hasLocalOnly = localItems.some(p => !serverIdSet.has(p.id));
      if (hasLocalOnly) {
        scheduleSave(get().items);
      }
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