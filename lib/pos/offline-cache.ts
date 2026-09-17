'use client'

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
