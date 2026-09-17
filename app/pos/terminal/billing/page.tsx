'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { usePOSStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'
import {
  fetchPOSIndex,
  fetchPOSDetailsForVariants,
  type POSIndexEntry,
  type POSDetailEntry,
} from '@/lib/api/pos'
import ProductSearch from '@/components/pos/ProductSearch'
import CategoryFilter from '@/components/pos/CategoryFilter'
import ProductGrid, { POSProduct } from '@/components/pos/ProductGrid'
import VariantPickerModal from '@/components/pos/VariantPickerModal'
import { sortSizeValues } from '@/lib/pos-size-sort'
import BillingCart from '@/components/pos/BillingCart'
import PaymentModal, {
  type PaymentResult,
  type SplitPayment,
} from '@/components/pos/PaymentModal'
import Receipt from '@/components/pos/Receipt'
import CustomerSearch from '@/components/pos/CustomerSearch'
import DiscountModal from '@/components/pos/DiscountModal'
import GiftCardModal from '@/components/pos/GiftCardModal'
import CameraBarcodeScanner from '@/components/pos/CameraBarcodeScanner'
import NoteModal from '@/components/pos/NoteModal'
import FulfillmentModal from '@/components/pos/FulfillmentModal'
import VoidModal from '@/components/pos/VoidModal'
import SavedCarts from '@/components/pos/SavedCarts'
import ReturnModal from '@/components/pos/ReturnModal'
import EmailReceiptModal from '@/components/pos/EmailReceiptModal'
import {
  generateOrderNumber,
  playScanBeep,
  waitForPrintImages,
} from '@/lib/utils'
import type { CartDisplayItem } from '@/types'
import { toast } from 'sonner'
import {
  printReceipt,
  NoPrinterConnectedError,
} from '@/lib/printer/print-receipt'
import { usePrinterStore } from '@/store/printerStore'
import {
  CURRENCY_SYMBOL,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  CONTACT_PHONE,
  VAT_RATE,
  SITE_LOGO,
  SITE_URL,
} from '@/lib/constants'
const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}
function cashRounding(total: number) {
  return Math.ceil(total) - total
}
type Screen = 'terminal' | 'receipt'
export default function BillingPage() {
  const [screen, setScreen] = useState<Screen>('terminal')
  const [orderId, setOrderId] = useState('')
  const [medusaOrderId, setMedusaOrderId] = useState<string | undefined>(
    undefined,
  )
  const [trackingToken, setTrackingToken] = useState<string | undefined>(
    undefined,
  )
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [size, setSize] = useState('All sizes')
  const [sizeTitle, setSizeTitle] = useState<string | null>(null)
  const [sizeGroup, setSizeGroup] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showEmailReceipt, setShowEmailReceipt] = useState(false)
  const [splitPayments, setSplitPayments] = useState<SplitPayment[] | null>(
    null,
  )
  const [showPayment, setShowPayment] = useState(false)
  const [showCustomer, setShowCustomer] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showGiftCard, setShowGiftCard] = useState(false)
  const [showCameraScan, setShowCameraScan] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showFulfillment, setShowFulfillment] = useState(false)
  const [showVoid, setShowVoid] = useState(false)
  const [showSavedCarts, setShowSavedCarts] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [returnOrders, setReturnOrders] = useState<
    import('@/lib/api/pos').PosOrderRecord[]
  >([])
  const [pendingCharge, setPendingCharge] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const {
    items,
    subtotal,
    discountTotal,
    shippingCost,
    tax,
    total,
    customDiscount,
    couponCode,
    giftCardCode,
    giftCardAmount,
    amountDue,
    paymentMethod,
    customer,
    orderNote,
    fulfillmentType,
    shippingAddress,
    // Kept in the store and still loaded in the background (see the
    // effect below) for other POS surfaces (returns, saved carts,
    // analytics) that still read the full catalogue — just no longer used
    // for this screen's own rendering, which is index/details-driven now.
    products,
    soundOnScan,
    autoPrintReceipt,
    addItem,
    removeItem,
    updateQuantity,
    setPaymentMethod,
    clearCart,
    voidSale,
    completeOrder,
    addRevenueEntry,
    loadMedusaProducts,
  } = usePOSStore()
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])
  const authUser = useAuthStore((s) => s.user)
  const user = authUser
    ? {
        name: authUser.name,
      }
    : null
  useEffect(() => {
    // Still triggered here (not removed) because other POS surfaces
    // (returns, saved carts, analytics) read the full catalogue from this
    // store and expect billing to have kicked off the load, same as
    // before. This screen itself no longer waits on it or reads from it —
    // see the index/details state below.
    //
    // Delayed a few seconds rather than fired immediately: a DevTools
    // capture showed this full-catalogue request (still heavy — it's the
    // deep inventory join across ~1700 products, not something touched
    // today) competing for the same connection as the index/details calls
    // that actually matter for this screen appearing quickly. Firing it
    // after the critical path has had a moment to complete means it no
    // longer competes with what the cashier is actually waiting on.
    const timer = setTimeout(() => {
      loadMedusaProducts()
    }, 3000)
    return () => clearTimeout(timer)
  }, [loadMedusaProducts])
  // ── Search-index architecture ──────────────────────────────────────────
  // Replaces reading the full ~1700-product `products` array (from
  // usePOSStore, above) for search/scan/category/size filtering on this
  // screen. See app/api/pos/index/route.ts for the full reasoning — short
  // version: that full-catalogue load is what made this screen take 30+
  // seconds, and Medusa's own admin search (q=) doesn't cover variant SKU
  // (a confirmed, open Medusa limitation), so a naive "just search Medusa
  // directly" rebuild would have silently broken barcode scanning. Instead:
  //   1. `indexEntries` — name/sku/category/size only, no price or stock,
  //      loaded once, small enough to be fast and to filter instantly.
  //   2. Whatever the current search/category/size narrows `indexEntries`
  //      down to, `detailsByVariantId` fetches REAL price + live stock for
  //      just that narrow set — never the whole catalogue.
  const [indexEntries, setIndexEntries] = useState<POSIndexEntry[]>([])
  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [detailsByVariantId, setDetailsByVariantId] = useState<
    Map<string, POSDetailEntry>
  >(new Map())
  // Set whenever EITHER the index or a details fetch had to fall back to
  // the local offline cache — i.e. the shop's connection to the server
  // itself is down, not just Medusa being slow. This must stay visible
  // and explicit: prices/stock shown while this is true may be minutes
  // old, and staff need to know that, not just see numbers that look
  // normal. Cleared the next time either fetch succeeds live.
  const [offlineSince, setOfflineSince] = useState<number | null>(null)
  // Guards against a real bug a DevTools capture caught: this effect fired
  // /api/pos/index TWICE on one page load (React StrictMode double-invoking
  // effects in dev is the usual cause — same class of bug already fixed in
  // store/posStore.ts's loadMedusaProducts). A `useState` guard isn't
  // reliable here because both near-simultaneous calls can read the old
  // state before either has set it; a ref is checked and set synchronously,
  // so the second call sees the first one already in flight.
  const indexLoadInFlight = useRef(false)
  const loadIndex = useCallback(async () => {
    if (indexLoadInFlight.current) return
    indexLoadInFlight.current = true
    setIndexLoading(true)
    setIndexError(null)
    try {
      const { entries, fromCache, cachedAt } = await fetchPOSIndex()
      setIndexEntries(entries)
      setOfflineSince(fromCache ? (cachedAt ?? Date.now()) : null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load products'
      console.error('[POS] Index load failed:', message)
      setIndexError(message)
    } finally {
      setIndexLoading(false)
      indexLoadInFlight.current = false
    }
  }, [])
  useEffect(() => {
    loadIndex()
  }, [loadIndex])
  // All of this now runs over `indexEntries` (name/sku/category/size only)
  // instead of the full `products` catalogue — same exact matching logic as
  // before, just against a far smaller, instantly-available object.
  const CATEGORIES = Array.from(
    new Set(
      indexEntries
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c) && c !== 'Uncategorized'),
    ),
  ).sort((a, b) => a.localeCompare(b))
  const productsInCat = indexEntries.filter(
    (p) => cat === 'All' || p.category === cat,
  )
  const SIZE_TITLES = Array.from(
    new Set(
      productsInCat
        .map((p) => p.sizeOptionTitle)
        .filter((t): t is string => Boolean(t)),
    ),
  ).sort((a, b) => a.localeCompare(b))
  const sizeValuesForTitle = (title: string) =>
    sortSizeValues(
      Array.from(
        new Set(
          productsInCat
            .filter((p) => p.sizeOptionTitle === title)
            .map((p) => p.size)
            .filter((s): s is string => Boolean(s)),
        ),
      ),
    )
  useEffect(() => {
    if (sizeGroup && !SIZE_TITLES.includes(sizeGroup)) {
      setSizeGroup(null)
    }
  }, [SIZE_TITLES.join(','), sizeGroup])
  // Cap the default ("All", no search) view — fetching live price+stock for
  // literally the whole catalogue on an unfiltered screen would defeat the
  // entire point of this rework. Typing a search or picking a category
  // narrows well below this in practice; this cap only bites on the
  // deliberately-broad default view.
  const MAX_VISIBLE = 60
  const matchedIndexEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return indexEntries.filter((p) => {
      const matchCat = cat === 'All' || p.category === cat
      const matchSize =
        size === 'All sizes' ||
        (p.size === size && p.sizeOptionTitle === sizeTitle)
      const matchSearch =
        !q ||
        (p.name ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      return matchCat && matchSize && matchSearch
    })
  }, [indexEntries, cat, size, sizeTitle, search])
  const visibleIndexEntries = matchedIndexEntries.slice(0, MAX_VISIBLE)
  const hiddenCount = matchedIndexEntries.length - visibleIndexEntries.length
  // Debounced: fetch live price+stock only for what's actually about to be
  // shown, and only after typing settles for a moment, so scanning through
  // a search string doesn't fire a request per keystroke.
  useEffect(() => {
    const productIds = Array.from(
      new Set(visibleIndexEntries.map((e) => e.productId)),
    )
    const variantIds = visibleIndexEntries.map((e) => e.variantId)
    if (productIds.length === 0) return
    const timer = setTimeout(() => {
      fetchPOSDetailsForVariants(productIds, variantIds)
        .then(({ byVariantId, fromCache, cachedAt }) => {
          setDetailsByVariantId((prev) => {
            const merged = new Map(prev)
            for (const [k, v] of byVariantId) merged.set(k, v)
            return merged
          })
          if (fromCache) setOfflineSince(cachedAt ?? Date.now())
          else setOfflineSince(null)
        })
        .catch((err) => {
          console.error('[POS] Details fetch failed:', err)
        })
    }, 250)
    return () => clearTimeout(timer)
  }, [visibleIndexEntries.map((e) => e.productId).join(',')])
  const detailsLoading =
    visibleIndexEntries.length > 0 &&
    visibleIndexEntries.some((e) => !detailsByVariantId.has(e.variantId))
  const STOCK_PENDING_PLACEHOLDER = 9999
  function toPOSProduct(entry: POSIndexEntry): POSProduct {
    const detail = detailsByVariantId.get(entry.variantId)
    return {
      id: entry.productId,
      name: entry.name,
      brand: entry.brand,
      sku: entry.sku,
      price: detail?.price ?? 0,
      // Optimistic placeholder until the real count lands — same reasoning
      // as the /api/pos/products fast/stock split: POS already lets staff
      // sell an item Medusa shows as out of stock, so a brief "looks
      // available" beats a brief, wrong "out of stock".
      stock: detail?.stock ?? STOCK_PENDING_PLACEHOLDER,
      category: entry.category,
      image: detail?.image,
      channel: detail?.channel ?? 'both',
      variantId: entry.variantId,
      size: entry.size,
      sizeOptionTitle: entry.sizeOptionTitle,
      pricePending: !detail,
    }
  }
  const filtered = useMemo(
    () => visibleIndexEntries.map(toPOSProduct),
    [visibleIndexEntries, detailsByVariantId],
  )
  // The size filter chips above already let staff narrow to one exact
  // variant when they know it, but with no size picked `filtered` still
  // has one row per variant — a shoe in 6 sizes showed as 6 identical
  // tiles. Collapse that down to one tile per product id; the tile shows
  // whichever variant is picked as "representative" (first in-stock one)
  // and clicking it opens a size picker instead of adding directly,
  // unless the product only has the one variant to begin with.
  const productGroups = useMemo(() => {
    const byId = new Map<string, POSProduct[]>()
    for (const p of filtered) {
      const list = byId.get(p.id)
      if (list) list.push(p)
      else byId.set(p.id, [p])
    }
    return byId
  }, [filtered])
  const gridProducts = useMemo(() => {
    return Array.from(productGroups.values()).map((group) => {
      const representative = group.find((v) => v.stock > 0) ?? group[0]
      return group.length > 1
        ? {
            ...representative,
            size: undefined,
            variantCountOverride: group.length,
          }
        : representative
    })
  }, [productGroups])
  const [variantPickerFor, setVariantPickerFor] = useState<POSProduct[] | null>(
    null,
  )
  const [scanLookupPending, setScanLookupPending] = useState(false)
  const handleScanSubmit = async (raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q) return
    // Matching runs over indexEntries (name/sku/category/size only) —
    // identical logic to before, just against the small index instead of
    // the full catalogue. This is also why scanning stays reliable: it
    // never depends on Medusa's own admin search, which doesn't cover SKU
    // (see app/api/pos/index/route.ts).
    const bySku =
      indexEntries.find((p) => p.sku.toLowerCase() === q) ??
      indexEntries.find((p) => p.sku.toLowerCase().includes(q))
    const byExactName = indexEntries.find((p) => p.name.toLowerCase() === q)
    const partialMatches = indexEntries.filter(
      (p) =>
        (p.name ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q),
    )
    const match =
      bySku ??
      byExactName ??
      (partialMatches.length === 1 ? partialMatches[0] : undefined)
    if (!match) {
      if (partialMatches.length > 1) {
        return
      }
      toast.error('Product not found', {
        description: `No product matches "${raw}" — check the SKU or add it in Products.`,
      })
      return
    }
    // A scan is about to be sold — it needs REAL price and stock, not the
    // index (which carries neither) and not a placeholder. This is a small,
    // single-product Medusa call, not the full catalogue, so it's fast even
    // though it's a genuine network round trip.
    setScanLookupPending(true)
    try {
      const { byVariantId, fromCache, cachedAt } =
        await fetchPOSDetailsForVariants([match.productId], [match.variantId])
      const detail = byVariantId.get(match.variantId)
      if (!detail) {
        toast.error(`Could not confirm price for ${match.name}`, {
          description: fromCache
            ? "Offline, and this item isn't in the local cache yet — try again once reconnected."
            : 'Not added — try scanning again.',
        })
        return
      }
      setDetailsByVariantId((prev) =>
        new Map(prev).set(match.variantId, detail),
      )
      if (fromCache) setOfflineSince(cachedAt ?? Date.now())
      const posProduct: POSProduct = {
        id: match.productId,
        name: match.name,
        brand: match.brand,
        sku: match.sku,
        price: detail.price,
        stock: detail.stock,
        category: match.category,
        image: detail.image,
        channel: detail.channel,
        variantId: match.variantId,
        size: match.size,
        sizeOptionTitle: match.sizeOptionTitle,
      }
      handleAdd(posProduct)
      setSearch('')
      // A scan while offline is the one moment this needs to be louder than
      // the background banner — this specific item is about to be sold at
      // a price that could be minutes old.
      if (fromCache) {
        toast(`${match.name} added at last-known price — you're offline`, {
          duration: 3000,
        })
      } else if (detail.stock <= 0) {
        toast(`${match.name} added — out of stock, selling anyway`, {
          duration: 1800,
        })
      } else {
        toast.success(`${match.name} added`, {
          duration: 1200,
        })
      }
    } catch (err) {
      console.error('[POS] Scan detail lookup failed:', err)
      toast.error(`Could not add ${match.name}`, {
        description: 'Network error confirming price — try again.',
      })
    } finally {
      setScanLookupPending(false)
    }
  }
  const handleAdd = useCallback(
    (p: POSProduct) => {
      if (!p.variantId) {
        toast.error(`${p.name} is missing a Medusa variant`, {
          description:
            'This item cannot be sold until it is re-synced from Products.',
        })
        return
      }
      addItem(
        {
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          stock: p.stock,
          sku: p.sku,
          category: p.category,
          images: [],
          slug: p.id,
          description: '',
          isActive: true,
          isOutOfStock: p.stock === 0,
          lowStockThreshold: 3,
          tags: [],
          variantId: p.variantId,
        } as any,
        1,
        {
          id: p.variantId,
          title: p.size,
        } as any,
      )
      if (soundOnScan) playScanBeep()
    },
    [addItem, soundOnScan],
  )
  const cartDisplayItems: CartDisplayItem[] = items.map((i) => ({
    id: i.product.id,
    lineId: `${i.product.id}::${i.variant?.id ?? ''}`,
    name: i.product.name,
    brand: i.product.brand ?? '',
    price: i.product.price,
    quantity: i.quantity,
    sku: i.product.sku ?? '',
    stock: i.product.stock ?? 0,
    category: i.product.categoryId ?? '',
    variantTitle: i.variant?.title || undefined,
    originalPrice: i.product.originalPrice,
    discount: i.discount,
  }))
  // Cart lines are looked up by lineId (product id + variant id combined),
  // not just product id — the same shoe can be in the cart multiple times
  // as different sizes, and matching on product id alone would always hit
  // the first matching line regardless of which size's +/- was tapped.
  const findByLineId = (lineId: string) =>
    usePOSStore
      .getState()
      .items.find((i) => `${i.product.id}::${i.variant?.id ?? ''}` === lineId)
  const handleIncrease = useCallback(
    (lineId: string) => {
      const item = findByLineId(lineId)
      if (item)
        updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)
    },
    [updateQuantity],
  )
  const handleDecrease = useCallback(
    (lineId: string) => {
      const item = findByLineId(lineId)
      if (item)
        updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)
    },
    [updateQuantity],
  )
  const handleRemove = useCallback(
    (lineId: string) => {
      const item = findByLineId(lineId)
      if (item) removeItem(item.product.id, item.variant?.id)
    },
    [removeItem],
  )
  const handleOpenReturn = async () => {
    try {
      const { fetchPOSOrderHistory } = await import('@/lib/api/pos')
      const history = await fetchPOSOrderHistory()
      setReturnOrders(history)
      setShowReturn(true)
    } catch (err: unknown) {
      toast.error('Could not load order history', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }
  const handleChargeClick = () => {
    setPendingCharge(true)
    setShowCustomer(true)
  }
  const handleConfirmPayment = async (result: PaymentResult) => {
    if (fulfillmentType === 'ship' && !shippingAddress?.address_1) {
      toast.error('Add the shipping address before charging this sale', {
        description: 'Tap the "Ship to them" button above the cart.',
      })
      return
    }
    setPaymentMethod(result.method)
    setSplitPayments(result.splits ?? null)
    const id = `POS-${generateOrderNumber()}`
    const cashierName = user?.name ?? 'Staff'
    let medusaOrderId: string | undefined
    let trackingToken: string | undefined
    if (items.length > 0) {
      try {
        const { createPOSOrder, fetchDefaultRegion } =
          await import('@/lib/api/pos')
        const regionId = await fetchDefaultRegion()
        if (!regionId) {
          throw new Error('No default region configured in Medusa')
        }
        const orderItems = items.map((i) => {
          const variantId = (i.product as any).variantId ?? i.variant?.id
          if (!variantId) {
            throw new Error(
              `"${i.product.name}" has no linked Medusa variant — remove it and re-add from Products.`,
            )
          }
          return {
            variant_id: variantId,
            quantity: i.quantity,
            product_id: (i.product as any).id,
          }
        })
        const orderResult = await createPOSOrder({
          items: orderItems,
          customer_id:
            customer?.id && !customer.id.startsWith('local-')
              ? customer.id
              : undefined,
          customer_email: (customer as any)?.email || shippingAddress?.email,
          customer_name: customer?.name,
          customer_phone: customer?.phone,
          payment_method: result.method,
          note: orderNote,
          cashier: cashierName,
          region_id: regionId,
          fulfillment_type: fulfillmentType,
          shipping_address:
            fulfillmentType === 'ship' && shippingAddress
              ? shippingAddress
              : undefined,
          stripe_payment_intent_id:
            result.stripePaymentIntentId ??
            result.splits?.find((s) => s.stripePaymentIntentId)
              ?.stripePaymentIntentId,
          stripe_payment_amount:
            result.stripePaymentAmount ??
            result.splits?.find((s) => s.stripePaymentIntentId)
              ?.stripePaymentAmount,
          gift_card_code: giftCardCode ?? undefined,
          coupon_code: couponCode ?? undefined,
          manual_discount_amount:
            customDiscount > 0 ? customDiscount : undefined,
        })
        medusaOrderId = orderResult?.order?.id
        trackingToken = orderResult?.trackingToken
      } catch (err: unknown) {
        console.error('[BillingPage] Medusa order create failed:', err)
        toast.error('Sale not synced to Medusa', {
          description:
            (err instanceof Error ? err.message : 'Unknown error') +
            ' — receipt is printing, but please record this sale manually and check stock.',
          duration: 10000,
        })
      }
    }
    completeOrder(id, cashierName, medusaOrderId)
    addRevenueEntry({
      source: 'pos',
      amount: total,
      orderId: id,
      cashier: cashierName,
    })
    const cashCollected =
      result.method === 'cash'
        ? amountDue
        : result.method === 'split'
          ? (result.splits ?? [])
              .filter((s) => s.method === 'cash')
              .reduce((sum, s) => sum + s.amount, 0)
          : 0
    if (cashCollected > 0) {
      usePOSStore.getState().recordCashSale(cashCollected)
    }
    setOrderId(id)
    setMedusaOrderId(medusaOrderId)
    setTrackingToken(trackingToken)
    setShowPayment(false)
    setScreen('receipt')
  }
  const handleNewSale = () => {
    clearCart()
    setScreen('terminal')
    setOrderId('')
    setMedusaOrderId(undefined)
    setTrackingToken(undefined)
    setSplitPayments(null)
  }
  const handlePrintReceipt = useCallback(async () => {
    const { connectionType } = usePrinterStore.getState()
    if (connectionType === 'none') {
      // No hardware printer configured — use the browser's print dialog.
      await waitForPrintImages()
      window.print()
      return
    }
    const now = new Date()
    const rounding = paymentMethod === 'cash' ? cashRounding(total) : 0
    try {
      await printReceipt({
        storeName: STORE_DISPLAY_NAME,
        addressLine1: STORE_ADDRESS_LINE1,
        addressLine2: STORE_ADDRESS_LINE2,
        phone: CONTACT_PHONE,
        orderId,
        dateStr: now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        timeStr: now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashier: user?.name || 'Staff',
        items: cartDisplayItems.map((i) => ({
          name: i.name,
          variantTitle: i.variantTitle,
          quantity: i.quantity,
          lineTotal: i.price * i.quantity - (i.discount ?? 0),
        })),
        subtotal,
        discountAmount: discountTotal,
        discountLabel: couponCode || 'Discount',
        shippingAmount: shippingCost,
        giftCardAmount: giftCardAmount ?? 0,
        giftCardMasked: giftCardCode
          ? `**** **** ${giftCardCode.slice(-4)}`
          : undefined,
        tax,
        vatPct: Math.round(VAT_RATE * 100),
        total,
        rounding,
        payMethodLabel: PAY_LABELS[paymentMethod] || paymentMethod,
        change: paymentMethod === 'cash' ? rounding : 0,
        splitPayments: splitPayments?.map((s) => ({
          label: PAY_LABELS[s.method] || s.method,
          amount: s.amount,
        })),
        shipTo:
          fulfillmentType === 'ship' && shippingAddress?.address_1
            ? {
                name: `${shippingAddress.first_name} ${shippingAddress.last_name}`.trim(),
                address1: shippingAddress.address_1,
                cityPostcode:
                  `${shippingAddress.city} ${shippingAddress.postal_code}`.trim(),
              }
            : null,
        orderNote,
        currencySymbol: CURRENCY_SYMBOL,
        logoUrl: SITE_LOGO,
        trackingUrl: `${SITE_URL}/orders/${encodeURIComponent(orderId)}`,
      })
    } catch (err: unknown) {
      if (err instanceof NoPrinterConnectedError) {
        await waitForPrintImages()
        window.print()
        return
      }
      toast.error('Could not print to receipt printer', {
        description:
          err instanceof Error
            ? err.message
            : 'Unknown error — falling back to browser print.',
      })
      await waitForPrintImages()
      window.print()
    }
  }, [
    orderId,
    user,
    cartDisplayItems,
    subtotal,
    discountTotal,
    couponCode,
    giftCardAmount,
    giftCardCode,
    tax,
    total,
    paymentMethod,
    splitPayments,
    fulfillmentType,
    shippingAddress,
    orderNote,
  ])
  useEffect(() => {
    if (screen === 'receipt' && autoPrintReceipt && orderId) {
      handlePrintReceipt()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, orderId])
  if (screen === 'receipt') {
    return (
      <div
        className='flex-1 min-h-0'
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <Receipt
          orderId={orderId}
          medusaOrderId={medusaOrderId}
          trackingToken={trackingToken}
          items={cartDisplayItems}
          subtotal={subtotal}
          discountAmount={discountTotal}
          shippingAmount={shippingCost}
          gst={tax}
          total={total}
          payMethod={paymentMethod}
          splitPayments={splitPayments}
          cashier={user?.name || 'Staff'}
          couponCode={couponCode}
          giftCardCode={giftCardCode}
          giftCardAmount={giftCardAmount}
          fulfillmentType={fulfillmentType}
          shippingAddress={shippingAddress}
          orderNote={orderNote}
          onNewSale={handleNewSale}
          onPrint={handlePrintReceipt}
          onEmail={() => {
            if (!medusaOrderId) {
              toast.error('Could not email receipt', {
                description:
                  'This sale never synced to Medusa, so there is no order to email. Record it manually.',
              })
              return
            }
            setShowEmailReceipt(true)
          }}
        />
        {showEmailReceipt && (
          <EmailReceiptModal
            onClose={() => setShowEmailReceipt(false)}
            defaultEmail={
              (customer as any)?.email || shippingAddress?.email || ''
            }
            receipt={{
              orderId: medusaOrderId ?? orderId,
              items: cartDisplayItems,
              subtotal,
              discountAmount: discountTotal,
              tax,
              total,
              payMethod: paymentMethod,
              splitPayments,
              cashier: user?.name || 'Staff',
            }}
          />
        )}
      </div>
    )
  }
  const hasItems = items.length > 0
  return (
    <div
      className='flex-1 flex flex-col lg:flex-row overflow-hidden h-full min-h-0'
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {}
      <div className='flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2.5'>
        {offlineSince !== null && (
          <div
            className='flex items-center justify-between px-3 py-2 rounded-lg text-xs'
            style={{
              background: '#FFF8E5',
              border: '1px solid #F5D67A',
              color: '#946200',
            }}
          >
            <span>
              You're offline — showing prices/stock last synced{' '}
              {new Date(offlineSince).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Card payments will not work until reconnected.
            </span>
            <button
              onClick={() => {
                loadIndex()
              }}
              className='font-medium underline ml-2 shrink-0'
            >
              Retry
            </button>
          </div>
        )}

        {indexError && (
          <div
            className='flex items-center justify-between px-3 py-2 rounded-lg text-xs'
            style={{
              background: '#FFF4F4',
              border: '1px solid #FECACA',
              color: '#D82C0D',
            }}
          >
            <span>Products failed to load: {indexError}</span>
            <button
              onClick={() => loadIndex()}
              className='font-medium underline ml-2'
            >
              Retry
            </button>
          </div>
        )}

        {indexLoading && (
          <div
            className='flex items-center gap-2 px-3 py-2 rounded-lg text-xs'
            style={{
              background: '#F2F7F5',
              border: '1px solid #B5E4D8',
              color: '#008060',
            }}
          >
            <div
              className='w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0'
              style={{
                borderColor: '#B5E4D8',
                borderTopColor: '#008060',
              }}
            />
            <span>Loading products...</span>
          </div>
        )}

        <ProductSearch
          value={search}
          onChange={setSearch}
          onSubmit={handleScanSubmit}
          onOpenCamera={() => setShowCameraScan(true)}
        />
        <CategoryFilter
          categories={CATEGORIES}
          selected={cat}
          onChange={(next) => {
            setCat(next)
            setSize('All sizes')
            setSizeTitle(null)
            setSizeGroup(null)
          }}
        />
        {SIZE_TITLES.length > 0 && (
          <div className='flex gap-1.5'>
            {SIZE_TITLES.map((title) => {
              const isSelected = sizeTitle === title && size !== 'All sizes'
              const isOpen = sizeGroup === title
              return (
                <button
                  key={title}
                  onClick={() =>
                    setSizeGroup((g) => (g === title ? null : title))
                  }
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all'
                  style={{
                    background: isOpen || isSelected ? '#008060' : '#FFFFFF',
                    color: isOpen || isSelected ? '#FFFFFF' : '#6D7175',
                    borderColor: isOpen || isSelected ? '#008060' : '#E1E3E5',
                  }}
                >
                  {isSelected ? `${title}: ${size}` : title}
                  {isSelected && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        setSize('All sizes')
                        setSizeTitle(null)
                      }}
                      className='ml-0.5'
                    >
                      ✕
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        {sizeGroup && (
          <CategoryFilter
            categories={sizeValuesForTitle(sizeGroup)}
            selected={sizeTitle === sizeGroup ? size : 'All'}
            onChange={(next) => {
              if (next === 'All') {
                setSize('All sizes')
                setSizeTitle(null)
              } else {
                setSize(next)
                setSizeTitle(sizeGroup)
              }
              setSizeGroup(null)
            }}
          />
        )}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {hiddenCount > 0 && (
            <p className='text-[11px] px-1 pb-1.5' style={{ color: '#8C9196' }}>
              Showing {MAX_VISIBLE} of {matchedIndexEntries.length} matches —
              type to search or pick a category to narrow it down.
            </p>
          )}
          <ProductGrid
            products={gridProducts}
            isLoading={indexLoading}
            onAdd={(p) => {
              const group = productGroups.get(p.id) ?? [p]
              if (group.length > 1) {
                setVariantPickerFor(group)
                return
              }
              handleAdd(p)
              setMobileCartOpen(true)
            }}
          />
        </div>
      </div>

      {variantPickerFor && (
        <VariantPickerModal
          productName={variantPickerFor[0].name}
          image={variantPickerFor[0].image}
          variants={variantPickerFor}
          onSelect={(v) => {
            handleAdd(v)
            setVariantPickerFor(null)
            setMobileCartOpen(true)
          }}
          onClose={() => setVariantPickerFor(null)}
        />
      )}

      {}
      {hasItems && (
        <div className='lg:hidden fixed bottom-16 left-0 right-0 z-30 flex justify-center pointer-events-none'>
          <button
            onClick={() => setMobileCartOpen(true)}
            className='pointer-events-auto flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold shadow-xl'
            style={{
              background: '#008060',
              color: '#fff',
            }}
          >
            <span className='flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold'>
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
            View Cart
            <span className='font-bold'>£{total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${mobileCartOpen ? 'visible' : 'invisible'}`}
      >
        {}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${mobileCartOpen ? 'opacity-40' : 'opacity-0'}`}
          onClick={() => setMobileCartOpen(false)}
        />
        {}
        <div
          className={`absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl overflow-hidden transition-transform duration-300 ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{
            background: '#fff',
            maxHeight: '80dvh',
          }}
        >
          {}
          <div
            className='flex items-center justify-between px-4 py-3 shrink-0'
            style={{
              borderBottom: '1px solid #E1E3E5',
            }}
          >
            <span className='text-sm font-semibold text-[#202223]'>
              Cart · {items.reduce((s, i) => s + i.quantity, 0)} items
            </span>
            <button
              onClick={() => setMobileCartOpen(false)}
              className='w-7 h-7 flex items-center justify-center rounded-full bg-[#F1F2F3] text-[#6D7175] text-lg leading-none'
            >
              ×
            </button>
          </div>
          <div className='flex-1 min-h-0 overflow-y-auto'>
            <BillingCart
              items={cartDisplayItems}
              subtotal={subtotal}
              discountAmount={discountTotal}
              shippingAmount={shippingCost}
              gst={tax}
              total={total}
              giftCardCode={giftCardCode}
              giftCardAmount={giftCardAmount}
              amountDue={amountDue}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              onRemove={handleRemove}
              onDiscountPercentChange={(percent) =>
                usePOSStore.getState().applyPercentageDiscount(percent)
              }
              onCharge={() => {
                setMobileCartOpen(false)
                handleChargeClick()
              }}
              onClear={clearCart}
            />
          </div>
        </div>
      </div>

      {}
      <div
        className='hidden lg:flex w-72 xl:w-80 flex-col overflow-hidden'
        style={{
          borderLeft: '1px solid #E1E3E5',
          minHeight: 0,
        }}
      >
        <div
          className='flex items-center gap-1.5 px-3 py-2 shrink-0'
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E1E3E5',
          }}
        >
          <button
            onClick={() => setShowCustomer(true)}
            className='flex items-center gap-1 px-2 py-1.5 rounded text-xs border transition-all flex-1'
            style={{
              borderColor: customer ? '#008060' : '#E1E3E5',
              color: customer ? '#008060' : '#6D7175',
              background: customer ? '#F2F7F5' : '#FFFFFF',
            }}
          >
            <svg
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
              <circle cx='12' cy='7' r='4' />
            </svg>
            <span className='truncate'>
              {customer ? customer.name : 'Customer'}
            </span>
          </button>

          <button
            onClick={() => setShowFulfillment(true)}
            className='p-1.5 rounded border transition-all'
            title='Pickup or ship to customer'
            style={{
              borderColor: fulfillmentType === 'ship' ? '#008060' : '#E1E3E5',
              color: fulfillmentType === 'ship' ? '#008060' : '#6D7175',
              background: fulfillmentType === 'ship' ? '#F2F7F5' : '#FFFFFF',
            }}
          >
            {fulfillmentType === 'ship' ? (
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <path d='M16.5 9.4 7.55 4.24' />
                <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
                <path d='M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12' />
              </svg>
            ) : (
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <path d='M3 6h18M16 10a4 4 0 01-8 0' />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowNote(true)}
            className='p-1.5 rounded border transition-all'
            title='Add note'
            style={{
              borderColor: orderNote ? '#008060' : '#E1E3E5',
              color: orderNote ? '#008060' : '#6D7175',
              background: orderNote ? '#F2F7F5' : '#FFFFFF',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
              <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
            </svg>
          </button>

          <button
            onClick={() => setShowDiscount(true)}
            className='p-1.5 rounded border transition-all'
            title='Add discount'
            style={{
              borderColor:
                customDiscount > 0 || couponCode ? '#008060' : '#E1E3E5',
              color: customDiscount > 0 || couponCode ? '#008060' : '#6D7175',
              background:
                customDiscount > 0 || couponCode ? '#F2F7F5' : '#FFFFFF',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' />
              <line x1='7' y1='7' x2='7.01' y2='7' />
            </svg>
          </button>

          <button
            onClick={() => setShowGiftCard(true)}
            className='p-1.5 rounded border transition-all'
            title='Redeem gift card'
            style={{
              borderColor: giftCardCode ? '#008060' : '#E1E3E5',
              color: giftCardCode ? '#008060' : '#6D7175',
              background: giftCardCode ? '#F2F7F5' : '#FFFFFF',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <rect x='2' y='6' width='20' height='12' rx='2' />
              <circle cx='7.5' cy='12' r='2' />
              <path d='M14 10h4M14 14h4' />
            </svg>
          </button>

          <button
            onClick={() => setShowSavedCarts(true)}
            className='p-1.5 rounded border transition-all'
            title='Saved carts'
            style={{
              borderColor: '#E1E3E5',
              color: '#6D7175',
              background: '#FFFFFF',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <path d='M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' />
              <polyline points='17 21 17 13 7 13 7 21' />
              <polyline points='7 3 7 8 15 8' />
            </svg>
          </button>

          <button
            onClick={handleOpenReturn}
            className='p-1.5 rounded border transition-all hover:border-[#D82C0D] hover:text-[#D82C0D]'
            title='Process a return'
            style={{
              borderColor: '#E1E3E5',
              color: '#6D7175',
              background: '#FFFFFF',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='9 14 4 9 9 4' />
              <path d='M20 20v-7a4 4 0 00-4-4H4' />
            </svg>
          </button>

          {items.length > 0 && (
            <button
              onClick={() => setShowVoid(true)}
              className='p-1.5 rounded border transition-all hover:border-[#D82C0D] hover:text-[#D82C0D]'
              title='Void sale'
              style={{
                borderColor: '#E1E3E5',
                color: '#6D7175',
                background: '#FFFFFF',
              }}
            >
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
            </button>
          )}
        </div>

        {orderNote && (
          <div
            className='px-3 py-1.5 flex items-center gap-2 text-xs shrink-0'
            style={{
              background: '#FFFBEB',
              borderBottom: '1px solid #FDE68A',
            }}
          >
            <svg
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#B7791F'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
              <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
            </svg>
            <span
              className='truncate flex-1'
              style={{
                color: '#B7791F',
              }}
            >
              {orderNote}
            </span>
          </div>
        )}

        <div className='flex-1 min-h-0 overflow-hidden'>
          <BillingCart
            items={cartDisplayItems}
            discountAmount={discountTotal}
            shippingAmount={shippingCost}
            gst={tax}
            total={total}
            subtotal={subtotal}
            giftCardCode={giftCardCode}
            giftCardAmount={giftCardAmount}
            amountDue={amountDue}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            onDiscountPercentChange={(percent) =>
              usePOSStore.getState().applyPercentageDiscount(percent)
            }
            onCharge={handleChargeClick}
            onClear={clearCart}
          />
        </div>
      </div>
      {}

      {}
      {showPayment && (
        <PaymentModal
          total={amountDue}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowPayment(false)}
        />
      )}
      {showCustomer && (
        <CustomerSearch
          required={pendingCharge}
          onClose={() => {
            setShowCustomer(false)
            if (pendingCharge) {
              setPendingCharge(false)
              setShowFulfillment(true)
            }
          }}
        />
      )}
      {showDiscount && <DiscountModal onClose={() => setShowDiscount(false)} />}
      {showGiftCard && <GiftCardModal onClose={() => setShowGiftCard(false)} />}
      {showCameraScan && (
        <CameraBarcodeScanner
          onDetected={(code) => {
            setShowCameraScan(false)
            handleScanSubmit(code)
          }}
          onClose={() => setShowCameraScan(false)}
        />
      )}
      {showNote && <NoteModal onClose={() => setShowNote(false)} />}
      {showFulfillment && (
        <FulfillmentModal
          onClose={() => setShowFulfillment(false)}
          onSave={() => setShowPayment(true)}
        />
      )}
      {showVoid && (
        <VoidModal
          onConfirm={() => {
            voidSale()
            setShowVoid(false)
          }}
          onClose={() => setShowVoid(false)}
        />
      )}
      {showSavedCarts && (
        <SavedCarts
          onClose={() => setShowSavedCarts(false)}
          onSave={() => setShowSavedCarts(false)}
        />
      )}
      {showReturn && (
        <ReturnModal
          orders={returnOrders}
          onReturned={() => {
            setShowReturn(false)
            toast.success('Return processed')
          }}
          onClose={() => setShowReturn(false)}
        />
      )}
    </div>
  )
}
