interface IconProps {
  size?: number
  className?: string
}

/** Pencil with an underline stroke — used for "Rename". */
export function PencilIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      <path d='M15.2 4.8a2.1 2.1 0 013 3L8.4 17.6 4 18.9l1.3-4.4 9.9-9.7z' />
      <path d='M13.4 6.6l3 3' />
      <path d='M13 21h8' />
    </svg>
  )
}

/** Trash can with lid handle and two bin lines — used for "Delete". */
export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      <path d='M4 7h16' />
      <path d='M9.5 7V5a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0114.5 5v2' />
      <path d='M6 7l.8 11.4A2 2 0 008.8 20.3h6.4a2 2 0 002-1.9L18 7' />
      <path d='M10 11v5.5' />
      <path d='M14 11v5.5' />
    </svg>
  )
}

/** Small spinning arc for in-progress buttons. */
export function SpinnerIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={`animate-spin ${className ?? ''}`}
      aria-hidden='true'
    >
      <circle
        cx='12'
        cy='12'
        r='9'
        stroke='currentColor'
        strokeOpacity='0.25'
        strokeWidth='3'
      />
      <path
        d='M21 12a9 9 0 00-9-9'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
      />
    </svg>
  )
}
