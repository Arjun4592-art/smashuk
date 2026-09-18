'use client'

import { useMemo, useState } from 'react'

const RETURN_REASONS = [
  'Defective product',
  'Wrong item received',
  'Changed mind',
  'Size issue',
  'Damaged packaging',
  'Other',
]

function fmt(amount: number, currency = 'GBP') {
  const symbol =
    currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return (
    symbol +
    amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

interface Props {
  order: any
  remainingQty: Record<string, number>
  onSubmit: (
    items: { item_id: string; quantity: number }[],
    reason: string,
    shippingOption: 'label' | 'no_shipping',
    trackingNumber?: string,
    shippingCarrier?: string,
    refundAmount?: number,
  ) => Promise<void>
  onClose: () => void
}

type Step = 'items' | 'shipping' | 'summary'

const SHIPPING_CARRIERS = [
  'Royal Mail',
  'DPD',
  'Evri',
  'DHL',
  'UPS',
  'FedEx',
  'Parcelforce',
  'Other',
]

export default function ReturnExchangeModal({
  order,
  remainingQty,
  onSubmit,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('items')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [shippingOption, setShippingOption] = useState<'label' | 'no_shipping'>(
    'label',
  )
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingCarrier, setShippingCarrier] = useState('')
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currency = order.currency_code ?? 'gbp'

  const returnableItems = useMemo(
    () => (order.items ?? []).filter((i: any) => (remainingQty[i.id] ?? 0) > 0),
    [order.items, remainingQty],
  )

  const selectedItems = useMemo(
    () =>
      Object.entries(qtys)
        .filter(([, qty]) => qty > 0)
        .map(([item_id, quantity]) => {
          const item = returnableItems.find((i: any) => i.id === item_id)
          return { item_id, quantity, item }
        }),
    [qtys, returnableItems],
  )

  const calculatedTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, { quantity, item }) => sum + (item?.unit_price ?? 0) * quantity,
        0,
      ),
    [selectedItems],
  )

  const parsedCustomAmount = parseFloat(customAmount)
  const refundTotal =
    useCustomAmount && !Number.isNaN(parsedCustomAmount)
      ? parsedCustomAmount
      : calculatedTotal

  // ── Step validation ──────────────────────────────────────────────
  const canGoToShipping = selectedItems.length > 0 && !!reason
  const canGoToSummary = true // shipping step is always valid

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (
      useCustomAmount &&
      (Number.isNaN(parsedCustomAmount) || parsedCustomAmount <= 0)
    ) {
      setError('Enter a valid custom refund amount')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(
        selectedItems.map(({ item_id, quantity }) => ({ item_id, quantity })),
        reason,
        shippingOption,
        trackingNumber || undefined,
        shippingCarrier || undefined,
        useCustomAmount ? parsedCustomAmount : undefined,
      )
    } catch (err: any) {
      setError(err.message ?? 'Failed to process return')
      setSubmitting(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    items: 'Return and exchange',
    shipping: 'Return and exchange',
    summary: 'Return and exchange',
  }

  const stepIndex: Record<Step, number> = { items: 0, shipping: 1, summary: 2 }

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4'
      onClick={onClose}
    >
      <div
        className='bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E1E3E5] shrink-0'>
          <div className='flex items-center gap-3'>
            {step !== 'items' && (
              <button
                onClick={() =>
                  setStep(step === 'summary' ? 'shipping' : 'items')
                }
                className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7] text-[#6D7175]'
              >
                ←
              </button>
            )}
            <h3 className='text-[15px] font-semibold text-[#202223]'>
              {stepTitles[step]}
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7] text-[#6D7175] text-lg'
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className='flex gap-1 px-5 pt-3 pb-1 shrink-0'>
          {(['items', 'shipping', 'summary'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                stepIndex[step] >= i ? 'bg-[#008060]' : 'bg-[#E1E3E5]'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {/* ── STEP 1: Select items ── */}
          {step === 'items' && (
            <div className='space-y-4'>
              <div>
                <p className='text-[13px] font-semibold text-[#202223] mb-0.5'>
                  Select quantity to return
                </p>
                <p className='text-[12px] text-[#8C9196]'>
                  #{order.display_id ?? order.id?.slice(-6)}
                  {order.shipping_address?.address_1
                    ? ` · Shipped from ${order.shipping_address.address_1}`
                    : ''}
                </p>
              </div>

              {returnableItems.length === 0 ? (
                <p className='text-[13px] text-[#6D7175] py-4 text-center'>
                  Every item has already been returned.
                </p>
              ) : (
                <div className='space-y-3'>
                  {returnableItems.map((item: any) => {
                    const max = remainingQty[item.id] ?? 0
                    const qty = qtys[item.id] ?? 0
                    const lineTotal = item.unit_price * qty
                    return (
                      <div
                        key={item.id}
                        className='p-3.5 rounded-xl border border-[#E1E3E5]'
                      >
                        <div className='flex items-start gap-3 mb-3'>
                          {/* Thumbnail */}
                          <div className='w-12 h-12 rounded-lg bg-[#F6F6F7] border border-[#E1E3E5] flex items-center justify-center overflow-hidden shrink-0'>
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className='w-full h-full object-cover'
                              />
                            ) : (
                              <span className='text-xl'>📦</span>
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[13px] font-medium text-[#202223] leading-snug'>
                              {item.title}
                            </p>
                            {item.variant_title &&
                              item.variant_title !== 'Default' && (
                                <span className='inline-block mt-1 px-2 py-0.5 bg-[#F6F6F7] text-[#6D7175] text-[11px] rounded-md'>
                                  {item.variant_title}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Quantity selector */}
                        <div className='flex items-center justify-between bg-[#F9FAFB] rounded-lg px-3 py-2 border border-[#E1E3E5]'>
                          <div>
                            <p className='text-[11px] text-[#8C9196]'>
                              Quantity
                            </p>
                            <p className='text-[13px] font-medium text-[#202223]'>
                              {qty}{' '}
                              <span className='text-[#8C9196]'>/ {max}</span>
                            </p>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={() =>
                                setQtys((p) => ({
                                  ...p,
                                  [item.id]: Math.max(0, qty - 1),
                                }))
                              }
                              className='w-8 h-8 flex items-center justify-center rounded-lg border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[#6D7175] text-lg font-light disabled:opacity-30'
                              disabled={qty === 0}
                            >
                              −
                            </button>
                            <button
                              onClick={() =>
                                setQtys((p) => ({
                                  ...p,
                                  [item.id]: Math.min(max, qty + 1),
                                }))
                              }
                              className='w-8 h-8 flex items-center justify-center rounded-lg border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[#6D7175] text-lg font-light disabled:opacity-30'
                              disabled={qty === max}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Price row */}
                        {qty > 0 && (
                          <div className='flex items-center justify-between mt-2 px-1'>
                            <p className='text-[12px] text-[#8C9196]'>
                              {fmt(item.unit_price, currency)}{' '}
                              <span className='text-[#C4C8CC]'>×</span>{' '}
                              <span className='text-[#202223] font-medium'>
                                {qty}
                              </span>
                            </p>
                            <p className='text-[12px] font-semibold text-[#202223]'>
                              {fmt(lineTotal, currency)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reason */}
              {returnableItems.length > 0 && (
                <div>
                  <p className='text-[12px] font-medium text-[#6D7175] mb-1.5'>
                    Return reason
                  </p>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className='w-full px-3 py-2.5 rounded-xl border border-[#E1E3E5] text-[13px] outline-none text-[#202223] bg-white focus:border-[#008060]'
                  >
                    <option value=''>Select reason…</option>
                    {RETURN_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Return shipping ── */}
          {step === 'shipping' && (
            <div className='space-y-4'>
              <p className='text-[13px] font-semibold text-[#202223]'>
                Return shipping options
              </p>

              {/* Upload label option */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  shippingOption === 'label'
                    ? 'border-[#008060] bg-[#F2F7F5]'
                    : 'border-[#E1E3E5] hover:border-[#C4C8CC]'
                }`}
                onClick={() => setShippingOption('label')}
              >
                <div className='flex items-center gap-3 mb-3'>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      shippingOption === 'label'
                        ? 'border-[#008060]'
                        : 'border-[#C4C8CC]'
                    }`}
                  >
                    {shippingOption === 'label' && (
                      <div className='w-2 h-2 rounded-full bg-[#008060]' />
                    )}
                  </div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    Add tracking info
                  </p>
                </div>

                {shippingOption === 'label' && (
                  <div className='space-y-3 mt-1'>
                    <input
                      type='text'
                      placeholder='Tracking number'
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className='w-full px-3 py-2.5 rounded-xl border border-[#E1E3E5] text-[13px] outline-none text-[#202223] bg-white focus:border-[#008060]'
                    />
                    <select
                      value={shippingCarrier}
                      onChange={(e) => setShippingCarrier(e.target.value)}
                      className='w-full px-3 py-2.5 rounded-xl border border-[#E1E3E5] text-[13px] outline-none text-[#202223] bg-white focus:border-[#008060]'
                    >
                      <option value=''>Shipping carrier</option>
                      {SHIPPING_CARRIERS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* No shipping option */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  shippingOption === 'no_shipping'
                    ? 'border-[#008060] bg-[#F2F7F5]'
                    : 'border-[#E1E3E5] hover:border-[#C4C8CC]'
                }`}
                onClick={() => setShippingOption('no_shipping')}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      shippingOption === 'no_shipping'
                        ? 'border-[#008060]'
                        : 'border-[#C4C8CC]'
                    }`}
                  >
                    {shippingOption === 'no_shipping' && (
                      <div className='w-2 h-2 rounded-full bg-[#008060]' />
                    )}
                  </div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    No shipping required
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Summary ── */}
          {step === 'summary' && (
            <div className='space-y-4'>
              <p className='text-[13px] font-semibold text-[#202223]'>
                Summary
              </p>

              {/* Items */}
              <div className='rounded-xl border border-[#E1E3E5] divide-y divide-[#F1F1F1]'>
                {selectedItems.map(({ item_id, quantity, item }) => (
                  <div
                    key={item_id}
                    className='flex items-center gap-3 px-4 py-3'
                  >
                    <div className='w-9 h-9 rounded-lg bg-[#F6F6F7] border border-[#E1E3E5] flex items-center justify-center overflow-hidden shrink-0'>
                      {item?.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <span className='text-base'>📦</span>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[12.5px] font-medium text-[#202223] truncate'>
                        {item?.title}
                      </p>
                      {item?.variant_title &&
                        item.variant_title !== 'Default' && (
                          <p className='text-[11px] text-[#8C9196]'>
                            {item.variant_title}
                          </p>
                        )}
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-[12.5px] font-semibold text-[#202223]'>
                        {fmt((item?.unit_price ?? 0) * quantity, currency)}
                      </p>
                      <p className='text-[11px] text-[#8C9196]'>× {quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping info */}
              <div className='p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E1E3E5] space-y-1'>
                <p className='text-[11px] font-semibold text-[#8C9196] uppercase tracking-wider'>
                  Return shipping
                </p>
                {shippingOption === 'no_shipping' ? (
                  <p className='text-[13px] text-[#202223]'>
                    No shipping required
                  </p>
                ) : (
                  <>
                    <p className='text-[13px] text-[#202223]'>
                      {trackingNumber || '—'}{' '}
                      {shippingCarrier && (
                        <span className='text-[#8C9196]'>
                          via {shippingCarrier}
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* Return reason */}
              <div className='p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E1E3E5]'>
                <p className='text-[11px] font-semibold text-[#8C9196] uppercase tracking-wider mb-1'>
                  Reason
                </p>
                <p className='text-[13px] text-[#202223]'>{reason}</p>
              </div>

              {/* Refund total */}
              <div className='p-3.5 rounded-xl bg-[#F2F7F5] border border-[#008060]/20 space-y-2'>
                <div className='flex justify-between items-center'>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    {useCustomAmount ? 'Calculated total' : 'Refund total'}
                  </p>
                  <p
                    className={`text-[13px] font-semibold ${
                      useCustomAmount
                        ? 'text-[#8C9196] line-through'
                        : 'text-[#008060]'
                    }`}
                  >
                    {fmt(calculatedTotal, currency)}
                  </p>
                </div>

                <label className='flex items-center gap-2 text-[12px] text-[#6D7175] cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={useCustomAmount}
                    onChange={(e) => {
                      setUseCustomAmount(e.target.checked)
                      if (e.target.checked && !customAmount)
                        setCustomAmount(calculatedTotal.toFixed(2))
                    }}
                    className='accent-[#008060]'
                  />
                  Use custom refund amount
                </label>

                {useCustomAmount && (
                  <div className='flex items-center gap-2'>
                    <span className='text-[13px] text-[#202223] font-medium'>
                      {currency.toUpperCase() === 'GBP'
                        ? '£'
                        : currency.toUpperCase()}
                    </span>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder='0.00'
                      className='flex-1 px-3 py-2 rounded-xl border border-[#E1E3E5] text-[13px] outline-none text-[#202223] focus:border-[#008060]'
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-5 py-4 border-t border-[#E1E3E5] shrink-0 space-y-2'>
          {error && (
            <p className='text-[12.5px] text-[#D82C0D] text-center'>{error}</p>
          )}

          {step === 'items' && (
            <div className='flex gap-2'>
              <button
                onClick={onClose}
                className='flex-1 py-2.5 border border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7] text-[13px] font-medium rounded-xl transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('shipping')}
                disabled={!canGoToShipping}
                className='flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-40'
              >
                Continue
              </button>
            </div>
          )}

          {step === 'shipping' && (
            <button
              onClick={() => setStep('summary')}
              className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-xl transition-colors'
            >
              Continue to summary
            </button>
          )}

          {step === 'summary' && (
            <button
              onClick={handleSubmit}
              disabled={submitting || refundTotal === 0}
              className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50'
            >
              {submitting
                ? 'Processing…'
                : `Create return · ${fmt(refundTotal, currency)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
