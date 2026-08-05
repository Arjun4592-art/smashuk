// app/(website)/local-store/page.tsx
//
// Content here mirrors what our physical Manchester store's page covers —
// services, the stringing booking flow, FAQs, testimonials — rewritten for
// this site rather than copied verbatim, and wired into the same
// SEO/store-contact system every other static page on this site uses
// (lib/seo.ts + lib/store-contact.ts) so it stays editable from the
// dashboard instead of being hardcoded.

import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { generateStaticMetadata } from '@/lib/seo'
import { getPublicStoreContact } from '@/lib/store-contact'

export async function generateMetadata() {
  return generateStaticMetadata('local-store')
}

const SERVICES = [
  {
    icon: '🎾',
    title: 'Racket Restringing',
    desc: "We’ve strung thousands of rackets, including for players at major tournaments. Standard turnaround is 24 hours, with an on-the-spot ~40 minute service available if you’re in a hurry before a match.",
    href: '/local-store/stringing',
  },
  {
    icon: '🏸',
    title: 'Advice From Players, Not Just Staff',
    desc: 'Our team plays badminton, tennis, squash and padel at club and county level. We\'d rather spend ten minutes understanding your game than sell you the most expensive frame on the wall.',
    href: null as string | null,
  },
  {
    icon: '🔄',
    title: 'Racket Demo & Trial Service',
    desc: "Buying a racket blind is a gamble. Try select premium frames in-store before you commit — subject to what's currently available to demo.",
    href: '/local-store/racket-demo',
  },
  {
    icon: '🤝',
    title: 'Clubs, Universities & Sponsorship',
    desc: 'We work with local clubs and university teams on bulk kit orders, printed kit, demo racket programmes, and sponsorship — get in touch to set something up.',
    href: '/local-store/partnerships',
  },
]

const BOOKING_STEPS = [
  {
    step: '01',
    title: 'Book',
    desc: 'Reserve your stringing slot online, ideally at least 48 hours ahead so we can guarantee your time.',
  },
  {
    step: '02',
    title: 'Drop Off',
    desc: "Bring your racket in at your booked time. Grab a coffee nearby or browse the shop while you wait.",
  },
  {
    step: '03',
    title: 'Collect',
    desc: 'Pick up your freshly strung racket, tensioned exactly how you asked, and get back on court.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      "Bought my first racket here and the staff couldn’t have been more patient or knowledgeable.",
    name: 'Jitan',
  },
  {
    quote:
      'Had my racket restrung and regripped in no time — fair price and genuinely good service.',
    name: 'Jack W',
  },
  {
    quote:
      "Great range of gear and the team actually took the time to steer me toward a racket that suited my game.",
    name: 'Dorota',
  },
]

const FAQS = [
  {
    q: 'Where are you located and what are your opening hours?',
    a: 'Monday–Friday 11am–7pm, Saturday 11am–5pm, closed Sundays. See the address and map below.',
  },
  {
    q: 'Where can I park?',
    a: 'Free on-street parking is usually available nearby. Pay-and-display parking at the local supermarket is roughly a minute\'s walk away, and there\'s also a covered car park at the nearby sports centre.',
  },
  {
    q: 'Will you help me choose a racket?',
    a: 'Yes — every member of staff plays racket sports themselves, so you\'ll get advice based on how you actually play, not a sales script.',
  },
  {
    q: 'Can I try a racket before buying it?',
    a: 'We run a demo/trial programme on a range of rackets, depending on what\'s currently in stock to demo.',
  },
  {
    q: 'How long does restringing take?',
    a: 'Standard turnaround is 24 hours with no extra charge. An on-the-spot ~40 minute service is also available if you book it.',
  },
  {
    q: 'Can I get my racket restrung the same day, without booking?',
    a: "Call ahead to check availability — we'll always try to help. A small same-day surcharge applies if it wasn’t booked in advance.",
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll only charge the labour cost for stringing it.",
  },
  {
    q: "Can you get a specific string I'm after?",
    a: "We stock a wide range of strings and can usually source a specific one on request — just call or email us to check.",
  },
]

export default async function LocalStorePage() {
  const contact = await getPublicStoreContact()
  const fullAddress = [
    contact.address.line1,
    contact.address.line2,
    contact.address.city,
    contact.address.pincode,
  ]
    .filter(Boolean)
    .join(', ')
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${contact.name}, ${fullAddress}`,
  )}`

  return (
    <div className='bg-white'>
      {/* Hero */}
      <div className='bg-[#0A1F44] text-white'>
        <div className='max-w-5xl mx-auto px-4 py-16 text-center'>
          <div className='inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-lato font-semibold px-3 py-1.5 rounded-full mb-5'>
            ⭐ Rated 4.5/5 · 100+ verified reviews
          </div>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            {contact.address.city} Racket Specialist
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Run by players, for players. Whether you’re picking your first
            racket or your fifth, come and get advice from people who
            actually play badminton, tennis, squash and padel — open six
            days a week.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Who we are */}
        <div className='max-w-3xl mx-auto text-center mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-3'>
            Who We Are
          </h2>
          <p className='text-gray-500 font-lato leading-relaxed'>
            {SITE_NAME} is run by a team of racket sports players competing
            at club and county level in badminton, tennis and squash. We use
            what we’ve learned on court to help you pick equipment that
            actually suits your game — whether you’re just starting out or
            chasing your next tournament win.
          </p>
        </div>

        {/* Services */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-16'>
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className='bg-white rounded-2xl border border-gray-100 p-6'
            >
              <span className='text-3xl'>{s.icon}</span>
              <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {s.title}
              </h3>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {s.desc}
              </p>
              {s.href && (
                <Link
                  href={s.href}
                  className='inline-block mt-3 text-sm font-montserrat font-semibold text-[#E8553A] hover:underline'
                >
                  Learn More →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Booking steps */}
        <div className='mb-16'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Fast Stringing Service — How It Works
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8'>
            Need a racket restrung before a match? Here&rsquo;s the process.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {BOOKING_STEPS.map((b) => (
              <div
                key={b.step}
                className='bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100'
              >
                <span className='font-montserrat font-black text-3xl text-[#E8553A]/30'>
                  {b.step}
                </span>
                <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mt-2 mb-1.5'>
                  {b.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className='mb-16'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            What Customers Say
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className='bg-white rounded-2xl border border-gray-100 p-6'
              >
                <div className='text-[#E8553A] text-sm mb-2'>★★★★★</div>
                <p className='text-sm text-gray-600 font-lato leading-relaxed italic mb-3'>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className='text-xs font-montserrat font-bold text-[#0A1F44]'>
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Gift cards */}
        <div className='bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-8 text-center mb-16'>
          <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
            Gift Cards Available In-Store
          </h2>
          <p className='text-gray-500 font-lato max-w-xl mx-auto'>
            Our physical gift cards can be used on equipment, stringing, and
            accessories — a simple gift for any racket sports player,
            whether it’s a birthday, a tournament prize, or a thank-you.
          </p>
        </div>

        {/* FAQ */}
        <div className='mb-16'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Your Questions, Answered
          </h2>
          <div className='max-w-3xl mx-auto divide-y divide-gray-100 border-t border-b border-gray-100'>
            {FAQS.map((f) => (
              <details key={f.q} className='group py-4'>
                <summary className='font-montserrat font-semibold text-sm text-[#0A1F44] cursor-pointer list-none flex items-center justify-between gap-4'>
                  {f.q}
                  <span className='text-[#E8553A] group-open:rotate-45 transition-transform text-lg leading-none'>
                    +
                  </span>
                </summary>
                <p className='text-sm text-gray-500 font-lato leading-relaxed mt-2'>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact / directions */}
        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
          <div>
            <h2 className='font-montserrat font-black text-xl mb-1'>
              Visit Us
            </h2>
            <p className='text-white/70 font-lato text-sm'>{fullAddress}</p>
            <p className='text-white/70 font-lato text-sm mt-1'>
              Mon–Fri 11am–7pm · Sat 11am–5pm · Sun closed
            </p>
            <p className='text-white/70 font-lato text-sm mt-1'>
              {contact.phone} · {contact.email}
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-3 w-full md:w-auto'>
            <a
              href={directionsUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='bg-white/10 hover:bg-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap text-center'
            >
              📍 Get Directions
            </a>
            <Link
              href='/contact'
              className='bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap text-center'
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
