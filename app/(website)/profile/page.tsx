'use client';

import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageIcon, ChevronRightIcon, HeartIcon } from '@/components/ui/Icons';
import { ProfileSkeleton, OrderCardSkeleton } from '@/components/ui/Skeleton';
import OrderTracking from '@/components/website/OrderTracking';
import RequestReturnModal from '@/components/website/RequestReturnModal';
import ProductCard from '@/components/website/ProductCard';
import EditProfileTab from '@/components/website/account/EditProfileTab';
import AddressesTab from '@/components/website/account/AddressesTab';
import PaymentMethodsTab from '@/components/website/account/PaymentMethodsTab';
import SecurityTab from '@/components/website/account/SecurityTab';
const TABS = [{
  key: 'overview',
  label: 'Overview'
}, {
  key: 'profile',
  label: 'Edit Profile'
}, {
  key: 'addresses',
  label: 'Addresses'
}, {
  key: 'orders',
  label: 'Orders'
}, {
  key: 'wishlist',
  label: 'Wishlist'
}, {
  key: 'payment',
  label: 'Payment Methods'
}, {
  key: 'security',
  label: 'Security'
}] as const;
type TabKey = typeof TABS[number]['key'];
export default function ProfilePage() {
  return <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageContent />
    </Suspense>;
}
function ProfilePageContent() {
  const {
    user,
    logout,
    authChecked,
    isLoggingOut
  } = useAuthStore();
  const clearCart = useCartStore(s => s.clearCart);
  const wishlistItems = useWishlistStore(s => s.items);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders
  } = useOrders();
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const initialTab = searchParams.get('tab') as TabKey | null ?? 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.some(t => t.key === initialTab) ? initialTab : 'overview');
  const handleLogout = async () => {
    clearCart();
    logout('website');
    router.replace('/login');
  };
  useEffect(() => {
    if (authChecked && !user && !isLoggingOut) {
      router.replace('/login?redirect=/profile');
    }
  }, [authChecked, user, isLoggingOut, router]);
  if (!user) return <ProfileSkeleton />;
  const totalSpent = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  return <>
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
                {user.avatar ? <img src={user.avatar} alt={user.name} className='w-full h-full object-cover' /> : user.name.slice(0, 2).toUpperCase()}
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
                {TABS.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-lato font-semibold transition-colors flex items-center justify-between ${activeTab === tab.key ? 'bg-[#E8553A]/8 text-[#E8553A]' : 'text-[#0A1F44] hover:bg-gray-50'}`}>
                    {tab.label}
                    {tab.key === 'wishlist' && wishlistItems.length > 0 && <span className='text-[10px] font-black bg-[#0A1F44] text-white rounded-full px-1.5 py-0.5'>
                        {wishlistItems.length}
                      </span>}
                  </button>)}
              </div>

              <button onClick={handleLogout} className='w-full py-3 bg-white border border-red-200 text-red-500 rounded-2xl text-sm font-semibold font-montserrat hover:bg-red-50 transition-colors'>
                Sign Out
              </button>
            </div>

            {}
            <div className='lg:col-span-3 space-y-6'>
              {activeTab === 'overview' && <>
                  <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                    <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                      Account Overview
                    </h2>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {[{
                    label: 'Full Name',
                    value: user.name
                  }, {
                    label: 'Email',
                    value: user.email
                  }, {
                    label: 'Phone',
                    value: user.phone || 'Not set'
                  }, {
                    label: 'Member Since',
                    value: new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  }].map(info => <div key={info.label}>
                          <p className='text-xs text-gray-400 font-lato uppercase tracking-wider mb-1'>
                            {info.label}
                          </p>
                          <p className='font-lato font-semibold text-[#0A1F44] text-sm'>
                            {info.value}
                          </p>
                        </div>)}
                    </div>
                  </div>

                  {}
                  <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                    <div className='flex items-center justify-between mb-5'>
                      <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                        Recent Orders
                      </h2>
                      <button onClick={() => setActiveTab('orders')} className='text-sm text-[#E8553A] font-semibold font-lato hover:underline'>
                        View All →
                      </button>
                    </div>

                    {ordersLoading ? <div className='space-y-3'>
                        {[...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}
                      </div> : orders.length === 0 ? <div className='text-center py-10'>
                        <PackageIcon size={40} className='text-gray-200 mx-auto mb-3' />
                        <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                          No orders yet
                        </p>
                        <Link href='/shop' className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'>
                          Shop Now
                        </Link>
                      </div> : <div className='space-y-3'>
                        {orders.slice(0, 3).map((order: any) => <OrderRow key={order.id} order={order} onTrack={() => setTrackingOrderId(order.id)} onReturn={() => setReturnOrder(order)} />)}
                      </div>}
                  </div>
                </>}

              {activeTab === 'profile' && <EditProfileTab />}

              {activeTab === 'addresses' && <AddressesTab />}

              {activeTab === 'orders' && <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                  <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                    My Orders
                  </h2>
                  {ordersLoading ? <div className='space-y-3'>
                      {[...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}
                    </div> : orders.length === 0 ? <div className='text-center py-10'>
                      <PackageIcon size={40} className='text-gray-200 mx-auto mb-3' />
                      <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                        No orders yet
                      </p>
                      <Link href='/shop' className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'>
                        Shop Now
                      </Link>
                    </div> : <div className='space-y-3'>
                      {orders.map((order: any) => <OrderRow key={order.id} order={order} onTrack={() => setTrackingOrderId(order.id)} onReturn={() => setReturnOrder(order)} />)}
                    </div>}
                </div>}

              {activeTab === 'wishlist' && <div className='bg-white rounded-2xl border border-gray-100 p-6'>
                  <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                    My Wishlist
                  </h2>
                  {wishlistItems.length === 0 ? <div className='text-center py-10'>
                      <HeartIcon size={40} className='text-gray-200 mx-auto mb-3' />
                      <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
                        Your wishlist is empty
                      </p>
                      <Link href='/shop' className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'>
                        Browse Products
                      </Link>
                    </div> : <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                      {wishlistItems.map(product => <ProductCard key={product.id} product={product} />)}
                    </div>}
                </div>}

              {activeTab === 'payment' && <PaymentMethodsTab />}
              {activeTab === 'security' && <SecurityTab />}
            </div>
          </div>
        </div>
      </div>

      {trackingOrderId && <OrderTracking orderId={trackingOrderId} onClose={() => setTrackingOrderId(null)} />}

      {returnOrder && <RequestReturnModal order={returnOrder} onClose={() => setReturnOrder(null)} onSubmitted={() => {
      setReturnOrder(null);
      toast.success("Return requested — we'll email you once it's reviewed.");
      refetchOrders();
    }} />}
    </>;
}
function OrderRow({
  order,
  onTrack,
  onReturn
}: {
  order: any;
  onTrack: () => void;
  onReturn: () => void;
}) {
  return <div className='p-4 border border-gray-100 rounded-xl hover:border-[#E8553A]/20 transition-colors'>
      <div className='flex items-center justify-between'>
        <Link href={`/orders/${order.id}`} className='flex items-center gap-3 group'>
          <div className='w-10 h-10 bg-[#0A1F44]/5 rounded-xl flex items-center justify-center'>
            <PackageIcon size={18} className='text-[#0A1F44]' />
          </div>
          <div>
            <p className='font-montserrat font-bold text-sm text-[#0A1F44] group-hover:text-[#E8553A] transition-colors'>
              #{order.display_id ?? order.id}
            </p>
            <p className='text-xs text-gray-400 font-lato'>
              {new Date(order.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}{' '}
              · {order.items?.length ?? 0} items
            </p>
          </div>
        </Link>
        <p className='font-montserrat font-black text-sm text-[#0A1F44]'>
          {formatCurrency(order.total ?? 0)}
        </p>
      </div>

      <div className='flex items-center justify-between mt-3 pt-3 border-t border-gray-100'>
        <p className='text-xs text-gray-400 font-lato capitalize'>
          {order.payment_status}
        </p>
        <div className='flex items-center gap-3'>
          <button onClick={onTrack} className='text-xs font-semibold text-[#0A1F44] hover:text-[#E8553A] font-lato flex items-center gap-1 transition-colors'>
            🚚 Track
          </button>
          {order.payment_status === 'captured' && order.status !== 'canceled' && <button onClick={onReturn} className='text-xs font-semibold text-[#0A1F44] hover:text-[#E8553A] font-lato transition-colors'>
                ↩️ Request Return
              </button>}
        </div>
      </div>
    </div>;
}
