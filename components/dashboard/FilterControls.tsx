'use client'

import type { ReactNode } from 'react'

/* Shared filter controls for dashboard list pages (Orders, Products).
   Custom inline SVG icons — no icon library. */

export function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polyline points='6 9 12 15 18 9' />
    </svg>
  )
}

export function CloseIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
      aria-hidden='true'
    >
      <line x1='6' y1='6' x2='18' y2='18' />
      <line x1='18' y1='6' x2='6' y2='18' />
    </svg>
  )
}

export function ListViewIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      aria-hidden='true'
    >
      <line x1='8' y1='6' x2='21' y2='6' />
      <line x1='8' y1='12' x2='21' y2='12' />
      <line x1='8' y1='18' x2='21' y2='18' />
      <line x1='3' y1='6' x2='3.01' y2='6' />
      <line x1='3' y1='12' x2='3.01' y2='12' />
      <line x1='3' y1='18' x2='3.01' y2='18' />
    </svg>
  )
}

export function GridViewIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
    </svg>
  )
}

/** Native <select> with a custom chevron. Turns green when a value is chosen. */
export function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
  active,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  children: ReactNode
  /** Defaults to `value !== ''` (empty string = "all"). */
  active?: boolean
  className?: string
}) {
  const isActive = active ?? value !== ''
  return (
    <div
      className={`relative inline-flex ${isActive ? 'text-[#008060]' : 'text-[#8C9196]'} ${className}`}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`appearance-none h-9 w-full max-w-[220px] pl-3 pr-8 rounded-lg border text-[13px] outline-none cursor-pointer truncate transition-colors focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 ${
          isActive
            ? 'border-[#008060] bg-[#E3F1EB]/60 text-[#008060] font-medium'
            : 'border-[#E1E3E5] bg-white text-[#202223] hover:border-[#8C9196]'
        }`}
      >
        {children}
      </select>
      <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2'>
        <ChevronDownIcon />
      </span>
    </div>
  )
}

export interface SegmentOption {
  value: string
  label: ReactNode
  count?: number
}

/** Pill-style segmented control (e.g. All / Website / POS). */
export function SegmentedControl({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: SegmentOption[]
  ariaLabel: string
}) {
  return (
    <div
      role='tablist'
      aria-label={ariaLabel}
      className='inline-flex p-0.5 rounded-lg bg-[#F1F2F3]'
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium whitespace-nowrap border-none cursor-pointer transition-all ${
              active
                ? 'bg-white text-[#008060] shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                : 'bg-transparent text-[#6D7175] hover:text-[#202223]'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`text-[10.5px] px-1.5 rounded-full ${
                  active
                    ? 'bg-[#E3F1EB] text-[#008060]'
                    : 'bg-[#E1E3E5] text-[#6D7175]'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** "Clear filters (n)" ghost button shown when any filter is active. */
export function ClearFiltersButton({
  count,
  onClick,
}: {
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium text-[#008060] bg-transparent border border-transparent cursor-pointer transition-colors hover:bg-[#E3F1EB]'
    >
      <CloseIcon size={11} />
      Clear filters{count ? ` (${count})` : ''}
    </button>
  )
}
