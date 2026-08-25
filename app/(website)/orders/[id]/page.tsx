'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { getDisplayOrderStatus } from '@/lib/order-status';
import { ChevronRightIcon, PackageIcon, StarIcon } from '@/components/ui/Icons';
import OrderTracking from '@/components/website/OrderTracking';
import RequestReturnModal from '@/components/website/RequestReturnModal';
import WriteReviewModal from '@/components/website/WriteReviewModal';
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#FFC453]/15 text-[#916A00]',
  confirmed: 'bg-[#2C6ECB]/15 text-[#2C6ECB]',
  processing: 'bg-[#2C6ECB]/15 text-[#2C6ECB]',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-[#008060]/15 text-[#008060]',
  cancelled: 'bg-[#D82C0D]/15 text-[#D82C0D]',
  refunded: 'bg-gray-100 text-gray-600'
};
interface ReviewItem {
  productId: string;
  productTitle: string;
  thumbnail?: string | null;
  orderId: string;
}
export default function OrderDetailPage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = use(params);
  const {
    data: order,
    isLoading,
    error,
    refetch
  } = useOrder(id);
  const [showTracking, setShowTracking] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [reviewItem, setReviewItem] = useState<ReviewItem | null>(null);
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  const isPickup = order?.metadata?.fulfillment_type === 'pickup';
  const displayStatus = order ? getDisplayOrderStatus(order) : 'pending';
  const isDelivered = order?.status === 'completed' || order?.fulfillment_status === 'fulfilled' || displayStatus === 'delivered';
  if (isLoading) {
    return <div className='min-h-screen bg-[#F2F4F7] flex items-center justify-center'>
        <div className='w-8 h-8 border-2 border-[#0A1F44] border-t-transparent rounded-full animate-spin' />
      </div>;
  }
  if (error || !order) {
    return <div className='min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center gap-4 px-4'>
        <PackageIcon size={48} className='text-gray-300' />
        <p className='text-gray-500 font-lato'>
          We couldn&apos;t find that order.
        </p>
        <Link href='/profile?tab=orders' className='bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full hover:bg-[#D4441F] transition-colors'>
          Back to My Orders
        </Link>
      </div>;
  }
  const remainingReturnQty: Record<string, number> = {};
  for (const item of order.items ?? []) {
    remainingReturnQty[item.id] = item.quantity;
  }
  for (const record of order.metadata?.returns ?? []) {
    if (record.status === 'rejected') continue;
    for (const line of record.items ?? []) {
      remainingReturnQty[line.item_id] = (remainingReturnQty[line.item_id] ?? 0) - line.quantity;
    }
  }
  const canReturn = order.payment_status === 'captured' && order.status !== 'canceled' && Object.values(remainingReturnQty).some(qty => qty > 0);
  return <>
      <div className='min-h-screen bg-[#F2F4F7]'>
        <div className='bg-[#0A1F44] py-10'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-3'>
              <Link href='/' className='hover:text-white'>
                Home
              </Link>
              <ChevronRightIcon size={14} />
              <Link href='/profile?tab=orders' className='hover:text-white'>
                My Orders
              </Link>
              <ChevronRightIcon size={14} />
              <span className='text-white'>
                #{order.display_id ?? order.id.slice(-6)}
              </span>
            </div>
            <div className='flex items-center gap-3 flex-wrap'>
              <h1 className='font-montserrat font-black text-3xl text-white'>
                Order #{order.display_id ?? order.id.slice(-6)}
              </h1>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold font-montserrat capitalize ${STATUS_COLORS[displayStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {displayStatus}
              </span>
              {isPickup && <span className='px-3 py-1.5 rounded-full text-xs font-bold font-montserrat bg-white/10 text-white'>
                  🏬 Store Pickup
                </span>}
            </div>
            <p className='text-white/70 font-lato mt-1'>
              Placed on{' '}
              {new Date(order.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            </p>
          </div>
        </div>

        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {}
          <div className='lg:col-span-2 space-y-4'>
            <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-100'>
                <h2 className='font-montserrat font-bold text-[#0A1F44]'>
                  Items ({order.items?.length ?? 0})
                </h2>
              </div>
              <div className='divide-y divide-gray-100'>
                {(order.items ?? []).map((item: any) => {
                const productId = item.variant?.product_id ?? item.product_id;
                const alreadyReviewed = reviewedItems.has(item.id);
                return <div key={item.id} className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-14 h-14 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center overflow-hidden'>
                          {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className='w-full h-full object-cover' /> : <PackageIcon size={20} className='text-gray-400' />}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='font-montserrat font-bold text-sm text-[#0A1F44] truncate'>
                            {item.title}
                          </p>
                          <p className='text-xs text-gray-400 font-lato'>
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className='font-montserrat font-black text-sm text-[#0A1F44]'>
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>

                      {}
                      {isDelivered && productId && <div className='mt-3 flex justify-end'>
                          {alreadyReviewed ? <span className='text-xs text-green-600 font-lato flex items-center gap-1'>
                              <span>✓</span> Review submitted — thank you!
                            </span> : <button onClick={() => setReviewItem({
                      productId,
                      productTitle: item.title,
                      thumbnail: item.thumbnail,
                      orderId: order.id
                    })} className='flex items-center gap-1.5 text-xs font-semibold text-[#E8553A] hover:text-[#D4441F] font-montserrat transition-colors'>
                              <StarIcon size={13} filled className='text-amber-400' />
                              Write a Review
                            </button>}
                        </div>}
                    </div>;
              })}
              </div>
              <div className='px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5'>
                <div className='flex items-center justify-between text-sm font-lato text-gray-500'>
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal ?? 0)}</span>
                </div>
                {!!order.shipping_total && <div className='flex items-center justify-between text-sm font-lato text-gray-500'>
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shipping_total ?? 0)}</span>
                  </div>}
                <div className='flex items-center justify-between font-montserrat font-black text-[#0A1F44] pt-1'>
                  <span>Total</span>
                  <span>{formatCurrency(order.total ?? 0)}</span>
                </div>
              </div>
            </div>

            {}
            {isDelivered && <div className='bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center gap-3'>
                <span className='text-2xl shrink-0'>⭐</span>
                <div>
                  <p className='font-montserrat font-bold text-sm text-[#0A1F44]'>
                    Enjoying your purchase?
                  </p>
                  <p className='text-xs text-gray-500 font-lato mt-0.5'>
                    Share your experience — your review helps other shoppers.
                  </p>
                </div>
              </div>}
          </div>

          {}
          <div className='space-y-4'>
            {isPickup ? <div className='bg-white rounded-2xl border border-gray-100 p-5'>
                <h2 className='font-montserrat font-bold text-[#0A1F44] mb-2'>
                  🏬 Collect In-Store
                </h2>
                <p className='text-sm text-gray-500 font-lato'>
                  This order is being handed to you at our store — there&apos;s
                  no courier delivery for pickup orders.
                </p>
              </div> : <div className='bg-white rounded-2xl border border-gray-100 p-5'>
                <h2 className='font-montserrat font-bold text-[#0A1F44] mb-2'>
                  🚚 Delivery
                </h2>
                {order.shipping_address && <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                    {order.shipping_address.first_name}{' '}
                    {order.shipping_address.last_name}
                    <br />
                    {order.shipping_address.address_1}
                    {order.shipping_address.address_2 ? `, ${order.shipping_address.address_2}` : ''}
                    <br />
                    {order.shipping_address.city},{' '}
                    {order.shipping_address.postal_code}
                  </p>}
                {}
                {!isDelivered && <button onClick={() => setShowTracking(true)} className='mt-3 text-sm font-semibold text-[#E8553A] hover:underline font-lato'>
                    Track this order →
                  </button>}
                {isDelivered && <p className='mt-3 text-xs text-green-600 font-lato font-semibold flex items-center gap-1'>
                    <span>✓</span> Delivered successfully
                  </p>}
              </div>}

            <div className='bg-white rounded-2xl border border-gray-100 p-5'>
              <h2 className='font-montserrat font-bold text-[#0A1F44] mb-2'>
                Payment
              </h2>
              <p className='text-sm font-lato capitalize text-gray-600'>
                {order.payment_status?.replace(/_/g, ' ')}
              </p>
            </div>

            {canReturn && <button onClick={() => setShowReturn(true)} className='w-full bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition-shadow'>
                <span className='font-montserrat font-bold text-[#0A1F44]'>
                  ↩️ Request Return
                </span>
              </button>}
          </div>
        </div>
      </div>

      {showTracking && <OrderTracking orderId={order.id} onClose={() => setShowTracking(false)} />}

      {showReturn && <RequestReturnModal order={order} onClose={() => setShowReturn(false)} onSubmitted={() => {
      setShowReturn(false);
      toast.success("Return requested — we'll email you once it's reviewed.");
      refetch();
    }} />}

      {reviewItem && <WriteReviewModal item={reviewItem} onClose={() => setReviewItem(null)} onSubmitted={() => {
      setReviewedItems(prev => {
        const next = new Set(prev);
        const matchedItem = (order.items ?? []).find((i: any) => i.variant?.product_id === reviewItem.productId || i.product_id === reviewItem.productId);
        if (matchedItem) next.add(matchedItem.id);
        return next;
      });
      setReviewItem(null);
      toast.success('Review submitted — thank you! 🎉');
    }} />}
    </>;
}
