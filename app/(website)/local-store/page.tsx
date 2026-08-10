// app/(website)/local-store/page.tsx
//
// Content here mirrors what our physical Manchester store's page covers —
// services, the stringing booking flow, brands stocked, partnership
// programmes, reviews, and FAQs — rewritten for this site rather than
// copied verbatim, and wired into the same live systems every other page
// on this site uses instead of hardcoding anything that already has a
// real source of truth:
//   - lib/seo.ts + lib/store-contact.ts     -> SEO + address/phone/email
//   - components/website/BrandsBar          -> real brand list (Medusa)
//   - components/website/ReviewsSlider      -> real customer reviews
//   - lib/blog-posts.ts                     -> real guide content
// This keeps the page editable from the dashboard / catalog instead of
// drifting out of sync with what the store actually stocks.

import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { generateStaticMetadata } from '@/lib/seo'
import { getPublicStoreContact } from '@/lib/store-contact'
import { BLOG_POSTS } from '@/lib/blog-posts'
import BrandsBar from '@/components/website/BrandsBar'
import ReviewsSlider from '@/components/website/ReviewsSlider'
import LocalStoreNewArrivals from '@/components/website/LocalStoreNewArrivals'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'
import Accordion from '@/components/website/local-store/Accordion'

export async function generateMetadata() {
  return generateStaticMetadata('local-store')
}

const SERVICES = [
  {
    icon: '🎾',
    title: 'Racket Restringing',
    desc: "We've strung over 10,000 rackets, including for players at major tournaments. Standard turnaround is 24 hours, with an on-the-spot ~40 minute express service available if you're in a hurry before a match.",
    href: '/local-store/stringing',
    // TODO: replace with your stringing machine / restring photo
    image: '/local-store/service-stringing.jpg',
  },
  {
    icon: '🏸',
    title: 'Advice From Players, Not Just Staff',
    desc: "Our team plays badminton, tennis, squash and padel at club and county level. We'd rather spend ten minutes understanding your game than sell you the most expensive frame on the wall.",
    href: null as string | null,
    // TODO: replace with a staff/team photo
    image: '/local-store/service-advice.jpg',
  },
  {
    icon: '🔄',
    title: 'Racket Demo & Trial Service',
    desc: "Buying a racket blind is a gamble. Try select premium frames in-store before you commit — subject to what's currently available to demo.",
    href: '/local-store/racket-demo',
    // TODO: replace with a demo racket wall / trial photo
    image: '/local-store/service-demo.jpg',
  },
  {
    icon: '🤝',
    title: 'Clubs, Universities & Sponsorship',
    desc: 'We work with local clubs and university teams on bulk kit orders, printed kit, demo racket programmes, shuttlecock and ball supply deals, and sponsorship packages.',
    href: '/local-store/partnerships',
    // TODO: replace with a club/kit/team photo
    image: '/local-store/service-partnerships.jpg',
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
    desc: 'Bring your racket in at your booked time. Grab a coffee nearby or browse the shop while you wait.',
  },
  {
    step: '03',
    title: 'Collect',
    desc: 'Pick up your freshly strung racket, tensioned exactly how you asked, and get back on court.',
  },
]

const FAQS = [
  {
    q: 'Where are you located and what are your opening hours?',
    a: 'Monday–Friday 11am–7pm, Saturday 11am–5pm, closed Sundays. See the address and map below.',
  },
  {
    q: 'Where can I park?',
    a: "Free on-street parking is usually available nearby. Pay-and-display parking at the local supermarket is roughly a minute's walk away, and there's also a free covered car park at the nearby sports centre.",
  },
  {
    q: 'Will you help me choose a racket?',
    a: "Yes — every member of staff plays racket sports themselves, so you'll get advice based on how you actually play, not a sales script.",
  },
  {
    q: 'Can I try a racket before buying it?',
    a: "We run a demo/trial programme on a range of rackets, depending on what's currently in stock to demo.",
  },
  {
    q: 'How long does restringing take?',
    a: 'Standard turnaround is 24 hours with no extra charge. An on-the-spot ~40 minute express service is also available if you book it.',
  },
  {
    q: 'Can I get my racket restrung the same day, without booking?',
    a: "Call ahead to check availability — we'll always try to help. A small same-day surcharge applies if it wasn't booked in advance.",
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll only charge the labour cost for stringing it.",
  },
  {
    q: "Can you get a specific string I'm after?",
    a: 'We stock a wide range of strings and can usually source a specific one on request — just call or email us to check.',
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
      <LuxuryHero
        eyebrow='⭐ Rated 4.5/5 · 100+ verified reviews'
        title={`${contact.address.city} Racket Specialist`}
        subtitle="Run by players, for players. Whether you're picking your first racket or your fifth, come and get advice from people who actually play badminton, tennis, squash and padel — open six days a week."
        image='/local-store/hero.jpg'
        imageAlt={`${contact.address.city} racket store front`}
        size='lg'
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Reviews - live data from the site's review system (shown right after hero, matching in-store page order) */}
        <div className='mb-16 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Customer Testimonials
          </h2>
          <ReviewsSlider />
        </div>

        {/* Who we are */}
        <div className='max-w-3xl mx-auto text-center mb-14 reveal'>
          <span className='ls-eyebrow text-[#E8553A] text-xs font-montserrat font-bold uppercase mb-2 inline-flex'>
            Our Story
          </span>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-3'>
            Who We Are
          </h2>
          <p className='text-gray-500 font-lato leading-relaxed'>
            {SITE_NAME} is run by a team of racket sports players competing at
            club and county level in badminton, tennis and squash. We use what
            we've learned on court to help you pick equipment that actually
            suits your game — whether you're just starting out or chasing your
            next tournament win.
          </p>
        </div>

        {/* Services */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-16'>
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className='ls-card reveal bg-white rounded-2xl border border-gray-100 overflow-hidden'
            >
              {/* TODO: replace src in SERVICES array above with your own photo */}
              <div className='ls-card-img-wrap'>
                <img
                  src={s.image}
                  alt={s.title}
                  className='w-full h-40 object-cover'
                />
              </div>
              <div className='p-6'>
                <span className='ls-card-icon inline-block text-3xl'>
                  {s.icon}
                </span>
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
            </div>
          ))}
        </div>

        {/* Booking steps */}
        <div className='mb-16'>
          <h2 className='reveal font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Fast Stringing Service — How It Works
          </h2>
          <p className='reveal text-gray-500 font-lato text-center mb-8'>
            Need a racket restrung before a match? Here&rsquo;s the process.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {BOOKING_STEPS.map((b) => (
              <div
                key={b.step}
                className='ls-card reveal bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100'
              >
                <span className='ls-step-badge font-montserrat font-black text-3xl text-[#E8553A]/30'>
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
          <div className='reveal flex flex-col sm:flex-row items-center justify-center gap-3 mt-8'>
            <Link
              href='/local-store/stringing'
              className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
            >
              Book A Stringing Slot
            </Link>
            <p className='text-xs text-gray-400 font-lato'>
              Need it faster? Give us a call — we'll always try to fit in an
              emergency restring before a match if we can.
            </p>
          </div>
        </div>

        {/* Gift cards */}
        <div className='ls-card reveal-scale bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-8 text-center mb-16'>
          <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
            Gift Cards
          </h2>
          <p className='text-gray-500 font-lato max-w-xl mx-auto mb-4'>
            {SITE_NAME} gift cards can be used on equipment, stringing, court
            essentials and accessories — both in-store and online. A simple gift
            for any racket sports player, whether it's a birthday, a tournament
            prize, or a thank-you.
          </p>
          <Link
            href='/gift-cards'
            className='ls-btn-shine inline-block bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Buy A Gift Card
          </Link>
        </div>

        {/* New Products In-Store - live catalog data, tabbed by sport */}
        <div className='reveal'>
          <LocalStoreNewArrivals />
        </div>

        <div className='ls-divider my-14' />

        {/* Brands we carry - live from the catalog */}
        <div className='reveal'>
          <BrandsBar />
        </div>

        {/* FAQ — split into a left intro column + right accordion column */}
        <div className='mb-16'>
          <div className='reveal grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <span className='ls-eyebrow text-[#E8553A] text-xs font-montserrat font-bold uppercase mb-2 inline-flex'>
                FAQs
              </span>
              <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-2'>
                Your Questions, Answered
              </h2>
              <p className='text-gray-500 font-lato mb-6'>
                Have questions? We&rsquo;re here to help.
              </p>
              <div className='flex flex-col gap-2.5 text-sm font-lato mb-6'>
                <span className='text-gray-500'>
                  📞{' '}
                  <a
                    href={`tel:${contact.phone}`}
                    className='font-semibold text-[#0A1F44]'
                  >
                    {contact.phone}
                  </a>
                </span>
                <span className='text-gray-500'>
                  ✉️{' '}
                  <a
                    href={`mailto:${contact.email}`}
                    className='font-semibold text-[#0A1F44]'
                  >
                    {contact.email}
                  </a>
                </span>
              </div>
              <Link
                href='/contact'
                className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-5 py-2.5 rounded-full text-xs transition-colors'
              >
                Contact Us
              </Link>
            </div>

            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='divide-y divide-gray-100 border-t border-b border-gray-100'
              rowClassName='py-4'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44]'
              contentClassName='text-sm text-gray-500 font-lato leading-relaxed pt-2'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </div>

        {/* Popular Racket Guides - real content from lib/blog-posts.ts */}
        <div className='mb-16'>
          <h2 className='reveal font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-1'>
            Popular Racket Guides
          </h2>
          <p className='reveal text-gray-500 font-lato text-center mb-8'>
            Written by players
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {BLOG_POSTS.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className='ls-card reveal block bg-white rounded-2xl border border-gray-100 overflow-hidden'
              >
                <div className='ls-card-img-wrap'>
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className='w-full h-36 object-cover'
                  />
                </div>
                <div className='p-5'>
                  <span className='text-xs font-montserrat font-bold text-[#E8553A] uppercase tracking-wide'>
                    {post.category}
                  </span>
                  <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mt-1.5 mb-1.5'>
                    {post.title}
                  </h3>
                  <p className='text-sm text-gray-500 font-lato leading-relaxed line-clamp-2'>
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact / directions */}
        <div className='reveal-scale bg-[#0A1F44] rounded-2xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
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
              className='ls-btn-shine bg-white/10 hover:bg-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap text-center'
            >
              📍 Get Directions
            </a>
            <Link
              href='/contact'
              className='ls-btn-shine bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap text-center'
            >
              Contact Us
            </Link>
          </div>
        </div>

        <div className='max-w-2xl mx-auto text-center mt-14'>
          <h2 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
            Who we are
          </h2>
          <p className='text-xs text-gray-500 font-lato leading-relaxed'>
            With a team coming from a diverse background, we are run by players
            who are actively playing at club to county level in badminton,
            tennis and squash. We love to share our knowledge so feel free to
            give us a ring with any questions!
          </p>
        </div>
      </div>
    </div>
  )
}
