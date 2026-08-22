// app/(website)/local-store/page.tsx
//
// Redesigned to match the stringing-service page's visual language
// (navy #0A1F44 / orange #E8553A / cream #F5F3EF, eyebrow pills, grid-
// texture hero, menu-style rows, numbered timelines) while keeping every
// data source wired to the same live systems as before:
//   - lib/seo.ts + lib/store-contact.ts     -> SEO + address/phone/email
//   - components/website/BrandsBar          -> real brand list (Medusa)
//   - components/website/ReviewsSlider      -> real customer reviews
//   - lib/blog-posts.ts                     -> real guide content

import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { generateStaticMetadata } from '@/lib/seo'
import { getPublicStoreContact } from '@/lib/store-contact'
import { getBlogPosts } from '@/lib/blog-posts'
import BrandsBar from '@/components/website/BrandsBar'
import ReviewsSlider from '@/components/website/ReviewsSlider'
import LocalStoreNewArrivals from '@/components/website/LocalStoreNewArrivals'
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
    image: '/local-store/service-stringing.jpg',
  },
  {
    icon: '🏸',
    title: 'Advice From Players, Not Just Staff',
    desc: "Our team plays badminton, tennis, squash and padel at club and county level. We'd rather spend ten minutes understanding your game than sell you the most expensive frame on the wall.",
    href: null as string | null,
    image: '/local-store/service-advice.jpg',
  },
  {
    icon: '🔄',
    title: 'Racket Demo & Trial Service',
    desc: "Buying a racket blind is a gamble. Try select premium frames in-store before you commit — subject to what's currently available to demo.",
    href: '/local-store/racket-demo',
    image: '/local-store/service-demo.jpg',
  },
  {
    icon: '🤝',
    title: 'Clubs, Universities & Sponsorship',
    desc: 'We work with local clubs and university teams on bulk kit orders, printed kit, demo racket programmes, shuttlecock and ball supply deals, and sponsorship packages.',
    href: '/local-store/partnerships',
    image: '/local-store/service-partnerships.jpg',
  },
]

const BOOKING_STEPS = [
  {
    n: '01',
    title: 'Book',
    body: 'Reserve your stringing slot online, ideally at least 48 hours ahead so we can guarantee your time.',
  },
  {
    n: '02',
    title: 'Drop Off',
    body: 'Bring your racket in at your booked time. Grab a coffee nearby or browse the shop while you wait.',
  },
  {
    n: '03',
    title: 'Collect',
    body: 'Pick up your freshly strung racket, tensioned exactly how you asked, and get back on court.',
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>
  )
}

function GridTexture() {
  return (
    <svg
      className='absolute inset-0 w-full h-full opacity-[0.06]'
      preserveAspectRatio='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={'v' + i}
          x1={`${i * 5.5}%`}
          y1='0'
          x2={`${i * 5.5 + 3}%`}
          y2='100%'
          stroke='white'
          strokeWidth='1'
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={'h' + i}
          x1='0'
          y1={`${i * 9}%`}
          x2='100%'
          y2={`${i * 9 + 2}%`}
          stroke='white'
          strokeWidth='1'
        />
      ))}
    </svg>
  )
}

export default async function LocalStorePage() {
  const contact = await getPublicStoreContact()
  const blogPosts = await getBlogPosts()
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
    <div className='bg-[#F5F3EF] min-h-screen'>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-20'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            Local Store
          </p>

          <div className='grid md:grid-cols-2 gap-12 items-end'>
            <div>
              <Eyebrow>⭐ Rated 4.5/5 · 100+ verified reviews</Eyebrow>
              <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-6'>
                {contact.address.city}{' '}
                <span className='text-[#E8553A]'>Racket Specialist</span>
              </h1>
              <p className='text-white/60 text-sm leading-relaxed max-w-sm mb-8'>
                Run by players, for players. Whether you're picking your first
                racket or your fifth, come and get advice from people who
                actually play badminton, tennis, squash and padel — open six
                days a week.
              </p>
              <div className='flex flex-wrap gap-3'>
                <a
                  href={directionsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='bg-[#E8553A] hover:bg-[#D4441F] text-white px-7 py-3.5 rounded-full text-sm font-montserrat font-bold transition-colors'
                >
                  Visit Us
                </a>
                <Link
                  href='/contact'
                  className='border border-white/20 hover:border-white/40 text-white/70 hover:text-white px-7 py-3.5 rounded-full text-sm font-montserrat transition-colors'
                >
                  Contact Us
                </Link>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {[
                { n: '10k+', label: 'Rackets strung' },
                { n: '100+', label: 'Verified reviews' },
                { n: '4.5/5', label: 'Average rating' },
                { n: '6', label: 'Days open a week' },
              ].map((s) => (
                <div
                  key={s.n}
                  className='bg-white/5 border border-white/10 rounded-2xl p-5'
                >
                  <p className='text-[#E8553A] font-montserrat font-black text-3xl'>
                    {s.n}
                  </p>
                  <p className='text-white/50 text-xs mt-1 leading-snug'>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className='mt-12 flex flex-wrap gap-6 text-white/40 text-xs font-mono tracking-wide'>
            <span>📍 {contact.address.city}</span>
            <span>🕐 Mon–Fri 11am–7pm · Sat 11am–5pm</span>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>Testimonials</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Customer Testimonials
        </h2>
        <ReviewsSlider />
      </section>

      {/* ── WHO WE ARE ───────────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-3xl mx-auto px-4 md:px-6 py-16 text-center'>
          <Eyebrow>Our Story</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-3'>
            Who We Are
          </h2>
          <p className='text-gray-400 text-sm leading-relaxed'>
            {SITE_NAME} is run by a team of racket sports players competing at
            club and county level in badminton, tennis and squash. We use what
            we've learned on court to help you pick equipment that actually
            suits your game — whether you're just starting out or chasing your
            next tournament win.
          </p>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <section className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>What We Do</Eyebrow>
        <h2 className='reveal font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Our Services
        </h2>
        <div className='grid md:grid-cols-2 gap-6'>
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className='reveal ls-card bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden'
            >
              <div className='ls-card-img-wrap'>
                <img
                  src={s.image}
                  alt={s.title}
                  className='w-full h-40 object-cover'
                />
              </div>
              <div className='p-6'>
                <span className='ls-card-icon inline-block text-3xl mb-3'>
                  {s.icon}
                </span>
                <h3 className='font-montserrat font-black text-[#0A1F44] text-lg mb-1.5'>
                  {s.title}
                </h3>
                <p className='text-gray-500 text-sm leading-relaxed'>
                  {s.desc}
                </p>
                {s.href && (
                  <Link
                    href={s.href}
                    className='ls-link-underline inline-block mt-3 text-sm font-montserrat font-semibold text-[#E8553A]'
                  >
                    Learn More →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOOKING STEPS ────────────────────────────────────────────── */}
      <section className='reveal bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Stringing</Eyebrow>
          <h2 className='font-montserrat font-black text-white text-3xl mb-2'>
            Fast Stringing Service
          </h2>
          <p className='text-white/50 text-sm mb-10'>
            Need a racket restrung before a match? Here&rsquo;s the process.
          </p>

          <div className='hidden md:flex gap-0 relative mb-4'>
            <div className='reveal-line-x absolute top-9 left-9 right-9 h-[2px] bg-gradient-to-r from-[#E8553A]/20 via-[#E8553A]/60 to-[#E8553A]/20' />
            {BOOKING_STEPS.map((b) => (
              <div
                key={b.n}
                className='reveal flex-1 flex flex-col items-center px-3'
              >
                <div className='ls-tap relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#E8553A] bg-[#0A1F44] flex items-center justify-center mb-5 transition-transform duration-300 hover:scale-110'>
                  <span className='font-montserrat font-black text-[#E8553A] text-lg'>
                    {b.n}
                  </span>
                </div>
                <h3 className='font-montserrat font-bold text-white text-sm text-center mb-2'>
                  {b.title}
                </h3>
                <p className='text-white/50 text-xs text-center leading-relaxed'>
                  {b.body}
                </p>
              </div>
            ))}
          </div>

          <div className='md:hidden space-y-0 relative mb-8'>
            <div className='reveal-line absolute left-[23px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#E8553A]/60 to-[#E8553A]/10' />
            {BOOKING_STEPS.map((b) => (
              <div key={b.n} className='reveal flex gap-6 py-5'>
                <div className='relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full border-2 border-[#E8553A] bg-[#0A1F44] flex items-center justify-center'>
                  <span className='font-montserrat font-black text-[#E8553A] text-sm'>
                    {b.n}
                  </span>
                </div>
                <div className='pt-2'>
                  <h3 className='font-montserrat font-bold text-white text-sm mb-1'>
                    {b.title}
                  </h3>
                  <p className='text-white/50 text-xs leading-relaxed'>
                    {b.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className='flex flex-col items-center justify-center gap-4 text-center'>
            <Link
              href='/local-store/stringing'
              className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
            >
              Book A Stringing Slot
            </Link>
            <p className='text-xs text-white/40 max-w-sm'>
              Need it faster? Give us a call — we'll always try to fit in an
              emergency restring before a match if we can.
            </p>
          </div>
        </div>
      </section>

      {/* ── GIFT CARDS ───────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-white border border-[#0A1F44]/8 rounded-2xl px-8 py-10 flex flex-col md:flex-row items-center gap-8 justify-between'>
          <div className='flex flex-col items-start gap-6 md:order-1'>
            <div>
              <h2 className='font-montserrat font-black text-[#0A1F44] text-xl mb-2'>
                Gift Cards
              </h2>
              <p className='text-gray-400 text-sm max-w-xl leading-relaxed'>
                {SITE_NAME} gift cards can be used on equipment, stringing,
                court essentials and accessories — both in-store and online. A
                simple gift for any racket sports player, whether it's a
                birthday, a tournament prize, or a thank-you.
              </p>
            </div>
            <Link
              href='/gift-cards'
              className='flex-shrink-0 inline-block bg-[#0A1F44] hover:bg-[#142d5e] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
            >
              Buy A Gift Card
            </Link>
          </div>

          <div className='flex-shrink-0 md:order-2'>
            <svg
              width='220'
              height='140'
              viewBox='0 0 220 140'
              className='drop-shadow-lg'
            >
              <rect
                x='4'
                y='4'
                width='212'
                height='132'
                rx='16'
                fill='#0A1F44'
              />
              <rect
                x='4'
                y='4'
                width='212'
                height='132'
                rx='16'
                fill='none'
                stroke='#E8553A'
                strokeWidth='2'
              />
              <circle cx='170' cy='30' r='34' fill='#E8553A' opacity='0.15' />
              <text
                x='24'
                y='40'
                fontFamily='Montserrat, sans-serif'
                fontWeight='900'
                fontSize='14'
                fill='white'
              >
                {SITE_NAME}
              </text>
              <text
                x='24'
                y='90'
                fontFamily='Montserrat, sans-serif'
                fontWeight='900'
                fontSize='20'
                fill='#E8553A'
              >
                GIFT CARD
              </text>
              <text
                x='24'
                y='114'
                fontFamily='monospace'
                fontSize='11'
                fill='rgba(255,255,255,0.5)'
                letterSpacing='2'
              >
                •••• •••• •••• 4821
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS (live catalog) ──────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>New In</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
            New Products In-Store
          </h2>
          <LocalStoreNewArrivals />
        </div>
      </section>

      {/* ── BRANDS ───────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>Brands We Carry</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          The Brands We Stock
        </h2>
        <BrandsBar />
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <Eyebrow>FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-2'>
                Your Questions, Answered
              </h2>
              <p className='text-gray-400 text-sm mb-6'>
                Have questions? We&rsquo;re here to help.
              </p>
              <div className='flex flex-col gap-2.5 text-sm mb-6'>
                <span className='text-gray-400'>
                  📞{' '}
                  <a
                    href={`tel:${contact.phone}`}
                    className='font-semibold text-[#0A1F44]'
                  >
                    {contact.phone}
                  </a>
                </span>
                <span className='text-gray-400'>
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
                className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-5 py-2.5 rounded-full text-xs transition-colors'
              >
                Contact Us
              </Link>
            </div>
            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='divide-y divide-[#0A1F44]/8 border-t border-b border-[#0A1F44]/8'
              rowClassName='py-4'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44]'
              contentClassName='text-sm text-gray-400 leading-relaxed pt-2'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </div>
      </section>

      {/* ── GUIDES ───────────────────────────────────────────────────── */}
      <section className='reveal bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Learn</Eyebrow>
          <h2 className='font-montserrat font-black text-white text-3xl mb-2'>
            Popular Racket Guides
          </h2>
          <p className='text-white/40 text-sm mb-10 max-w-md'>
            Written by players.
          </p>
          <div className='grid md:grid-cols-3 gap-4'>
            {blogPosts.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className='block bg-white/5 border border-white/10 hover:border-[#E8553A]/50 hover:bg-white/8 rounded-2xl overflow-hidden transition-all group'
              >
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className='w-full h-36 object-cover'
                />
                <div className='p-6'>
                  <span className='text-[#E8553A] text-xs font-mono tracking-wide uppercase'>
                    {post.category}
                  </span>
                  <h3 className='font-montserrat font-bold text-white text-base mt-1.5 mb-1.5 group-hover:text-[#E8553A] transition-colors'>
                    {post.title}
                  </h3>
                  <p className='text-white/40 text-xs leading-relaxed line-clamp-2 mb-3'>
                    {post.excerpt}
                  </p>
                  <span className='text-[#E8553A] text-xs font-mono tracking-wide'>
                    READ GUIDE →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / DIRECTIONS ────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-white border border-[#0A1F44]/8 rounded-2xl p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8'>
          <div className='md:order-1 flex flex-col items-start gap-6 w-full md:w-auto'>
            <div>
              <h2 className='font-montserrat font-black text-[#0A1F44] text-xl mb-1'>
                Visit Us
              </h2>
              <p className='text-gray-400 text-sm'>{fullAddress}</p>
              <p className='text-gray-400 text-sm mt-1'>
                Mon–Fri 11am–7pm · Sat 11am–5pm · Sun closed
              </p>
              <p className='text-gray-400 text-sm mt-1'>
                {contact.phone} · {contact.email}
              </p>
            </div>
            <div className='flex flex-col sm:flex-row gap-3 w-full md:w-auto'>
              <a
                href={directionsUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='bg-[#0A1F44]/5 hover:bg-[#0A1F44]/10 text-[#0A1F44] font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap text-center'
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

          <div className='md:order-2 flex-shrink-0 w-full md:w-[340px] h-[220px] rounded-2xl overflow-hidden border border-[#0A1F44]/8'>
            <iframe
              title={`${contact.name} map`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                `${contact.name}, ${fullAddress}`,
              )}&output=embed`}
              width='100%'
              height='100%'
              style={{ border: 0 }}
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER NOTE ──────────────────────────────────────────────── */}
      <section className='reveal max-w-2xl mx-auto px-4 md:px-6 pb-16 text-center'>
        <h2 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
          Who we are
        </h2>
        <p className='text-xs text-gray-400 leading-relaxed'>
          With a team coming from a diverse background, we are run by players
          who are actively playing at club to county level in badminton, tennis
          and squash. We love to share our knowledge so feel free to give us a
          ring with any questions!
        </p>
      </section>
    </div>
  )
}
