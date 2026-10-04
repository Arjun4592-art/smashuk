'use client'

// Shared look for the Home Page / Promo Banner dashboard screens — the same
// design language as the Website Menu screen (inline SVG icons, 36px controls,
// soft grey borders, green primary).

import { useEffect, useState, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, no emoji / unicode glyphs in the UI chrome)       */
/* ------------------------------------------------------------------ */

export function Svg({
  size = 16,
  fill = 'none',
  className,
  children,
}: {
  size?: number
  fill?: string
  className?: string
  children: ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill={fill}
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {children}
    </svg>
  )
}

export type IconProps = { size?: number; className?: string }

export const Icon = {
  Chevron: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='6 9 12 15 18 9' />
    </Svg>
  ),
  Up: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='19' x2='12' y2='5' />
      <polyline points='5 12 12 5 19 12' />
    </Svg>
  ),
  Down: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <polyline points='19 12 12 19 5 12' />
    </Svg>
  ),
  Close: (p: IconProps) => (
    <Svg {...p}>
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
    </Svg>
  ),
  Trash: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v6M14 11v6' />
      <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
    </Svg>
  ),
  Plus: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <line x1='5' y1='12' x2='19' y2='12' />
    </Svg>
  ),
  Save: (p: IconProps) => (
    <Svg {...p}>
      <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' />
      <polyline points='17 21 17 13 7 13 7 21' />
      <polyline points='7 3 7 8 15 8' />
    </Svg>
  ),
  Reset: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='1 4 1 10 7 10' />
      <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
    </Svg>
  ),
  External: (p: IconProps) => (
    <Svg {...p}>
      <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
      <polyline points='15 3 21 3 21 9' />
      <line x1='10' y1='14' x2='21' y2='3' />
    </Svg>
  ),
  Info: (p: IconProps) => (
    <Svg {...p}>
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='16' x2='12' y2='12' />
      <line x1='12' y1='8' x2='12.01' y2='8' />
    </Svg>
  ),
  Alert: (p: IconProps) => (
    <Svg {...p}>
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='8' x2='12' y2='12' />
      <line x1='12' y1='16' x2='12.01' y2='16' />
    </Svg>
  ),
  Layout: (p: IconProps) => (
    <Svg {...p}>
      <rect x='3' y='3' width='18' height='18' rx='2' />
      <line x1='3' y1='9' x2='21' y2='9' />
      <line x1='9' y1='21' x2='9' y2='9' />
    </Svg>
  ),
  Tag: (p: IconProps) => (
    <Svg {...p}>
      <path d='M20.59 13.41L11 3.83V3H3v8l9.83 9.83a2 2 0 0 0 2.83 0l4.93-4.93a2 2 0 0 0 0-2.83z' />
      <line x1='7' y1='7' x2='7.01' y2='7' />
    </Svg>
  ),
  Image: (p: IconProps) => (
    <Svg {...p}>
      <rect x='3' y='3' width='18' height='18' rx='2' />
      <circle cx='8.5' cy='8.5' r='1.5' />
      <polyline points='21 15 16 10 5 21' />
    </Svg>
  ),
  Shield: (p: IconProps) => (
    <Svg {...p}>
      <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
      <polyline points='9 12 11 14 15 10' />
    </Svg>
  ),
  Grid: (p: IconProps) => (
    <Svg {...p}>
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
    </Svg>
  ),
  Bag: (p: IconProps) => (
    <Svg {...p}>
      <path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' />
      <line x1='3' y1='6' x2='21' y2='6' />
      <path d='M16 10a4 4 0 0 1-8 0' />
    </Svg>
  ),
  Building: (p: IconProps) => (
    <Svg {...p}>
      <rect x='4' y='2' width='16' height='20' rx='2' />
      <path d='M9 22v-4h6v4' />
      <line x1='8' y1='6' x2='8.01' y2='6' />
      <line x1='12' y1='6' x2='12.01' y2='6' />
      <line x1='16' y1='6' x2='16.01' y2='6' />
      <line x1='8' y1='10' x2='8.01' y2='10' />
      <line x1='12' y1='10' x2='12.01' y2='10' />
      <line x1='16' y1='10' x2='16.01' y2='10' />
    </Svg>
  ),
  Star: (p: IconProps) => (
    <Svg {...p}>
      <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
    </Svg>
  ),
  Mail: (p: IconProps) => (
    <Svg {...p}>
      <path d='M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' />
      <polyline points='22 6 12 13 2 6' />
    </Svg>
  ),
  Eye: (p: IconProps) => (
    <Svg {...p}>
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </Svg>
  ),
  Spinner: ({ size = 16 }: IconProps) => (
    <svg
      className='animate-spin'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      aria-hidden='true'
    >
      <circle
        className='opacity-25'
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 018-8v8H4z'
      />
    </svg>
  ),
}

/* ------------------------------------------------------------------ */
/* Class constants (used by the block editors)                          */
/* ------------------------------------------------------------------ */

export const inputCls =
  'w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white'
export const labelCls = 'block text-[12px] font-medium text-[#4A4F55] mb-1.5'
export const hintCls = 'ml-1 text-[11px] text-[#8C9196] font-normal'
export const iconBtn =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-[#6D7175] text-[14px] cursor-pointer transition-colors hover:bg-[#F1F2F3] hover:text-[#202223] disabled:cursor-not-allowed disabled:opacity-30'
export const primaryOutlineBtn =
  'inline-flex min-h-[36px] items-center gap-1.5 px-3.5 border border-[#008060] text-[#008060] text-[12.5px] font-semibold rounded-lg bg-white hover:bg-[#F1F8F5] cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50'
export const ghostBtn =
  'inline-flex min-h-[36px] items-center gap-1.5 px-3.5 border border-[#D2D5D8] text-[#202223] text-[12.5px] font-semibold rounded-lg bg-white hover:bg-[#F6F6F7] cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50'
export const dangerBtn =
  'inline-flex min-h-[32px] items-center gap-1.5 px-2.5 border border-[#F0C4BC] text-[#D72C0D] text-[12px] font-medium rounded-lg bg-transparent hover:bg-[#FFF1EF] cursor-pointer transition-colors'

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */

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
      title={label}
      onClick={onClick}
      className={`relative block h-5 w-9 shrink-0 rounded-full border-none p-0 cursor-pointer transition-colors ${
        on ? 'bg-[#008060]' : 'bg-[#C9CCCF]'
      }`}
    >
      <span
        className='absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200'
        style={{ transform: `translateX(${on ? 18 : 2}px)` }}
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

export function Field({
  label,
  hint,
  note,
  children,
}: {
  label: string
  /** Small grey text under the field */
  hint?: string
  /** Small grey text next to the label */
  note?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {note && <span className={hintCls}>{note}</span>}
      </label>
      {children}
      {hint && <p className='mt-1 text-[11.5px] text-[#8C9196]'>{hint}</p>}
    </div>
  )
}

export function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-[#8C9196] hover:bg-[#FFF1EF] hover:text-[#D72C0D]'
          : 'text-[#6D7175] hover:bg-[#F1F2F3] hover:text-[#202223]'
      }`}
    >
      {children}
    </button>
  )
}

// First click arms it ("Delete?"), second click confirms — no browser popups.
export function DeleteButton({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  if (!armed) {
    return (
      <IconButton danger label={label} onClick={() => setArmed(true)}>
        <Icon.Trash size={15} />
      </IconButton>
    )
  }
  return (
    <button
      type='button'
      autoFocus
      onBlur={() => setArmed(false)}
      onClick={() => {
        setArmed(false)
        onConfirm()
      }}
      className='h-8 shrink-0 rounded-lg border-none bg-[#D72C0D] px-2.5 text-[12px] font-semibold text-white cursor-pointer hover:bg-[#BC2200]'
    >
      Delete?
    </button>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'subtle'
}) {
  const styles = {
    default: 'border-[#D2D5D8] bg-white text-[#202223] hover:bg-[#F6F6F7]',
    primary:
      'border-[#008060] bg-[#008060] text-white hover:bg-[#006E52] hover:border-[#006E52]',
    subtle:
      'border-dashed border-[#C9CCCF] bg-transparent text-[#4A4F55] hover:bg-[#F6F6F7] hover:border-[#8C9196]',
  }[variant]
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[12.5px] font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  )
}

export function Chip({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: 'gray' | 'amber' | 'green'
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tone === 'amber'
          ? 'bg-[#FFF1D6] text-[#8A6116]'
          : tone === 'green'
            ? 'bg-[#E3F4EC] text-[#1F6F52]'
            : 'bg-[#F1F2F3] text-[#6D7175]'
      }`}
    >
      {children}
    </span>
  )
}

/** Sticky page header with the save controls — same as the Website Menu screen. */
export function PageHeader({
  icon,
  title,
  description,
  status,
  children,
}: {
  icon: ReactNode
  title: string
  description: ReactNode
  /** 'dirty' | 'saved' | null (hidden while loading) */
  status: 'dirty' | 'saved' | null
  children?: ReactNode
}) {
  return (
    <div className='sticky -top-4 z-20 -mx-4 -mt-4 mb-5 border-b border-[#E1E3E5] bg-white px-4 py-3 lg:-top-6 lg:-mx-6 lg:-mt-6 lg:px-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008060]/10 text-[#008060]'>
            {icon}
          </span>
          <div className='min-w-0'>
            <h1 className='font-sora text-[20px] font-semibold leading-tight text-[#202223]'>
              {title}
            </h1>
            <p className='text-[12.5px] text-[#6D7175]'>{description}</p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {status === 'dirty' && (
            <span className='mr-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8A6116]'>
              <span className='h-2 w-2 rounded-full bg-[#F5A623]' /> Unsaved
              changes
            </span>
          )}
          {status === 'saved' && (
            <span className='mr-1 inline-flex items-center gap-1.5 text-[12px] text-[#6D7175]'>
              <span className='h-2 w-2 rounded-full bg-[#2EAD7A]' /> All changes
              saved
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
