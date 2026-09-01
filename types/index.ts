export type UserRole = 'admin' | 'staff' | 'customer'
export const DASHBOARD_ROLES: UserRole[] = ['admin']
export const WEBSITE_ROLES: UserRole[] = ['customer']
export const POS_ROLES: UserRole[] = ['admin', 'staff']
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  createdAt: string
}
export interface CustomerAddress {
  id: string
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
  is_default_shipping?: boolean
}
export interface AuthCookiePayload {
  userId: string
  name: string
  role: UserRole
  isAuthenticated: boolean
  source: 'dashboard' | 'website' | 'pos'
  sessionId?: string
}
export interface CartDisplayItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
  sku: string
  stock: number
  category: string
  variantTitle?: string
  originalPrice?: number
  discount?: number
}
export interface MedusaProduct {
  id: string
  title: string
  handle?: string
  thumbnail?: string
  status: string
  description?: string
  images?: {
    url: string
  }[]
  variants?: ProductVariant[]
  categories?: {
    id: string
    name: string
    handle?: string
  }[]
  tags?: {
    value: string
  }[]
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
  options?: ProductOption[]
}
export interface ProductOption {
  id: string
  title: string
  values?: {
    value: string
  }[]
}
export interface ProductVariant {
  id: string
  sku?: string
  title?: string
  prices?: {
    amount: number
    currency_code: string
  }[]
  calculated_price?: {
    calculated_amount: number
  }
  inventory_quantity?: number
  options?: {
    option_id?: string
    value: string
  }[]
}
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  sport: string
  category: string
  categoryId: string
  price: number
  originalPrice?: number
  images: string[]
  stock: number
  sku: string
  rating: number
  reviewCount: number
  badge?: string | null
  inStock: boolean
  tags: string[]
  createdAt?: string
  updatedAt?: string
  specs: {
    label: string
    value: string
  }[]
  stringUpgradeAvailable?: boolean
  stringUpgradeType?: 'free' | 'paid'
  variants?: ProductVariant[]
  options?: ProductOption[]
  tierPricing?: {
    minQty: number
    maxQty?: number
    discountPct: number
  }[]
  crossSells?: {
    productId: string
    productTitle: string
    discountPct: number
  }[]
}
export interface CrossSellProduct extends Product {
  crossSellDiscountPct: number
}
export interface SiteReview {
  id: string
  name: string
  sport: string
  city: string
  rating: number
  review: string
  avatar?: string
  published: boolean
  createdAt: string
}
export interface POSCartItem {
  product: Product
  quantity: number
  variant?: ProductVariant
  discount?: number
}
export interface POSSession {
  id: string
  cashierId: string
  cashierName: string
  openedAt: string
  closedAt?: string
  openingCash: number
  closingCash?: number
  totalSales: number
  totalOrders: number
  cashSales: number
}
