'use client'
import { useRef } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  // Fired when the cashier presses Enter in the box — this is how barcode
  // scanners "type": they act as a keyboard, blast out the barcode/SKU
  // digits, then send a real Enter keystroke. The parent looks up an exact
  // SKU match and adds it straight to the cart.
  onSubmit?: (val: string) => void
  // Opens the camera-based scanner (tablet/phone camera) — separate from
  // the hardware-scanner flow above, for devices with no physical scanner
  // attached. Only shown when the parent provides this.
  onOpenCamera?: () => void
}

export default function ProductSearch({
  value,
  onChange,
  onSubmit,
  onOpenCamera,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className='flex gap-2'>
      {/* Search input — also doubles as the barcode-scan target */}
      <div
        className='flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-white'
        style={{ borderColor: '#E1E3E5' }}
      >
        {/* Search SVG */}
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#8C9196'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='flex-shrink-0'
        >
          <circle cx='11' cy='11' r='8' />
          <line x1='21' y1='21' x2='16.65' y2='16.65' />
        </svg>
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              e.preventDefault()
              onSubmit?.(value.trim())
            }
          }}
          placeholder='Search by name/SKU, or scan a barcode...'
          className='flex-1 bg-transparent outline-none text-sm'
          style={{ color: '#202223' }}
        />
        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange('')}
            className='flex-shrink-0 p-0.5 rounded transition-colors hover:bg-[#F6F6F7]'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#8C9196'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        )}
      </div>

      {/* Scan barcode button — just focuses the box so a handheld/USB
          scanner (which types into whatever has focus) is ready to fire.
          It does NOT add a random product anymore. */}
      <button
        onClick={() => inputRef.current?.focus()}
        className='flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
        style={{
          background: '#FFFFFF',
          borderColor: '#E1E3E5',
          color: '#6D7175',
        }}
        title='Focus this box, then scan — the scanner types the barcode and hits Enter for you'
      >
        {/* Barcode SVG */}
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
        >
          <path d='M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14' />
          <path d='M3 5h2M3 19h2M19 5h2M19 19h2' />
        </svg>
        <span className='hidden sm:inline'>Scan</span>
      </button>

      {/* Camera scan button — opens CameraBarcodeScanner for devices with
          no physical scanner attached (tablet/phone camera). */}
      {onOpenCamera && (
        <button
          onClick={onOpenCamera}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
          style={{
            background: '#FFFFFF',
            borderColor: '#E1E3E5',
            color: '#6D7175',
          }}
          title="Scan a barcode using this device\'s camera"
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z' />
            <circle cx='12' cy='13' r='4' />
          </svg>
          <span className='hidden sm:inline'>Camera</span>
        </button>
      )}
    </div>
  )
}
