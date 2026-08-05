interface Props {
  onPress: (num: string) => void
  onDelete: () => void
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function PinPad({ onPress, onDelete, disabled }: Props) {
  return (
    <div className='grid grid-cols-3 gap-2'>
      {/* 1 — 9 */}
      {KEYS.map((num) => (
        <button
          key={num}
          onClick={() => !disabled && onPress(num)}
          disabled={disabled}
          className='rounded-lg py-3.5 text-base font-semibold border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
          style={{
            background: '#FFFFFF',
            borderColor: '#E1E3E5',
            color: '#202223',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {num}
        </button>
      ))}

      {/* Empty */}
      <div />

      {/* 0 */}
      <button
        onClick={() => !disabled && onPress('0')}
        disabled={disabled}
        className='rounded-lg py-3.5 text-base font-semibold border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#008060] hover:text-[#008060] hover:bg-[#F2F7F5]'
        style={{
          background: '#FFFFFF',
          borderColor: '#E1E3E5',
          color: '#202223',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        0
      </button>

      {/* Delete — SVG icon */}
      <button
        onClick={() => !disabled && onDelete()}
        disabled={disabled}
        className='rounded-lg py-3.5 flex items-center justify-center border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#D82C0D] hover:bg-[#FFF4F4]'
        style={{
          background: '#FFFFFF',
          borderColor: '#E1E3E5',
        }}
      >
        <svg
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#6D7175'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z' />
          <line x1='18' y1='9' x2='12' y2='15' />
          <line x1='12' y1='9' x2='18' y2='15' />
        </svg>
      </button>
    </div>
  )
}
