'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { requestReturn } from '@/lib/api/store'
import { RETURN_LABEL_FEE } from '@/lib/order-flow'
const RETURN_REASONS = [
  'Item is defective',
  'Wrong item received',
  'Changed my mind',
  'Size/fit issue',
  'Damaged in transit',
  'Other',
]
interface Props {
  order: any
  onClose: () => void
  onSubmitted: () => void
}
export default function RequestReturnModal({
  order,
  onClose,
  onSubmitted,
}: Props) {
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [wantLabel, setWantLabel] = useState<boolean | null>(null)
  const items = order.items ?? []
  const handleSubmit = async () => {
    const selected = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([item_id, quantity]) => ({
        item_id,
        quantity,
      }))
    if (selected.length === 0) {
      setError('Select at least one item')
      return
    }
    if (!reason) {
      setError('Please pick a reason')
      return
    }
    if (wantLabel === null) {
      setError('Please choose whether you need a prepaid return label')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await requestReturn(order.id, selected, reason, note, wantLabel)
      onSubmitted()
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit return request')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className='font-montserrat font-black text-lg text-[#0A1F44] mb-1'>
          Request a return
        </h3>
        <p className='text-sm text-gray-400 font-lato mb-4'>
          Order #{order.display_id ?? order.id} — we&apos;ll review your request
          and email you once we start processing it.
        </p>

        <div className='space-y-3 mb-4'>
          {items.map((item: any) => {
            const qty = qtys[item.id] ?? 0
            return (
              <div
                key={item.id}
                className='p-3 rounded-xl border border-gray-100'
              >
                <div className='flex items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44] truncate'>
                      {item.title}
                    </p>
                    <p className='text-xs text-gray-400 font-lato'>
                      {formatCurrency(item.unit_price)} · of {item.quantity}{' '}
                      ordered
                    </p>
                  </div>
                  <div className='flex items-center rounded-lg border border-gray-200 overflow-hidden shrink-0'>
                    <button
                      onClick={() =>
                        setQtys((p) => ({
                          ...p,
                          [item.id]: Math.max(0, qty - 1),
                        }))
                      }
                      className='w-7 h-7 flex items-center justify-center hover:bg-gray-50 text-gray-500'
                    >
                      −
                    </button>
                    <span className='w-8 h-7 flex items-center justify-center text-xs font-bold border-x border-gray-200 text-[#0A1F44]'>
                      {qty}
                    </span>
                    <button
                      onClick={() =>
                        setQtys((p) => ({
                          ...p,
                          [item.id]: Math.min(item.quantity, qty + 1),
                        }))
                      }
                      className='w-7 h-7 flex items-center justify-center hover:bg-gray-50 text-gray-500'
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <label className='block text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5 uppercase tracking-wide'>
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className='w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-lato outline-none mb-3 text-[#0A1F44]'
        >
          <option value=''>Select a reason...</option>
          {RETURN_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label className='block text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5 uppercase tracking-wide'>
          Additional details (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className='w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-lato outline-none mb-4 resize-none text-[#0A1F44]'
          placeholder='Tell us more...'
        />

        <label className='block text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5 uppercase tracking-wide'>
          Return label
        </label>
        <div className='space-y-2 mb-4'>
          <label
            className={`flex items-start gap-2 p-3 rounded-xl border text-sm font-lato cursor-pointer ${wantLabel === true ? 'border-[#E8553A] bg-[#FFF5F2]' : 'border-gray-200'}`}
          >
            <input
              type='radio'
              name='return-label'
              checked={wantLabel === true}
              onChange={() => setWantLabel(true)}
              className='mt-1'
            />
            <span className='text-[#0A1F44]'>
              <strong>Send me a prepaid return label</strong> for{' '}
              {formatCurrency(RETURN_LABEL_FEE)}.
              <span className='block text-xs text-gray-400'>
                The cost is taken off your refund.
              </span>
            </span>
          </label>
          <label
            className={`flex items-start gap-2 p-3 rounded-xl border text-sm font-lato cursor-pointer ${wantLabel === false ? 'border-[#E8553A] bg-[#FFF5F2]' : 'border-gray-200'}`}
          >
            <input
              type='radio'
              name='return-label'
              checked={wantLabel === false}
              onChange={() => setWantLabel(false)}
              className='mt-1'
            />
            <span className='text-[#0A1F44]'>
              <strong>I&apos;ll arrange the return myself</strong>
              <span className='block text-xs text-gray-400'>
                No label cost. Please keep your proof of postage.
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p className='text-xs text-red-500 font-lato mb-3'>{error}</p>
        )}

        <div className='flex gap-2'>
          <button
            onClick={onClose}
            disabled={submitting}
            className='flex-1 py-2.5 rounded-full text-sm font-montserrat font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className='flex-1 py-2.5 rounded-full text-sm font-montserrat font-bold bg-[#E8553A] text-white hover:bg-[#D4441F] transition-colors disabled:opacity-50'
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
