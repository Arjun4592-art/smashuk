'use client'

import { useState } from 'react'

export interface PickerCategory {
  id: string
  label: string
}

/**
 * "Also show in" — lets a product live in more than one category
 * (e.g. a bag sold under both Tennis and Badminton). The main category is
 * still chosen in the Category dropdown above; this adds the extra ones.
 */
export default function ExtraCategoriesPicker({
  categories,
  primaryId,
  selectedIds,
  onChange,
  disabled,
}: {
  categories: PickerCategory[]
  /** The main category — never offered or shown as an extra. */
  primaryId: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const [pick, setPick] = useState('')

  const byId = new Map(categories.map((c) => [c.id, c]))
  // Ids the product already has but that are not in the loaded list (e.g.
  // deleted category) are still shown so they can be removed.
  const chips = selectedIds.filter((id) => id !== primaryId)
  const available = categories.filter(
    (c) => c.id !== primaryId && !selectedIds.includes(c.id),
  )

  const add = (id: string) => {
    if (!id || id === primaryId || selectedIds.includes(id)) return
    onChange([...selectedIds, id])
    setPick('')
  }

  return (
    <div>
      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
        Also show in{' '}
        <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
          (optional extra categories)
        </span>
      </label>

      {chips.length > 0 && (
        <div className='flex flex-wrap gap-1.5 mb-2'>
          {chips.map((id) => (
            <span
              key={id}
              className='inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#F2F7F5] border border-[#008060]/25 rounded-full text-[12px] text-[#202223]'
            >
              {byId.get(id)?.label ?? 'Unknown category'}
              <button
                type='button'
                aria-label='Remove category'
                disabled={disabled}
                onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                className='w-4 h-4 flex items-center justify-center rounded-full text-[#6D7175] hover:text-[#D82C0D] hover:bg-white border-none bg-transparent cursor-pointer text-[11px] leading-none disabled:opacity-50'
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <select
        value={pick}
        onChange={(e) => add(e.target.value)}
        disabled={disabled || available.length === 0}
        className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer disabled:opacity-50'
      >
        <option value=''>
          {disabled
            ? 'Loading...'
            : available.length === 0
              ? 'No more categories'
              : '+ Add another category'}
        </option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <p className='text-[11.5px] text-[#8C9196] mt-1'>
        The product will appear in the main category above and in each of these.
      </p>
    </div>
  )
}
