import { useState, useEffect, useCallback } from 'react';
import { getOrders, getProducts, getCustomers, getDashboardStats, getInventory, getDiscounts, type DashboardStats } from '@/lib/api/dashboard';
function useAsync<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return {
    data,
    loading,
    error,
    refetch: fetch
  };
}
export function useOrders(params?: {
  limit?: number;
  offset?: number;
  status?: string[];
}) {
  return useAsync(() => getOrders(params), [params?.limit, params?.offset, params?.status?.join(',')]);
}
export function useProducts(params?: {
  limit?: number;
  offset?: number;
  q?: string;
  status?: string[];
}) {
  return useAsync(() => getProducts(params), [params?.limit, params?.offset, params?.q, params?.status?.join(',')]);
}
export function useCustomers(params?: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  return useAsync(() => getCustomers(params), [params?.limit, params?.offset, params?.q]);
}
export function useDashboardStats(range?: string) {
  return useAsync(() => getDashboardStats(range), [range ?? 'last30']);
}
export function useInventory(params?: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  return useAsync(() => getInventory(params), [params?.limit, params?.offset, params?.q]);
}
export function useDiscounts(params?: {
  limit?: number;
  offset?: number;
}) {
  return useAsync(() => getDiscounts(params), [params?.limit, params?.offset]);
}
