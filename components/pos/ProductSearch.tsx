'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { usePosVoiceAssistant } from '@/hooks/usePosVoiceAssistant'
interface Props {
  value: string
  onChange: (val: string) => void
  onSubmit?: (val: string) => void
  onOpenCamera?: () => void
  /** Opens the custom-sale modal. Shown below the lg breakpoint only (desktop has it in the cart toolbar). */
  onCustomItem?: () => void
}
export default function ProductSearch({
  value,
  onChange,
  onSubmit,
  onOpenCamera,
  onCustomItem,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // --- Voice assistant ----------------------------------------------------
  // Tap the mic, or turn on "Hello Smash" and just say it. It only FILLS the
  // search box — it never calls onSubmit (the barcode/SKU "add straight to
  // cart" path), so a misheard word can never add the wrong product.
  // See hooks/usePosVoiceAssistant.ts.
  const {
    supported: voiceSupported,
    listening,
    wakeOn,
    wakeListening,
    startListening,
    stopListening,
    setWakeOn,
  } = usePosVoiceAssistant({
    onQuery: onChange,
    onClear: () => onChange(''),
    onOpenCamera,
    onDone: () => inputRef.current?.focus(),
  })
  return (
    <div className='flex gap-2'>
      {}
      <div
        className='flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-white'
        style={{
          borderColor: '#E1E3E5',
        }}
      >
        {}
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
          style={{
            color: '#202223',
          }}
        />
        {}
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

      {}
      {voiceSupported && (
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
            listening
              ? 'animate-pulse'
              : 'hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
          }`}
          style={{
            background: listening ? '#FFF4F4' : '#FFFFFF',
            borderColor: listening ? '#D72C0D' : '#E1E3E5',
            color: listening ? '#D72C0D' : '#6D7175',
          }}
          title={
            listening
              ? 'Listening… tap to stop'
              : 'Voice search — say a product, brand, category (e.g. "rackets") or SKU'
          }
          aria-label={listening ? 'Stop voice search' : 'Start voice search'}
          aria-pressed={listening}
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
            <rect x='9' y='2' width='6' height='12' rx='3' />
            <path d='M5 11a7 7 0 0014 0' />
            <line x1='12' y1='18' x2='12' y2='22' />
          </svg>
          <span className='hidden sm:inline'>
            {listening ? 'Listening…' : 'Voice'}
          </span>
        </button>
      )}

      {}
      {voiceSupported && (
        <button
          onClick={() => {
            const next = !wakeOn
            setWakeOn(next)
            if (next) {
              toast('Hands-free voice is on', {
                description:
                  'Say "Hello Smash" or "search for ..." — e.g. "search for rackets". The microphone stays open while this is on.',
                duration: 4500,
              })
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
            wakeOn
              ? ''
              : 'hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
          }`}
          style={{
            background: wakeOn ? '#F2F7F5' : '#FFFFFF',
            borderColor: wakeOn ? '#008060' : '#E1E3E5',
            color: wakeOn ? '#008060' : '#6D7175',
          }}
          title={
            wakeOn
              ? 'Hands-free voice is on — say "Hello Smash" or "search for ...". Tap to turn off.'
              : 'Turn on hands-free voice search (keeps the microphone open)'
          }
          aria-label='Toggle Hello Smash hands-free voice search'
          aria-pressed={wakeOn}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              wakeListening ? 'animate-pulse' : ''
            }`}
            style={{
              background: wakeOn
                ? wakeListening
                  ? '#008060'
                  : '#B5E4D8'
                : '#C9CCCF',
            }}
          />
          <span className='hidden md:inline'>Hello Smash</span>
        </button>
      )}

      {}
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
        {}
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

      {}
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

      {}
      {onCustomItem && (
        <button
          onClick={onCustomItem}
          className='lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5] shrink-0'
          style={{
            background: '#FFFFFF',
            borderColor: '#E1E3E5',
            color: '#6D7175',
          }}
          title='Sell an item that is not registered'
          aria-label='Custom item'
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
            <line x1='12' y1='5' x2='12' y2='19' />
            <line x1='5' y1='12' x2='19' y2='12' />
          </svg>
          <span className='hidden sm:inline'>Custom</span>
        </button>
      )}
    </div>
  )
}
