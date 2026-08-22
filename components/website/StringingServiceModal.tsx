'use client'

// StringingServiceModal
//
// The "Choose Your Service Option" entry gate — shown before the customer
// reaches the actual booking form. Mirrors the 3-option flow customers
// already know from the standalone stringing app (smashuk-manchester.co.uk
// /CustomerStatus): Standard drop-off, 40-Minute Express (bookable online),
// and an Emergency same-day call-in.
//
// Only "Express" leads into a form — it closes this modal and scrolls to
// the existing #book section, which renders <StringingBookingForm />
// (see app/(website)/local-store/stringing/page.tsx). Standard and
// Emergency are informational only, since neither is a bookable-online
// flow on this site.

import { CloseIcon } from '@/components/ui/Icons'
import {
  CONTACT_PHONE,
  CONTACT_EMAIL,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
} from '@/lib/constants'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onClose: () => void
  onBookExpress: () => void
}

const PRICING = [
  { sport: 'Badminton', icon: '🏸', from: '£16' },
  { sport: 'Squash', icon: '🏓', from: '£22' },
  { sport: 'Tennis', icon: '🎾', from: '£22' },
]

export default function StringingServiceModal({
  onClose,
  onBookExpress,
}: Props) {
  const phoneHref = `tel:${CONTACT_PHONE.replace(/\s+/g, '')}`

  // Mounted only after the component lands on the client, so
  // createPortal(document.body) never runs during SSR (document doesn't
  // exist there). This is a 'use client' component already rendered
  // conditionally (only when open), so this resolves on the very next
  // render — no visible flash.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const modal = (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-start justify-between px-6 pt-6 pb-2 sticky top-0 bg-white z-10'>
          <div>
            <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
              Choose Your Service Option
            </h2>
            <p className='text-gray-400 text-sm font-lato mt-1 max-w-md'>
              We offer three convenient ways to get your racket strung — pick
              whichever suits your schedule.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label='Close'
            className='w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#0A1F44] transition-colors'
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* 3 service cards */}
        <div className='px-6 pt-4 pb-2 grid md:grid-cols-3 gap-4'>
          {/* Standard */}
          <div className='rounded-2xl border-2 border-[#0A1F44]/10 p-5 flex flex-col'>
            <span className='self-start bg-[#0A1F44] text-white text-[10px] font-montserrat font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4'>
              Most Popular
            </span>
            <span className='text-3xl mb-3'>⏱️</span>
            <h3 className='font-montserrat font-black text-[#0A1F44] text-base leading-tight mb-1'>
              24-Hour Standard Service
            </h3>
            <p className='text-[#0A1F44]/70 font-montserrat font-bold text-sm mb-3'>
              No Booking Required
            </p>
            <p className='text-gray-400 text-xs font-lato leading-relaxed mb-4'>
              Simply drop off your racket during our opening hours. Ready for
              collection within 24 hours.
            </p>
            <div className='mt-auto bg-gray-50 rounded-xl p-3 mb-4'>
              <p className='text-[11px] font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                📍 Opening Hours
              </p>
              <p className='text-[11px] text-gray-500 font-lato leading-relaxed'>
                Mon–Sat · 11am–7pm
                <br />
                Sunday: Closed
              </p>
            </div>
            <a
              href='/local-store'
              className='text-center bg-[#0A1F44] hover:bg-[#142d5e] text-white font-montserrat font-bold text-xs px-4 py-2.5 rounded-full transition-colors'
            >
              Visit Our Store
            </a>
          </div>

          {/* Express */}
          <div className='rounded-2xl border-2 border-[#E8553A]/30 p-5 flex flex-col relative overflow-hidden'>
            <span className='self-start bg-[#E8553A] text-white text-[10px] font-montserrat font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4'>
              Premium Service
            </span>
            <span className='text-3xl mb-3'>⚡</span>
            <h3 className='font-montserrat font-black text-[#0A1F44] text-base leading-tight mb-1'>
              40-Minute Express Service
            </h3>
            <p className='text-[#E8553A] font-montserrat font-bold text-sm mb-3'>
              48h Advance Booking
            </p>
            <p className='text-gray-400 text-xs font-lato leading-relaxed mb-4'>
              Book your slot online at least 48 hours in advance. Perfect for
              tournament preparation.
            </p>
            <div className='mt-auto bg-[#E8553A]/5 rounded-xl p-3 mb-4'>
              <p className='text-[11px] font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                📋 Requirements
              </p>
              <ul className='text-[11px] text-gray-500 font-lato leading-relaxed space-y-0.5'>
                <li>• 48 hours advance booking</li>
                <li>• Online booking system</li>
                <li>• Wait while we complete</li>
              </ul>
            </div>
            <button
              onClick={onBookExpress}
              className='bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold text-xs px-4 py-2.5 rounded-full transition-colors'
            >
              📅 Book Express Service
            </button>
          </div>

          {/* Emergency */}
          <div className='rounded-2xl border-2 border-[#0A1F44]/10 p-5 flex flex-col'>
            <span className='self-start bg-orange-100 text-orange-600 text-[10px] font-montserrat font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4'>
              Emergency Service
            </span>
            <span className='text-3xl mb-3'>📞</span>
            <h3 className='font-montserrat font-black text-[#0A1F44] text-base leading-tight mb-1'>
              Emergency Same-Day Service
            </h3>
            <p className='text-orange-600 font-montserrat font-bold text-sm mb-3'>
              Call to Enquire
            </p>
            <p className='text-gray-400 text-xs font-lato leading-relaxed mb-4'>
              Need urgent service? Call us during opening hours to check
              same-day availability.
            </p>
            <div className='mt-auto bg-gray-50 rounded-xl p-3 mb-4'>
              <p className='text-[11px] font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                📞 Contact Us
              </p>
              <p className='text-[11px] text-gray-500 font-lato leading-relaxed'>
                {CONTACT_PHONE}
                <br />
                {CONTACT_EMAIL}
              </p>
              <p className='text-[10px] text-orange-500 font-lato mt-1'>
                *Additional charges apply
              </p>
            </div>
            <a
              href={phoneHref}
              className='text-center bg-orange-500 hover:bg-orange-600 text-white font-montserrat font-bold text-xs px-4 py-2.5 rounded-full transition-colors'
            >
              📞 Call Now
            </a>
          </div>
        </div>

        {/* Pricing footer */}
        <div className='mx-6 mb-6 mt-2 bg-gray-50 rounded-2xl p-5'>
          <h4 className='font-montserrat font-black text-[#0A1F44] text-sm text-center mb-4'>
            Professional Stringing Pricing
          </h4>
          <div className='grid grid-cols-3 gap-3'>
            {PRICING.map((p) => (
              <div
                key={p.sport}
                className='bg-white rounded-xl p-3 text-center border border-gray-100'
              >
                <p className='font-montserrat font-black text-[#E8553A] text-lg'>
                  {p.from}
                </p>
                <p className='text-gray-400 text-[11px] font-lato'>
                  {p.icon} {p.sport}
                </p>
              </div>
            ))}
          </div>
          <p className='text-center text-[10.5px] text-gray-400 font-lato mt-3'>
            Bring your own string? We only charge the labour fee. Address:{' '}
            {STORE_ADDRESS_LINE1}, {STORE_ADDRESS_LINE2}
          </p>
        </div>
      </div>
    </div>
  )

  // Render straight onto document.body — this page's hero section uses the
  // "reveal" scroll-animation class, which applies a CSS transform on
  // scroll. A transformed ancestor becomes the containing block for any
  // `position: fixed` descendant, which was pinning this modal inside that
  // section instead of covering the full viewport. Portalling to <body>
  // sidesteps that entirely.
  if (!mounted) return null
  return createPortal(modal, document.body)
}
