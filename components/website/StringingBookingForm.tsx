'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import { normalizeProduct } from '@/lib/api/store'
import type { Product } from '@/types'
import type { Sport } from '@/lib/stringing-options'
import {
  getStringGroupsForSport,
  getTensionsForSport,
} from '@/lib/stringing-options'

const NO_PREFERENCE = 'No preference — advise me in-store'
const OWN_STRING = 'Bringing my own string'

// Static racket types — used ONLY as a fallback when the live Medusa
// product fetch fails or comes back empty (backend unreachable / nothing
// seeded yet), so the form still renders and can fall back to sending a
// booking request by email instead of showing nothing.
const SPORTS: Sport[] = ['badminton', 'tennis', 'squash']

const SPORT_ICON: Record<string, string> = {
  badminton: '🏸',
  tennis: '🎾',
  squash: '🏓',
}

function formatPrice(product: any): string | null {
  const variant = product?.variants?.[0]
  const amount =
    variant?.calculated_price?.calculated_amount ?? variant?.prices?.[0]?.amount
  if (typeof amount !== 'number') return null
  return `£${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`
}

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
  // BUG FIX: this used to be typed `Product[]` and store the raw Medusa
  // products straight from /api/store/products (a plain passthrough proxy —
  // see app/api/store/products/route.ts — it does NOT run normalizeProduct()
  // like ShopClient.tsx / wishlistStore.ts do). A raw Medusa product has no
  // top-level .name/.slug/.images/.price — those only exist after
  // normalizeProduct(). Passing the raw shape straight into addItem() meant
  // the cart page (which reads item.product.name/.slug/.images[0]/.price)
  // rendered a blank name, a broken image, a dead "/shop/undefined" link,
  // and £NaN for that item's price *and* the cart's subtotal/tax/total.
  // Kept as raw `any[]` here (not `Product[]`) because matching by sport
  // still needs the raw `metadata.service_sport` field, which
  // normalizeProduct() doesn't carry over — normalization now happens right
  // before a product is used (see selectedProduct below).
  const [services, setServices] = useState<any[]>([])
  const [sport, setSport] = useState('')
  const [stringChoice, setStringChoice] = useState('')
  const [tension, setTension] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Manually-managed "which strings are available right now" catalog from
  // the dashboard (Settings → Stringing String Catalog). See
  // lib/stringing-catalog.ts. Empty array = nothing configured there yet,
  // in which case the form falls back to the static full list from
  // lib/stringing-options.ts (getStringGroupsForSport below) so it never
  // shows an empty dropdown.
  const [catalogStrings, setCatalogStrings] = useState<
    { sport: string; brand: string; name: string }[]
  >([])
  // Tracks whether the /api/store/products fetch has finished (success OR
  // failure) — used to decide when to show the "which stringing is
  // available" cards vs. a loading placeholder vs. the static fallback.
  const [servicesLoaded, setServicesLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/store/products?q=Stringing')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.products ?? []).filter(
          (p: any) => p.metadata?.service_type === 'stringing',
        )
        setServices(found)
      })
      .catch(() => {})
      .finally(() => setServicesLoaded(true))

    fetch('/api/store/stringing-catalog')
      .then((res) => res.json())
      .then((data) => setCatalogStrings(data.items ?? []))
      .catch(() => {})
  }, [])

  // What can actually be booked right now. When live "Stringing Service"
  // products exist in Medusa (seeded via Settings → Services), only those
  // sports are offered — this is the real, current availability. If the
  // fetch failed or nothing has been seeded yet, fall back to the full
  // static list so the form never renders with zero options.
  const availableSports = useMemo(() => {
    if (services.length) {
      return services
        .map((p: any) => p.metadata?.service_sport)
        .filter((s: string): s is Sport => SPORTS.includes(s as Sport))
    }
    return servicesLoaded ? SPORTS : []
  }, [services, servicesLoaded])

  const timeSlots = useMemo(() => slotsForDate(date), [date])
  // Match on the raw metadata field, then normalize just the matched
  // product — see the BUG FIX note on `services` above for why.
  const selectedRaw = services.find(
    (p: any) => p.metadata?.service_sport === sport,
  )
  const selectedProduct: Product | undefined = selectedRaw
    ? normalizeProduct(selectedRaw)
    : undefined
  // String/tension options change with the racket type — re-derived
  // whenever `sport` changes (see lib/stringing-options.ts, shared with the
  // /local-store/stringing/{badminton,tennis,squash} guide pages).
  //
  // If the dashboard's manual "Stringing String Catalog" has entries for
  // this sport, those take priority (they reflect real current
  // availability) — grouped by brand the same shape as the static list.
  // Otherwise fall back to the full static list so the dropdown is never
  // empty for a sport nobody has configured yet.
  const catalogGroupsForSport = useMemo(() => {
    const matches = catalogStrings.filter((s) => s.sport === sport)
    if (!matches.length) return null
    const byBrand = new Map<string, string[]>()
    for (const s of matches) {
      if (!byBrand.has(s.brand)) byBrand.set(s.brand, [])
      byBrand.get(s.brand)!.push(s.name)
    }
    return Array.from(byBrand.entries()).map(([group, items]) => ({
      group,
      items,
    }))
  }, [catalogStrings, sport])

  const stringGroups = useMemo(
    () => catalogGroupsForSport ?? getStringGroupsForSport(sport),
    [catalogGroupsForSport, sport],
  )
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
    if (!sport) {
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

    const notesParts = [
      stringChoice && stringChoice !== NO_PREFERENCE
        ? `String: ${stringChoice}`
        : '',
      tension && tension !== NO_PREFERENCE ? `Tension: ${tension}` : '',
    ].filter(Boolean)
    const notes = notesParts.length
      ? notesParts.join(' · ')
      : 'No preference given'

    const variant = (selectedProduct as any)?.variants?.[0]

    // No live Medusa product for this sport (backend down, or not seeded
    // yet) — send the booking as an email enquiry instead of blocking it.
    // /api/store/contact only needs SMTP, so it works independently of
    // Medusa being reachable.
    if (!selectedProduct || !variant?.id) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/store/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Website booking',
            email: 'no-reply@smashuk.co',
            subject: `Stringing booking request — ${sport}`,
            message: `Racket type: ${sport}\nDrop-off date: ${date}\nTime slot: ${time}\n${notes}\n\n(Sent automatically — online payment wasn't available when this was submitted, please contact the customer to confirm and take payment.)`,
          }),
        })
        const data = await res.json()
        if (!res.ok)
          throw new Error(data.error ?? 'Failed to send booking request')
        toast.success(
          "Booking request sent — we'll confirm by message shortly.",
        )
        setDate('')
        setTime('')
        setStringChoice('')
        setTension('')
      } catch {
        toast.error(
          'Could not send your booking request — please try again or WhatsApp us.',
        )
      } finally {
        setSubmitting(false)
      }
      return
    }

    setSubmitting(true)
    try {
      addItem(
        selectedProduct,
        1,
        { id: variant.id },
        {
          booking_date: date,
          booking_time: time,
          tension_notes: notes,
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

          {!servicesLoaded ? (
            // Fetch still in flight — three skeleton chips the same size as
            // the real cards below, so the form doesn't jump on load.
            <div className='grid grid-cols-3 gap-2'>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className='h-[62px] rounded-xl border-2 border-gray-100 bg-gray-50 animate-pulse'
                />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-2'>
              {availableSports.map((s) => {
                const liveProduct = services.find(
                  (p: any) => p.metadata?.service_sport === s,
                )
                const price = liveProduct ? formatPrice(liveProduct) : null
                return (
                  <button
                    key={s}
                    onClick={() => handleSportChange(s)}
                    className={`px-3 py-2.5 rounded-xl border-2 text-sm font-lato font-semibold capitalize transition-colors flex flex-col items-center gap-0.5 ${
                      sport === s
                        ? 'border-[#E8553A] bg-[#E8553A]/5 text-[#E8553A]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className='text-lg leading-none'>
                      {SPORT_ICON[s]}
                    </span>
                    <span>{s}</span>
                    {price && (
                      <span
                        className={`text-[10.5px] font-mono font-normal normal-case ${
                          sport === s ? 'text-[#E8553A]/70' : 'text-gray-400'
                        }`}
                      >
                        from {price}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {servicesLoaded && !services.length && (
            <p className='text-[11.5px] text-gray-400 font-lato mt-1.5'>
              Live pricing is unavailable right now — pick your racket type and
              we'll confirm the price when we message you back.
            </p>
          )}
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
            ? 'Sending…'
            : selectedProduct
              ? `Book & Pay — ${(
                  (selectedProduct as any).variants?.[0]?.calculated_price
                    ?.calculated_amount ??
                  (selectedProduct as any).variants?.[0]?.prices?.[0]?.amount ??
                  0
                ).toFixed(2)}`
              : 'Request Booking'}
        </button>
        <p className='text-[11.5px] text-gray-400 font-lato text-center'>
          {selectedProduct
            ? `Payment is taken online — bring your racket to us at your booked time.${
                cartId ? '' : " You'll set up your cart on the next step."
              }`
            : "We'll message or email you to confirm your slot and take payment — no online payment needed right now."}
        </p>
      </div>
    </div>
  )
}
