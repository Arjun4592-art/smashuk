'use client'
import { useState } from 'react'
import { usePOSStore } from '@/store/posStore'

interface Props {
  onClose: () => void
}

export default function NoteModal({ onClose }: Props) {
  const { orderNote, setOrderNote } = usePOSStore()
  const [value, setValue] = useState(orderNote)

  const handleSave = () => {
    setOrderNote(value.trim())
    onClose()
  }

  const handleClear = () => {
    setValue('')
    setOrderNote('')
    onClose()
  }

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-sm rounded-xl overflow-hidden'
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
            Order note
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

        <div className='p-5'>
          <label
            className='text-[11px] font-medium uppercase tracking-wide block mb-2'
            style={{ color: '#6D7175' }}
          >
            Add a note to this order
          </label>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='e.g. Customer requested gift wrapping, special instructions...'
            rows={4}
            className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none transition-colors focus:border-[#008060]'
            style={{ borderColor: '#E1E3E5', color: '#202223' }}
          />
          <p className='text-xs mt-1 text-right' style={{ color: '#8C9196' }}>
            {value.length}/500
          </p>
        </div>

        <div className='px-5 pb-5 flex gap-2'>
          {orderNote && (
            <button
              onClick={handleClear}
              className='py-2.5 px-4 rounded-lg text-sm border transition-colors hover:bg-[#FFF4F4]'
              style={{ borderColor: '#E1E3E5', color: '#D82C0D' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]'
            style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='flex-1 py-2.5 rounded-lg text-sm font-semibold'
            style={{ background: '#008060', color: '#FFFFFF' }}
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}
