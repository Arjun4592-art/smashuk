import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import Accordion from '@/components/website/local-store/Accordion'
import { MAIL_IN_BOOKING_HREF } from '@/lib/mail-in'

export const metadata = {
  title: `Mail-In Racket Stringing — Badminton & Tennis, UK-wide | ${SITE_NAME}`,
  description:
    'Post your badminton or tennis rackets to Smash Racket Pro. Professional stringing, tracked delivery, about 2 working days turnaround and cheaper delivery when you send more rackets.',
  keywords:
    'mail in racket stringing, post racket stringing, badminton stringing by post, tennis stringing by post, racket restring UK',
}

// Every "Book" button goes to the dedicated booking page.
const BOOKING_HREF = MAIL_IN_BOOKING_HREF

const STEPS = [
  {
    n: '1',
    icon: 'book' as const,
    title: 'Book Online',
    body: 'Choose your racket, string and tension.',
  },
  {
    n: '2',
    icon: 'pack' as const,
    title: 'Pack Your Rackets',
    body: "Already have a suitable racket box? Use your own. No box? Choose our Reusable Racket Box Kit and we'll send one to you.",
  },
  {
    n: '3',
    icon: 'send' as const,
    title: 'Send Them To Us',
    body: 'Use the shipping instructions provided after booking. Your rackets are sent to Smash Racket Pro using tracked delivery.',
  },
  {
    n: '4',
    icon: 'string' as const,
    title: 'We String & Return Them',
    body: 'We restring your racket and securely send it back to you. Standard stringing normally takes approximately 2 working days after we receive your racket.',
  },
]

const PRICES = [
  { rackets: '1 racket', price: '£12.95', best: false },
  { rackets: '2 rackets', price: '£8.95', best: false },
  { rackets: '3+ rackets', price: '£5.95', best: true },
]

const PACK_STEPS = [
  'Racket inside the box',
  'Protection around the racket',
  'Box securely closed',
  'Finished parcel ready for delivery',
]

const TRUST_POINTS = [
  'Experienced racket specialists',
  'Professional stringing equipment',
  'String and tension selected by you',
  'Racket inspected before stringing',
  'Securely packed before return',
]

// TODO: replace with 3 genuine customer reviews before launch (stringing
// quality, consistency, speed, service, racket knowledge). Nothing here is a
// real review.
const REVIEWS = [
  { quote: '[Real customer review]', name: 'Customer Name' },
  { quote: '[Real customer review]', name: 'Customer Name' },
  { quote: '[Real customer review]', name: 'Customer Name' },
]

// Reused from the Local Store stringing page (/local-store/stringing).
const TRUST_STATS = [
  { value: '10,000+', label: 'Rackets strung' },
  { value: 'UKRSA', label: 'Certified stringers' },
  { value: 'Badminton & Tennis', label: 'Specialist experience' },
]

// TODO: fill in once you have the real figure, e.g.
// { score: '4.9', count: '250+ reviews', source: 'Google' }
// Renders nothing while it is null, so no made-up rating is ever shown.
const REVIEW_RATING: { score: string; count: string; source: string } | null =
  null

const FAQS = [
  {
    id: 'time',
    q: 'How long does stringing take?',
    a: 'Standard stringing normally takes approximately 2 working days once your racket reaches us.',
  },
  {
    id: 'box',
    q: "What if I don't have a box?",
    a: "Add our reusable Racket Box Kit when booking and we'll send one to you.",
  },
  {
    id: 'several',
    q: 'Can I send several rackets together?',
    a: 'Yes. In fact, you save on delivery when sending multiple rackets.',
  },
  {
    id: 'sports',
    q: 'Can I send badminton and tennis rackets?',
    a: 'Yes.',
  },
  {
    id: 'string',
    q: 'Can I choose my own string and tension?',
    a: 'Yes. Select both during booking.',
  },
  {
    id: 'pack',
    q: 'How do I pack my racket safely?',
    a: 'Follow our packing guide or video before sending your racket.',
  },
  {
    id: 'faster',
    q: 'Can I get my racket back faster?',
    a: 'Yes. Priority Mail-In will be available as an upgrade at checkout.',
  },
]

const ICON_PROPS = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: '#0A1F44',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}
const ACCENT = { stroke: '#E8553A', strokeWidth: 2.4 }

function StepIcon({ name }: { name: 'book' | 'pack' | 'send' | 'string' }) {
  const cls = 'w-14 h-14'
  if (name === 'book')
    return (
      <svg {...ICON_PROPS} className={cls}>
        <rect x='8' y='10' width='48' height='31' rx='3' />
        <path d='M24 53h16M32 41v12' />
        <path d='M15 17h14M15 22h9' opacity='.5' />
        <path d='M33 30l5 5 10-11' {...ACCENT} />
      </svg>
    )
  if (name === 'pack')
    return (
      <svg {...ICON_PROPS} className={cls}>
        <path d='M10 22 32 12l22 10-22 10Z' />
        <path d='M10 22v22l22 10V32M54 22v22L32 54' />
        <path d='M21 17l22 10' {...ACCENT} />
        <path d='M38 42v6' opacity='.5' />
      </svg>
    )
  if (name === 'send')
    return (
      <svg {...ICON_PROPS} className={cls}>
        <path d='M6 42V22a2 2 0 0 1 2-2h28v22' />
        <path d='M36 28h10l8 8v6' />
        <path d='M6 42h6M24 42h8M42 42h12' />
        <circle cx='18' cy='44' r='5' />
        <circle cx='44' cy='44' r='5' />
        <path d='M11 27h12M11 33h17' {...ACCENT} />
      </svg>
    )
  return (
    <svg {...ICON_PROPS} className={cls}>
      <g transform='rotate(-35 26 26)'>
        <ellipse cx='26' cy='20' rx='12' ry='15' />
        <path d='M20 8v24M26 5v30M32 8v24M15 14h22M14 20h24M15 26h22' opacity='.55' />
        <path d='M26 35v14' />
      </g>
      <path d='M58 40a10 10 0 1 0-4 12' {...ACCENT} />
      <path d='M58 31v9h-9' {...ACCENT} />
    </svg>
  )
}

/** Coral arrow centred in the gap between two step panels, drifting from the
 *  panel on its left (or above) towards the next one. */
function StepArrow({ delay = 0 }: { delay?: number }) {
  const style = { animationDelay: `${delay}s` }
  return (
    <>
      {/* desktop: sits in the 24px gap to the left of the panel, points right */}
      <span
        aria-hidden
        className='hidden lg:flex absolute top-1/2 -translate-y-1/2 -left-6 w-6 items-center justify-center z-10 pointer-events-none'
      >
        <svg viewBox='0 0 20 44' className='mail-arrow-x w-5 h-11' style={style}>
          <path d='M2 2 18 22 2 42' fill='none' stroke='#E8553A' strokeWidth='7' />
        </svg>
      </span>
      {/* mobile / tablet: sits in the 32px gap above the panel, points down */}
      <span
        aria-hidden
        className='lg:hidden flex absolute -top-8 left-0 right-0 h-8 items-center justify-center z-10 pointer-events-none'
      >
        <svg viewBox='0 0 44 20' className='mail-arrow-y w-11 h-5' style={style}>
          <path d='M2 2 22 18 42 2' fill='none' stroke='#E8553A' strokeWidth='7' />
        </svg>
      </span>
    </>
  )
}

/** Thin animated arrow that sits in the gap BETWEEN two packing cards.
 *  Its box is exactly one gap wide and is anchored to the vertical middle of
 *  the card, so the arrow is centred between the two cards. Points right on
 *  desktop and is rotated to point down when the cards stack. */
function PackArrow({ delay = 0 }: { delay?: number }) {
  const style = { animationDelay: `${delay}s` }
  return (
    <span
      aria-hidden
      className='absolute z-10 pointer-events-none flex items-center justify-center -top-14 left-0 right-0 h-14 lg:top-1/2 lg:-translate-y-1/2 lg:-left-14 lg:right-auto lg:w-14 lg:h-auto'
    >
      <svg
        viewBox='0 0 40 12'
        className='w-10 h-3 rotate-90 lg:rotate-0 overflow-visible'
        fill='none'
        stroke='#E8553A'
        strokeWidth='1.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path
          d='M2 6H37'
          pathLength={1}
          className='pack-arrow-line'
          style={style}
        />
        <path d='M31.5 1.5 37 6l-5.5 4.5' className='pack-arrow-head' style={style} />
      </svg>
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-block font-mono text-[10px] tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/10 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>
  )
}

function CtaButton({
  children,
  href = BOOKING_HREF,
  variant = 'coral',
}: {
  children: React.ReactNode
  href?: string
  variant?: 'coral' | 'white'
}) {
  const style =
    variant === 'white'
      ? 'bg-white text-[#E8553A] hover:bg-white/90'
      : 'bg-[#E8553A] text-white hover:bg-[#D4441F]'
  return (
    <Link
      href={href}
      className={`ls-btn-shine inline-block ${style} font-montserrat font-bold text-sm px-8 py-3.5 rounded-full transition-colors uppercase tracking-wide`}
    >
      {children}
    </Link>
  )
}

export default function MailInStringingPage() {
  return (
    <div className='bg-[#F5F3EF] min-h-screen font-lato'>
      {/* SECTION 1 — HERO */}
      <section className='relative bg-[#0A1F44] overflow-hidden'>
        {/* background photo */}
        <img
          src='/local-store/mail-in-stringing.jpg'
          alt=''
          aria-hidden
          fetchPriority='high'
          className='absolute inset-0 w-full h-full object-cover object-right'
        />
        {/* overlay: solid-ish on mobile (text spans full width), fades left to right on desktop */}
        <div className='absolute inset-0 bg-[#0A1F44]/80 md:bg-transparent' />
        <div className='absolute inset-0 hidden md:block bg-gradient-to-r from-[#0A1F44] via-[#0A1F44]/85 to-[#0A1F44]/10' />

        <div className='relative max-w-6xl mx-auto px-6 pt-14 pb-20 md:pb-28'>
          <p className='text-white/50 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/80'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp;{' '}
            <Link href='/local-store/stringing' className='hover:text-white/80'>
              Stringing
            </Link>{' '}
            &nbsp;/&nbsp; Mail-In
          </p>

          <div className='max-w-xl'>
            <Eyebrow>Badminton &amp; Tennis · UK-wide</Eyebrow>
            <h1
              className='font-black text-white text-4xl md:text-6xl mb-6 font-montserrat'
              style={{ lineHeight: 1.08 }}
            >
              Professional Racket Stringing.{' '}
              <span className='text-[#E8553A]'>Delivered Back To Your Door.</span>
            </h1>
            <p className='text-white/80 text-base leading-relaxed mb-3'>
              Send your badminton or tennis rackets to Smash Racket Pro from
              anywhere in the UK.
            </p>
            <p className='text-white/80 text-base leading-relaxed mb-8'>
              We restring them professionally and send them securely back to
              you.
            </p>
            <ul className='space-y-2 mb-9'>
              {[
                'Professional badminton & tennis stringing',
                'Tracked delivery',
                '2-working-day standard stringing turnaround',
                'Save when sending multiple rackets',
                'Racket box available if required',
              ].map((b) => (
                <li key={b} className='text-white/90 text-sm flex gap-2.5'>
                  <span className='text-[#E8553A] font-bold'>✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <CtaButton>Book Your Restring</CtaButton>
            <p className='text-white/70 text-sm mt-4'>
              Already have a box? Great. Don&apos;t have one? We&apos;ll send
              you one.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — HOW IT WORKS */}
      <section className='max-w-5xl mx-auto px-6 py-16'>
        <Eyebrow>How It Works</Eyebrow>
        <h2 className='font-black text-[#0A1F44] text-3xl mb-10 font-montserrat'>
          Mail-In Stringing In 4 Simple Steps
        </h2>
        <style>{`
          @keyframes mail-arrow-x {
            0%   { transform: translateX(-7px); opacity: 0; }
            35%  { opacity: 1; }
            100% { transform: translateX(7px); opacity: 0; }
          }
          @keyframes mail-arrow-y {
            0%   { transform: translateY(-7px); opacity: 0; }
            35%  { opacity: 1; }
            100% { transform: translateY(7px); opacity: 0; }
          }
          .mail-arrow-x { animation: mail-arrow-x 1.5s ease-in-out infinite; }
          .mail-arrow-y { animation: mail-arrow-y 1.5s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .mail-arrow-x, .mail-arrow-y { animation: none; opacity: 1; }
          }
        `}</style>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6'>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className='relative bg-white rounded-xl px-6 pt-8 pb-8 text-center shadow-[0_12px_32px_rgba(10,31,68,0.10)]'
            >
              {i > 0 && <StepArrow delay={(i - 1) * 0.35} />}
              <span
                aria-hidden
                className='absolute top-3 right-4 font-montserrat font-black text-5xl leading-none text-[#E8553A] opacity-30 select-none pointer-events-none'
              >
                0{s.n}
              </span>
              <div className='flex justify-center mb-5'>
                <StepIcon name={s.icon} />
              </div>
              <h3 className='font-black text-[#0A1F44] text-base uppercase tracking-wide mb-3 font-montserrat'>
                {s.title}
              </h3>
              <p className='text-gray-500 text-sm leading-relaxed'>{s.body}</p>
            </div>
          ))}
        </div>
        <div className='flex justify-center mt-10'>
          <CtaButton>Start My Restring</CtaButton>
        </div>
      </section>

      {/* SECTION 3 — PRICING */}
      <section className='bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-6 py-16'>
          <Eyebrow>Pricing</Eyebrow>
          <h2 className='font-black text-white text-3xl mb-3 font-montserrat'>
            Send More Rackets. Pay Less For Delivery.
          </h2>
          <p className='text-white/50 text-sm mb-10'>
            Round-trip delivery price, depending on how many rackets are in the
            box.
          </p>
          <div className='grid md:grid-cols-3 gap-5'>
            {PRICES.map((p) => (
              <div
                key={p.rackets}
                className={`relative rounded-2xl p-8 text-center ${
                  p.best
                    ? 'bg-[#E8553A] ring-4 ring-white/20 md:-translate-y-2'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {p.best && (
                  <span className='absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#E8553A] text-[11px] font-black font-montserrat tracking-widest px-4 py-1 rounded-full'>
                    BEST VALUE
                  </span>
                )}
                <p
                  className={`font-montserrat font-bold text-sm uppercase tracking-wider mb-3 ${
                    p.best ? 'text-white/90' : 'text-white/60'
                  }`}
                >
                  {p.rackets}
                </p>
                <p className='font-black text-white text-5xl font-montserrat'>
                  {p.price}
                </p>
                <p
                  className={`text-xs mt-2 font-mono ${
                    p.best ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  round-trip delivery
                </p>
                {p.best && (
                  <p className='mt-5 text-white font-black text-sm font-montserrat tracking-wide'>
                    FREE RETURN DELIVERY
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className='text-white/60 text-sm text-center mt-8 max-w-xl mx-auto'>
            Sending several rackets in the same box reduces the delivery cost,
            so we pass the saving back to you.
          </p>

          <div className='mt-12 bg-white rounded-2xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center'>
            <div>
              <p className='text-xs font-mono tracking-widest uppercase text-[#E8553A] mb-2'>
                Don&apos;t have a box?
              </p>
              <h3 className='font-black text-[#0A1F44] text-2xl mb-2 font-montserrat'>
                Reusable Racket Box Kit{' '}
                <span className='text-[#E8553A]'>£11.95 one-off</span>
              </h3>
              <p className='text-gray-500 text-sm leading-relaxed mb-2'>
                We&apos;ll send a suitable racket shipping box directly to you.
                Pack your rackets, send them back to us, and keep the box after
                your rackets return.
              </p>
              <p className='text-[#0A1F44] font-bold text-sm'>
                Keep the box for your next restring and avoid paying for another
                one.
              </p>
            </div>
            <CtaButton>Book Mail-In Stringing</CtaButton>
          </div>
        </div>
      </section>

      {/* SECTION 4 — SAFE PACKAGING + TURNAROUND */}
      <section className='max-w-5xl mx-auto px-6 py-16'>
        <Eyebrow>Safe Packaging</Eyebrow>
        <h2 className='font-black text-[#0A1F44] text-3xl mb-3 font-montserrat'>
          Your Racket Is In Safe Hands.
        </h2>
        <p className='text-gray-500 text-sm mb-8'>
          This is how your rackets should be packed before they travel.
        </p>
        <style>{`
          .pack-arrow-line { stroke-dasharray: 1; animation: pack-line 2.4s ease-in-out infinite; }
          .pack-arrow-head { animation: pack-head 2.4s ease-in-out infinite; }
          @keyframes pack-line {
            0%   { stroke-dashoffset: 1; opacity: 1; }
            40%  { stroke-dashoffset: 0; opacity: 1; }
            80%  { stroke-dashoffset: 0; opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @keyframes pack-head {
            0%, 30% { opacity: 0; transform: translateX(-6px); }
            45%, 80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .pack-arrow-line, .pack-arrow-head { animation: none; stroke-dashoffset: 0; opacity: 1; transform: none; }
          }
        `}</style>
        <ol className='grid grid-cols-1 gap-y-14 max-w-sm mx-auto lg:max-w-none lg:grid-cols-4 lg:gap-x-14 lg:gap-y-0'>
          {PACK_STEPS.map((label, i) => (
            <li key={label}>
              <div className='relative'>
                {i > 0 && <PackArrow delay={(i - 1) * 0.4} />}
                {/* Replace this tile with a real photo, e.g.
                    <img src='/local-store/mail-in-pack-1.jpg' ... /> */}
                <div className='aspect-[4/3] rounded-2xl bg-white border border-dashed border-[#0A1F44]/20 flex flex-col items-center justify-center text-center p-4'>
                  <span className='text-3xl mb-2'>📷</span>
                  <span className='text-xs text-gray-400 font-mono'>
                    Photo {i + 1}
                  </span>
                </div>
              </div>
              <p
                aria-hidden
                className='mt-5 font-montserrat font-black text-4xl leading-none text-[#E8553A]'
              >
                0{i + 1}
              </p>
              <p className='mt-2 text-[#0A1F44] font-bold text-base leading-snug font-montserrat'>
                {label}
              </p>
            </li>
          ))}
        </ol>
        <div className='mt-8'>
          <a
            href='#faq'
            className='inline-block border-2 border-[#0A1F44] text-[#0A1F44] hover:bg-[#0A1F44] hover:text-white transition-colors font-montserrat font-bold text-sm px-7 py-3 rounded-full uppercase tracking-wide'
          >
            How To Pack Your Racket
          </a>
        </div>

        <h2 className='font-black text-[#0A1F44] text-3xl mt-16 mb-8 font-montserrat'>
          How Long Does It Take?
        </h2>
        <div className='grid md:grid-cols-2 gap-6'>
          <div className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'>
            <h3 className='font-black text-[#0A1F44] text-xl mb-5 font-montserrat'>
              Already Have A Box?
            </h3>
            <ol className='space-y-3 mb-6'>
              {[
                ['2 working days', 'Us'],
                ['2 working days', 'Stringing'],
                ['2 working days', 'Back to you'],
              ].map(([t, l]) => (
                <li key={l} className='flex items-center gap-3 text-sm'>
                  <span className='text-[#E8553A] font-bold'>→</span>
                  <span className='font-bold text-[#0A1F44]'>{t}</span>
                  <span className='text-gray-500'>{l}</span>
                </li>
              ))}
            </ol>
            <p className='font-black text-[#E8553A] text-2xl font-montserrat'>
              Around 6 Working Days Total
            </p>
          </div>
          <div className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'>
            <h3 className='font-black text-[#0A1F44] text-xl mb-5 font-montserrat'>
              Need A Box From Us?
            </h3>
            <p className='text-gray-500 text-sm leading-relaxed mb-6'>
              Allow approximately another 2 working days for the empty box to
              reach you.
            </p>
            <p className='font-black text-[#E8553A] text-2xl font-montserrat'>
              Around 8 Working Days Total
            </p>
          </div>
        </div>
        <p className='text-gray-400 text-xs mt-4'>
          Delivery times are estimates and can vary depending on weekends,
          public holidays and courier performance.
        </p>

        <div className='mt-10 bg-[#E8553A] rounded-2xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center'>
          <div>
            <h3 className='font-black text-white text-2xl mb-2 font-montserrat'>
              Need It Faster?
            </h3>
            <p className='text-white/90 text-sm leading-relaxed'>
              <strong>Priority Mail-In Service</strong> — priority stringing and
              faster delivery options. Available at checkout.
            </p>
          </div>
          <CtaButton variant='white'>Choose Priority Service</CtaButton>
        </div>
      </section>

      {/* SECTION 5 — TRUST */}
      <section className='bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-6 py-16'>
          <Eyebrow>Why Trust Us</Eyebrow>
          <h2 className='font-black text-[#0A1F44] text-3xl mb-10 font-montserrat'>
            Professional Stringing You Can Trust
          </h2>
          <div className='grid md:grid-cols-2 gap-10 items-start'>
            <ul className='space-y-4'>
              {TRUST_POINTS.map((t) => (
                <li
                  key={t}
                  className='flex gap-3 text-[#0A1F44] font-bold text-sm font-montserrat'
                >
                  <span className='text-[#E8553A]'>✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className='grid gap-3'>
              {TRUST_STATS.map((st) => (
                <div
                  key={st.label}
                  className='flex items-baseline justify-between gap-4 bg-[#F5F3EF] rounded-xl px-5 py-4 border border-[#0A1F44]/8'
                >
                  <span className='font-black text-[#E8553A] text-2xl font-montserrat'>
                    {st.value}
                  </span>
                  <span className='text-[#0A1F44] text-sm font-bold font-montserrat text-right'>
                    {st.label}
                  </span>
                </div>
              ))}
              {REVIEW_RATING && (
                <div className='flex items-baseline justify-between gap-4 bg-[#F5F3EF] rounded-xl px-5 py-4 border border-[#0A1F44]/8'>
                  <span className='font-black text-[#E8553A] text-2xl font-montserrat'>
                    ★ {REVIEW_RATING.score}
                  </span>
                  <span className='text-[#0A1F44] text-sm font-bold font-montserrat text-right'>
                    {REVIEW_RATING.count} on {REVIEW_RATING.source}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className='grid sm:grid-cols-3 gap-5 mt-10'>
            <figure>
              <img
                src='/local-store/mail-in-stringing.jpg'
                alt='Smash Racket Pro technician stringing a racket'
                width={1536}
                height={1024}
                className='w-full rounded-2xl object-cover object-right aspect-[4/3]'
              />
              <figcaption className='mt-3 text-sm text-[#0A1F44] font-bold font-montserrat'>
                Our technician at work
              </figcaption>
            </figure>
            {['Our stringing machine', 'Finished rackets, ready to return'].map(
              (label) => (
                <figure key={label}>
                  {/* Replace this tile with a real photo, e.g.
                      <img src='/local-store/mail-in-machine.jpg' ... /> */}
                  <div className='aspect-[4/3] rounded-2xl bg-[#F5F3EF] border border-dashed border-[#0A1F44]/20 flex flex-col items-center justify-center text-center p-4'>
                    <span className='text-3xl mb-2'>📷</span>
                    <span className='text-xs text-gray-400 font-mono'>Photo</span>
                  </div>
                  <figcaption className='mt-3 text-sm text-[#0A1F44] font-bold font-montserrat'>
                    {label}
                  </figcaption>
                </figure>
              ),
            )}
          </div>

          <h3 className='font-black text-[#0A1F44] text-2xl mt-14 mb-6 font-montserrat'>
            Customer Reviews
          </h3>
          <div className='grid md:grid-cols-3 gap-5'>
            {REVIEWS.map((r, i) => (
              <div
                key={i}
                className='bg-[#F5F3EF] rounded-2xl p-6 border border-[#0A1F44]/8'
              >
                <p className='text-[#E8553A] tracking-widest mb-3'>★★★★★</p>
                <p className='text-gray-600 text-sm leading-relaxed mb-4'>
                  &ldquo;{r.quote}&rdquo;
                </p>
                <p className='font-bold text-[#0A1F44] text-sm font-montserrat'>
                  {r.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — FINAL CTA + FAQ */}
      <section className='bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-6 py-16 text-center'>
          <h2 className='font-black text-white text-3xl md:text-4xl mb-8 font-montserrat'>
            Ready To Send Your Rackets?
          </h2>
          <div className='grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8'>
            {PRICES.map((p) => (
              <div
                key={p.rackets}
                className='bg-white/5 border border-white/10 rounded-2xl p-5'
              >
                <p className='text-white/60 text-sm mb-1'>{p.rackets}</p>
                <p className='text-white font-black text-2xl font-montserrat'>
                  {p.price}
                </p>
                <p className='text-white/40 text-xs'>round-trip delivery</p>
              </div>
            ))}
          </div>
          <p className='text-white/80 text-sm mb-8'>
            No box? Add our reusable Racket Box Kit for £11.95.
          </p>
          <CtaButton>Book My Restring</CtaButton>
          <p className='text-white/50 text-sm mt-5'>
            Professional stringing • Tracked delivery • Secure racket packaging
          </p>
        </div>
      </section>

      <section id='faq' className='max-w-3xl mx-auto px-6 py-16 scroll-mt-20'>
        <Eyebrow>Quick FAQ</Eyebrow>
        <h2 className='font-black text-[#0A1F44] text-3xl mb-8 font-montserrat'>
          Questions? Answered.
        </h2>
        <Accordion
          icon='plus'
          containerClassName='divide-y divide-[#0A1F44]/10 border-y border-[#0A1F44]/10'
          triggerClassName='py-5 font-bold text-[#0A1F44] text-sm font-montserrat'
          contentClassName='pb-5 text-gray-500 text-sm leading-relaxed'
          items={FAQS.map((f) => ({
            id: f.id,
            title: <span>{f.q}</span>,
            content: <p>{f.a}</p>,
          }))}
        />
      </section>
    </div>
  )
}