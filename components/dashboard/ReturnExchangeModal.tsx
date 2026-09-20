'use client'

import { useMemo, useState } from 'react'
import {
  Btn,
  IconBack,
  IconBox,
  cx,
  roundBtnClass,
} from '@/components/orders/OrderUI'

const RETURN_REASONS = [
  'Defective product',
  'Wrong item received',
  'Changed mind',
  'Size issue',
  'Damaged packaging',
  'Other',
]

const SHIPPING_CARRIERS = [
  'Parcel2Go',
  'DPD',
  'Evri',
  'DHL',
  'UPS',
  'FedEx',
  'Parcelforce',
  'Other',
]

function fmt(amount: number, currency = 'GBP') {
  const symbol =
    currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return (
    symbol +
    (Number(amount) || 0).toLocaleString('en-GB', {
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

const fieldCls =
  'w-full rounded-xl border border-[#C4C8CC] bg-white text-[15px] text-[#202223] outline-none ' +
  'focus:border-[#008060] focus:ring-1 focus:ring-[#008060]/30 transition-colors'

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={cx(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
        on ? 'border-[#008060]' : 'border-[#C4C8CC]',
      )}
    >
      {on && <span className='w-2.5 h-2.5 rounded-full bg-[#008060]' />}
    </span>
  )
}

export default function ReturnExchangeModal({
  order,
  remainingQty,
  onSubmit,
  onClose,
}: Props) {
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
        .map(([item_id, quantity]) => ({
          item_id,
          quantity,
          item: returnableItems.find((i: any) => i.id === item_id),
        })),
    [qtys, returnableItems],
  )

  const calculatedTotal = selectedItems.reduce(
    (sum, { quantity, item }) => sum + (item?.unit_price ?? 0) * quantity,
    0,
  )
  const parsedCustom = parseFloat(customAmount)
  const refundTotal =
    useCustomAmount && !Number.isNaN(parsedCustom)
      ? parsedCustom
      : calculatedTotal

  const canSubmit = selectedItems.length > 0 && !!reason && refundTotal > 0

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('Select at least one item to return')
      return
    }
    if (!reason) {
      setError('Choose a return reason')
      return
    }
    if (useCustomAmount && (Number.isNaN(parsedCustom) || parsedCustom <= 0)) {
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
        useCustomAmount ? parsedCustom : undefined,
      )
    } catch (err: any) {
      setError(err.message ?? 'Failed to process return')
      setSubmitting(false)
    }
  }

  const setQty = (id: string, next: number, max: number) =>
    setQtys((p) => ({ ...p, [id]: Math.min(max, Math.max(0, next)) }))

  return (
    <div
      className='fixed inset-0 z-[60] flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className='bg-[#F6F6F7] w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:rounded-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='bg-white shrink-0 grid grid-cols-[40px_1fr_40px] items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:pt-3 border-b border-[#E1E3E5]'>
          <button
            type='button'
            aria-label='Back'
            onClick={onClose}
            className={roundBtnClass}
          >
            <IconBack />
          </button>
          <h3 className='text-center text-[17px] font-semibold text-[#202223]'>
            Return and exchange
          </h3>
          <span />
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto overscroll-contain'>
          {/* 1 — items */}
          <div className='bg-white px-4 py-5'>
            <h4 className='text-[17px] font-bold text-[#202223]'>
              Select quantity to return
            </h4>
            <p className='text-[15px] font-bold text-[#202223] mt-1'>
              #{order.display_id ?? order.id?.slice(-6)}
            </p>
            <p className='text-[13px] text-[#6D7175]'>
              {(order.items ?? []).length} item
              {(order.items ?? []).length === 1 ? '' : 's'}
            </p>

            {returnableItems.length === 0 ? (
              <p className='text-[15px] text-[#6D7175] py-8 text-center'>
                Every item has already been returned.
              </p>
            ) : (
              <div className='mt-4 space-y-3'>
                {returnableItems.map((item: any) => {
                  const max = remainingQty[item.id] ?? 0
                  const qty = qtys[item.id] ?? 0
                  return (
                    <div
                      key={item.id}
                      className='rounded-xl border border-[#E1E3E5] overflow-hidden'
                    >
                      <div className='flex gap-3 p-3'>
                        <div className='w-14 h-14 rounded-lg border border-[#E1E3E5] bg-[#FAFAFA] flex items-center justify-center overflow-hidden shrink-0 text-[#C4C8CC]'>
                          {item.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnail}
                              alt=''
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <IconBox size={22} />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[15px] font-semibold text-[#202223] leading-snug'>
                            {item.title}
                          </p>
                          {item.variant_title &&
                            item.variant_title !== 'Default' && (
                              <span className='inline-block mt-1 px-2 py-0.5 rounded-md bg-[#F1F2F3] text-[12.5px] text-[#6D7175]'>
                                {item.variant_title}
                              </span>
                            )}
                        </div>
                      </div>

                      <div className='px-3 pb-3'>
                        <div className='flex items-center justify-between rounded-xl border border-[#C4C8CC] pl-4 pr-2 py-2'>
                          <div>
                            <p className='text-[12px] text-[#6D7175] leading-none'>
                              Quantity
                            </p>
                            <p className='text-[16px] text-[#202223] mt-1.5 leading-none tabular-nums'>
                              {qty}{' '}
                              <span className='text-[#6D7175]'>/ {max}</span>
                            </p>
                          </div>
                          <div className='flex gap-2'>
                            <button
                              type='button'
                              aria-label='Decrease quantity'
                              onClick={() => setQty(item.id, qty - 1, max)}
                              disabled={qty === 0}
                              className='w-11 h-11 rounded-lg bg-[#F1F2F3] text-[#202223] text-[22px] leading-none flex items-center justify-center disabled:opacity-40 cursor-pointer active:bg-[#C9CCCF]'
                            >
                              −
                            </button>
                            <button
                              type='button'
                              aria-label='Increase quantity'
                              onClick={() => setQty(item.id, qty + 1, max)}
                              disabled={qty === max}
                              className='w-11 h-11 rounded-lg bg-[#F1F2F3] text-[#202223] text-[22px] leading-none flex items-center justify-center disabled:opacity-40 cursor-pointer active:bg-[#C9CCCF]'
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className='flex items-center justify-between mt-3 text-[15px] tabular-nums'>
                          <span className='text-[#202223]'>
                            {fmt(item.unit_price, currency)}{' '}
                            <span className='text-[#8C9196]'>×</span>{' '}
                            <span className='inline-block min-w-6 text-center rounded-md bg-[#F1F2F3] px-1.5'>
                              {qty}
                            </span>
                          </span>
                          <span className='text-[#202223]'>
                            {fmt(item.unit_price * qty, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {returnableItems.length > 0 && (
              <div className='relative mt-5'>
                <label
                  htmlFor='return-reason'
                  className='absolute left-4 top-2 text-[12px] text-[#6D7175] pointer-events-none'
                >
                  Return reason
                </label>
                <select
                  id='return-reason'
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={cx(fieldCls, 'h-14 pt-5 px-4 appearance-none')}
                >
                  <option value=''>Select reason…</option>
                  {RETURN_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <span className='absolute right-4 top-1/2 -translate-y-1/2 text-[#6D7175] pointer-events-none text-[11px]'>
                  ▾
                </span>
              </div>
            )}
          </div>

          {/* 2 — return shipping */}
          {returnableItems.length > 0 && (
            <div className='bg-white mt-3 px-4 py-5'>
              <h4 className='text-[17px] font-bold text-[#202223]'>
                Return shipping options
              </h4>

              <div className='mt-4 space-y-4'>
                <div>
                  <button
                    type='button'
                    onClick={() => setShippingOption('label')}
                    className='flex items-center gap-3 text-[16px] text-[#202223] cursor-pointer'
                  >
                    <Radio on={shippingOption === 'label'} />
                    Add tracking details
                  </button>

                  {shippingOption === 'label' && (
                    <div className='mt-4 space-y-3'>
                      <input
                        type='text'
                        placeholder='Tracking number'
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className={cx(fieldCls, 'h-14 px-4')}
                      />
                      <div className='relative'>
                        <label
                          htmlFor='return-carrier'
                          className='absolute left-4 top-2 text-[12px] text-[#6D7175] pointer-events-none'
                        >
                          Shipping carrier
                        </label>
                        <select
                          id='return-carrier'
                          value={shippingCarrier}
                          onChange={(e) => setShippingCarrier(e.target.value)}
                          className={cx(
                            fieldCls,
                            'h-14 pt-5 px-4 appearance-none',
                          )}
                        >
                          <option value=''></option>
                          {SHIPPING_CARRIERS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <span className='absolute right-4 top-1/2 -translate-y-1/2 text-[#6D7175] pointer-events-none text-[11px]'>
                          ▾
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type='button'
                  onClick={() => setShippingOption('no_shipping')}
                  className='flex items-center gap-3 text-[16px] text-[#202223] cursor-pointer'
                >
                  <Radio on={shippingOption === 'no_shipping'} />
                  No shipping required
                </button>
              </div>
            </div>
          )}

          {/* 3 — summary */}
          <div className='bg-white mt-3 px-4 py-5'>
            <h4 className='text-[17px] font-bold text-[#202223]'>Summary</h4>

            {selectedItems.length === 0 ? (
              <p className='text-[15px] text-[#6D7175] mt-2'>
                No items selected
              </p>
            ) : (
              <div className='mt-3 space-y-2.5'>
                {selectedItems.map(({ item_id, quantity, item }) => (
                  <div
                    key={item_id}
                    className='flex justify-between gap-4 text-[15px]'
                  >
                    <span className='text-[#202223] min-w-0 truncate'>
                      {item?.title}{' '}
                      <span className='text-[#6D7175]'>× {quantity}</span>
                    </span>
                    <span className='text-[#202223] tabular-nums shrink-0'>
                      {fmt((item?.unit_price ?? 0) * quantity, currency)}
                    </span>
                  </div>
                ))}

                <div className='h-px bg-[#E1E3E5] my-3' />

                <div className='flex justify-between text-[15px] font-semibold text-[#202223]'>
                  <span>
                    {useCustomAmount ? 'Refund total' : 'Estimated refund'}
                  </span>
                  <span className='tabular-nums'>
                    {fmt(refundTotal, currency)}
                  </span>
                </div>
                {!useCustomAmount && (
                  <p className='text-[12.5px] text-[#6D7175]'>
                    Final amount is calculated after any discounts.
                  </p>
                )}

                <label className='flex items-center gap-2.5 pt-2 text-[14px] text-[#202223] cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={useCustomAmount}
                    onChange={(e) => {
                      setUseCustomAmount(e.target.checked)
                      if (e.target.checked && !customAmount)
                        setCustomAmount(calculatedTotal.toFixed(2))
                    }}
                    className='w-5 h-5 accent-[#008060]'
                  />
                  Use custom refund amount
                </label>

                {useCustomAmount && (
                  <div className='flex items-center gap-2'>
                    <span className='text-[15px] text-[#202223]'>
                      {currency.toUpperCase() === 'GBP'
                        ? '£'
                        : currency.toUpperCase()}
                    </span>
                    <input
                      type='number'
                      inputMode='decimal'
                      step='0.01'
                      min='0'
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder='0.00'
                      className={cx(fieldCls, 'h-12 px-4 flex-1')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className='h-3' />
        </div>

        {/* Sticky footer */}
        <div className='bg-white shrink-0 border-t border-[#E1E3E5] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
          {error && (
            <p className='text-[13px] text-[#D82C0D] text-center mb-2'>
              {error}
            </p>
          )}
          <Btn
            variant='primary'
            full
            loading={submitting}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Create return
          </Btn>
        </div>
      </div>
    </div>
  )
}
