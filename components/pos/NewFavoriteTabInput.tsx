'use client'

import { useState } from 'react'
import { MAX_TAB_LABEL_LENGTH, normalizeTabLabel } from '@/lib/pos/favorites'

interface Props {
  onSubmit: (label: string) => Promise<void>
  onCancel: () => void
  /** Pre-filled text (used when renaming). */
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  busyLabel?: string
}

export default function NewFavoriteTabInput({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'New tab name',
  submitLabel = 'Add',
  busyLabel = 'Adding...',
}: Props) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const label = normalizeTabLabel(value)
    if (!label) {
      setError('Enter a tab name')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(label)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save tab')
      setBusy(false)
    }
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-2'>
        <input
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          value={value}
          maxLength={MAX_TAB_LABEL_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') onCancel()
          }}
          placeholder={placeholder}
          disabled={busy}
          className='flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm outline-none'
          style={{
            borderColor: '#C9CCCF',
            color: '#202223',
            background: '#FFFFFF',
          }}
        />
        <button
          type='button'
          onClick={submit}
          disabled={busy}
          className='px-3 py-2 rounded-lg text-sm font-semibold shrink-0'
          style={{
            background: '#008060',
            color: '#FFFFFF',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? busyLabel : submitLabel}
        </button>
        <button
          type='button'
          onClick={onCancel}
          disabled={busy}
          className='px-2 py-2 text-sm shrink-0'
          style={{ color: '#6D7175' }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className='text-xs' style={{ color: '#D82C0D' }}>
          {error}
        </p>
      )}
    </div>
  )
}
