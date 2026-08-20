import { useQuery } from '@tanstack/react-query'
import {
  getProducts,
  getAllProducts,
  getProduct,
  getSiteReviews,
  getBrandStats,
} from '@/lib/api/store'

export function useMedusaProducts(params?: {
  limit?: number
  offset?: number
  q?: string
  category_id?: string[]
}) {
  const query = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    staleTime: 60 * 1000,
    retry: 2,
    // Empty result on error — UI gracefully shows "no products"
    placeholderData: { products: [], count: 0 },
  })

  // BUG FIX: placeholderData makes react-query report `isLoading: false`
  // immediately (status flips to "success" with the empty placeholder), so
  // every skeleton check downstream (`if (isLoading) ...`) never fired —
  // the UI just flashed blank/empty product grids until the real fetch
  // resolved. `isPlaceholderData` stays true for exactly that window, so
  // folding it into `isLoading` restores the skeleton until real data
  // arrives, without touching every call site individually.
  return { ...query, isLoading: query.isLoading || query.isPlaceholderData }
}

// BUG FIX: used by the /shop listing page, which filters and builds its
// category/brand sidebar options entirely client-side. Fetching a single
// capped page (the old useMedusaProducts({ limit: 100 })) hid every product
// past the cutoff — smaller categories (Grips, Strings, Shuttlecocks,
// Balls, Accessories) disappeared from the sidebar entirely and any filter
// selecting them showed "0 products found". This pages through the whole
// catalog via getAllProducts() so the shop page always has every product.
export function useAllStoreProducts(params?: {
  q?: string
  category_id?: string[]
}) {
  const query = useQuery({
    queryKey: ['products-all', params],
    queryFn: () => getAllProducts(params),
    staleTime: 60 * 1000,
    retry: 2,
    placeholderData: { products: [], count: 0 },
  })

  // Same placeholderData fix as useMedusaProducts below — keep the loading
  // skeleton up until the real (full) fetch resolves.
  return { ...query, isLoading: query.isLoading || query.isPlaceholderData }
}

export function useMedusaProduct(handle: string) {
  return useQuery({
    queryKey: ['product', handle],
    queryFn: () => getProduct(handle),
    enabled: !!handle,
    retry: 2,
  })
}

// Real homepage testimonial reviews (was a hardcoded fake array in
// components/website/ReviewsSlider.tsx — now backed by Medusa store
// metadata via app/api/store/reviews).
export function useSiteReviews() {
  return useQuery({
    queryKey: ['site-reviews'],
    queryFn: getSiteReviews,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: [],
  })
}

// Real brand list + product/rating stats — was hardcoded ("11+ Premium
// Brands", "500+ Products", "4.9★ Avg Rating") in BrandsBar/Hero. Now
// aggregated live from the Medusa catalog via app/api/store/brands.
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
      bySport: {},
    },
  })
}

// Aliases
export const useStoreProducts = useMedusaProducts
export const useStoreProduct = useMedusaProduct
