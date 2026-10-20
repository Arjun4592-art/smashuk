'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useOrders } from '@/hooks/useOrders'
import { formatCurrency } from '@/lib/utils'
import { getDisplayOrderStatus } from '@/lib/order-status'
import {
  FLOW_LABEL,
  FLOW_PILL_CLASS,
  FLOW_STAGE_ORDER,
  canRequestReturn,
  getRefundRequest,
} from '@/lib/order-flow'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PackageIcon, ChevronRightIcon, HeartIcon } from '@/components/ui/Icons'
import { ProfileSkeleton, OrderCardSkeleton } from '@/components/ui/Skeleton'
import OrderTracking from '@/components/website/OrderTracking'
import RequestReturnModal from '@/components/website/RequestReturnModal'
import ProductCard from '@/components/website/ProductCard'
import EditProfileTab from '@/components/website/account/EditProfileTab'
import AddressesTab, {
  ADDRESSES_QUERY_KEY,
} from '@/components/website/account/AddressesTab'
import { getAddresses } from '@/lib/api/store'
import PaymentMethodsTab from '@/components/website/account/PaymentMethodsTab'
import SecurityTab from '@/components/website/account/SecurityTab'
const TABS = [
  {
    key: 'overview',
    label: 'Overview',
  },
  {
    key: 'profile',
    label: 'Edit Profile',
  },
  {
    key: 'addresses',
    label: 'Addresses',
  },
  {
    key: 'orders',
    label: 'Orders',
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
  },
  {
    key: 'payment',
    label: 'Payment Methods',
  },
  {
    key: 'security',
    label: 'Security',
  },
] as const
type TabKey = (typeof TABS)[number]['key']

const ORDER_STATUS_META: Record<string, { label: string; cls: string }> =
  Object.fromEntries(
    FLOW_STAGE_ORDER.map((s) => [
      s,
      { label: FLOW_LABEL[s], cls: FLOW_PILL_CLASS[s] },
    ]),
  )

type ReturnRecord = {
  id: string
  status: 'requested' | 'awaiting_return' | 'refunded' | 'rejected'
  items?: { item_id: string; title: string; quantity: number }[]
  reason?: string
  requested_at?: string
  processed_at?: string
  label?: { tracking_number?: string; carrier?: string }
  label_requested?: boolean
}

/** Everything the order card needs to know about returns / refunds. */
function getOrderReturnState(order: any) {
  const records: ReturnRecord[] = Array.isArray(order.metadata?.returns)
    ? order.metadata.returns
    : []
  const requested = records.filter((r) => r.status === 'requested')
  const awaiting = records.filter((r) => r.status === 'awaiting_return')
  const refundedRecords = records.filter((r) => r.status === 'refunded')

  // Same rule as the order detail page: rejected returns free the quantity up.
  const remaining: Record<string, number> = {}
  for (const item of order.items ?? []) remaining[item.id] = item.quantity
  for (const r of records) {
    if (r.status === 'rejected') continue
    for (const line of r.items ?? []) {
      remaining[line.item_id] = (remaining[line.item_id] ?? 0) - line.quantity
    }
  }
  const hasRemainingQty = Object.values(remaining).some((q) => q > 0)

  const isRefunded =
    refundedRecords.length > 0 ||
    order.payment_status === 'refunded' ||
    order.payment_status === 'partially_refunded'
  const isCancelled =
    order.status === 'canceled' || order.payment_status === 'canceled'

  return {
    requested,
    awaiting,
    refundedRecords,
    isRefunded,
    isCancelled,
    // Returns only open once the order has been despatched / picked up
    canReturn: canRequestReturn(order) && hasRemainingQty,
  }
}

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  )
}
function ProfilePageContent() {
  const { user, logout, authChecked, isLoggingOut } = useAuthStore()
  const clearCart = useCartStore((s) => s.clearCart)
  const wishlistItems = useWishlistStore((s) => s.items)
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders()
  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAddresses,
    retry: false,
    enabled: !!user,
  })
  const defaultAddress =
    addresses.find((a) => a.is_default_shipping) ?? addresses[0]
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [returnOrder, setReturnOrder] = useState<any>(null)
  const initialTab = (searchParams.get('tab') as TabKey | null) ?? 'overview'
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : 'overview',
  )
  const changeTab = (key: TabKey) => {
    setActiveTab(key)
    router.replace(`/profile?tab=${key}`, { scroll: false })
  }
  const handleLogout = async () => {
    clearCart()
    logout('website')
    router.replace('/login')
  }
  useEffect(() => {
    if (authChecked && !user && !isLoggingOut) {
      // The server said "no valid user" but a stale auth cookie may still be
      // set, and the proxy bounces /login back to /profile for anyone with
      // that cookie (redirect loop, page stuck on the skeleton). Clear the
      // cookie first, then go to login.
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface: 'website' }),
      })
        .catch(() => {})
        .finally(() => router.replace('/login?redirect=/profile'))
    }
  }, [authChecked, user, isLoggingOut, router])
  if (!user) return <ProfileSkeleton />
  const totalSpent = orders.reduce((sum: number, o: any) => {
    const { isRefunded, isCancelled } = getOrderReturnState(o)
    return isRefunded || isCancelled ? sum : sum + (o.total ?? 0)
  }, 0)
  return (
    <>
      <div className='min-h-screen bg-[#F2F4F7]'>
        <div className='bg-[#0A1F44] py-10'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-4'>
              <Link href='/' className='hover:text-white'>
                Home
              </Link>
              <ChevronRightIcon size={14} />
              <span className='text-white'>My Profile</span>
            </div>
            <div className='flex items-center gap-4'>
              <div className='w-16 h-16 bg-[#E8553A] rounded-2xl flex items-center justify-center text-white font-montserrat font-black text-2xl shadow-lg overflow-hidden'>
                {user.avatar && !avatarFailed ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className='w-full h-full object-cover'
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  user.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h1 className='font-montserrat font-black text-2xl text-white'>
                  {user.name}
                </h1>
                <p className='text-white/60 font-lato text-sm'>{user.email}</p>
                <span className='inline-block mt-1 px-3 py-0.5 bg-[#E8553A]/20 text-[#E8553A] text-xs font-semibold rounded-full font-montserrat capitalize'>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
            {}
            <div className='space-y-4'>
              <div className='bg-white rounded-2xl border border-gray-100 p-5'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='text-center p-3 bg-[#0A1F44]/5 rounded-xl'>
                    <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                      {orders.length}
                    </p>
                    <p className='text-xs text-gray-400 font-lato mt-0.5'>
                      Orders
                    </p>
                  </div>
                  <div className='text-center p-3 bg-[#E8553A]/5 rounded-xl'>
                    <p className='font-montserrat font-black text-lg text-[#E8553A]'>
                      {formatCurrency(totalSpent)}
                    </p>
                    <p className='text-xs text-gray-400 font-lato mt-0.5'>
                      Spent
                    </p>
                  </div>
                </div>
              </div>

              {}
              <div className='bg-white rounded-2xl border border-gray-100 p-2'>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => changeTab(tab.key)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-lato font-semibold transition-colors flex items-center justify-between ${activeTab === tab.key ? 'bg-[#E8553A]/8 text-[#E8553A]' : 'text-[#0A1F44] hover:bg-gray-50'}`}
                  >
                    {tab.label}
                    {tab.key === 'wishlist' && wishlistItems.length > 0 && (
                      <span className='text-[10px] font-black bg-[#0A1F44] text-white rounded-full px-1.5 py-0.5'>
                        {wishlistItems.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogout}
                className='w-full py-3 bg-white border border-red-200 text-red-500 rounded-2xl text-sm font-semibold font-montserrat hover:bg-red-50 transition-colors'
              >
                Sign Out
              </button>
            </div>

            {}
            <div className='lg:col-span-3 space-y-6'>
              {activeTab === 'overview' && (
                <>
                  <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                    <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                      Account Overview
                    </h2>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {[
                        {
                          label: 'Full Name',
                          value: user.name,
                        },
                        {
                          label: 'Email',
                          value: user.email,
                        },
                        {
                          label: 'Phone',
                          value: user.phone || 'Not set',
                        },
                        {
                          label: 'Member Since',
                          value: new Date(user.createdAt).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          ),
                        },
                      ].map((info) => (
                        <div key={info.label}>
                          <p className='text-xs text-gray-400 font-lato uppercase tracking-wider mb-1'>
                            {info.label}
                          </p>
                          <p className='font-lato font-semibold text-[#0A1F44] text-sm'>
                            {info.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                        Default Address
                      </h2>
                      <button
                        onClick={() => changeTab('addresses')}
                        className='text-sm text-[#E8553A] font-semibold font-lato hover:underline'
                      >
                        {defaultAddress ? 'Manage →' : 'Add address →'}
                      </button>
                    </div>
                    {addressesLoading ? (
                      <div className='h-16 rounded-xl bg-gray-100 animate-pulse' />
                    ) : defaultAddress ? (
                      <div className='text-sm font-lato text-gray-500 leading-relaxed'>
                        <p className='font-montserrat font-bold text-[#0A1F44]'>
                          {defaultAddress.first_name} {defaultAddress.last_name}
                          {defaultAddress.address_name && (
                            <span className='ml-2 text-[10px] uppercase tracking-wider bg-[#0A1F44]/5 rounded px-1.5 py-0.5'>
                              {defaultAddress.address_name}
                            </span>
                          )}
                        </p>
                        {defaultAddress.address_1}
                        {defaultAddress.address_2
                          ? `, ${defaultAddress.address_2}`
                          : ''}
                        , {defaultAddress.city} {defaultAddress.postal_code}
                        {defaultAddress.phone ? (
                          <>
                            <br />
                            Phone: {defaultAddress.phone}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <p className='text-sm text-gray-400 font-lato'>
                        You haven&apos;t saved a delivery address yet. Save one
                        for faster checkout.
                      </p>
                    )}
                  </div>

                  {}
                  <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                    <div className='flex items-center justify-between mb-5'>
                      <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                        Recent Orders
                      </h2>
                      <button
                        onClick={() => changeTab('orders')}
                        className='text-sm text-[#E8553A] font-semibold font-lato hover:underline'
                      >
                        View All →
                      </button>
                    </div>

                    {ordersLoading ? (
                      <div className='space-y-3'>
                        {[...Array(3)].map((_, i) => (
                          <OrderCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : orders.length === 0 ? (
                      <div className='text-center py-10'>
                        <PackageIcon
                          size={40}
                          className='text-gray-200 mx-auto mb-3'
                        />
                        <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                          No orders yet
                        </p>
                        <Link
                          href='/shop'
                          className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'
                        >
                          Shop Now
                        </Link>
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        {orders.slice(0, 3).map((order: any) => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            onTrack={() => setTrackingOrderId(order.id)}
                            onReturn={() => setReturnOrder(order)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'profile' && <EditProfileTab />}

              {activeTab === 'addresses' && <AddressesTab />}

              {activeTab === 'orders' && (
                <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                  <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                    My Orders
                  </h2>
                  {ordersLoading ? (
                    <div className='space-y-3'>
                      {[...Array(3)].map((_, i) => (
                        <OrderCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : ordersError ? (
                    <div className='text-center py-10'>
                      <PackageIcon
                        size={40}
                        className='text-gray-200 mx-auto mb-3'
                      />
                      <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                        We couldn&apos;t load your orders
                      </p>
                      <p className='text-sm text-gray-500 font-lato mb-4'>
                        {ordersError.message === 'not_synced'
                          ? 'Your session needs refreshing. Please sign out and sign in again.'
                          : 'Something went wrong. Please try again.'}
                      </p>
                      <button
                        onClick={() => refetchOrders()}
                        className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'
                      >
                        Try again
                      </button>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className='text-center py-10'>
                      <PackageIcon
                        size={40}
                        className='text-gray-200 mx-auto mb-3'
                      />
                      <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                        No orders yet
                      </p>
                      <Link
                        href='/shop'
                        className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'
                      >
                        Shop Now
                      </Link>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {orders.map((order: any) => (
                        <OrderRow
                          key={order.id}
                          order={order}
                          onTrack={() => setTrackingOrderId(order.id)}
                          onReturn={() => setReturnOrder(order)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                  <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                    My Wishlist
                  </h2>
                  {wishlistItems.length === 0 ? (
                    <div className='text-center py-10'>
                      <HeartIcon
                        size={40}
                        className='text-gray-200 mx-auto mb-3'
                      />
                      <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                        Your wishlist is empty
                      </p>
                      <Link
                        href='/shop'
                        className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'
                      >
                        Browse Products
                      </Link>
                    </div>
                  ) : (
                    <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                      {wishlistItems.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payment' && <PaymentMethodsTab />}
              {activeTab === 'security' && <SecurityTab />}
            </div>
          </div>
        </div>
      </div>

      {trackingOrderId && (
        <OrderTracking
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      )}

      {returnOrder && (
        <RequestReturnModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onSubmitted={() => {
            setReturnOrder(null)
            toast.success(
              "Return requested — we'll email you once it's reviewed.",
            )
            refetchOrders()
          }}
        />
      )}
    </>
  )
}
function OrderRow({
  order,
  onTrack,
  onReturn,
}: {
  order: any
  onTrack: () => void
  onReturn: () => void
}) {
  const ret = getOrderReturnState(order)
  const displayStatus = getDisplayOrderStatus(order)
  const items: any[] = order.items ?? []
  const shownItems = items.slice(0, 3)
  const itemCount = items.reduce((n, i) => n + (i.quantity ?? 1), 0)

  // One badge: the order flow stage (NEW, PROCESSING, DESPATCHED, ...)
  const badge = ORDER_STATUS_META[displayStatus] ?? ORDER_STATUS_META.new
  const refundRequest = getRefundRequest(order)

  const activeReturn = ret.requested[0] ?? ret.awaiting[0]
  const returnedItemCount = (activeReturn?.items ?? []).reduce(
    (n, i) => n + i.quantity,
    0,
  )

  return (
    <div className='p-4 border border-gray-100 rounded-xl hover:border-[#E8553A]/20 transition-colors'>
      <div className='flex items-start justify-between gap-3'>
        <p className='text-xs text-gray-400 font-lato pt-1'>
          Ordered on {fmtDate(order.created_at)} · {itemCount}{' '}
          {itemCount === 1 ? 'item' : 'items'}
        </p>

        <div className='text-right shrink-0'>
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold font-montserrat ${badge.cls}`}
          >
            {badge.label}
          </span>
          {/* Hide the amount once money has been refunded. */}
          {!ret.isRefunded && (
            <p className='font-montserrat font-black text-sm text-[#0A1F44] mt-1.5'>
              {formatCurrency(order.total ?? 0)}
            </p>
          )}
        </div>
      </div>

      {shownItems.length > 0 && (
        <div className='mt-3 space-y-3'>
          {shownItems.map((item: any) => (
            <Link
              key={item.id}
              href={`/orders/${order.id}`}
              className='flex items-center gap-4 group'
            >
              <div className='w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center'>
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <PackageIcon size={20} className='text-gray-300' />
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-lato font-semibold text-[#0A1F44] group-hover:text-[#E8553A] transition-colors line-clamp-2'>
                  {item.title}
                </p>
                <p className='text-xs text-gray-400 font-lato truncate mt-0.5'>
                  {item.variant_title && !/^default/i.test(item.variant_title)
                    ? `${item.variant_title} · `
                    : ''}
                  Qty {item.quantity}
                </p>
              </div>
            </Link>
          ))}
          {items.length > shownItems.length && (
            <p className='text-xs text-gray-400 font-lato pl-20'>
              +{items.length - shownItems.length} more{' '}
              {items.length - shownItems.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      )}

      {/* Return details */}
      {ret.requested.length > 0 && (
        <div className='mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-lato text-amber-800'>
          Return requested on {fmtDate(activeReturn?.requested_at)} for{' '}
          {returnedItemCount} {returnedItemCount === 1 ? 'item' : 'items'}.
          We&apos;ll email you once it&apos;s reviewed.
        </div>
      )}
      {ret.requested.length === 0 && ret.awaiting.length > 0 && (
        <div className='mt-3 rounded-lg bg-[#2C6ECB]/10 border border-[#2C6ECB]/20 px-3 py-2 text-xs font-lato text-[#1f4f94]'>
          We&apos;re processing your return.{' '}
          {activeReturn?.label?.tracking_number
            ? `Please send the item back using the label we emailed you (tracking: ${activeReturn.label.tracking_number}).`
            : activeReturn?.label_requested
              ? 'Your prepaid return label is on its way by email.'
              : 'Please send the item back to us, and keep your proof of postage.'}{' '}
          We refund you once we&apos;ve received and checked it.
        </div>
      )}
      {refundRequest?.status === 'requested' && (
        <div className='mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-lato text-amber-800'>
          Refund request received. We&apos;ll email you once it&apos;s been
          reviewed.
        </div>
      )}
      {ret.requested.length === 0 &&
        ret.awaiting.length === 0 &&
        ret.isRefunded && (
          <div className='mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs font-lato text-gray-600'>
            Refund processed
            {ret.refundedRecords[0]?.processed_at
              ? ` on ${fmtDate(ret.refundedRecords[0].processed_at)}`
              : ''}
            . It can take a few days to show on your statement.
          </div>
        )}

      <div className='flex items-center justify-between mt-3 pt-3 border-t border-gray-100'>
        <Link
          href={`/orders/${order.id}`}
          className='text-xs font-semibold text-[#E8553A] hover:underline font-lato'
        >
          View details →
        </Link>
        <div className='flex items-center gap-3'>
          {!ret.isRefunded && !ret.isCancelled && (
            <button
              onClick={onTrack}
              className='text-xs font-semibold text-[#0A1F44] hover:text-[#E8553A] font-lato flex items-center gap-1 transition-colors'
            >
              🚚 Track
            </button>
          )}
          {ret.canReturn && (
            <button
              onClick={onReturn}
              className='text-xs font-semibold text-[#0A1F44] hover:text-[#E8553A] font-lato transition-colors'
            >
              ↩️ Request Return
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
