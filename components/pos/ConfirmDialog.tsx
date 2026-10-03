'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { SpinnerIcon, TrashIcon } from '@/components/pos/TabActionIcons'

interface Props {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busyLabel?: string
  /** Shows a spinner and locks the dialog while the action runs. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * In-app replacement for window.confirm() for destructive actions.
 * Styled to match the other POS modals (see VoidModal).
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busyLabel = 'Deleting...',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus the safe option first so an accidental Enter doesn't delete.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        aria-describedby='confirm-dialog-message'
        className='w-full max-w-sm rounded-xl overflow-hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div className='flex flex-col items-center text-center px-5 pt-6 pb-5'>
          <div
            className='w-14 h-14 rounded-full flex items-center justify-center mb-3'
            style={{ background: '#FFF4F4', color: '#D82C0D' }}
          >
            <TrashIcon size={26} />
          </div>
          <h4
            id='confirm-dialog-title'
            className='text-base font-semibold mb-1'
            style={{ color: '#202223' }}
          >
            {title}
          </h4>
          <div
            id='confirm-dialog-message'
            className='text-sm'
            style={{ color: '#6D7175' }}
          >
            {message}
          </div>
        </div>

        <div className='px-5 pb-5 flex gap-2'>
          <button
            ref={cancelRef}
            type='button'
            onClick={onCancel}
            disabled={busy}
            className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7] disabled:opacity-50'
            style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={busy}
            className='flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-70'
            style={{ background: '#D82C0D', color: '#FFFFFF' }}
          >
            {busy && <SpinnerIcon size={15} />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
