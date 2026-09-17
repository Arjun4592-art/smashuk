'use client'

// ARCHITECTURE — why this exists, and what it does and doesn't solve.
//
// This does NOT make POS work fully offline. A card payment still needs a
// real connection to whatever payment gateway processes it — no amount of
// local caching changes that. What this DOES fix: today, if the shop's
// WiFi/internet drops for even a moment while a cashier is mid-search, the
// billing screen has nothing to show — every fetch just fails. This module
// keeps a local copy of the last successful index + product-detail
// responses, so a brief connectivity drop degrades to "search still works,
// prices might be a few minutes old" instead of "screen is broken".
//
// Deliberately built as a small IndexedDB wrapper with the browser's native
// API rather than adding a library (idb, Dexie, etc.) or a full
// Service-Worker/PWA setup (Serwist et al — the standard approach in 2026
// for full offline-first Next.js apps). A full PWA conversion changes how
// the whole site is served and cached, is a much bigger and riskier change
// to make blind on a live payment system, and mostly helps a DIFFERENT
// case than the one that matters here: reloading the page while fully
// offline. That's rare in practice compared to "network blips while the
// tab is already open", which is what this targets. If you later want the
// stronger guarantee (works even after a reload with zero connectivity),
// that's better built as part of the desktop app's own local database,
// which was already the plan — a real local DB there does this properly,
// rather than retrofitting a full PWA onto the web version now.
const DB_NAME = 'pos-offline-cache'
const DB_VERSION = 1
const INDEX_STORE = 'index-entries'
const DETAILS_STORE = 'detail-entries'
const META_STORE = 'meta'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(INDEX_STORE)) {
        db.createObjectStore(INDEX_STORE)
      }
      if (!db.objectStoreNames.contains(DETAILS_STORE)) {
        db.createObjectStore(DETAILS_STORE)
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const req = fn(tx.objectStore(storeName))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/** Best-effort — a caching layer must never be why the app breaks. */
async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error('[POS offline cache]', err)
    return fallback
  }
}

export async function saveIndexSnapshot(entries: unknown[]): Promise<void> {
  await safely(async () => {
    await withStore(INDEX_STORE, 'readwrite', (s) => s.put(entries, 'all'))
    await withStore(META_STORE, 'readwrite', (s) =>
      s.put(Date.now(), 'indexSavedAt'),
    )
  }, undefined)
}
export async function loadIndexSnapshot(): Promise<{
  entries: unknown[]
  savedAt: number | null
} | null> {
  return safely(async () => {
    const entries = await withStore<unknown[]>(INDEX_STORE, 'readonly', (s) =>
      s.get('all'),
    )
    if (!entries) return null
    const savedAt = await withStore<number | null>(
      META_STORE,
      'readonly',
      (s) => s.get('indexSavedAt'),
    )
    return { entries, savedAt: savedAt ?? null }
  }, null)
}

export async function saveDetailEntries(
  entriesByVariantId: Record<string, unknown>,
): Promise<void> {
  await safely(async () => {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DETAILS_STORE, 'readwrite')
      const store = tx.objectStore(DETAILS_STORE)
      const now = Date.now()
      for (const [variantId, detail] of Object.entries(entriesByVariantId)) {
        store.put({ detail, savedAt: now }, variantId)
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }, undefined)
}
export async function loadDetailEntries(
  variantIds: string[],
): Promise<Map<string, { detail: unknown; savedAt: number }>> {
  return safely(async () => {
    const db = await openDb()
    const result = new Map<string, { detail: unknown; savedAt: number }>()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DETAILS_STORE, 'readonly')
      const store = tx.objectStore(DETAILS_STORE)
      let pending = variantIds.length
      if (pending === 0) {
        resolve()
        return
      }
      for (const variantId of variantIds) {
        const req = store.get(variantId)
        req.onsuccess = () => {
          if (req.result) result.set(variantId, req.result)
          pending -= 1
          if (pending === 0) resolve()
        }
        req.onerror = () => {
          pending -= 1
          if (pending === 0) resolve()
        }
      }
      tx.onerror = () => reject(tx.error)
    })
    return result
  }, new Map())
}
