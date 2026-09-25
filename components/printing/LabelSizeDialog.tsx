'use client'

import { useEffect } from 'react'
import LabelSizePicker from './LabelSizePicker'

// Small dialog so the label size can be changed from the dashboard
// (POS uses the same picker inside Settings → Printer). The size is stored
// per browser, in the same place the POS reads it from.
export default function LabelSizeDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className='bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between'>
          <h3 className='text-[16px] font-semibold text-[#202223]'>
            Label size
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='text-sm font-medium text-[#008060] px-2 py-1'
          >
            Done
          </button>
        </div>
        <LabelSizePicker />
      </div>
    </div>
  )
}
