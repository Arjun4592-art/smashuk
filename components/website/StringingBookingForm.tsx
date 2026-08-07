'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import type { Product } from '@/types'
import {
  getStringGroupsForSport,
  getTensionsForSport,
} from '@/lib/stringing-options'

const NO_PREFERENCE = 'No preference — advise me in-store'
const OWN_STRING = 'Bringing my own string'

// Store hours — Mon-Fri 11am-7pm, Sat 11am-5pm, Sun closed. Used to build
// valid time-slot options for the day the customer picks.
function slotsForDate(dateStr: string): string[] {
  if (!dateStr) return []
  const day = new Date(`${dateStr}T00:00:00`).getDay() // 0 = Sun, 6 = Sat
  if (day === 0) return [] // closed Sundays
  const closeHour = day === 6 ? 17 : 19 // Sat closes 5pm, else 7pm
  const slots: string[] = []
  for (let h = 11; h < closeHour; h++) {
    slots.push(`${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`)
    slots.push(`${h % 12 === 0 ? 12 : h % 12}:30 ${h < 12 ? 'AM' : 'PM'}`)
  }
  return slots
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function StringingBookingForm() {
  const router = useRouter()
  const { cartId, addItem } = useCartStore()
  const [services, setServices] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState('')
  const [stringChoice, setStringChoice] = useState('')
  const [tension, setTension] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/store/products?q=Stringing')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.products ?? []).filter(
          (p: any) => p.metadata?.service_type === 'stringing',
        )
        setServices(found)
        if (found.length) setSport(found[0].metadata.service_sport)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const timeSlots = useMemo(() => slotsForDate(date), [date])
  const selectedProduct = services.find(
    (p: any) => p.metadata?.service_sport === sport,
  )
  // String/tension options change with the racket type — re-derived
  // whenever `sport` changes (see lib/stringing-options.ts, shared with the
  // /local-store/stringing/{badminton,tennis,squash} guide pages).
  const stringGroups = useMemo(() => getStringGroupsForSport(sport), [sport])
  const tensionOptions = useMemo(() => getTensionsForSport(sport), [sport])

  // Selected racket type changed — the previous string/tension pick may not
  // exist in the new sport's list, so reset both rather than silently
  // carrying over an option (e.g. a tennis string) onto a badminton booking.
  const handleSportChange = (newSport: string) => {
    setSport(newSport)
    setStringChoice('')
    setTension('')
  }

  const handleBook = async () => {
    if (!selectedProduct) {
      toast.error('Please choose a racket type.')
      return
    }
    if (!date || !time) {
      toast.error('Please choose a drop-off date and time.')
      return
    }
    if (date < todayISO()) {
      toast.error('Please choose today or a future date.')
      return
    }
    const variant = (selectedProduct as any).variants?.[0]
    if (!variant?.id) {
      toast.error(
        'This service is not available to book right now — please contact us instead.',
      )
      return
    }

    setSubmitting(true)
    try {
      const notesParts = [
        stringChoice && stringChoice !== NO_PREFERENCE
          ? `String: ${stringChoice}`
          : '',
        tension && tension !== NO_PREFERENCE ? `Tension: ${tension}` : '',
      ].filter(Boolean)

      addItem(
        selectedProduct,
        1,
        { id: variant.id },
        {
          booking_date: date,
          booking_time: time,
          tension_notes: notesParts.length
            ? notesParts.join(' · ')
            : 'No preference given',
          service_type: 'stringing',
        },
      )
      // addItem syncs to the real Medusa cart in the background — give it
      // a moment before sending the customer to the cart page.
      await new Promise((r) => setTimeout(r, 500))
      toast.success('Added to cart — review your booking before checkout.')
      router.push('/cart')
    } catch {
      toast.error('Could not add this booking — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400 font-lato'>
        Loading booking form…
      </div>
    )
  }

  if (!services.length) {
    return (
      <div className='bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-6 text-center'>
        <p className='text-sm text-gray-600 font-lato'>
          Online booking isn’t set up yet — please use the contact button below
          and we’ll book you in manually.
        </p>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-2xl border border-gray-100 p-6'>
      <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-4'>
        Book Your Stringing Online
      </h3>
      <div className='space-y-4'>
        <div>
          <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
            Racket Type
          </label>
          <div className='grid grid-cols-3 gap-2'>
            {services.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleSportChange(p.metadata.service_sport)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-lato font-semibold capitalize transition-colors ${
                  sport === p.metadata.service_sport
                    ? 'border-[#E8553A] bg-[#E8553A]/5 text-[#E8553A]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.metadata.service_sport}
              </button>
            ))}
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Drop-Off Date
            </label>
            <input
              type='date'
              value={date}
              min={todayISO()}
              onChange={(e) => {
                setDate(e.target.value)
                setTime('')
              }}
              className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44]'
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Time Slot
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date || !timeSlots.length}
              className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44] disabled:bg-gray-50 disabled:text-gray-400'
            >
              <option value=''>
                {date && !timeSlots.length
                  ? 'Closed that day'
                  : 'Select a time'}
              </option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              String (Optional)
            </label>
            <select
              value={stringChoice}
              onChange={(e) => setStringChoice(e.target.value)}
              disabled={!sport}
              className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44] disabled:bg-gray-50 disabled:text-gray-400'
            >
              <option value=''>{NO_PREFERENCE}</option>
              <option value={OWN_STRING}>{OWN_STRING}</option>
              {stringGroups.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Tension (Optional)
            </label>
            <select
              value={tension}
              onChange={(e) => setTension(e.target.value)}
              disabled={!sport}
              className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44] disabled:bg-gray-50 disabled:text-gray-400'
            >
              <option value=''>{NO_PREFERENCE}</option>
              {tensionOptions.map((t) => (
                <option key={t.level} value={`${t.range} (${t.level})`}>
                  {t.range} — {t.level}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!sport && (
          <p className='text-[11.5px] text-gray-400 font-lato -mt-2'>
            Choose a racket type above to see string & tension options.
          </p>
        )}

        <button
          onClick={handleBook}
          disabled={submitting}
          className='w-full bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold py-3 rounded-full text-sm transition-colors disabled:opacity-50'
        >
          {submitting
            ? 'Adding…'
            : selectedProduct
              ? `Book & Pay — ${(
                  (selectedProduct as any).variants?.[0]?.calculated_price
                    ?.calculated_amount ??
                  (selectedProduct as any).variants?.[0]?.prices?.[0]?.amount ??
                  0
                ).toFixed(2)}`
              : 'Book Now'}
        </button>
        <p className='text-[11.5px] text-gray-400 font-lato text-center'>
          Payment is taken online — bring your racket to us at your booked time.{' '}
          {cartId ? '' : "You'll set up your cart on the next step."}
        </p>
      </div>
    </div>
  )
}
