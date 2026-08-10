import { useQuery } from '@tanstack/react-query'
import { getProducts, getProduct, getSiteReviews, getBrandStats } from '@/lib/api/store'

export function useMedusaProducts(params?: {
  limit?: number
  offset?: number
  q?: string
  category_id?: string[]
}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    staleTime: 60 * 1000,
    retry: 2,
    // Empty result on error — UI gracefully shows "no products"
    placeholderData: { products: [], count: 0 },
  })
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
    placeholderData: { brands: [], brandCount: 0, productCount: 0, avgRating: null, bySport: {} },
  })
}

// Aliases
export const useStoreProducts = useMedusaProducts
export const useStoreProduct = useMedusaProduct
