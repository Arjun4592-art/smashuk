import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getOrders,
  getProducts,
  getCustomers,
  getDashboardStats,
  getInventory,
  getInventoryPage,
  getDiscounts,
  getAbandonedCheckouts,
  type DashboardStats,
} from '@/lib/api/dashboard'
function useAsync<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Only the latest request may update state — with paging, a slow earlier
  // page must not overwrite a newer one.
  const requestId = useRef(0)
  const fetch = useCallback(async () => {
    const myId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (myId === requestId.current) setData(result)
    } catch (err: any) {
      if (myId !== requestId.current) return
      console.error('Dashboard fetch error:', err)
      setError(err?.message ?? 'Failed to load data')
    } finally {
      if (myId === requestId.current) setLoading(false)
    }
    // deps is a caller-supplied array (see useOrders/useProducts/etc. below),
    // so it can't be a static array literal here; each call site below
    // passes its own literal array.
    // eslint-disable-next-line react-hooks/use-memo
  }, deps)
  useEffect(() => {
    fetch()
  }, [fetch])
  return {
    data,
    loading,
    error,
    refetch: fetch,
  }
}
/**
 * Loads EVERY page of a list (progressively) instead of only the first N.
 * Pages that filter / segment / count on the client need the full list —
 * with a 100-row window, "Out of stock" or a customer segment silently
 * only looked at the first 100 rows. `loading` is true only until the first
 * page is in; `loadingMore` stays true while the rest stream in.
 */
function useAllPages<T>(
  fetchPage: (
    offset: number,
    pageSize: number,
  ) => Promise<{ items: T[]; total: number; fetched: number }>,
  deps: any[],
  pageSize = 100,
  cap = 5000,
) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const run = useCallback(async () => {
    const myId = ++requestId.current
    const stale = () => myId !== requestId.current
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    try {
      let offset = 0
      let all: T[] = []
      let count = Infinity
      while (offset < count && offset < cap) {
        const page = await fetchPage(offset, pageSize)
        if (stale()) return
        all = all.concat(page.items)
        count = page.total
        offset += page.fetched
        setItems(all)
        setTotal(count)
        if (offset === 0 || page.fetched === 0) break
        if (offset === page.fetched) {
          setLoading(false)
          if (offset < count) setLoadingMore(true)
        }
      }
    } catch (err: any) {
      if (stale()) return
      console.error('Dashboard fetch error:', err)
      setError(err?.message ?? 'Failed to load data')
    } finally {
      if (!stale()) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
    // eslint-disable-next-line react-hooks/use-memo
  }, deps)
  useEffect(() => {
    run()
  }, [run])
  return { items, total, loading, loadingMore, error, refetch: run }
}
/** All customers (every page), same return shape as useCustomers. */
export function useAllCustomers(params?: { q?: string }) {
  const r = useAllPages<
    Awaited<ReturnType<typeof getCustomers>>['customers'][number]
  >(
    async (offset, pageSize) => {
      const res = await getCustomers({
        limit: pageSize,
        offset,
        q: params?.q,
      })
      return {
        items: res.customers,
        total: res.count ?? res.customers.length,
        fetched: res.customers.length,
      }
    },
    [params?.q],
  )
  return {
    data: { customers: r.items, count: r.total },
    loading: r.loading,
    loadingMore: r.loadingMore,
    error: r.error,
    refetch: r.refetch,
  }
}
/** All inventory rows (every page of products), same shape as useInventory. */
export function useAllInventory(params?: { q?: string }) {
  const r = useAllPages<
    Awaited<ReturnType<typeof getInventoryPage>>['items'][number]
  >(
    async (offset, pageSize) => {
      const res = await getInventoryPage({
        limit: pageSize,
        offset,
        q: params?.q,
      })
      return { items: res.items, total: res.count, fetched: res.fetched }
    },
    [params?.q],
    100,
  )
  return {
    data: r.items,
    loading: r.loading,
    loadingMore: r.loadingMore,
    error: r.error,
    refetch: r.refetch,
  }
}
/** Every order (newest first, paged 200 at a time), same shape as useOrders. */
export function useAllOrders() {
  const r = useAllPages<
    Awaited<ReturnType<typeof getOrders>>['orders'][number]
  >(
    async (offset, pageSize) => {
      const res = await getOrders({ limit: pageSize, offset })
      return {
        items: res.orders,
        total: res.count ?? res.orders.length,
        fetched: res.orders.length,
      }
    },
    [],
    200,
  )
  return {
    data: { orders: r.items, count: r.total },
    loading: r.loading,
    loadingMore: r.loadingMore,
    error: r.error,
    refetch: r.refetch,
  }
}
export function useOrders(params?: {
  limit?: number
  offset?: number
  status?: string[]
}) {
  return useAsync(
    () => getOrders(params),
    [params?.limit, params?.offset, params?.status?.join(',')],
  )
}
export function useProducts(params?: {
  limit?: number
  offset?: number
  q?: string
  status?: string[]
}) {
  return useAsync(
    () => getProducts(params),
    [params?.limit, params?.offset, params?.q, params?.status?.join(',')],
  )
}
export function useCustomers(params?: {
  limit?: number
  offset?: number
  q?: string
}) {
  return useAsync(
    () => getCustomers(params),
    [params?.limit, params?.offset, params?.q],
  )
}
export function useDashboardStats(range?: string) {
  return useAsync(() => getDashboardStats(range), [range ?? 'last30'])
}
export function useInventory(params?: {
  limit?: number
  offset?: number
  q?: string
}) {
  return useAsync(
    () => getInventory(params),
    [params?.limit, params?.offset, params?.q],
  )
}
export function useDiscounts(params?: { limit?: number; offset?: number }) {
  return useAsync(() => getDiscounts(params), [params?.limit, params?.offset])
}
export function useAbandonedCheckouts(params?: {
  limit?: number
  offset?: number
  minutes?: number
}) {
  return useAsync(
    () => getAbandonedCheckouts(params),
    [params?.limit, params?.offset, params?.minutes],
  )
}
