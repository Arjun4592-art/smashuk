import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import StringingBookingForm from '@/components/website/StringingBookingForm'

export const metadata = {
  title: `Racket Stringing Services — Badminton, Tennis & Squash | ${SITE_NAME}`,
  description:
    'Professional racket stringing for badminton, tennis and squash. UKRSA-qualified stringers, four fully-automatic machines, 24-hour turnaround or a 40-minute express service. Prices from £16.',
  keywords:
    'racket stringing manchester, badminton stringing service, tennis racket restring, squash racket restring, 40 minute stringing service, string a racket manchester, ukrsa stringers, racket restring prices',
}

const PRICING = [
  { sport: 'Badminton', icon: '🏸', price: 'From £16' },
  { sport: 'Tennis', icon: '🎾', price: 'From £22' },
  { sport: 'Squash', icon: '🥎', price: 'From £22' },
]

const PROCESS = [
  {
    step: '1',
    title: 'Inspection',
    desc: 'On drop-off, we check the overall condition of your racket frame and grommets before anything else.',
  },
  {
    step: '2',
    title: 'Consultation',
    desc: 'A quick chat about your playing style, how often you play, and what string/tension has worked (or not) for you before.',
  },
  {
    step: '3',
    title: 'Stringing',
    desc: 'Strung on one of our four fully-automatic machines, to your exact tension spec.',
  },
  {
    step: '4',
    title: 'Quality Check',
    desc: 'We verify tension, check the string pattern, and inspect the frame for anything that might have shifted during stringing.',
  },
  {
    step: '5',
    title: 'Collection',
    desc: "We'll message or email you the moment it's ready, plus a few tips on looking after your new string job.",
  },
]

export default function StringingServicesPage() {
  return (
    <div className='bg-white'>
      <div className='bg-[#0A1F44] text-white'>
        <div className='max-w-5xl mx-auto px-4 py-14 text-center'>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Racket Stringing Services
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            UKRSA-qualified stringers, four fully-automatic machines, and
            over 10,000 rackets strung — including for players at major
            tournaments.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Pricing */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-14'>
          {PRICING.map((p) => (
            <div
              key={p.sport}
              className='bg-white rounded-2xl border border-gray-100 p-6 text-center'
            >
              <span className='text-3xl'>{p.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3'>
                {p.sport}
              </h2>
              <p className='text-[#E8553A] font-montserrat font-black text-xl mt-1'>
                {p.price}
              </p>
            </div>
          ))}
        </div>

        {/* Turnaround options */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          <div className='bg-[#F8F9FB] rounded-2xl border border-gray-100 p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              ⏱️ 24-Hour Standard
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Our default turnaround, no extra charge. Drop off today,
              collect tomorrow.
            </p>
          </div>
          <div className='bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              ⚡ 40-Minute Express
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Need it before a match today? Book an on-the-spot slot in
              advance and wait in-store — a small same-day surcharge applies
              if it wasn’t pre-booked.
            </p>
          </div>
        </div>

        {/* Process */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            What Happens To Your Racket
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
            {PROCESS.map((p) => (
              <div key={p.step} className='text-center'>
                <div className='w-10 h-10 rounded-full bg-[#E8553A] text-white font-montserrat font-black flex items-center justify-center mx-auto mb-3'>
                  {p.step}
                </div>
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                  {p.title}
                </h3>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty + strings */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          <div className='bg-white rounded-2xl border border-gray-100 p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              🎟️ Stringing Loyalty Stamps
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Collect a stamp with every stringing job and earn a free
              restring after enough visits. The more you play, the more you
              save.
            </p>
          </div>
          <div className='bg-white rounded-2xl border border-gray-100 p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              🧵 Bring Your Own String
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Already have string you like? Bring it in and we’ll only charge
              the labour fee. We also stock a wide range of strings from
              leading brands and can usually source a specific one on
              request.
            </p>
          </div>
        </div>

        <div className='max-w-md mx-auto mb-14'>
          <StringingBookingForm />
        </div>

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Prefer To Book By Phone Or Message?
          </h2>
          <p className='text-white/70 font-lato mb-5'>
            That works too — get in touch and we’ll sort a slot for you.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
