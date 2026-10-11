import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { loadMailInBookingData } from '@/lib/mail-in-server'
import MailInBookingClient from './MailInBookingClient'

export const metadata: Metadata = {
  title: `Book Mail-In Stringing | ${SITE_NAME}`,
  description:
    'Book mail-in badminton or tennis racket stringing. Choose your string and tension, see the delivery price instantly and post your rackets to Smash Racket Pro.',
}

// Prices come from Medusa, so never serve a cached copy.
export const dynamic = 'force-dynamic'

export default async function MailInBookingPage() {
  const booking = await loadMailInBookingData()
  return (
    <div className='bg-[#F5F3EF] min-h-screen font-lato'>
      <header className='bg-[#0A1F44]'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-24 md:pb-28'>
          <p className='text-sm mb-5'>
            <Link
              href='/local-store/stringing/mail-in'
              className='text-white/60 hover:text-white transition-colors'
            >
              &larr; Back to Mail-In Stringing
            </Link>
          </p>
          <h1 className='font-montserrat font-black text-white text-3xl md:text-5xl leading-tight'>
            Book your restring
          </h1>
          <p className='mt-3 text-white/70 text-base max-w-xl'>
            Six quick choices. The price updates as you go, and nothing is
            charged until you check out.
          </p>
        </div>
      </header>

      {/* The form panel overlaps the header band */}
      <div className='max-w-6xl mx-auto px-4 sm:px-6 -mt-16 md:-mt-20 pb-20'>
        <MailInBookingClient {...booking} />
      </div>
    </div>
  )
}