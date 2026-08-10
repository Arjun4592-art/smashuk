'use client'
import { useState, useEffect } from 'react'
import { usePOSStore } from '@/store/posStore'
import type { ReturnItem } from '@/store/posStore'
import { markPOSOrderReturned, type PosOrderRecord } from '@/lib/api/pos'

interface Props {
  // Real Medusa order history (see app/pos/terminal/orders/page.tsx) —
  // this used to read `completedOrders` straight from the local zustand
  // store (localStorage-only), so a return processed here never showed up
  // on any other till or in Medusa itself.
  orders: PosOrderRecord[]
  onReturned: (medusaOrderId: string) => void
  onClose: () => void
}

const RETURN_REASONS = [
  'Defective product',
  'Wrong item received',
  'Changed mind',
  'Size issue',
  'Damaged packaging',
  'Other',
]

export default function ReturnModal({ orders, onReturned, onClose }: Props) {
  const completedOrders = orders
  const [step, setStep] = useState<'search' | 'items' | 'success'>('search')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [returnItems, setReturnItems] = useState<
    Record<string, { qty: number; reason: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lock background scroll while open. The Orders list scrolls inside its
  // own #pos-orders-scroll-area container (not <body>), so that has to be
  // locked directly too — see same fix in OrderDetailModal.tsx.
  useEffect(() => {
    const scrollEl = document.getElementById('pos-orders-scroll-area')
    const prevBodyOverflow = document.body.style.overflow
    const prevElOverflow = scrollEl?.style.overflow ?? ''

    document.body.style.overflow = 'hidden'
    if (scrollEl) scrollEl.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevBodyOverflow
      if (scrollEl) scrollEl.style.overflow = prevElOverflow
    }
  }, [])

  const filteredOrders = completedOrders.filter(
    (o) =>
      !o.returned &&
      (!search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name.toLowerCase().includes(search.toLowerCase())),
  )

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order)
    setStep('items')
  }

  const handleQtyChange = (productId: string, qty: number) => {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], qty },
    }))
  }

  const handleReasonChange = (productId: string, reason: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], reason },
    }))
  }

  const [serverRefundTotal, setServerRefundTotal] = useState(0)

  const handleProcessReturn = async () => {
    if (!selectedOrder) return
    const items: ReturnItem[] = Object.entries(returnItems)
      .filter(([, v]) => v.qty > 0)
      .map(([productId, v]) => {
        const item = selectedOrder.items.find(
          (i: any) => i.product.id === productId,
        )
        return {
          productId,
          name: item?.product.name ?? '',
          quantity: v.qty,
          price: item?.product.price ?? 0,
          reason: v.reason || 'Other',
        }
      })
    if (!items.length) return
    setError(null)
    setSubmitting(true)
    try {
      // Writes a return record onto the real Medusa order AND issues a
      // real refund on the captured payment — see
      // lib/api/medusa-returns.ts. Keyed by the real order line item id
      // (product.lineItemId), not the variant id, so the refund amount
      // is computed server-side from the order's actual unit_price.
      const { refund_amount } = await markPOSOrderReturned(
        selectedOrder.medusaOrderId ?? selectedOrder.id,
        items[0]?.reason || 'Other',
        items
          .map((i) => {
            const item = selectedOrder.items.find(
              (si: any) => si.product.id === i.productId,
            )
            return { item_id: item?.product.lineItemId, quantity: i.quantity }
          })
          .filter((i) => i.item_id),
      )
      setServerRefundTotal(refund_amount)
      // NOTE: this bumps the POS terminal's *displayed* stock count only —
      // it was already a client-side-only mock before this fix, not a
      // write to Medusa's real inventory. A true inventory reversal on
      // return would need Medusa's Inventory API and is a separate piece
      // of work from making order history itself Medusa-backed.
      usePOSStore
        .getState()
        .restoreStock(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )
      onReturned(selectedOrder.medusaOrderId ?? selectedOrder.id)
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process return')
    } finally {
      setSubmitting(false)
    }
  }

  const refundTotal = Object.entries(returnItems)
    .filter(([, v]) => v.qty > 0)
    .reduce((sum, [productId, v]) => {
      const item = selectedOrder?.items.find(
        (i: any) => i.product.id === productId,
      )
      return sum + (item?.product.price ?? 0) * v.qty
    }, 0)

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-md rounded-xl overflow-hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className='flex items-center justify-between px-5 py-4'
          style={{ borderBottom: '1px solid #E1E3E5' }}
        >
          <h3 className='text-base font-semibold' style={{ color: '#202223' }}>
            {step === 'search'
              ? 'Process return'
              : step === 'items'
                ? `Return — ${selectedOrder?.id}`
                : 'Return processed'}
          </h3>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]'
            style={{ color: '#6D7175' }}
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Search step */}
        {step === 'search' && (
          <>
            <div className='p-5'>
              <div
                className='flex items-center gap-2 px-3 py-2 rounded-lg border mb-3'
                style={{ borderColor: '#E1E3E5' }}
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='#8C9196'
                  strokeWidth='2'
                  strokeLinecap='round'
                >
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by order ID or customer...'
                  className='flex-1 bg-transparent outline-none text-sm'
                  style={{ color: '#202223' }}
                />
              </div>
              <div
                className='overflow-y-auto space-y-1'
                style={{ maxHeight: 280 }}
              >
                {filteredOrders.length === 0 ? (
                  <div className='text-center py-8'>
                    <p className='text-sm' style={{ color: '#8C9196' }}>
                      No orders found
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleSelectOrder(o)}
                      className='w-full flex items-center gap-3 p-3 rounded-lg text-left border transition-colors hover:border-[#008060] hover:bg-[#F2F7F5]'
                      style={{ borderColor: '#E1E3E5' }}
                    >
                      <div className='flex-1 min-w-0'>
                        <p
                          className='text-sm font-medium'
                          style={{ color: '#202223' }}
                        >
                          {o.id}
                        </p>
                        <p className='text-xs' style={{ color: '#8C9196' }}>
                          {o.customer?.name || 'Walk-in'} · {o.items.length}{' '}
                          items
                        </p>
                      </div>
                      <span
                        className='text-sm font-medium'
                        style={{ color: '#202223' }}
                      >
                        £{o.total.toLocaleString('en-GB')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Items step */}
        {step === 'items' && selectedOrder && (
          <>
            <div
              className='overflow-y-auto p-5 space-y-3'
              style={{ maxHeight: 360 }}
            >
              {selectedOrder.items.map((item: any) => {
                const ri = returnItems[item.product.id]
                return (
                  <div
                    key={item.product.id}
                    className='p-3 rounded-lg border'
                    style={{ borderColor: '#E1E3E5' }}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div>
                        <p
                          className='text-sm font-medium'
                          style={{ color: '#202223' }}
                        >
                          {item.product.name}
                        </p>
                        <p className='text-xs' style={{ color: '#8C9196' }}>
                          £{item.product.price.toLocaleString('en-GB')} · Qty:{' '}
                          {item.quantity}
                        </p>
                      </div>
                      {/* Qty selector */}
                      <div
                        className='flex items-center rounded border overflow-hidden'
                        style={{ borderColor: '#E1E3E5' }}
                      >
                        <button
                          onClick={() =>
                            handleQtyChange(
                              item.product.id,
                              Math.max(0, (ri?.qty ?? 0) - 1),
                            )
                          }
                          className='w-7 h-7 flex items-center justify-center hover:bg-[#F6F6F7]'
                          style={{ color: '#6D7175' }}
                        >
                          <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                          >
                            <line x1='5' y1='12' x2='19' y2='12' />
                          </svg>
                        </button>
                        <span
                          className='w-8 h-7 flex items-center justify-center text-xs font-medium'
                          style={{
                            borderLeft: '1px solid #E1E3E5',
                            borderRight: '1px solid #E1E3E5',
                            color: '#202223',
                          }}
                        >
                          {ri?.qty ?? 0}
                        </span>
                        <button
                          onClick={() =>
                            handleQtyChange(
                              item.product.id,
                              Math.min(item.quantity, (ri?.qty ?? 0) + 1),
                            )
                          }
                          className='w-7 h-7 flex items-center justify-center hover:bg-[#F6F6F7]'
                          style={{ color: '#6D7175' }}
                        >
                          <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                          >
                            <line x1='12' y1='5' x2='12' y2='19' />
                            <line x1='5' y1='12' x2='19' y2='12' />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Reason */}
                    {(ri?.qty ?? 0) > 0 && (
                      <select
                        value={ri?.reason ?? ''}
                        onChange={(e) =>
                          handleReasonChange(item.product.id, e.target.value)
                        }
                        className='w-full px-2 py-1.5 rounded border text-xs outline-none mt-1'
                        style={{ borderColor: '#E1E3E5', color: '#202223' }}
                      >
                        <option value=''>Select reason...</option>
                        {RETURN_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>

            {refundTotal > 0 && (
              <div
                className='mx-5 mb-4 p-3 rounded-lg'
                style={{ background: '#F2F7F5' }}
              >
                <div
                  className='flex justify-between text-sm font-medium'
                  style={{ color: '#202223' }}
                >
                  <span>Refund total</span>
                  <span style={{ color: '#008060' }}>
                    £{refundTotal.toLocaleString('en-GB')}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p
                className='px-5 -mt-2 mb-3 text-xs'
                style={{ color: '#D82C0D' }}
              >
                {error}
              </p>
            )}

            <div className='px-5 pb-5 flex gap-2'>
              <button
                onClick={() => setStep('search')}
                disabled={submitting}
                className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
              >
                Back
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={refundTotal === 0 || submitting}
                className='flex-1 py-2.5 rounded-lg text-sm font-semibold'
                style={{
                  background: refundTotal > 0 ? '#008060' : '#E1E3E5',
                  color: refundTotal > 0 ? '#FFFFFF' : '#8C9196',
                }}
              >
                {submitting ? 'Processing…' : 'Process return'}
              </button>
            </div>
          </>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className='p-5 text-center'>
            <div
              className='w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3'
              style={{ background: '#F2F7F5' }}
            >
              <svg
                width='28'
                height='28'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#008060'
                strokeWidth='2.5'
                strokeLinecap='round'
              >
                <path d='M20 6L9 17l-5-5' />
              </svg>
            </div>
            <h4
              className='text-base font-semibold mb-1'
              style={{ color: '#202223' }}
            >
              Return processed
            </h4>
            <p className='text-sm mb-5' style={{ color: '#6D7175' }}>
              Refund of £{serverRefundTotal.toLocaleString('en-GB')} has been
              processed successfully.
            </p>
            <button
              onClick={onClose}
              className='w-full py-2.5 rounded-lg text-sm font-medium'
              style={{ background: '#008060', color: '#FFFFFF' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
