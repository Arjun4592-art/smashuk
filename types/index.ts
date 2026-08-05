// ─── Auth Roles ────────────────────────────────────────────────────────────────
// Dashboard access : admin
// Website access   : customer (+ public)
// POS access       : admin, staff

export type UserRole = 'admin' | 'staff' | 'customer'

export const DASHBOARD_ROLES: UserRole[] = ['admin']
export const WEBSITE_ROLES: UserRole[] = ['customer']
export const POS_ROLES: UserRole[] = ['admin', 'staff']

// ─── User & Auth ───────────────────────────────────────────────────────────────
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

// Cookie payload — stored in a different cookie depending on the source:
// 'smashuk-auth'   → website
// 'pos-auth'       → pos
// 'dashboard-auth' → dashboard
export interface AuthCookiePayload {
  userId: string
  name: string
  role: UserRole
  isAuthenticated: boolean
  source: 'dashboard' | 'website' | 'pos'
  // Only set for 'pos' — a random id minted at login and mirrored into
  // that staff member's Medusa metadata.activeSessionId. Lets us detect
  // "this same PIN was used to log in somewhere else" (see
  // lib/api/pos-session.ts) so only the most recent device stays logged in.
  sessionId?: string
}

// ─── Shared Cart ───────────────────────────────────────────────────────────────
export interface CartDisplayItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
  sku: string
  stock: number
  category: string
}

// ─── Raw Medusa product (as it comes from the Medusa API) ──────────────────────
export interface MedusaProduct {
  id: string
  title: string
  handle?: string
  thumbnail?: string
  status: string
  description?: string
  images?: { url: string }[]
  variants?: ProductVariant[]
  categories?: { id: string; name: string; handle?: string }[]
  tags?: { value: string }[]
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface ProductVariant {
  id: string
  sku?: string
  title?: string
  prices?: { amount: number; currency_code: string }[]
  calculated_price?: { calculated_amount: number }
  inventory_quantity?: number
}

// ─── Normalized product (what the website/POS UI actually renders) ─────────────
// Produced from a MedusaProduct via normalizeProduct() in lib/api/store.ts
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  sport: string
  // Medusa category *handle* (e.g. "badminton-rackets") — used by the shop
  // page's `?category=` filter. `categoryId` below is the raw Medusa id,
  // kept separately since some call sites need the id, not the handle.
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
  specs: { label: string; value: string }[]
  // "String Upgrade (+1 Day)" — a required Yes/No choice shown on racket
  // products only (not every product has it, matches smashuk.co)
  stringUpgradeAvailable?: boolean
  // Raw Medusa variants — kept around so add-to-cart can pick a variant id/price
  variants?: ProductVariant[]
}

// ─── Site Reviews (homepage testimonial slider) ─────────────────────────────
// Real, persisted reviews — stored in Medusa's `store.metadata.reviews`
// (see app/api/admin/reviews and app/api/store/reviews). Managed from the
// dashboard's Reviews page; only `published: true` reviews are shown on the
// public website slider.
export interface SiteReview {
  id: string
  name: string
  sport: string
  city: string
  rating: number // 1-5
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
  // BUG FIX: cash-drawer reconciliation used to compare the counted cash
  // against `openingCash + totalSales + cashIn - cashOut` — but `totalSales`
  // is revenue across ALL payment methods (cash, card, split). Card money
  // never physically enters the drawer, so any shift with card sales showed
  // a false "shortage" equal to the card total. `cashSales` tracks only the
  // cash actually collected (full amount for a cash sale, the cash portion
  // of a split sale, 0 for a pure card sale) — see recordCashSale() below
  // and closeCashDrawer(), which now uses this instead of totalSales.
  cashSales: number
}
