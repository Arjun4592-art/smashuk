import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getOrders,
  getProducts,
  getCustomers,
  getDashboardStats,
  getInventory,
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
