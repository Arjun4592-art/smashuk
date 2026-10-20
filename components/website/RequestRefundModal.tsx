'use client'

import { useState } from 'react'
import { requestRefund } from '@/lib/api/store'

const REFUND_REASONS = [
  'Ordered by mistake',
  'Found a better price',
  'Delivery is taking too long',
  'Changed my mind',
  'Other',
]

interface Props {
  order: any
  onClose: () => void
  onSubmitted: () => void
}

// Refund request for an order that has not been despatched / picked up yet.
export default function RequestRefundModal({
  order,
  onClose,
  onSubmitted,
}: Props) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please pick a reason')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await requestRefund(order.id, reason, note)
      onSubmitted()
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit refund request')
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
          Request a refund
        </h3>
        <p className='text-sm text-gray-400 font-lato mb-4'>
          Order #{order.display_id ?? order.id} hasn&apos;t left the shop yet,
          so we can refund it in full once we&apos;ve reviewed your request.
        </p>

        <label className='block text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5 uppercase tracking-wide'>
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className='w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-lato outline-none mb-3 text-[#0A1F44]'
        >
          <option value=''>Select a reason...</option>
          {REFUND_REASONS.map((r) => (
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
