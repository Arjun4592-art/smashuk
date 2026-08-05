interface Props {
  pin: string
  error: boolean
  success: boolean
}

export default function PinDots({ pin, error, success }: Props) {
  return (
    <div className='grid grid-cols-4 gap-2'>
      {[0, 1, 2, 3].map((i) => {
        const filled = pin.length > i

        const borderColor = error
          ? '#D82C0D'
          : success
            ? '#008060'
            : filled
              ? '#008060'
              : '#E1E3E5'

        const bg = error
          ? '#FFF4F4'
          : success
            ? '#F2F7F5'
            : filled
              ? '#F2F7F5'
              : '#FFFFFF'

        const textColor = error
          ? '#D82C0D'
          : success
            ? '#008060'
            : filled
              ? '#008060'
              : '#8C9196'

        return (
          <div
            key={i}
            className='h-12 rounded-lg border-2 flex items-center justify-center text-xl font-semibold transition-all duration-200'
            style={{ background: bg, borderColor, color: textColor }}
          >
            {filled ? '●' : '–'}
          </div>
        )
      })}
    </div>
  )
}
