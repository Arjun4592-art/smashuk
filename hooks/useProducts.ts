import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getProducts, getAllProducts, getAllProductsProgressive, getProduct, getSiteReviews, getBrandStats } from '@/lib/api/store';
export function useMedusaProducts(params?: {
  limit?: number;
  offset?: number;
  q?: string;
  category_id?: string[];
}) {
  const query = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    staleTime: 60 * 1000,
    retry: 2,
    placeholderData: {
      products: [],
      count: 0
    }
  });
  return {
    ...query,
    isLoading: query.isLoading || query.isPlaceholderData
  };
}
export function useAllStoreProducts(params?: {
  q?: string;
  category_id?: string[];
}) {
  const query = useQuery({
    queryKey: ['products-all', params],
    queryFn: () => getAllProducts(params),
    staleTime: 60 * 1000,
    retry: 2,
    placeholderData: {
      products: [],
      count: 0
    }
  });
  return {
    ...query,
    isLoading: query.isLoading || query.isPlaceholderData
  };
}
export function useAllStoreProductsProgressive(params?: {
  q?: string;
  category_id?: string[];
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const paramsKey = JSON.stringify(params ?? {});
  useEffect(() => {
    const signal = {
      cancelled: false
    };
    setIsLoading(true);
    setIsBackgroundLoading(false);
    setIsError(false);
    setProducts([]);
    setCount(0);
    getAllProductsProgressive(params, {
      onFirstBatch: first => {
        if (signal.cancelled) return;
        setProducts(first.products);
        setCount(first.count);
        setIsLoading(false);
        if (first.count > first.products.length) setIsBackgroundLoading(true);
      },
      onMore: (more: any[]) => {
        if (signal.cancelled) return;
        setProducts((prev: any[]) => [...prev, ...more]);
      },
      onDone: () => {
        if (signal.cancelled) return;
        setIsBackgroundLoading(false);
      }
    }, signal).catch(() => {
      if (signal.cancelled) return;
      setIsError(true);
      setIsLoading(false);
      setIsBackgroundLoading(false);
    });
    return () => {
      signal.cancelled = true;
    };
  }, [paramsKey]);
  return {
    products,
    count,
    isLoading,
    isBackgroundLoading,
    isError
  };
}
export function useMedusaProduct(handle: string) {
  return useQuery({
    queryKey: ['product', handle],
    queryFn: () => getProduct(handle),
    enabled: !!handle,
    retry: 2
  });
}
export function useSiteReviews() {
  return useQuery({
    queryKey: ['site-reviews'],
    queryFn: getSiteReviews,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: []
  });
}
export function useBrandStats() {
  return useQuery({
    queryKey: ['brand-stats'],
    queryFn: getBrandStats,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: {
      brands: [],
      brandCount: 0,
      productCount: 0,
      avgRating: null,
      bySport: {}
    }
  });
}
export const useStoreProducts = useMedusaProducts;
export const useStoreProduct = useMedusaProduct;
