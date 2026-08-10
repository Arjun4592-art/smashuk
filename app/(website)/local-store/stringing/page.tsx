import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { getPublicStoreContact } from '@/lib/store-contact'
import StringingBookingForm from '@/components/website/StringingBookingForm'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'

export const metadata = {
  title: `Racket Stringing Services — Badminton, Tennis & Squash | ${SITE_NAME}`,
  description:
    'Professional racket stringing for badminton, tennis and squash. UKRSA-qualified stringers, four fully-automatic machines, 24-hour turnaround or a 40-minute express service. Prices from £16.',
  keywords:
    'racket stringing manchester, badminton stringing service, tennis racket restring, squash racket restring, 40 minute stringing service, string a racket manchester, ukrsa stringers, racket restring prices',
}

const PRICING = [
  {
    sport: 'Badminton',
    icon: '🏸',
    price: 'From £16',
    href: '/local-store/stringing/badminton',
  },
  {
    sport: 'Tennis',
    icon: '🎾',
    price: 'From £22',
    href: '/local-store/stringing/tennis',
  },
  {
    sport: 'Squash',
    icon: '🏓',
    price: 'From £22',
    href: '/local-store/stringing/squash',
  },
]

const WHY_CHOOSE_US = [
  {
    icon: '👨‍🔧',
    title: 'Expert Stringing',
    desc: 'Our certified stringers have years of experience and technical expertise to deliver perfect results every time.',
  },
  {
    icon: '🏆',
    title: '10,000+ Rackets Strung',
    desc: 'With thousands of rackets strung, we have the experience and knowledge to handle any stringing requirement.',
  },
  {
    icon: '⚡',
    title: 'Fast Turnaround',
    desc: 'Choose from our standard 24-hour service or book our express 40-minute stringing for same-day play.',
  },
  {
    icon: '💡',
    title: 'Expert Guidance',
    desc: 'Not sure which string or tension is right for you? Our experts will guide you to the perfect setup for your playing style.',
  },
  {
    icon: '🎯',
    title: 'Wide String Variety',
    desc: 'We stock a comprehensive range of strings from leading brands to suit every player and budget.',
  },
  {
    icon: '🎁',
    title: 'Loyalty Programme',
    desc: 'Collect stamps with every stringing service and earn free stringing. The more you play, the more you save!',
  },
]

const GUIDES = [
  {
    icon: '📖',
    sport: 'Badminton',
    desc: 'Learn about tension, string types, and how to choose the right setup for badminton.',
    href: '/local-store/stringing/badminton',
  },
  {
    icon: '📖',
    sport: 'Tennis',
    desc: 'Discover the best strings and tensions for your tennis playing style.',
    href: '/local-store/stringing/tennis',
  },
  {
    icon: '📖',
    sport: 'Squash',
    desc: 'Everything you need to know about squash racket stringing.',
    href: '/local-store/stringing/squash',
  },
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

export default async function StringingServicesPage() {
  const contact = await getPublicStoreContact()
  const fullAddress = [
    contact.address.line1,
    contact.address.line2,
    contact.address.city,
    contact.address.pincode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className='bg-white'>
      {/* Hero */}
      <LuxuryHero
        title='Racket Stringing Services'
        subtitle='UKRSA-qualified stringers, four fully-automatic machines, and over 10,000 rackets strung — including for players at major tournaments.'
        image='/local-store/stringing-hero.jpg'
        imageAlt='Racket stringing service'
        metaLines={[`📍 ${fullAddress}`, '🕐 Opening Hours: 11am–7pm (Mon–Sat)']}
        breadcrumbs={[
          { label: 'Local Store', href: '/local-store' },
          { label: 'Stringing' },
        ]}
        size='lg'
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* 40-minute express banner */}
        <div className='bg-linear-to-r from-[#E8553A] to-[#D4441F] rounded-2xl p-8 text-center text-white mb-14'>
          <h2 className='font-montserrat font-black text-xl md:text-2xl mb-2'>
            ⚡ Get Your Racket Ready in 40 Minutes
          </h2>
          <p className='font-lato text-white/90 mb-5 max-w-lg mx-auto'>
            Book your express stringing service and have your racket ready to
            play in just 40 minutes.
          </p>
          <div className='flex flex-wrap gap-3 justify-center'>
            <a
              href='#book'
              className='inline-block bg-white text-[#E8553A] font-montserrat font-bold px-6 py-3 rounded-full text-sm hover:bg-white/90 transition-colors'
            >
              Book Now — 40 Minute Service
            </a>
            <span className='inline-flex items-center text-white/80 font-lato text-sm px-2'>
              or drop off for 24h turnaround
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-14'>
          {PRICING.map((p) => (
            <Link
              key={p.sport}
              href={p.href}
              className='block bg-white rounded-2xl border border-gray-100 p-6 text-center hover:border-[#E8553A]/30 hover:shadow-[0_8px_24px_rgba(232,85,58,0.08)] transition-all'
            >
              <span className='text-3xl'>{p.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3'>
                {p.sport}
              </h2>
              <p className='text-[#E8553A] font-montserrat font-black text-xl mt-1'>
                {p.price}
              </p>
              <p className='text-xs font-montserrat font-semibold text-[#E8553A]/70 mt-2'>
                View Details →
              </p>
            </Link>
          ))}
        </div>

        {/* Turnaround options */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          <div className='bg-[#F8F9FB] rounded-2xl border border-gray-100 p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              ⏱️ 24-Hour Standard
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Our default turnaround, no extra charge. Drop off today, collect
              tomorrow.
            </p>
          </div>
          <div className='bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-6'>
            <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
              ⚡ 40-Minute Express
            </h3>
            <p className='text-sm text-gray-500 font-lato leading-relaxed'>
              Need it before a match today? Book an on-the-spot slot in advance
              and wait in-store — a small same-day surcharge applies if it
              wasn't pre-booked.
            </p>
          </div>
        </div>

        {/* Why choose us */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Why Choose Our Stringing Services?
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
            {WHY_CHOOSE_US.map((w) => (
              <div
                key={w.title}
                className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6'
              >
                <span className='text-3xl'>{w.icon}</span>
                <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mt-3 mb-1.5'>
                  {w.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Process — horizontal timeline */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-white text-center mb-10 bg-[#0A1F44] rounded-2xl py-5 px-4'>
            What Happens To Your Racket
          </h2>

          {/* Desktop timeline */}
          <div className='hidden md:block relative'>
            {/* Connector line */}
            <div className='absolute top-5 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#E8553A] via-[#E8553A] to-[#E8553A] opacity-20' />

            <div className='grid grid-cols-5 gap-4 relative'>
              {PROCESS.map((p, i) => (
                <div
                  key={p.step}
                  className='flex flex-col items-center text-center'
                >
                  {/* Circle with connecting line overlap */}
                  <div className='relative z-10 w-10 h-10 rounded-full bg-[#E8553A] text-white font-montserrat font-black text-base flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(232,85,58,0.35)]'>
                    {p.step}
                  </div>
                  {/* Card */}
                  <div className='bg-white rounded-xl border border-gray-100 p-4 w-full hover:border-[#E8553A]/30 hover:shadow-[0_4px_16px_rgba(232,85,58,0.08)] transition-all'>
                    <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
                      {p.title}
                    </h3>
                    <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile timeline — vertical */}
          <div className='md:hidden relative pl-8'>
            {/* Vertical line */}
            <div className='absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#E8553A] to-[#E8553A]/20' />

            <div className='flex flex-col gap-6'>
              {PROCESS.map((p) => (
                <div key={p.step} className='relative flex gap-4 items-start'>
                  {/* Circle */}
                  <div className='absolute -left-8 z-10 w-8 h-8 rounded-full bg-[#E8553A] text-white font-montserrat font-black text-sm flex items-center justify-center shadow-[0_4px_12px_rgba(232,85,58,0.35)]'>
                    {p.step}
                  </div>
                  {/* Card */}
                  <div className='bg-white rounded-xl border border-gray-100 p-4 w-full'>
                    <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1.5'>
                      {p.title}
                    </h3>
                    <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bring your own string */}
        <div className='bg-white rounded-2xl border border-gray-100 p-6 mb-14 max-w-2xl mx-auto text-center'>
          <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
            🧵 Bring Your Own String
          </h3>
          <p className='text-sm text-gray-500 font-lato leading-relaxed'>
            Already have string you like? Bring it in and we'll only charge the
            labour fee. We also stock a wide range of strings from leading
            brands and can usually source a specific one on request.
          </p>
        </div>

        {/* Ready to get started / booking */}
        <div id='book' className='mb-14 reveal'>
          <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center mb-8'>
            <h2 className='font-montserrat font-black text-xl mb-2 text-white'>
              Ready to Get Started?
            </h2>
            <p className='text-white/70 font-lato mb-1'>
              Book your express 40-minute stringing service today and get back
              on court faster.
            </p>
            <p className='text-white/50 font-lato text-sm mt-3'>
              📍 {fullAddress} · 🕐 11am–7pm (Mon–Sat)
            </p>
          </div>
          <div className='max-w-md mx-auto'>
            <StringingBookingForm />
          </div>
        </div>

        {/* Helpful stringing guides */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-white text-center mb-8 bg-[#0A1F44] rounded-2xl py-5 px-4'>
            Helpful Stringing Guides
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Browse our guides to learn more about racket stringing and find the
            perfect setup for your game.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {GUIDES.map((g) => (
              <Link
                key={g.sport}
                href={g.href}
                className='block bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#E8553A]/30 hover:shadow-[0_8px_24px_rgba(232,85,58,0.08)] transition-all'
              >
                <span className='text-2xl'>{g.icon}</span>
                <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mt-2 mb-1.5'>
                  {g.sport} Stringing Guide
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed mb-2'>
                  {g.desc}
                </p>
                <span className='text-xs font-montserrat font-semibold text-[#E8553A]'>
                  Read Guide →
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className='reveal-scale bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2 text-white'>
            Prefer To Book By Phone Or Message?
          </h2>
          <p className='text-white/70 font-lato mb-5'>
            That works too — get in touch and we'll sort a slot for you.
          </p>
          <Link
            href='/contact'
            className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
