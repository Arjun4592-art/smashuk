'use client'

// Small shared bits for the Home Page dashboard screen — same look as the other
// settings screens (Home Slider, Promo Banner).

export const inputCls =
  'w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white'
export const labelCls = 'block text-[12.5px] font-medium text-[#202223] mb-1.5'
export const hintCls = 'ml-1 text-[11px] text-[#8C9196] font-normal'
export const iconBtn =
  'w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg bg-white text-[#202223] hover:bg-[#F6F6F7] text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
export const primaryOutlineBtn =
  'px-4 py-2 border border-[#008060] text-[#008060] text-[13px] font-semibold rounded-lg bg-white hover:bg-[#F1F8F5] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
export const ghostBtn =
  'px-3 py-1.5 border border-[#E1E3E5] text-[#202223] text-[12.5px] font-medium rounded-lg bg-white hover:bg-[#F6F6F7] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
export const dangerBtn =
  'px-2.5 h-8 border border-[#D82C0D] text-[#D82C0D] text-[12px] font-medium rounded-lg bg-transparent hover:bg-[#FFF4F4] cursor-pointer'

export function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex items-center w-10 h-6 rounded-full transition-colors border-none cursor-pointer shrink-0 ${
        on ? 'bg-[#008060]' : 'bg-[#8C9196]'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}

export function ToggleRow({
  on,
  onClick,
  label,
  hint,
}: {
  on: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <div className='flex items-center gap-3'>
      <Toggle on={on} onClick={onClick} label={label} />
      <div>
        <p className='text-[12.5px] text-[#202223] m-0'>{label}</p>
        {hint && <p className='text-[11px] text-[#8C9196] m-0'>{hint}</p>}
      </div>
    </div>
  )
}
