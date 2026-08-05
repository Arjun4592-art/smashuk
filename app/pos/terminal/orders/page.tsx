'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import ReturnModal from '@/components/pos/ReturnModal'
import OrderLookupModal from '@/components/pos/OrderLookupModal'
import OrderDetailModal, {
  type OrderDetailData,
} from '@/components/pos/OrderDetailModal'
import { POSOrderRowSkeleton } from '@/components/ui/Skeleton'
import { fetchPOSOrderHistory, type PosOrderRecord } from '@/lib/api/pos'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#E3F1EB', color: '#008060' },
  processing: { bg: '#FFF3CD', color: '#B7791F' },
  shipped: { bg: '#E8F0FD', color: '#2C6ECB' },
  awaiting_pickup: { bg: '#FDF1E7', color: '#B95000' },
}

const STATUS_LABEL: Record<string, string> = {
  returned: 'Returned',
  awaiting_pickup: 'Awaiting Pickup',
}

// Convert a PosOrderRecord (real Medusa order, see lib/api/pos.ts) into
// OrderDetailData (modal)
function toOrderDetail(o: PosOrderRecord): OrderDetailData {
  return {
    id: o.id,
    medusaOrderId: o.medusaOrderId,
    items: o.items.map((i) => ({
      id: i.product.id,
      name: i.product.name,
      brand: i.product.brand,
      price: i.product.price,
      quantity: i.quantity,
    })),
    customer: o.customer
      ? { name: o.customer.name, phone: o.customer.phone }
      : null,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    tax: o.tax,
    total: o.total,
    paymentMethod: o.paymentMethod,
    note: o.note,
    cashier: o.cashier,
    completedAt: o.completedAt,
    returned: o.returned,
    isPickup: o.isPickup,
    fulfillmentStatus: o.fulfillmentStatus,
  }
}

export default function OrdersPage() {
  const authUser = useAuthStore((s) => s.user)
  const [showReturn, setShowReturn] = useState(false)
  const [showLookup, setShowLookup] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PosOrderRecord | null>(
    null,
  )
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  // BUG FIX: this page used to read `completedOrders` straight out of the
  // local zustand store, which persists to localStorage — so order history
  // was tied to one browser/device and vanished if storage was cleared,
  // even though every sale is already a real order in Medusa. Now it's
  // fetched from Medusa (via /api/pos/orders) on load instead, same as the
  // rest of the app's "source of truth" data.
  const [completedOrders, setCompletedOrders] = useState<PosOrderRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null)
      const orders = await fetchPOSOrderHistory()
      setCompletedOrders(orders)
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load order history',
      )
    } finally {
      setMounted(true)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    loadOrders()
  }, [loadOrders])

  // Staff (cashiers) only ever see the orders they personally rang up —
  // admins/managers see everyone's. Matched by cashier name, same way
  // the dashboard's staff sales aggregation already does it.
  //
  // BUG FIX: this used to apply to EVERY order with no exception, which
  // meant a website Store Pickup order (cashier is always '' — nobody's
  // rung it up yet) never matched any real staff member's name and so
  // only ever showed up for admins. A pending pickup isn't "assigned" to
  // any cashier — whoever's on the till when the customer walks in should
  // be the one who can see and hand it over. Pending pickups are now
  // shown to every logged-in staff member regardless of this match; the
  // cashier-match filter still applies as before to actual rung-up sales.
  const isAdmin = authUser?.role === 'admin'

  const isPendingPickup = (o: PosOrderRecord) =>
    o.isPickup &&
    !['fulfilled', 'delivered', 'partially_delivered'].includes(
      o.fulfillmentStatus,
    )

  // BUG FIX: ship-to-customer POS sales were hardcoded to 'completed' the
  // moment they were rung up, with no check against the order's real
  // Medusa fulfillment_status at all. Per app/api/pos/orders/route.ts,
  // ship orders are deliberately left `not_fulfilled` in Medusa until a
  // courier actually dispatches/delivers them — payment being captured at
  // sale time doesn't mean the item has left the store. So a ship order
  // showed "Completed" in this list even though nobody had dispatched it
  // yet. Mirror the same fulfillment states the dashboard already uses
  // (lib/order-status.ts) instead of assuming completion.
  const shipOrderStatus = (
    o: PosOrderRecord,
  ): 'completed' | 'shipped' | 'processing' => {
    const fs = o.fulfillmentStatus
    if (['delivered', 'partially_delivered'].includes(fs)) return 'completed'
    if (['shipped', 'partially_shipped'].includes(fs)) return 'shipped'
    // not_fulfilled, partially_fulfilled, or fulfilled-but-not-yet-shipped
    // — item is still sitting in store, not with the customer.
    return 'processing'
  }

  const allOrders = completedOrders
    .filter(
      (o) =>
        isAdmin ||
        !authUser ||
        isPendingPickup(o) ||
        o.cashier.trim().toLowerCase() === authUser.name.trim().toLowerCase(),
    )
    .map((o) => ({
      id: o.id,
      customer: o.customer?.name || 'Walk-in',
      cashier: o.cashier || '—',
      time: new Date(o.completedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: o.items.length,
      total: o.total,
      // Pickup orders waiting to be collected get their own status instead
      // of being lumped in with "completed" (they haven't been handed
      // over yet). Ship orders now reflect their real Medusa
      // fulfillment_status too, instead of assuming "completed" just
      // because the sale was rung up — see shipOrderStatus above.
      status: isPendingPickup(o)
        ? 'awaiting_pickup'
        : o.returned
          ? 'returned'
          : o.isPickup
            ? 'completed' // pickup + not pending => already handed over
            : shipOrderStatus(o),
      isPickup: o.isPickup,
      live: true,
      raw: o,
    }))

  const filtered = allOrders.filter(
    (o) =>
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.cashier.toLowerCase().includes(search.toLowerCase()),
  )

  const handleRowClick = (o: (typeof allOrders)[number]) => {
    if (o.live && o.raw) setSelectedOrder(o.raw)
  }

  return (
    <div
      className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4'
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3'>
        <h1 className='text-xl font-semibold' style={{ color: '#202223' }}>
          Orders
        </h1>

        <div className='flex gap-2'>
          {/* Search */}
          <div
            className='flex items-center gap-2 px-3 py-2 rounded-lg border bg-white flex-1 sm:w-64'
            style={{ borderColor: '#E1E3E5' }}
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#8C9196'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <circle cx='11' cy='11' r='8' />
              <line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search orders...'
              className='flex-1 bg-transparent outline-none text-sm'
              style={{ color: '#202223' }}
            />
          </div>

          {/* Look up ANY order — website or any cashier's — for pickup
              verification. Unlike the list below (local device history,
              filtered to "mine" for non-admins), this hits real Medusa data
              and is available to every staff member. */}
          <button
            onClick={() => setShowLookup(true)}
            className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-[#008060] hover:text-[#008060] whitespace-nowrap'
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
              <circle cx='11' cy='11' r='8' />
              <line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            Look up order
          </button>

          {/* Process return */}
          <button
            onClick={() => setShowReturn(true)}
            className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-[#008060] hover:text-[#008060] whitespace-nowrap'
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
              <polyline points='1 4 1 10 7 10' />
              <path d='M3.51 15a9 9 0 102.13-9.36L1 10' />
            </svg>
            Return
          </button>
        </div>
      </div>

      {/* Orders list */}
      <div
        className='rounded-xl overflow-hidden'
        style={{ background: '#FFFFFF', border: '1px solid #E1E3E5' }}
      >
        {/* Desktop header row */}
        <div
          className={`hidden sm:grid ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'} px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide`}
          style={{
            background: '#F6F6F7',
            color: '#8C9196',
            borderBottom: '1px solid #E1E3E5',
          }}
        >
          <span>Order ID</span>
          <span>Customer</span>
          {isAdmin && <span>Staff</span>}
          <span>Time</span>
          <span>Items</span>
          <span>Total</span>
          <span>Status</span>
        </div>

        {!mounted ? (
          <div>
            {[...Array(6)].map((_, i) => (
              <POSOrderRowSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className='flex flex-col items-center py-12 gap-2'>
            <p className='text-sm' style={{ color: '#D82C0D' }}>
              {loadError}
            </p>
            <button
              onClick={loadOrders}
              className='text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-[#F6F6F7]'
              style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center py-12 gap-2'>
            <svg
              width='32'
              height='32'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#E1E3E5'
              strokeWidth='1.5'
            >
              <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
              <polyline points='14 2 14 8 20 8' />
            </svg>
            <p className='text-sm' style={{ color: '#8C9196' }}>
              No orders found
            </p>
          </div>
        ) : (
          filtered.map((o, i) => {
            const style =
              o.status === 'returned'
                ? { bg: '#F6F6F7', color: '#6D7175' }
                : (STATUS_STYLE[o.status] ?? STATUS_STYLE.completed)

            const clickable = o.live

            return (
              <div key={o.id}>
                {/* Desktop row */}
                <div
                  onClick={() => handleRowClick(o)}
                  className={`hidden sm:grid ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'} px-4 py-3 text-sm items-center transition-colors hover:bg-[#F6F6F7]`}
                  style={{
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <span className='font-medium' style={{ color: '#008060' }}>
                    {o.id}
                  </span>
                  <span
                    style={{ color: '#202223' }}
                    className='flex items-center gap-1.5'
                  >
                    {o.customer}
                    {o.isPickup && (
                      <span
                        className='text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap'
                        style={{ background: '#FDF1E7', color: '#B95000' }}
                      >
                        🏬 Pickup
                      </span>
                    )}
                  </span>
                  {isAdmin && (
                    <span style={{ color: '#202223' }}>{o.cashier}</span>
                  )}
                  <span style={{ color: '#8C9196', fontSize: 12 }}>
                    {o.time}
                  </span>
                  <span style={{ color: '#6D7175' }}>{o.items}</span>
                  <span className='font-medium' style={{ color: '#202223' }}>
                    £{o.total.toLocaleString('en-GB')}
                  </span>
                  <span
                    className='text-[11px] px-2 py-0.5 rounded-full font-medium w-fit'
                    style={style}
                  >
                    {STATUS_LABEL[o.status] ??
                      o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                  </span>
                </div>

                {/* Mobile card */}
                <div
                  onClick={() => handleRowClick(o)}
                  className='sm:hidden flex flex-col gap-1.5 px-4 py-3 active:bg-[#F6F6F7] transition-colors'
                  style={{
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <div className='flex justify-between items-center'>
                    <span
                      className='font-medium text-sm'
                      style={{ color: '#008060' }}
                    >
                      {o.id}
                    </span>
                    <span
                      className='font-semibold text-sm'
                      style={{ color: '#202223' }}
                    >
                      £{o.total.toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span
                      className='text-xs flex items-center gap-1'
                      style={{ color: '#6D7175' }}
                    >
                      {o.customer}
                      {o.isPickup && (
                        <span
                          className='text-[9px] px-1 py-0.5 rounded-full font-medium whitespace-nowrap'
                          style={{ background: '#FDF1E7', color: '#B95000' }}
                        >
                          🏬
                        </span>
                      )}
                      {isAdmin ? ` · ${o.cashier}` : ''} · {o.items} items ·{' '}
                      {o.time}
                    </span>
                    <span
                      className='text-[11px] px-2 py-0.5 rounded-full font-medium'
                      style={style}
                    >
                      {STATUS_LABEL[o.status] ??
                        o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={toOrderDetail(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onFulfill={() => {
            // Refresh order list from Medusa so the status updates immediately
            setSelectedOrder(null)
            loadOrders()
          }}
          onReturn={() => {
            setSelectedOrder(null)
            setShowReturn(true)
          }}
        />
      )}

      {showReturn && (
        <ReturnModal
          orders={completedOrders}
          onReturned={() => loadOrders()}
          onClose={() => setShowReturn(false)}
        />
      )}
      {showLookup && <OrderLookupModal onClose={() => setShowLookup(false)} />}
    </div>
  )
}
