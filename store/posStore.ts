import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { POSCartItem, POSSession, Product, ProductVariant } from '@/types'
import { VAT_RATE } from '@/lib/constants'
import {
  fetchCashDrawerState,
  openCashDrawerRemote,
  addCashMovementRemote,
  closeCashDrawerRemote,
} from '@/lib/api/pos-cash-drawer'

// Set by fetchStoreSettings() once Medusa's real tax rate is loaded — until
// then, computePOSTotals falls back to the hardcoded VAT_RATE constant so
// nothing breaks before the fetch resolves.
let liveTaxRate: number | null = null

export type { POSCartItem, POSSession, Product, ProductVariant } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface POSCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  totalOrders: number
  totalSpent: number
  lastOrder?: string
  marketingOptIn: boolean
}

export interface SavedCart {
  id: string
  name: string
  items: POSCartItem[]
  customer: POSCustomer | null
  note: string
  savedAt: string
  total: number
}

export interface CashMovement {
  id: string
  amount: number
  type: 'in' | 'out'
  reason: string
  time: string
}

export interface CashDrawer {
  id: string
  openedAt: string
  closedAt?: string
  openingCash: number
  closingCash?: number
  expectedCash?: number
  variance?: number
  movements: CashMovement[]
  cashier: string
}

export interface ReturnItem {
  productId: string
  name: string
  quantity: number
  price: number
  reason: string
}

export interface CompletedOrder {
  id: string
  medusaOrderId?: string
  items: POSCartItem[]
  customer: POSCustomer | null
  subtotal: number
  discountTotal: number
  tax: number
  total: number
  paymentMethod: string
  note: string
  cashier: string
  completedAt: string
  returned: boolean
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export type StaffRole = 'admin' | 'staff'

export interface POSStaffMember {
  id: string
  name: string
  initials: string
  email?: string
  phone?: string
  role: StaffRole
  pin: string
  shift?: string
  isActive: boolean
  createdAt: string
  totalSales: number
  totalOrders: number
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'login'
  | 'logout'
  | 'pin_change'
  | 'sale'
  | 'void'
  | 'return'

export interface AuditLogEntry {
  id: string
  staffId: string
  staffName: string
  action: AuditAction
  detail?: string
  timestamp: string
  ip?: string
}

// ─── Revenue ──────────────────────────────────────────────────────────────────
export type SalesChannel = 'both' | 'online_only' | 'pos_only'

export interface RevenueEntry {
  source: 'online' | 'pos'
  amount: number
  orderId: string
  cashier?: string
  timestamp: string
}

// ─── Product catalog ──────────────────────────────────────────────────────────
export interface POSCatalogProduct {
  id: string
  name: string
  brand: string
  sku: string
  price: number
  stock: number
  category: string
  image?: string
  description?: string
  channel?: SalesChannel
  posPrice?: number
  variantId?: string
}

// ─── State interface ──────────────────────────────────────────────────────────
interface POSState {
  session: POSSession | null
  isSessionOpen: boolean

  products: POSCatalogProduct[]
  medusaLoading: boolean
  medusaError: string | null
  loadRetries: number // ✅ Track retry attempts

  // Live store settings from Medusa (see fetchStoreSettings) — replaces the
  // hardcoded VAT_RATE/CURRENCY_SYMBOL constants everywhere they're
  // displayed, so Settings page and receipts reflect the real store config.
  taxRatePercent: number
  currencySymbol: string
  currencyCode: string
  storeSettingsLoaded: boolean

  // Terminal preferences (Settings tab) — persisted so they survive a
  // refresh/relogin instead of resetting to defaults every time.
  soundOnScan: boolean
  autoPrintReceipt: boolean
  showStockCount: boolean
  taxInclusivePricing: boolean

  items: POSCartItem[]
  customDiscount: number
  couponCode: string | null
  couponDiscount: number
  // Gift card redeemed against this sale. Unlike customDiscount/coupon
  // (which reduce the taxable subtotal), a gift card is a TENDER — it pays
  // down the already-taxed order total, the same way it works on the
  // website checkout (loyalty plugin credit_lines net the cart total, not
  // the subtotal). Kept separate from `total` for that reason: `total` is
  // still the real value of the sale (what goes in reports/revenue),
  // `amountDue` is what's left for cash/card/split to actually collect.
  giftCardCode: string | null
  giftCardAmount: number
  paymentMethod: string
  customerName: string
  customerPhone: string
  note: string
  customer: POSCustomer | null
  savedCarts: SavedCart[]
  cashDrawer: CashDrawer | null
  // Non-blocking sync status for the cash-drawer <-> Medusa store.metadata
  // backend sync (see lib/api/pos-cash-drawer.ts). Local `cashDrawer` above
  // remains the source of truth for the UI even if a sync call fails —
  // this just lets the UI show a "not synced" hint instead of failing silently.
  cashDrawerSyncError: string | null
  completedOrders: CompletedOrder[]
  orderNote: string
  staffList: POSStaffMember[]
  revenueLog: RevenueEntry[]
  auditLog: AuditLogEntry[]

  // Buy-in-store, ship-to-customer (mirrors the website's pickup-vs-delivery
  // choice, but from the POS side — see FulfillmentModal.tsx)
  fulfillmentType: 'pickup' | 'ship'
  shippingAddress: {
    first_name: string
    last_name: string
    address_1: string
    address_2: string
    city: string
    province: string
    postal_code: string
    country_code: string
    phone: string
  } | null

  subtotal: number
  discountTotal: number
  tax: number
  total: number
  // total minus any redeemed gift card amount — this is what PaymentModal
  // should actually ask the cashier to collect via cash/card/split.
  amountDue: number
  itemCount: number

  // ── Actions ───────────────────────────────────────────────────────────────
  loadMedusaProducts: () => Promise<void>
  syncMedusaProducts: () => Promise<void>
  retryLoadProducts: () => Promise<void> // ✅ Explicit retry action
  fetchStoreSettings: () => Promise<void>
  updateTerminalSetting: (
    key:
      | 'soundOnScan'
      | 'autoPrintReceipt'
      | 'showStockCount'
      | 'taxInclusivePricing',
    value: boolean,
  ) => void

  openSession: (
    cashierId: string,
    cashierName: string,
    openingCash: number,
  ) => void
  closeSession: (closingCash: number) => void

  addItem: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant,
  ) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void
  setItemDiscount: (
    productId: string,
    discount: number,
    variantId?: string,
  ) => void
  setCustomDiscount: (discount: number) => void
  applyCoupon: (code: string, discount: number) => void
  removeCoupon: () => void
  // `cardBalance` is the gift card's real remaining value from Medusa — the
  // amount actually redeemed is capped at whatever's left owing on the sale
  // (never redeem more than the total, and never more than the card has).
  applyGiftCard: (code: string, cardBalance: number) => void
  removeGiftCard: () => void
  setPaymentMethod: (method: string) => void
  setCustomer: (name: string, phone: string) => void
  setNote: (note: string) => void
  clearCart: () => void
  attachCustomer: (customer: POSCustomer) => void
  detachCustomer: () => void
  setOrderNote: (note: string) => void
  clearOrderNote: () => void
  setFulfillmentType: (type: 'pickup' | 'ship') => void
  setShippingAddress: (addr: POSState['shippingAddress']) => void
  saveCart: (name: string) => void
  loadCart: (id: string) => void
  deleteSavedCart: (id: string) => void

  openCashDrawer: (openingCash: number, cashier: string) => void
  closeCashDrawer: (closingCash: number) => void
  addCashMovement: (amount: number, type: 'in' | 'out', reason: string) => void
  // Pulls the current till state from Medusa (store.metadata) — used on
  // POS terminal mount so a fresh device/browser (or one that had its
  // localStorage cleared) can recover an already-open session instead of
  // silently starting from "no drawer open" while a real till is running
  // on another terminal.
  syncCashDrawerFromServer: () => Promise<void>

  completeOrder: (
    orderId: string,
    cashier: string,
    medusaOrderId?: string,
  ) => void
  processReturn: (orderId: string, returnItems: ReturnItem[]) => void
  voidSale: () => void
  applyFixedDiscount: (amount: number) => void
  applyPercentageDiscount: (percent: number) => void

  addStaff: (
    staff: Omit<
      POSStaffMember,
      'id' | 'createdAt' | 'totalSales' | 'totalOrders'
    >,
  ) => void
  updateStaff: (id: string, data: Partial<POSStaffMember>) => void
  removeStaff: (id: string) => void
  updateStaffPin: (id: string, pin: string) => void
  incrementStaffSales: (name: string, amount: number) => void

  addRevenueEntry: (entry: Omit<RevenueEntry, 'timestamp'>) => void
  // Adds `amount` to the current session's cash-only running total — call
  // with the ACTUAL cash collected for a sale (full total for cash, 0 for
  // card, just the cash portion for a split). Used by closeCashDrawer's
  // expectedCash calc so card sales never inflate the expected drawer count.
  recordCashSale: (amount: number) => void
  getTotalRevenue: () => number
  getOnlineRevenue: () => number
  getPOSRevenue: () => number
  // Wipes locally-recorded sales history (completedOrders + revenueLog) only.
  // Does NOT touch staff, session, cash drawer, or synced Medusa data — for
  // clearing out old test/demo transactions that skew the Analytics tab
  // (e.g. "Top Selling Products" showing stale prices/names from products
  // that have since been deleted or corrected in Medusa).
  clearSalesHistory: () => void

  deductStock: (items: { productId: string; quantity: number }[]) => void
  restoreStock: (items: { productId: string; quantity: number }[]) => void

  logStaffLogin: (staffId: string, staffName: string) => void
  logStaffLogout: (staffId: string, staffName: string) => void
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void
  clearAuditLog: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computePOSTotals(
  items: POSCartItem[],
  customDiscount: number,
  couponDiscount: number,
  giftCardAmount: number = 0,
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity - (item.discount ?? 0),
    0,
  )
  const discountTotal = customDiscount + couponDiscount
  const taxable = Math.max(0, subtotal - discountTotal)
  const tax = Math.round(taxable * (liveTaxRate ?? VAT_RATE))
  const total = taxable + tax
  // Gift card pays down the total AFTER tax (a tender, not a discount) —
  // never let it go negative, and never redeem more than the sale is worth.
  const cappedGiftCard = Math.max(0, Math.min(giftCardAmount, total))
  const amountDue = total - cappedGiftCard
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    subtotal,
    discountTotal,
    tax,
    total,
    amountDue,
    itemCount,
    giftCardAmount: cappedGiftCard,
  }
}

function makeAuditId() {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      session: null,
      isSessionOpen: false,
      products: [],
      medusaLoading: false,
      medusaError: null,
      taxRatePercent: VAT_RATE * 100,
      currencySymbol: '£',
      currencyCode: 'GBP',
      storeSettingsLoaded: false,
      soundOnScan: true,
      autoPrintReceipt: false,
      showStockCount: true,
      taxInclusivePricing: false,
      loadRetries: 0, // ✅ Initialize retry counter
      items: [],
      customDiscount: 0,
      couponCode: null,
      couponDiscount: 0,
      giftCardCode: null,
      giftCardAmount: 0,
      paymentMethod: 'cash',
      customerName: '',
      customerPhone: '',
      note: '',
      customer: null,
      savedCarts: [],
      cashDrawer: null,
      cashDrawerSyncError: null,
      completedOrders: [],
      orderNote: '',
      fulfillmentType: 'pickup',
      shippingAddress: null,
      revenueLog: [],
      auditLog: [],
      subtotal: 0,
      discountTotal: 0,
      tax: 0,
      total: 0,
      amountDue: 0,
      itemCount: 0,

      staffList: [
        {
          id: '1',
          name: 'Ramesh Kumar',
          initials: 'RK',
          role: 'staff',
          pin: '123456',
          shift: 'Morning',
          isActive: true,
          createdAt: new Date().toISOString(),
          totalSales: 0,
          totalOrders: 0,
        },
        {
          id: '2',
          name: 'Amit Kumar',
          initials: 'AK',
          role: 'admin',
          pin: '999999',
          shift: 'Full day',
          isActive: true,
          createdAt: new Date().toISOString(),
          totalSales: 0,
          totalOrders: 0,
        },
        {
          id: '3',
          name: 'Suresh Patel',
          initials: 'SP',
          role: 'staff',
          pin: '567890',
          shift: 'Evening',
          isActive: true,
          createdAt: new Date().toISOString(),
          totalSales: 0,
          totalOrders: 0,
        },
      ],

      // ── Medusa Products ────────────────────────────────────────────────────
      loadMedusaProducts: async () => {
        if (get().products.length > 0) return
        set({ medusaLoading: true, medusaError: null })
        try {
          const { fetchPOSProducts } = await import('@/lib/api/pos')
          const products = await fetchPOSProducts()
          set({ products, medusaLoading: false, loadRetries: 0 })
          console.log('[POS] Products loaded successfully:', products.length)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to load products'
          console.error('[POS] Medusa products load failed:', message)
          set({
            medusaError: message,
            medusaLoading: false,
            loadRetries: get().loadRetries + 1,
          })
        }
      },

      syncMedusaProducts: async () => {
        set({ medusaLoading: true, medusaError: null })
        try {
          const { fetchPOSProducts } = await import('@/lib/api/pos')
          const products = await fetchPOSProducts()
          set({ products, medusaLoading: false, loadRetries: 0 })
          console.log('[POS] Products synced successfully:', products.length)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to sync products'
          console.error('[POS] Medusa products sync failed:', message)
          set({
            medusaError: message,
            medusaLoading: false,
            loadRetries: get().loadRetries + 1,
          })
        }
      },

      // ✅ New explicit retry action
      retryLoadProducts: async () => {
        const retries = get().loadRetries
        if (retries >= 3) {
          set({
            medusaError:
              'Max retries reached. Check your Medusa server connection.',
          })
          return
        }
        console.log(`[POS] Retry attempt ${retries + 1}/3...`)
        await get().loadMedusaProducts()
      },

      // Loads the real tax rate + currency from Medusa (app/api/admin/
      // store-settings) instead of the hardcoded VAT_RATE=20%/GBP
      // constants. Updates liveTaxRate so every subsequent cart total
      // calculation uses the real rate, and recomputes the current cart's
      // totals immediately so an already-open sale doesn't keep showing
      // stale numbers until the next item is added.
      fetchStoreSettings: async () => {
        try {
          const res = await fetch('/api/admin/store-settings', {
            credentials: 'include',
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          liveTaxRate = data.taxRate
          set({
            taxRatePercent: data.taxRate * 100,
            currencySymbol: data.currencySymbol,
            currencyCode: data.currencyCode,
            storeSettingsLoaded: true,
          })
          // Recompute totals for whatever's currently in the cart with the
          // now-live tax rate.
          const { items, customDiscount, couponDiscount, giftCardAmount } =
            get()
          set(
            computePOSTotals(
              items,
              customDiscount,
              couponDiscount,
              giftCardAmount,
            ),
          )
        } catch (err) {
          console.warn(
            '[POS] fetchStoreSettings failed, keeping defaults:',
            err,
          )
        }
      },

      updateTerminalSetting: (key, value) =>
        set({ [key]: value } as Pick<POSState, typeof key>),

      // ── Audit log ────────────────────────────────────────────────────────
      logStaffLogin: (staffId, staffName) =>
        set((state) => ({
          auditLog: [
            {
              id: makeAuditId(),
              staffId,
              staffName,
              action: 'login',
              detail: `${staffName} logged in to POS`,
              timestamp: new Date().toISOString(),
            },
            ...state.auditLog,
          ],
        })),

      logStaffLogout: (staffId, staffName) =>
        set((state) => ({
          auditLog: [
            {
              id: makeAuditId(),
              staffId,
              staffName,
              action: 'logout',
              detail: `${staffName} logged out of POS`,
              timestamp: new Date().toISOString(),
            },
            ...state.auditLog,
          ],
        })),

      addAuditEntry: (entry) =>
        set((state) => ({
          auditLog: [
            {
              ...entry,
              id: makeAuditId(),
              timestamp: new Date().toISOString(),
            },
            ...state.auditLog,
          ],
        })),

      clearAuditLog: () => set({ auditLog: [] }),

      // ── Session ──────────────────────────────────────────────────────────
      openSession: (cashierId, cashierName, openingCash) =>
        set({
          session: {
            id: `session-${Date.now()}`,
            cashierId,
            cashierName,
            openedAt: new Date().toISOString(),
            openingCash,
            totalSales: 0,
            totalOrders: 0,
            cashSales: 0,
          },
          isSessionOpen: true,
        }),

      closeSession: (closingCash) =>
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                closedAt: new Date().toISOString(),
                closingCash,
              }
            : null,
          isSessionOpen: false,
        })),

      // ── Cart ─────────────────────────────────────────────────────────────
      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              item.variant?.id === variant?.id,
          )
          let newItems: POSCartItem[]
          if (existingIndex >= 0) {
            newItems = state.items.map((item, i) =>
              i === existingIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          } else {
            newItems = [
              ...state.items,
              { product, quantity, variant, discount: 0 },
            ]
          }
          return {
            items: newItems,
            ...computePOSTotals(
              newItems,
              state.customDiscount,
              state.couponDiscount,
              state.giftCardAmount,
            ),
          }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => {
          const newItems = state.items.filter(
            (item) =>
              !(
                item.product.id === productId && item.variant?.id === variantId
              ),
          )
          return {
            items: newItems,
            ...computePOSTotals(
              newItems,
              state.customDiscount,
              state.couponDiscount,
              state.giftCardAmount,
            ),
          }
        })
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set((state) => {
          const newItems = state.items.map((item) =>
            item.product.id === productId && item.variant?.id === variantId
              ? { ...item, quantity }
              : item,
          )
          return {
            items: newItems,
            ...computePOSTotals(
              newItems,
              state.customDiscount,
              state.couponDiscount,
              state.giftCardAmount,
            ),
          }
        })
      },

      setItemDiscount: (productId, discount, variantId) => {
        set((state) => {
          const newItems = state.items.map((item) =>
            item.product.id === productId && item.variant?.id === variantId
              ? { ...item, discount }
              : item,
          )
          return {
            items: newItems,
            ...computePOSTotals(
              newItems,
              state.customDiscount,
              state.couponDiscount,
              state.giftCardAmount,
            ),
          }
        })
      },

      setCustomDiscount: (discount) =>
        set((state) => ({
          customDiscount: discount,
          ...computePOSTotals(
            state.items,
            discount,
            state.couponDiscount,
            state.giftCardAmount,
          ),
        })),

      applyCoupon: (code, discount) =>
        set((state) => ({
          couponCode: code,
          couponDiscount: discount,
          ...computePOSTotals(
            state.items,
            state.customDiscount,
            discount,
            state.giftCardAmount,
          ),
        })),

      removeCoupon: () =>
        set((state) => ({
          couponCode: null,
          couponDiscount: 0,
          ...computePOSTotals(
            state.items,
            state.customDiscount,
            0,
            state.giftCardAmount,
          ),
        })),

      // Redeems a gift card against the sale. `cardBalance` is the real
      // remaining value pulled from Medusa (see validateGiftCard in
      // lib/api/pos.ts) — the amount actually applied is capped to the
      // lesser of the card's balance and the current total inside
      // computePOSTotals, so a cashier can never over-redeem a card or
      // apply more than the sale is worth.
      applyGiftCard: (code, cardBalance) =>
        set((state) => ({
          giftCardCode: code,
          ...computePOSTotals(
            state.items,
            state.customDiscount,
            state.couponDiscount,
            cardBalance,
          ),
        })),

      removeGiftCard: () =>
        set((state) => ({
          giftCardCode: null,
          ...computePOSTotals(
            state.items,
            state.customDiscount,
            state.couponDiscount,
            0,
          ),
        })),

      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setCustomer: (name, phone) =>
        set({ customerName: name, customerPhone: phone }),
      setNote: (note) => set({ note }),

      clearCart: () =>
        set((state) => ({
          items: [],
          customDiscount: 0,
          couponCode: null,
          couponDiscount: 0,
          giftCardCode: null,
          customerName: '',
          customerPhone: '',
          note: '',
          orderNote: '',
          fulfillmentType: 'pickup',
          shippingAddress: null,
          customer: null,
          paymentMethod: 'cash',
          ...computePOSTotals([], 0, 0),
          session: state.session
            ? {
                ...state.session,
                totalOrders: state.session.totalOrders + 1,
                totalSales: state.session.totalSales + state.total,
              }
            : null,
        })),

      attachCustomer: (customer) =>
        set({
          customer,
          customerName: customer.name,
          customerPhone: customer.phone ?? '',
        }),

      detachCustomer: () =>
        set({ customer: null, customerName: '', customerPhone: '' }),

      setOrderNote: (note) => set({ orderNote: note }),
      clearOrderNote: () => set({ orderNote: '' }),
      setFulfillmentType: (type) =>
        set({
          fulfillmentType: type,
          // Switching back to pickup clears any half-filled address so a
          // stale address can't accidentally get sent on a pickup order.
          ...(type === 'pickup' ? { shippingAddress: null } : {}),
        }),
      setShippingAddress: (addr) => set({ shippingAddress: addr }),

      applyFixedDiscount: (amount) =>
        set((state) => ({
          customDiscount: amount,
          ...computePOSTotals(
            state.items,
            amount,
            state.couponDiscount,
            state.giftCardAmount,
          ),
        })),

      applyPercentageDiscount: (percent) =>
        set((state) => {
          const subtotal = state.items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0,
          )
          const amount = Math.round((subtotal * percent) / 100)
          return {
            customDiscount: amount,
            ...computePOSTotals(
              state.items,
              amount,
              state.couponDiscount,
              state.giftCardAmount,
            ),
          }
        }),

      saveCart: (name) =>
        set((state) => {
          if (!state.items.length) return state
          const saved: SavedCart = {
            id: `cart-${Date.now()}`,
            name,
            items: [...state.items],
            customer: state.customer,
            note: state.orderNote,
            savedAt: new Date().toISOString(),
            total: state.total,
          }
          return { savedCarts: [...state.savedCarts, saved] }
        }),

      loadCart: (id) =>
        set((state) => {
          const cart = state.savedCarts.find((c) => c.id === id)
          if (!cart) return state
          return {
            items: cart.items,
            customer: cart.customer,
            customerName: cart.customer?.name ?? '',
            customerPhone: cart.customer?.phone ?? '',
            orderNote: cart.note,
            customDiscount: 0,
            couponCode: null,
            couponDiscount: 0,
            giftCardCode: null,
            savedCarts: state.savedCarts.filter((c) => c.id !== id),
            ...computePOSTotals(cart.items, 0, 0),
          }
        }),

      deleteSavedCart: (id) =>
        set((state) => ({
          savedCarts: state.savedCarts.filter((c) => c.id !== id),
        })),

      openCashDrawer: (openingCash, cashier) => {
        set({
          cashDrawer: {
            id: `drawer-${Date.now()}`,
            openedAt: new Date().toISOString(),
            openingCash,
            movements: [],
            cashier,
          },
          cashDrawerSyncError: null,
        })
        // Local state above is what the UI reacts to immediately — this
        // sync call just backs it up to Medusa's store.metadata so other
        // devices/terminals (and a fresh browser after storage is cleared)
        // can see the till is open. Fire-and-forget, same trust model as
        // logStaffActivity: a sync hiccup must never block ringing up sales.
        openCashDrawerRemote(openingCash, cashier).catch((err) => {
          console.error('[posStore] openCashDrawer sync failed:', err)
          set({
            cashDrawerSyncError:
              err instanceof Error
                ? err.message
                : 'Failed to sync till open to server',
          })
        })
      },

      closeCashDrawer: (closingCash) => {
        const state = get()
        if (!state.cashDrawer) return
        const cashIn = state.cashDrawer.movements
          .filter((m) => m.type === 'in')
          .reduce((s, m) => s + m.amount, 0)
        const cashOut = state.cashDrawer.movements
          .filter((m) => m.type === 'out')
          .reduce((s, m) => s + m.amount, 0)
        // BUG FIX: was `state.session?.totalSales` — total revenue across
        // ALL payment methods (cash, card, split), not just cash. Card
        // money never lands in the physical drawer, so any shift with
        // card sales produced a false "shortage" here. `cashSales` is the
        // cash-only running total (see recordCashSale below).
        const expectedCash =
          state.cashDrawer.openingCash +
          (state.session?.cashSales ?? 0) +
          cashIn -
          cashOut
        const roundedExpected = Math.round(expectedCash)
        const variance = Math.round(closingCash - expectedCash)

        set({
          cashDrawer: {
            ...state.cashDrawer,
            closedAt: new Date().toISOString(),
            closingCash,
            expectedCash: roundedExpected,
            variance,
          },
        })
        closeCashDrawerRemote(closingCash, roundedExpected, variance).catch(
          (err) => {
            console.error('[posStore] closeCashDrawer sync failed:', err)
            set({
              cashDrawerSyncError:
                err instanceof Error
                  ? err.message
                  : 'Failed to sync till close to server',
            })
          },
        )
      },

      addCashMovement: (amount, type, reason) => {
        set((state) => {
          if (!state.cashDrawer) return state
          const movement: CashMovement = {
            id: `movement-${Date.now()}`,
            amount,
            type,
            reason,
            time: new Date().toISOString(),
          }
          return {
            cashDrawer: {
              ...state.cashDrawer,
              movements: [...state.cashDrawer.movements, movement],
            },
          }
        })
        addCashMovementRemote(amount, type, reason).catch((err) => {
          console.error('[posStore] addCashMovement sync failed:', err)
          set({
            cashDrawerSyncError:
              err instanceof Error
                ? err.message
                : 'Failed to sync cash movement to server',
          })
        })
      },

      syncCashDrawerFromServer: async () => {
        try {
          const { current } = await fetchCashDrawerState()
          // Don't clobber a session the cashier already has open locally
          // (e.g. mid-shift refresh) — only hydrate when local state has
          // nothing, which is exactly the "fresh device/cleared storage"
          // case this exists for.
          if (current && !get().cashDrawer) {
            set({ cashDrawer: current, cashDrawerSyncError: null })
          }
        } catch (err) {
          console.error('[posStore] syncCashDrawerFromServer failed:', err)
        }
      },

      completeOrder: (orderId, cashier, medusaOrderId) => {
        const state = get()
        get().deductStock(
          state.items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        )
        get().addAuditEntry({
          staffId: cashier,
          staffName: cashier,
          action: 'sale',
          detail: `Sale £${state.total} — Order ${orderId}${medusaOrderId ? ` (Medusa: ${medusaOrderId})` : ''}`,
        })
        set((state) => {
          const order: CompletedOrder = {
            id: orderId,
            medusaOrderId,
            items: [...state.items],
            customer: state.customer,
            subtotal: state.subtotal,
            discountTotal: state.discountTotal,
            tax: state.tax,
            total: state.total,
            paymentMethod: state.paymentMethod,
            note: state.orderNote,
            cashier,
            completedAt: new Date().toISOString(),
            returned: false,
          }
          return { completedOrders: [order, ...state.completedOrders] }
        })
      },

      processReturn: (orderId, returnItems) => {
        set((state) => ({
          completedOrders: state.completedOrders.map((order) =>
            order.id === orderId ? { ...order, returned: true } : order,
          ),
        }))
        get().restoreStock(
          returnItems.map((ri) => ({
            productId: ri.productId,
            quantity: ri.quantity,
          })),
        )
      },

      voidSale: () => {
        get().addAuditEntry({
          staffId: 'system',
          staffName: 'System',
          action: 'void',
          detail: 'Sale voided',
        })
        set({
          items: [],
          customDiscount: 0,
          couponCode: null,
          couponDiscount: 0,
          giftCardCode: null,
          customerName: '',
          customerPhone: '',
          note: '',
          orderNote: '',
          fulfillmentType: 'pickup',
          shippingAddress: null,
          customer: null,
          paymentMethod: 'cash',
          ...computePOSTotals([], 0, 0),
        })
      },

      addStaff: (staff) =>
        set((state) => ({
          staffList: [
            ...state.staffList,
            {
              ...staff,
              id: `staff-${Date.now()}`,
              createdAt: new Date().toISOString(),
              totalSales: 0,
              totalOrders: 0,
              initials:
                staff.initials ||
                staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2),
            },
          ],
        })),

      updateStaff: (id, data) =>
        set((state) => ({
          staffList: state.staffList.map((s) =>
            s.id === id ? { ...s, ...data } : s,
          ),
        })),

      removeStaff: (id) =>
        set((state) => ({
          staffList: state.staffList.filter((s) => s.id !== id),
        })),

      updateStaffPin: (id, pin) => {
        const staff = get().staffList.find((s) => s.id === id)
        if (staff)
          get().addAuditEntry({
            staffId: id,
            staffName: staff.name,
            action: 'pin_change',
            detail: 'PIN updated',
          })
        set((state) => ({
          staffList: state.staffList.map((s) =>
            s.id === id ? { ...s, pin } : s,
          ),
        }))
      },

      incrementStaffSales: (name, amount) =>
        set((state) => ({
          staffList: state.staffList.map((s) =>
            s.name === name
              ? {
                  ...s,
                  totalSales: s.totalSales + amount,
                  totalOrders: s.totalOrders + 1,
                }
              : s,
          ),
        })),

      addRevenueEntry: (entry) =>
        set((state) => {
          const newEntry: RevenueEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
          }
          const updatedStaff = entry.cashier
            ? state.staffList.map((s) =>
                s.name === entry.cashier
                  ? {
                      ...s,
                      totalSales: s.totalSales + entry.amount,
                      totalOrders: s.totalOrders + 1,
                    }
                  : s,
              )
            : state.staffList
          return {
            revenueLog: [newEntry, ...state.revenueLog],
            staffList: updatedStaff,
          }
        }),

      recordCashSale: (amount) =>
        set((state) => ({
          session: state.session
            ? { ...state.session, cashSales: state.session.cashSales + amount }
            : null,
        })),

      getTotalRevenue: () => get().revenueLog.reduce((s, e) => s + e.amount, 0),
      getOnlineRevenue: () =>
        get()
          .revenueLog.filter((e) => e.source === 'online')
          .reduce((s, e) => s + e.amount, 0),
      getPOSRevenue: () =>
        get()
          .revenueLog.filter((e) => e.source === 'pos')
          .reduce((s, e) => s + e.amount, 0),

      clearSalesHistory: () =>
        set({
          completedOrders: [],
          revenueLog: [],
        }),

      deductStock: (items) =>
        set((state) => ({
          products: state.products.map((p) => {
            const found = items.find((i) => i.productId === p.id)
            return found
              ? { ...p, stock: Math.max(0, p.stock - found.quantity) }
              : p
          }),
        })),

      restoreStock: (items) =>
        set((state) => ({
          products: state.products.map((p) => {
            const found = items.find((i) => i.productId === p.id)
            return found ? { ...p, stock: p.stock + found.quantity } : p
          }),
        })),
    }),
    {
      name: 'smashpro-pos-store',
      partialize: (state) => ({
        staffList: state.staffList,
        completedOrders: state.completedOrders,
        revenueLog: state.revenueLog,
        auditLog: state.auditLog,
        savedCarts: state.savedCarts,
        cashDrawer: state.cashDrawer,
        products: state.products,
        soundOnScan: state.soundOnScan,
        autoPrintReceipt: state.autoPrintReceipt,
        showStockCount: state.showStockCount,
        taxInclusivePricing: state.taxInclusivePricing,
      }),
    },
  ),
)
