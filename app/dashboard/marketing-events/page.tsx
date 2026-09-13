'use client'

import { useState, useEffect } from 'react'

interface MarketingEvent {
  orderId: string
  orderRef: string
  email?: string
  eventName: string
  firedAt: string
  value: number | null
  currency: string | null
  metaCapiSent: boolean
  metaCapiReason: string | null
  googleAdsAttempted: boolean
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {ok ? '✓' : '✕'} {label}
    </span>
  )
}

export default function MarketingEventsPage() {
  const [events, setEvents] = useState<MarketingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/marketing-events')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError('Failed to load marketing events'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold mb-1'>Marketing Events</h1>
      <p className='text-sm text-[#6D7175] mb-4'>
        Purchase events fired from the site, with Meta Conversions API status.
        Google Ads only shows whether the browser attempted the conversion call
        — confirm actual delivery in Google Ads → Goals → Conversions.
      </p>

      {loading && <p className='text-sm text-[#6D7175]'>Loading…</p>}
      {error && <p className='text-sm text-red-600'>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p className='text-sm text-[#6D7175]'>No purchase events logged yet.</p>
      )}

      {!loading && events.length > 0 && (
        <div className='overflow-x-auto border border-[#E1E3E5] rounded-lg'>
          <table className='w-full text-sm'>
            <thead className='bg-[#F6F6F7] text-[#6D7175] text-left'>
              <tr>
                <th className='px-4 py-2'>Order</th>
                <th className='px-4 py-2'>Event</th>
                <th className='px-4 py-2'>Value</th>
                <th className='px-4 py-2'>Meta CAPI</th>
                <th className='px-4 py-2'>Google Ads</th>
                <th className='px-4 py-2'>Fired at</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, i) => (
                <tr
                  key={`${evt.orderId}-${i}`}
                  className='border-t border-[#E1E3E5]'
                >
                  <td className='px-4 py-2 font-medium'>{evt.orderRef}</td>
                  <td className='px-4 py-2'>{evt.eventName}</td>
                  <td className='px-4 py-2'>
                    {evt.value != null
                      ? `${evt.value} ${evt.currency ?? ''}`
                      : '—'}
                  </td>
                  <td className='px-4 py-2'>
                    <StatusBadge
                      ok={evt.metaCapiSent}
                      label={
                        evt.metaCapiSent
                          ? 'Sent'
                          : (evt.metaCapiReason ?? 'Failed')
                      }
                    />
                  </td>
                  <td className='px-4 py-2'>
                    <StatusBadge
                      ok={evt.googleAdsAttempted}
                      label={
                        evt.googleAdsAttempted ? 'Attempted' : 'Not configured'
                      }
                    />
                  </td>
                  <td className='px-4 py-2 text-[#6D7175]'>
                    {new Date(evt.firedAt).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
