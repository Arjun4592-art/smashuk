'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product } from '@/types'
import {
  getWishlist,
  updateWishlist,
  getProductsByIds,
  normalizeProduct,
} from '@/lib/api/store'

// The server (Medusa favorites module) is the source of truth: one row per
// customer + product. The browser keeps `items` for display, plus two small
// persisted queues of changes that have not reached the server yet
// (guest adds before login, a failed request, a tab closed mid-debounce).
// Queued changes are retried on the next change and on every hydrate, so a
// failed save is never silently lost - and a stale device can never overwrite
// the server list, because we only ever send add/remove deltas.
interface WishlistState {
  items: Product[]
  hydrated: boolean
  pendingAdd: string[]
  pendingRemove: string[]
  toggle: (product: Product) => void
  remove: (productId: string) => void
  isWishlisted: (productId: string) => boolean
  clear: () => void
  hydrateFromServer: () => Promise<void>
}

let flushTimer: ReturnType<typeof setTimeout> | null = null
// Requests are sent one at a time so an older request can never land after a
// newer one.
let flushChain: Promise<void> = Promise.resolve()

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => {
      const queueChange = (addIds: string[], removeIds: string[]) => {
        set((state) => ({
          pendingAdd: [
            ...state.pendingAdd.filter((id) => !removeIds.includes(id)),
            ...addIds.filter((id) => !state.pendingAdd.includes(id)),
          ],
          pendingRemove: [
            ...state.pendingRemove.filter((id) => !addIds.includes(id)),
            ...removeIds.filter((id) => !state.pendingRemove.includes(id)),
          ],
        }))
      }
      const flushOnce = async () => {
        const { pendingAdd, pendingRemove } = get()
        if (pendingAdd.length === 0 && pendingRemove.length === 0) return
        try {
          await updateWishlist({
            add: pendingAdd,
            remove: pendingRemove,
          })
          // Drop only what we just sent; anything queued meanwhile stays.
          set((state) => ({
            pendingAdd: state.pendingAdd.filter(
              (id) => !pendingAdd.includes(id),
            ),
            pendingRemove: state.pendingRemove.filter(
              (id) => !pendingRemove.includes(id),
            ),
          }))
        } catch (err) {
          // Stays queued; retried on the next change or hydrate.
          console.error('[wishlist] failed to sync to Medusa:', err)
        }
      }
      const flush = () => {
        flushChain = flushChain.then(flushOnce)
        return flushChain
      }
      const scheduleFlush = () => {
        if (flushTimer) clearTimeout(flushTimer)
        flushTimer = setTimeout(() => {
          void flush()
        }, 300)
      }
      return {
        items: [],
        hydrated: false,
        pendingAdd: [],
        pendingRemove: [],
        toggle: (product) => {
          const exists = get().items.some((p) => p.id === product.id)
          set((state) => ({
            items: exists
              ? state.items.filter((p) => p.id !== product.id)
              : [...state.items, product],
          }))
          if (exists) queueChange([], [product.id])
          else queueChange([product.id], [])
          scheduleFlush()
        },
        remove: (productId) => {
          set((state) => ({
            items: state.items.filter((p) => p.id !== productId),
          }))
          queueChange([], [productId])
          scheduleFlush()
        },
        isWishlisted: (productId) =>
          get().items.some((p) => p.id === productId),
        clear: () => {
          const ids = get().items.map((p) => p.id)
          set({
            items: [],
            pendingAdd: [],
          })
          queueChange([], ids)
          scheduleFlush()
        },
        hydrateFromServer: async () => {
          try {
            // Push anything still queued first, so the server list we read next
            // already includes it.
            await flush()
            const serverIds = await getWishlist()
            const { pendingAdd, pendingRemove } = get()
            // Server list + changes that still could not be sent.
            const effectiveIds = [
              ...serverIds.filter((id) => !pendingRemove.includes(id)),
              ...pendingAdd.filter((id) => !serverIds.includes(id)),
            ]
            const localById = new Map(get().items.map((p) => [p.id, p]))
            const missingIds = effectiveIds.filter((id) => !localById.has(id))
            const fetched = missingIds.length
              ? (await getProductsByIds(missingIds)).map(normalizeProduct)
              : []
            set((state) => {
              const byId = new Map(state.items.map((p) => [p.id, p]))
              fetched.forEach((p) => byId.set(p.id, p))
              return {
                items: effectiveIds
                  .map((id) => byId.get(id))
                  .filter(Boolean) as Product[],
                hydrated: true,
              }
            })
          } catch (err) {
            console.error('[wishlist] failed to hydrate from Medusa:', err)
            set({
              hydrated: true,
            })
          }
        },
      }
    },
    {
      name: 'smash-wishlist',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        pendingAdd: state.pendingAdd,
        pendingRemove: state.pendingRemove,
      }),
      // Before this version the wishlist was a full list saved to customer
      // metadata. On first load after the upgrade, queue the locally cached items
      // so they are copied into the new table instead of disappearing.
      migrate: (persisted: any, version) => {
        const state = persisted ?? {}
        if (version < 1) {
          const items: Product[] = Array.isArray(state.items) ? state.items : []
          return {
            ...state,
            items,
            pendingAdd: items.map((p) => p.id),
            pendingRemove: [],
          }
        }
        return state
      },
    },
  ),
)
