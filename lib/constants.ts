// ─── Site Info ──────────────────────────────────────────────────
export const SITE_NAME = 'Smash Racket Pro'
export const SITE_DESCRIPTION =
  'Premium sports equipment for every athlete. Shop football, cricket, basketball, tennis gear and more.'
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://smash-pro.netlify.app'
export const SITE_LOGO = '/icons/logo.png'
export const SITE_ICON = '/icons/icon-192.png'
export const SITE_OG_IMAGE = '/icons/og-image.jpg'
export const CONTACT_EMAIL = 'Sales@smashuk.co'
export const CONTACT_PHONE = '0161 536 3594'

// Short brand wordmark used on the POS receipt header — deliberately
// separate from SITE_NAME ('Smash Racket Pro'), which is the fuller
// site/legal name used everywhere else (page titles, SEO, emails).
export const STORE_DISPLAY_NAME = 'SMASH'
export const STORE_ADDRESS_LINE1 = '112A Hulme High Street'
export const STORE_ADDRESS_LINE2 = 'Manchester, England M15 5JP'

// Handle of the gift card product created in Medusa Admin (variants are
// the denominations: £10/£25/£50/etc). Gift cards are digital/emailed —
// they should never trigger a shipping charge or count toward the
// free-shipping threshold's "physical goods" logic. Used by cartStore's
// computeTotals to exclude gift card line items from the shipping calc.
export const GIFT_CARD_PRODUCT_HANDLE = 'gift-card-product'

// ─── POS Staff ──────────────────────────────────────────────────
export const POS_STAFF = [
  {
    id: '1',
    initials: 'RK',
    name: 'Ramesh Kumar',
    role: 'Cashier',
    shift: 'Morning shift',
    pin: '123456',
  },
  {
    id: '2',
    initials: 'AK',
    name: 'Amit Kumar',
    role: 'Owner',
    shift: 'Full access',
    pin: '999999',
  },
  {
    id: '3',
    initials: 'SP',
    name: 'Suresh Patel',
    role: 'Cashier',
    shift: 'Evening shift',
    pin: '567890',
  },
] as const

export const SPORTS = [
  { label: 'Badminton', slug: 'badminton', icon: '🏸' },
  { label: 'Tennis', slug: 'tennis', icon: '🎾' },
  { label: 'Padel', slug: 'padel', icon: '🎾' },
  { label: 'Squash', slug: 'squash', icon: '🏸' },
  { label: 'Clothing', slug: 'clothing', icon: '👕' },
] as const

export type SportSlug = (typeof SPORTS)[number]['slug']

// ─── Order Statuses ─────────────────────────────────────────────
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
] as const

// ─── Payment Methods ────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'wallet', label: 'Wallet' },
] as const

// ─── Pagination ─────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ─── Shipping ───────────────────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 80 // £80 free shipping
export const STANDARD_SHIPPING_COST = 4.99
export const EXPRESS_SHIPPING_COST = 9.99

// ─── Tax ────────────────────────────────────────────────────────
export const VAT_RATE = 0.2 // 20% UK VAT

// ─── Currency ───────────────────────────────────────────────────
export const CURRENCY = 'GBP'
export const CURRENCY_SYMBOL = '£'

// ─── Theme Colors ───────────────────────────────────────────────
export const COLORS = {
  background: '#F6F6F7',
  sidebar: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E1E3E5',
  textPrimary: '#202223',
  textSecondary: '#6D7175',
  textMuted: '#8C9196',
  accent: '#008060',
  warning: '#FFC453',
  error: '#D82C0D',
  info: '#2C6ECB',
} as const

// ─── Dashboard Nav ──────────────────────────────────────────────
export const DASHBOARD_NAV = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: '⊞',
  },
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: '📦',
    children: [
      { label: 'All Orders', href: '/dashboard/orders' },
      { label: 'Drafts', href: '/dashboard/orders?status=draft' },
      { label: 'Abandoned', href: '/dashboard/orders?status=abandoned' },
    ],
  },
  {
    label: 'Products',
    icon: '🏷️',
    children: [
      { label: 'All Products', href: '/dashboard/products' },
      { label: 'Add Product', href: '/dashboard/products/new' },
      { label: 'Categories', href: '/dashboard/categories' },
      { label: 'Inventory', href: '/dashboard/inventory' },
    ],
  },
  {
    label: 'Customers',
    icon: '👥',
    children: [
      { label: 'All Customers', href: '/dashboard/customers' },
      { label: 'Segments', href: '/dashboard/customers?view=segments' },
    ],
  },
  {
    label: 'Analytics',
    icon: '📊',
    children: [
      { label: 'Sales', href: '/dashboard/sales' },
      { label: 'Reports', href: '/dashboard/sales?view=reports' },
      { label: 'Live View', href: '/dashboard/sales?view=live' },
    ],
  },
  {
    label: 'Discounts',
    icon: '🎟️',
    children: [
      { label: 'All Discounts', href: '/dashboard/discounts' },
      { label: 'Add Discount', href: '/dashboard/discounts/add' },
    ],
  },
  {
    label: 'SEO',
    href: '/dashboard/seo',
    icon: '🔍',
  },
  {
    label: 'Settings',
    icon: '⚙️',
    children: [
      { label: 'General', href: '/dashboard/settings' },
      { label: 'Billing', href: '/dashboard/settings/billing' },
      { label: 'Shipping', href: '/dashboard/settings/shipping' },
      { label: 'Notifications', href: '/dashboard/settings/notifications' },
    ],
  },
] as const

// ─── SEO Defaults ───────────────────────────────────────────────
export const DEFAULT_SEO = {
  title: `${SITE_NAME} — Premium Sports Equipment`,
  description: SITE_DESCRIPTION,
  keywords: [
    'sports equipment',
    'football gear',
    'cricket bat',
    'basketball',
    'tennis racket',
    'running shoes',
    'sports shop uk',
    'racket sports store uk',
    'smash racket pro',
  ],
  ogImage: SITE_OG_IMAGE,
}
