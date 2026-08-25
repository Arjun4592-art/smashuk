'use client';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
interface TrackingStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  done: boolean;
  date: string | null;
}
interface TrackingData {
  orderId: string;
  displayId: string;
  status: string;
  fulfillmentStatus: string;
  isPickup?: boolean;
  storeLocation?: {
    name: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    } | null;
    phone: string;
    email: string;
  } | null;
  steps: TrackingStep[];
  currentStep: number;
  trackingNumber: string | null;
  carrier: string;
  estimatedDelivery: string | null;
  items: {
    id: string;
    title: string;
    quantity: number;
    thumbnail: string | null;
    unitPrice: number;
  }[];
  shippingAddress: any;
  total: number;
}
interface Props {
  orderId: string;
  onClose: () => void;
}
const STORE_ADDRESS = '112A Hulme High Street, Manchester M15 5JP';
function directionsUrl(storeLocation: TrackingData['storeLocation']): string {
  const addr = storeLocation?.address;
  const line = addr && (addr.line1 || addr.city) ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(', ') : STORE_ADDRESS;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(line)}`;
}
export default function OrderTracking({
  orderId,
  onClose
}: Props) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/store/tracking?id=${orderId}`, {
          credentials: 'include'
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        setData(json.tracking);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);
  return <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm'>
      <div className='w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col'>
        {}
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0'>
          <div>
            <h2 className='font-semibold text-gray-900 text-base'>
              {data?.isPickup ? 'Store Pickup' : 'Track Order'}
            </h2>
            {data && <p className='text-xs text-gray-400 mt-0.5'>{data.displayId}</p>}
          </div>
          <button onClick={onClose} className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors'>
            ✕
          </button>
        </div>

        <div className='flex-1 overflow-y-auto'>
          {loading && <div className='p-6 space-y-4 animate-pulse'>
              {[...Array(5)].map((_, i) => <div key={i} className='flex gap-3'>
                  <div className='w-8 h-8 bg-gray-100 rounded-full shrink-0' />
                  <div className='flex-1 space-y-1.5 pt-1'>
                    <div className='h-3.5 bg-gray-100 rounded w-32' />
                    <div className='h-3 bg-gray-100 rounded w-48' />
                  </div>
                </div>)}
            </div>}

          {error && <div className='p-6 text-center'>
              <p className='text-sm text-gray-500'>{error}</p>
            </div>}

          {data && <div className='p-5 space-y-5'>
              {data.isPickup ? (<div className='bg-[#FFF4E4] border border-[#FDE7BE] rounded-xl p-4 flex items-start gap-3'>
                  <span className='text-2xl'>🏬</span>
                  <div className='flex-1'>
                    <p className='text-xs text-[#946200] font-medium'>
                      Collect your order from
                    </p>
                    <p className='text-sm font-semibold text-gray-900 mt-0.5'>
                      {data.storeLocation?.name}
                    </p>
                    {data.storeLocation?.address && (data.storeLocation.address.line1 || data.storeLocation.address.city) ? <p className='text-xs text-gray-600 mt-1 leading-relaxed'>
                        {data.storeLocation.address.line1}
                        {data.storeLocation.address.line2 ? `, ${data.storeLocation.address.line2}` : ''}
                        <br />
                        {[data.storeLocation.address.city, data.storeLocation.address.state, data.storeLocation.address.pincode].filter(Boolean).join(', ')}
                        {data.storeLocation.address.country ? `, ${data.storeLocation.address.country}` : ''}
                      </p> : <p className='text-xs text-gray-600 mt-1'>
                        See our{' '}
                        <a href='/local-store' className='underline'>
                          store details
                        </a>{' '}
                        page for directions.
                      </p>}
                    <p className='text-xs text-gray-500 mt-1.5'>
                      {data.storeLocation?.phone} · {data.storeLocation?.email}
                    </p>
                    <a href={directionsUrl(data.storeLocation)} target='_blank' rel='noopener noreferrer' className='mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A1F44] hover:bg-[#132a5c] text-white text-xs font-semibold transition-colors'>
                      📍 Get Directions
                    </a>
                  </div>
                </div>) : <>
                  {}
                  <div className='bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex items-center gap-3'>
                    <span className='text-2xl'>📦</span>
                    <div>
                      <p className='text-xs text-green-600 font-medium'>
                        Estimated Delivery
                      </p>
                      <p className='text-sm font-semibold text-gray-900'>
                        {data.estimatedDelivery}
                      </p>
                    </div>
                  </div>

                  {}
                  {data.trackingNumber && <div className='bg-gray-50 rounded-xl p-4'>
                      <p className='text-xs text-gray-500 mb-1'>
                        Tracking Number ({data.carrier})
                      </p>
                      <p className='text-sm font-mono font-semibold text-gray-900'>
                        {data.trackingNumber}
                      </p>
                    </div>}
                </>}

              {}
              <div className='space-y-0'>
                {data.steps.map((step, i) => {
              const isLast = i === data.steps.length - 1;
              const isActive = i === data.currentStep - 1;
              return <div key={step.id} className='flex gap-3'>
                      {}
                      <div className='flex flex-col items-center shrink-0'>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${step.done ? 'bg-green-500' : isActive ? 'bg-[#0A1F44] ring-4 ring-blue-100' : 'bg-gray-100'}`}>
                          {step.done ? '✓' : <span className='text-sm'>{step.icon}</span>}
                        </div>
                        {!isLast && <div className={`w-0.5 h-8 mt-1 ${step.done ? 'bg-green-400' : 'bg-gray-100'}`} />}
                      </div>

                      {}
                      <div className='flex-1 pb-5'>
                        <p className={`text-sm font-semibold leading-none mb-1 ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        <p className='text-xs text-gray-400'>
                          {step.description}
                        </p>
                        {step.date && <p className='text-xs text-green-600 mt-0.5'>
                            {new Date(step.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                          </p>}
                      </div>
                    </div>;
            })}
              </div>

              {}
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                  Items in this order
                </p>
                <div className='space-y-2'>
                  {data.items.map(item => <div key={item.id} className='flex items-center gap-3 bg-gray-50 rounded-xl p-3'>
                      {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className='w-10 h-10 rounded-lg object-cover shrink-0' /> : <div className='w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-lg'>
                          📦
                        </div>}
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-medium text-gray-900 truncate'>
                          {item.title}
                        </p>
                        <p className='text-xs text-gray-400'>
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className='text-xs font-semibold text-gray-900 shrink-0'>
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>)}
                </div>
              </div>

              {}
              {data.shippingAddress && <div>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                    Delivery Address
                  </p>
                  <div className='bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-0.5'>
                    <p className='font-medium text-gray-900'>
                      {data.shippingAddress.first_name}{' '}
                      {data.shippingAddress.last_name}
                    </p>
                    <p>{data.shippingAddress.address_1}</p>
                    {data.shippingAddress.address_2 && <p>{data.shippingAddress.address_2}</p>}
                    <p>
                      {data.shippingAddress.city},{' '}
                      {data.shippingAddress.postal_code}
                    </p>
                  </div>
                </div>}

              {}
              <div className='flex items-center justify-between py-3 border-t border-gray-100'>
                <p className='text-sm text-gray-500'>Order Total</p>
                <p className='text-sm font-bold text-gray-900'>
                  {formatCurrency(data.total ?? 0)}
                </p>
              </div>
            </div>}
        </div>
      </div>
    </div>;
}
