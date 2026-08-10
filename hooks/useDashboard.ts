import { useState, useEffect, useCallback } from 'react'
import {
  getOrders,
  getProducts,
  getCustomers,
  getDashboardStats,
  getInventory,
  getDiscounts,
  type DashboardStats,
} from '@/lib/api/dashboard'

// ── Generic hook factory ──────────────────────────────────────────────────────

function useAsync<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err: any) {
      console.error('Dashboard fetch error:', err)
      setError(err?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
    // `useAsync` is a generic hook factory: `deps` is supplied by each
    // caller and can never be a static array literal here by design.
    // `fetcher` is intentionally excluded too — callers are expected to
    // pass a fresh fetcher whenever they want a refetch, driven by `deps`
    // itself (mirroring the old `useEffect(fn, deps)` contract), not by
    // fetcher identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps)

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── Orders hook ───────────────────────────────────────────────────────────────

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

// ── Products hook ─────────────────────────────────────────────────────────────

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

// ── Customers hook ────────────────────────────────────────────────────────────

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

// ── Dashboard stats hook ──────────────────────────────────────────────────────

export function useDashboardStats(range?: string) {
  return useAsync(() => getDashboardStats(range), [range ?? 'last30'])
}

// ── Inventory hook ────────────────────────────────────────────────────────────

export function useInventory(params?: { limit?: number; offset?: number }) {
  return useAsync(() => getInventory(params), [params?.limit, params?.offset])
}

// ── Discounts hook ────────────────────────────────────────────────────────────

export function useDiscounts(params?: { limit?: number; offset?: number }) {
  return useAsync(() => getDiscounts(params), [params?.limit, params?.offset])
}
