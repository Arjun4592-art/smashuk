'use client'
import { use, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { PackageIcon } from '@/components/ui/Icons'

interface TrackingStep {
  id: string
  label: string
  description: string
  icon: string
  done: boolean
  date: string | null
}
interface PublicTrackingData {
  orderId: string
  displayId: string
  isPickup: boolean
  storeLocation?: {
    name: string
    address: {
      line1: string
      line2: string
      city: string
      state: string
      pincode: string
      country: string
    } | null
    phone: string
    email: string
  } | null
  steps: TrackingStep[]
  currentStep: number
  trackingNumber: string | null
  carrier: string
  estimatedDelivery: string | null
  items: {
    id: string
    title: string
    quantity: number
    thumbnail: string | null
    unitPrice: number
  }[]
  shippingAddress: {
    city: string
    postal_code: string
    country_code: string
  } | null
  total: number
}

function directionsUrl(
  storeLocation: PublicTrackingData['storeLocation'],
): string {
  const addr = storeLocation?.address
  const line =
    addr && (addr.line1 || addr.city)
      ? [
          addr.line1,
          addr.line2,
          addr.city,
          addr.state,
          addr.pincode,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ')
      : ''
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(line)}`
}

function TrackPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('t') ?? ''
  const [data, setData] = useState<PublicTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/public/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`,
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load order')
        setData(json.tracking)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, token])

  return (
    <div className='min-h-screen bg-[#F2F4F7]'>
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-2xl mx-auto px-4 sm:px-6'>
          <Link href='/' className='text-white/60 text-sm hover:text-white'>
            ← Back to home
          </Link>
          <h1 className='font-montserrat font-black text-2xl sm:text-3xl text-white mt-3'>
            {data ? `Order ${data.displayId}` : 'Order status'}
          </h1>
          <p className='text-white/60 text-sm mt-1'>
            Anyone with this link can view this order&apos;s status — no account
            needed.
          </p>
        </div>
      </div>

      <div className='max-w-2xl mx-auto px-4 sm:px-6 py-8'>
        {loading && (
          <div className='bg-white rounded-2xl border border-gray-100 p-6 space-y-4 animate-pulse'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='flex gap-3'>
                <div className='w-8 h-8 bg-gray-100 rounded-full shrink-0' />
                <div className='flex-1 space-y-1.5 pt-1'>
                  <div className='h-3.5 bg-gray-100 rounded w-32' />
                  <div className='h-3 bg-gray-100 rounded w-48' />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className='bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col items-center gap-3'>
            <PackageIcon size={40} className='text-gray-300' />
            <p className='font-montserrat font-bold text-[#0A1F44]'>
              This link isn&apos;t valid
            </p>
            <p className='text-sm text-gray-500 font-lato max-w-sm'>
              {error === 'Invalid or expired link'
                ? "We couldn't verify this order link. Double-check the QR code or link you used, or contact us for help."
                : error}
            </p>
          </div>
        )}

        {data && (
          <div className='space-y-5'>
            {data.isPickup ? (
              <div className='bg-[#FFF4E4] border border-[#FDE7BE] rounded-2xl p-5 flex items-start gap-3'>
                <span className='text-2xl'>🏬</span>
                <div className='flex-1'>
                  <p className='text-xs text-[#946200] font-semibold uppercase tracking-wide'>
                    Collect your order from
                  </p>
                  <p className='text-sm font-bold text-gray-900 mt-1'>
                    {data.storeLocation?.name}
                  </p>
                  {data.storeLocation?.address &&
                  (data.storeLocation.address.line1 ||
                    data.storeLocation.address.city) ? (
                    <p className='text-xs text-gray-600 mt-1 leading-relaxed'>
                      {data.storeLocation.address.line1}
                      {data.storeLocation.address.line2
                        ? `, ${data.storeLocation.address.line2}`
                        : ''}
                      <br />
                      {[
                        data.storeLocation.address.city,
                        data.storeLocation.address.state,
                        data.storeLocation.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  ) : null}
                  <p className='text-xs text-gray-500 mt-1.5'>
                    {data.storeLocation?.phone} · {data.storeLocation?.email}
                  </p>
                  <a
                    href={directionsUrl(data.storeLocation)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A1F44] hover:bg-[#132a5c] text-white text-xs font-semibold transition-colors'
                  >
                    📍 Get Directions
                  </a>
                </div>
              </div>
            ) : (
              <>
                {data.estimatedDelivery && (
                  <div className='bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 flex items-center gap-3'>
                    <span className='text-2xl'>📦</span>
                    <div>
                      <p className='text-xs text-green-600 font-semibold uppercase tracking-wide'>
                        Estimated Delivery
                      </p>
                      <p className='text-sm font-bold text-gray-900'>
                        {data.estimatedDelivery}
                      </p>
                    </div>
                  </div>
                )}
                {data.trackingNumber && (
                  <div className='bg-white border border-gray-100 rounded-2xl p-5'>
                    <p className='text-xs text-gray-500 mb-1'>
                      Tracking Number ({data.carrier})
                    </p>
                    <p className='text-sm font-mono font-semibold text-gray-900'>
                      {data.trackingNumber}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className='bg-white rounded-2xl border border-gray-100 p-5'>
              <h2 className='font-montserrat font-bold text-[#0A1F44] mb-4'>
                Order Status
              </h2>
              {data.steps.map((step, i) => {
                const isLast = i === data.steps.length - 1
                const isActive = i === data.currentStep - 1
                return (
                  <div key={step.id} className='flex gap-3'>
                    <div className='flex flex-col items-center shrink-0'>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                          step.done
                            ? 'bg-green-500'
                            : isActive
                              ? 'bg-[#0A1F44] ring-4 ring-blue-100'
                              : 'bg-gray-100'
                        }`}
                      >
                        {step.done ? (
                          <span className='text-white text-sm'>✓</span>
                        ) : (
                          <span className='text-sm'>{step.icon}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-8 mt-1 ${step.done ? 'bg-green-400' : 'bg-gray-100'}`}
                        />
                      )}
                    </div>
                    <div className='flex-1 pb-5'>
                      <p
                        className={`text-sm font-semibold leading-none mb-1 ${step.done ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {step.label}
                      </p>
                      <p className='text-xs text-gray-400'>
                        {step.description}
                      </p>
                      {step.date && (
                        <p className='text-xs text-green-600 mt-0.5'>
                          {new Date(step.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className='bg-white rounded-2xl border border-gray-100 p-5'>
              <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
                Items in this order
              </p>
              <div className='space-y-2'>
                {data.items.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center gap-3 bg-gray-50 rounded-xl p-3'
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className='w-10 h-10 rounded-lg object-cover shrink-0'
                      />
                    ) : (
                      <div className='w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-lg'>
                        📦
                      </div>
                    )}
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
                  </div>
                ))}
              </div>

              {data.shippingAddress && (
                <div className='mt-4 pt-4 border-t border-gray-100'>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                    Delivering to
                  </p>
                  <p className='text-xs text-gray-600'>
                    {[
                      data.shippingAddress.city,
                      data.shippingAddress.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}

              <div className='flex items-center justify-between pt-4 mt-4 border-t border-gray-100'>
                <p className='text-sm text-gray-500'>Order Total</p>
                <p className='text-sm font-bold text-gray-900'>
                  {formatCurrency(data.total ?? 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PublicOrderTrackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <TrackPageInner id={id} />
    </Suspense>
  )
}
