'use client'

import { formatCurrency } from '@/lib/utils'
import { racketsLabel, type MailInBookingGroup } from '@/lib/mail-in'
import type { CartItem } from '@/store/cartStore'

type Booking = MailInBookingGroup<CartItem>

const sportLabel = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Mail-in'

function ParcelIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M21 8 12 3 3 8v8l9 5 9-5V8Z' />
      <path d='m3 8 9 5 9-5M12 13v8' />
    </svg>
  )
}

/** The detail lines of a booking: rackets, shipping, box kit, extras. */
function BookingLines({ b }: { b: Booking }) {
  const rows: { key: string; label: React.ReactNode; amount: number }[] = []
  b.rackets.forEach((r) =>
    rows.push({
      key: `r${r.n}`,
      label: (
        <>
          <span className='font-semibold text-[#0A1F44]'>
            {b.rackets.length > 1 ? `Racket ${r.n}` : 'Racket'}
            {r.model ? `: ${r.model}` : ''}
          </span>
          <span className='block text-gray-500'>
            {r.string}
            {r.tension ? ` · ${r.tension}` : ''}
          </span>
        </>
      ),
      amount: r.amount,
    }),
  )
  if (b.delivery)
    rows.push({
      key: 'delivery',
      label: (
        <>
          <span className='font-semibold text-[#0A1F44]'>
            Round-trip shipping
          </span>
          <span className='block text-gray-500'>
            One box, {racketsLabel(b.rackets.length)}
          </span>
        </>
      ),
      amount: b.delivery.amount,
    })
  if (b.boxKit)
    rows.push({
      key: 'box',
      label: (
        <span className='font-semibold text-[#0A1F44]'>
          Reusable Racket Box Kit
        </span>
      ),
      amount: b.boxKit.amount,
    })
  if (b.priorityLine)
    rows.push({
      key: 'priority',
      label: (
        <span className='font-semibold text-[#0A1F44]'>Priority service</span>
      ),
      amount: b.priorityLine.amount,
    })
  b.extras.forEach((e, i) =>
    rows.push({
      key: `x${i}`,
      label: (
        <span className='font-semibold text-[#0A1F44]'>
          {e.qty} × {e.label}
        </span>
      ),
      amount: e.amount,
    }),
  )
  return (
    <ul className='mt-3 space-y-2 text-xs font-lato'>
      {rows.map((r) => (
        <li key={r.key} className='flex justify-between gap-4'>
          <span className='min-w-0'>{r.label}</span>
          <span className='shrink-0 text-gray-600'>
            {formatCurrency(r.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** One mail-in booking as a single cart row (cart page). */
export function MailInCartRow({
  booking,
  onRemove,
}: {
  booking: Booking
  onRemove: () => void
}) {
  const racketCount = booking.rackets.length
  return (
    <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 sm:gap-6 py-6 items-start'>
      <div className='flex gap-4'>
        <div className='shrink-0 w-20 h-20 rounded-lg bg-[#F5F3EF] border border-gray-100 flex items-center justify-center text-[#0A1F44]'>
          <ParcelIcon className='h-9 w-9' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-[11px] text-gray-400 font-lato uppercase tracking-wider mb-0.5'>
            Mail-in stringing
          </p>
          <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm leading-snug'>
            {sportLabel(booking.sport)} restring, {racketsLabel(racketCount)}
          </h3>
          <p className='text-xs text-gray-400 font-lato mt-1'>
            {booking.hasBox ? 'Using your own box' : 'Box kit sent to you'}
            {booking.priority ? ' · Priority' : ''}
          </p>
          <BookingLines b={booking} />
          <button
            onClick={onRemove}
            className='inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-lato mt-3 transition-colors'
          >
            Remove booking
          </button>
        </div>
      </div>

      <div className='flex sm:justify-center'>
        <span className='w-36 text-center text-xs text-gray-400 font-lato'>
          1 booking
        </span>
      </div>

      <div className='sm:w-24 sm:text-right'>
        <span className='font-montserrat font-black text-[#0A1F44] text-base'>
          {formatCurrency(booking.total)}
        </span>
      </div>
    </div>
  )
}

/** One mail-in booking as a single compact row (checkout summary). */
export function MailInSummaryRow({ booking }: { booking: Booking }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='w-12 h-12 rounded-lg bg-[#F5F3EF] shrink-0 border border-gray-100 flex items-center justify-center text-[#0A1F44]'>
        <ParcelIcon className='h-6 w-6' />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-xs font-semibold text-[#0A1F44] font-montserrat truncate'>
          Mail-in stringing
        </p>
        <p className='text-xs text-gray-400 font-lato truncate'>
          {sportLabel(booking.sport)}, {racketsLabel(booking.rackets.length)}
          {booking.hasBox ? '' : ' + box kit'}
          {booking.priority ? ' · Priority' : ''}
        </p>
        {booking.rackets.map((r) => (
          <p key={r.n} className='text-xs text-gray-400 font-lato truncate'>
            {r.string}
            {r.tension ? ` · ${r.tension}` : ''}
          </p>
        ))}
      </div>
      <span className='text-sm font-black font-montserrat text-[#0A1F44]'>
        {formatCurrency(booking.total)}
      </span>
    </div>
  )
}
