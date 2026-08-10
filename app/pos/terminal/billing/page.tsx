'use client'
import { useState, useCallback, useEffect } from 'react'
import { usePOSStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'
import ProductSearch from '@/components/pos/ProductSearch'
import CategoryFilter from '@/components/pos/CategoryFilter'
import ProductGrid, { POSProduct } from '@/components/pos/ProductGrid'
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
import { generateOrderNumber, playScanBeep } from '@/lib/utils'
import type { CartDisplayItem } from '@/types'
import { toast } from 'sonner'

type Screen = 'terminal' | 'receipt'

export default function BillingPage() {
  const [screen, setScreen] = useState<Screen>('terminal')
  const [orderId, setOrderId] = useState('')
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
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
  // "Charge" was clicked with no customer attached yet — once one gets
  // attached (existing search or new), jump straight into payment instead
  // of making the cashier click Charge a second time.
  const [pendingCharge, setPendingCharge] = useState(false)
  // Mobile: cart slide-in state. Must live with the other hooks above the
  // `screen === 'receipt'` early return below — a hook declared after a
  // conditional return fires on some renders and not others, which is
  // exactly what throws "Rendered fewer hooks than expected".
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const {
    items,
    subtotal,
    discountTotal,
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
    products,
    medusaLoading,
    medusaError,
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
    syncMedusaProducts,
  } = usePOSStore()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  // POS user — read from the real auth store.
  //
  // BUG FIX: this used to read sessionStorage.getItem('pos_user'), but
  // nothing in the app ever WRITES that key (only reads it here / in
  // CashDrawer.tsx, and removes it on logout) — so `user` was always null
  // and every order's cashier silently fell back to the hardcoded string
  // 'Staff', which is exactly why the Orders/Analytics "Staff" column
  // showed the literal word "Staff" for every row instead of a real name.
  const authUser = useAuthStore((s) => s.user)
  const user = authUser ? { name: authUser.name } : null

  // ── Load Medusa products — no token needed ────────────────────────────────
  // BUG FIX: this used to call loadMedusaProducts(), which has an early
  // return `if (get().products.length > 0) return` — meaning once anything
  // was cached in localStorage (persist key: 'smashpro-pos-store'), the POS
  // would NEVER fetch fresh data again on mount, no matter how stale the
  // cache was (deleted products, price changes, new stock — all silently
  // ignored). syncMedusaProducts() always fetches current data from Medusa
  // and replaces the cache, so the terminal reflects real inventory.
  useEffect(() => {
    syncMedusaProducts()
  }, [syncMedusaProducts])

  // ── Categories — derived from real backend product data, not hardcoded ────
  const CATEGORIES = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c) && c !== 'Uncategorized'),
    ),
  ).sort((a, b) => a.localeCompare(b))

  // ── Filtered products ─────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchCat = cat === 'All' || p.category === cat
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  // ── Barcode scan / Enter-to-add — real lookup, not a random pick ────────
  // A handheld/USB scanner types the barcode into the focused search box and
  // then sends Enter. But a cashier typing a partial product name and
  // pressing Enter is just as common a flow, and the grid above is already
  // showing the correctly-filtered (partial, includes-based) matches at that
  // point. Previously this only tried an exact SKU or exact full-title match,
  // so typing "yonex" showed a "Product not found" error even though the
  // grid had several visible Yonex matches — this used a stricter check than
  // the grid filter, which was confusing. Now:
  //   1. Exact SKU match (barcode) → add immediately.
  //   2. Exact full-title match → add immediately.
  //   3. Otherwise, reuse the same partial match the grid uses — if it
  //      narrows to exactly one product, add that one. If it narrows to
  //      several, do nothing (the grid is already showing them — let the
  //      cashier tap the right one instead of guessing for them).
  //   4. Only show "Product not found" when there are truly zero matches.
  const handleScanSubmit = (raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q) return

    const bySku =
      products.find((p) => p.sku.toLowerCase() === q) ??
      products.find((p) => p.sku.toLowerCase().includes(q))
    const byExactName = products.find((p) => p.name.toLowerCase() === q)

    const partialMatches = products.filter(
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
        // Several products match what's typed — grid below already shows
        // them filtered, nothing to add automatically.
        return
      }
      toast.error('Product not found', {
        description: `No product matches "${raw}" — check the SKU or add it in Products.`,
      })
      return
    }
    if (match.stock <= 0) {
      toast.error(`${match.name} is out of stock`)
      return
    }

    handleAdd(match)
    setSearch('')
    toast.success(`${match.name} added`, { duration: 1200 })
  }

  // ── Cart handlers ─────────────────────────────────────────────────────────
  // IMPORTANT: p.variantId is the real Medusa variant id and MUST be carried
  // through to the cart item. createPOSOrder() (lib/api/pos.ts) sends this
  // as `variant_id` when charging the sale. Previously this object was built
  // without it and without passing a `variant` to addItem, so checkout fell
  // back to using the *product* id as the variant id — Medusa rejected it
  // ("Variants prod_... do not exist"), the order never synced, and only a
  // local receipt printed.
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
        { id: p.variantId } as any,
      )
      if (soundOnScan) playScanBeep()
    },
    [addItem, soundOnScan],
  )

  const cartDisplayItems: CartDisplayItem[] = items.map((i) => ({
    id: i.product.id,
    name: i.product.name,
    brand: i.product.brand ?? '',
    price: i.product.price,
    quantity: i.quantity,
    sku: i.product.sku ?? '',
    stock: i.product.stock ?? 0,
    category: i.product.categoryId ?? '',
  }))

  const handleIncrease = useCallback(
    (id: string) => {
      const item = usePOSStore.getState().items.find((i) => i.product.id === id)
      // updateQuantity matches on (productId, variantId) — omitting the
      // variant id here meant it never matched items that have a variant,
      // so +/- silently did nothing in the cart sidebar.
      if (item) updateQuantity(id, item.quantity + 1, item.variant?.id)
    },
    [updateQuantity],
  )

  const handleDecrease = useCallback(
    (id: string) => {
      const item = usePOSStore.getState().items.find((i) => i.product.id === id)
      if (item) updateQuantity(id, item.quantity - 1, item.variant?.id)
    },
    [updateQuantity],
  )

  const handleRemove = useCallback(
    (id: string) => {
      const item = usePOSStore.getState().items.find((i) => i.product.id === id)
      // Same variant-id matching issue as increase/decrease above.
      removeItem(id, item?.variant?.id)
    },
    [removeItem],
  )

  // ── Open the Return modal — must have order history loaded first, since
  // ReturnModal requires a real `orders` list (see components/pos/ReturnModal.tsx)
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

  // ── Charge button — Step 1: customer (MANDATORY) → Step 2: fulfillment → payment
  const handleChargeClick = () => {
    setPendingCharge(true)
    setShowCustomer(true)
  }

  // ── Payment confirm — creates the Medusa order via the server route ─────────
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

    if (items.length > 0) {
      try {
        const { createPOSOrder, fetchDefaultRegion } =
          await import('@/lib/api/pos')
        const regionId = await fetchDefaultRegion()
        if (!regionId) {
          throw new Error('No default region configured in Medusa')
        }

        // Resolve a real Medusa variant id for every line — never fall back
        // to the product id (that id is what caused "Variants prod_...
        // do not exist" errors, since a product id was being sent where
        // Medusa expected a variant id).
        const orderItems = items.map((i) => {
          const variantId = (i.product as any).variantId ?? i.variant?.id
          if (!variantId) {
            throw new Error(
              `"${i.product.name}" has no linked Medusa variant — remove it and re-add from Products.`,
            )
          }
          return { variant_id: variantId, quantity: i.quantity }
        })

        const medusaOrder = await createPOSOrder({
          items: orderItems,
          customer_id:
            customer?.id && !customer.id.startsWith('local-')
              ? customer.id
              : undefined,
          customer_email: (customer as any)?.email,
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
        })
        medusaOrderId = medusaOrder?.id
      } catch (err: unknown) {
        console.error('[BillingPage] Medusa order create failed:', err)
        // IMPORTANT: the cashier must be told — payment has already
        // happened at the counter, so we still let the receipt print, but
        // this sale has no record in Medusa (stock wasn't deducted, it
        // won't show in the order list). Needs manual reconciliation.
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
      // Revenue should reflect the real value of the sale, not just the
      // cash/card portion — a gift card redemption is still revenue
      // recognised now (Medusa already deducted it from the card's
      // balance), it just came from a different tender.
      source: 'pos',
      amount: total,
      orderId: id,
      cashier: cashierName,
    })

    // BUG FIX: cash-drawer reconciliation used to compare counted cash
    // against opening float + ALL sales (cash + card + split) for the
    // shift, which meant any card sale showed up as a false "shortage"
    // since that money never enters the physical drawer. Record only the
    // cash actually collected for THIS sale: the full total for a cash
    // sale, 0 for a pure card sale, or just the cash-method portion for a
    // split — see recordCashSale/closeCashDrawer in store/posStore.ts.
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
    setShowPayment(false)
    setScreen('receipt')
  }

  const handleNewSale = () => {
    clearCart()
    setScreen('terminal')
    setOrderId('')
    setSplitPayments(null)
  }

  // "Auto-print receipt" (Settings tab) — fire the print dialog as soon as
  // we land on the receipt screen for this order, instead of making the
  // cashier tap Print every time.
  useEffect(() => {
    if (screen === 'receipt' && autoPrintReceipt && orderId) {
      window.print()
    }
    // Only re-run when a *new* order lands on the receipt screen, not on
    // every render (orderId changes once per sale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, orderId])

  if (screen === 'receipt') {
    return (
      <div
        className='flex-1 overflow-y-auto'
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <Receipt
          orderId={orderId}
          items={cartDisplayItems}
          subtotal={subtotal}
          discountAmount={discountTotal}
          gst={tax}
          total={total}
          payMethod={paymentMethod}
          splitPayments={splitPayments}
          cashier={user?.name || 'Staff'}
          onNewSale={handleNewSale}
          onPrint={() => window.print()}
          onEmail={() => setShowEmailReceipt(true)}
        />
        {showEmailReceipt && (
          <EmailReceiptModal
            onClose={() => setShowEmailReceipt(false)}
            defaultEmail={(customer as any)?.email ?? ''}
            receipt={{
              orderId,
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
      {/* ── Left: Product grid (full width on mobile) ──────────────────────── */}
      <div className='flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2.5'>
        {medusaError && (
          <div
            className='flex items-center justify-between px-3 py-2 rounded-lg text-xs'
            style={{
              background: '#FFF4F4',
              border: '1px solid #FECACA',
              color: '#D82C0D',
            }}
          >
            <span>Products failed to load: {medusaError}</span>
            <button
              onClick={() => syncMedusaProducts()}
              className='font-medium underline ml-2'
            >
              Retry
            </button>
          </div>
        )}

        {medusaLoading && (
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
              style={{ borderColor: '#B5E4D8', borderTopColor: '#008060' }}
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
          onChange={setCat}
        />
        <div className='flex-1 min-h-0 overflow-y-auto'>
          <ProductGrid
            products={filtered}
            onAdd={(p) => {
              handleAdd(p)
              setMobileCartOpen(true)
            }}
          />
        </div>
      </div>

      {/* ── Mobile: floating cart button ───────────────────────────────────── */}
      {hasItems && (
        <div className='lg:hidden fixed bottom-16 left-0 right-0 z-30 flex justify-center pointer-events-none'>
          <button
            onClick={() => setMobileCartOpen(true)}
            className='pointer-events-auto flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold shadow-xl'
            style={{ background: '#008060', color: '#fff' }}
          >
            <span className='flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold'>
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
            View Cart
            <span className='font-bold'>£{total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Mobile: Cart slide-up panel ────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${mobileCartOpen ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${mobileCartOpen ? 'opacity-40' : 'opacity-0'}`}
          onClick={() => setMobileCartOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl overflow-hidden transition-transform duration-300 ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ background: '#fff', maxHeight: '80dvh' }}
        >
          {/* Handle + close */}
          <div
            className='flex items-center justify-between px-4 py-3 shrink-0'
            style={{ borderBottom: '1px solid #E1E3E5' }}
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
              gst={tax}
              total={total}
              giftCardCode={giftCardCode}
              giftCardAmount={giftCardAmount}
              amountDue={amountDue}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              onRemove={handleRemove}
              // BUG FIX: see the desktop BillingCart instance above — this
              // used to be `onDiscountChange={setCustomDiscount}`, storing
              // the raw 0-100 typed as a flat amount instead of a percent.
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

      {/* ── Desktop: Right cart panel ───────────────────────────────────────── */}
      <div
        className='hidden lg:flex w-72 xl:w-80 flex-col overflow-hidden'
        style={{ borderLeft: '1px solid #E1E3E5', minHeight: 0 }}
      >
        <div
          className='flex items-center gap-1.5 px-3 py-2 shrink-0'
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E1E3E5' }}
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
            style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
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
            <span className='truncate flex-1' style={{ color: '#B7791F' }}>
              {orderNote}
            </span>
          </div>
        )}

        <div className='flex-1 min-h-0 overflow-hidden'>
          <BillingCart
            items={cartDisplayItems}
            discountAmount={discountTotal}
            gst={tax}
            total={total}
            subtotal={subtotal}
            giftCardCode={giftCardCode}
            giftCardAmount={giftCardAmount}
            amountDue={amountDue}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            // BUG FIX: was `onDiscountChange={setCustomDiscount}`, which
            // stored the raw 0-100 the cashier typed as a flat currency
            // amount instead of a percentage. applyPercentageDiscount does
            // the same percent→amount conversion the "Add discount" modal's
            // percent tab already uses (Math.round(subtotal * percent/100)).
            onDiscountPercentChange={(percent) =>
              usePOSStore.getState().applyPercentageDiscount(percent)
            }
            onCharge={handleChargeClick}
            onClear={clearCart}
          />
        </div>
      </div>
      {/* ── End desktop cart panel ── */}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showPayment && (
        <PaymentModal
          // Cashier only needs to collect what's left after the gift card
          // (if any) has paid down the total — see amountDue in posStore.ts.
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
