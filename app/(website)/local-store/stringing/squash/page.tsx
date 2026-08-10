import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { getPublicStoreContact } from '@/lib/store-contact'
import StringingEnquiryForm from '@/components/website/StringingEnquiryForm'
import {
  SQUASH_TENSIONS as TENSIONS,
  SQUASH_STRINGS as STRINGS,
  SQUASH_BRANDS as BRANDS,
} from '@/lib/stringing-options'
import StringingTimeline from '@/components/website/StringingTimeline'
import Accordion from '@/components/website/local-store/Accordion'

export const metadata = {
  title: `Squash Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description:
    'Professional squash racket stringing from £22. Tension advice for beginner to advanced players, popular string types in stock, 24-hour or 40-minute express turnaround.',
  keywords:
    'squash stringing service, squash racket restring, squash string tension guide, squash restring manchester, squash string types',
}

const NEEDS_RESTRING = [
  'Your shots are lacking in power',
  "Your spin and slices aren't as sharp as they used to be",
  'The string sounds dull and dead off the racket',
  'You have a broken string',
]

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconInspect = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='11' cy='11' r='8' />
    <line x1='21' y1='21' x2='16.65' y2='16.65' />
    <line x1='11' y1='8' x2='11' y2='14' />
    <line x1='8' y1='11' x2='14' y2='11' />
  </svg>
)
const IconConsult = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
    <line x1='9' y1='10' x2='15' y2='10' />
    <line x1='9' y1='14' x2='13' y2='14' />
  </svg>
)
const IconString = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <line x1='2' y1='12' x2='22' y2='12' />
    <line x1='12' y1='2' x2='12' y2='22' />
    <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
    <line x1='19.07' y1='4.93' x2='4.93' y2='19.07' />
  </svg>
)
const IconCheck = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
    <polyline points='22 4 12 14.01 9 11.01' />
  </svg>
)
const IconCollect = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.45 5.45l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' />
  </svg>
)
const IconWrench = () => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#E8553A'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' />
  </svg>
)
// ───────────────────────────────────────────────────────────────────────────

const PROCESS = [
  {
    step: '01',
    title: 'Frame Check',
    desc: "We inspect your frame thoroughly for cracks — we won't restring a racket with a compromised frame.",
    icon: <IconInspect />,
  },
  {
    step: '02',
    title: 'Grommet Check',
    desc: 'Worn grommets shorten string life — we replace any that need it before stringing.',
    icon: <IconWrench />,
  },
  {
    step: '03',
    title: 'String Advice',
    desc: "Durability, power or control — we'll recommend a string to match what you're after.",
    icon: <IconConsult />,
  },
  {
    step: '04',
    title: 'Tension Advice',
    desc: "Based on your level and play style, we'll recommend the tension that gets the most from your racket.",
    icon: <IconString />,
  },
  {
    step: '05',
    title: "We'll Let You Know",
    desc: "Once done we'll message or email you so you can collect your freshly strung racket.",
    icon: <IconCollect />,
  },
]

const FAQS = [
  {
    q: 'What tension should I choose for squash?',
    a: "Tell us your level and playing style and we'll recommend a starting tension — squash strings tend to move/relax with play, so slight adjustments over time are normal.",
  },
  {
    q: 'How do I know what string and tension I require?',
    a: 'Our experienced staff will gladly help you choose the right string and tension to bring out the best in your game — just ask us in-store.',
  },
  {
    q: 'How often do squash strings need replacing?',
    a: 'Squash strings can lose tension faster than other racket sports due to the intensity of the game — most regular players restring every few months.',
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll charge a £15 labour fee for stringing it.",
  },
  {
    q: 'Is there a charge for same-day service?',
    a: 'Standard 24h turnaround is included in the price. Same-day service carries a small £4 surcharge, or book our on-the-spot slot for no extra charge.',
  },
]

const STATS = [
  { value: '20+', label: 'Years Experience' },
  { value: '20,000+', label: 'Rackets Strung' },
  { value: 'UKRSA', label: 'Certified Stringers' },
  { value: '24h', label: 'Standard Turnaround' },
]

export default async function SquashStringingPage() {
  const contact = await getPublicStoreContact()
  const primaryAddress = [
    contact.address.line1,
    contact.address.line2,
    contact.address.city,
    contact.address.pincode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className='bg-white'>
      {/* ── HERO ── */}
      <div className='ls-hero ls-hero-noise relative text-white overflow-hidden'>
        <span
          className='ls-hero-glow hidden md:block'
          style={{ width: 260, height: 260, top: '-8%', left: '2%' }}
        />
        <span
          className='ls-hero-glow hidden md:block'
          style={{
            width: 220,
            height: 220,
            bottom: '-8%',
            right: '6%',
            animationDelay: '2.4s',
          }}
        />
        <div className='absolute inset-0 overflow-hidden'>
          <img
            src='/local-store/stringing-squash-hero.jpg'
            alt='Squash racket stringing'
            className='ls-hero-img absolute inset-0 w-full h-full object-cover opacity-20'
          />
        </div>
        <div
          className='absolute inset-0 opacity-5'
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className='relative max-w-4xl mx-auto px-6 py-20 text-center'>
          <span className='ls-hero-eyebrow inline-flex items-center gap-1.5 text-xs font-montserrat font-bold text-[#FFC453] bg-[#FFC453]/10 border border-[#FFC453]/20 rounded-full px-4 py-1.5 mb-6'>
            🥎 Squash Stringing
          </span>
          <h1 className='ls-hero-title font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-4'>
            Strung For the
            <br />
            <span className='text-[#FFC453]'>Intensity of Squash.</span>
          </h1>
          <p className='ls-hero-subtitle text-white/70 font-lato text-lg max-w-lg mx-auto mb-8'>
            Precision stringing for squash rackets, with attention to detail for
            players of every level.
          </p>
          <div className='ls-hero-subtitle flex flex-wrap items-center justify-center gap-4 mb-10'>
            <div className='ls-card bg-white/10 border border-white/20 rounded-2xl px-6 py-3 backdrop-blur-sm'>
              <p className='font-montserrat font-black text-2xl text-[#FFC453]'>
                From £22
              </p>
              <p className='text-xs text-white/60 font-lato mt-0.5'>
                All inclusive
              </p>
            </div>
            <div className='ls-card bg-white/10 border border-white/20 rounded-2xl px-6 py-3 backdrop-blur-sm'>
              <p className='font-montserrat font-black text-2xl text-white'>
                40 min
              </p>
              <p className='text-xs text-white/60 font-lato mt-0.5'>
                Express service
              </p>
            </div>
            <div className='ls-card bg-white/10 border border-white/20 rounded-2xl px-6 py-3 backdrop-blur-sm'>
              <p className='font-montserrat font-black text-2xl text-white'>
                24h
              </p>
              <p className='text-xs text-white/60 font-lato mt-0.5'>
                Standard turnaround
              </p>
            </div>
          </div>
          <div className='ls-hero-cta'>
            <Link
              href='#enquire'
              className='ls-btn-shine inline-flex items-center gap-2 bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-8 py-3.5 rounded-full text-sm transition-colors shadow-[0_8px_24px_rgba(232,85,58,0.35)]'
            >
              Enquire Now →
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className='bg-[#F8F9FB] border-b border-gray-100'>
        <div className='max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
          {STATS.map((s) => (
            <div key={s.label}>
              <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                {s.value}
              </p>
              <p className='text-xs text-gray-500 font-lato mt-1'>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-6 py-16 space-y-20'>
        {/* ── ENQUIRY FORM ── */}
        <section id='enquire'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Book In
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Enquiry Form
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              Fill in your details and we'll get back to you to confirm your
              slot.
            </p>
          </div>
          <div className='max-w-lg mx-auto'>
            <StringingEnquiryForm sport='Squash' />
          </div>
        </section>

        {/* ── TENSION GUIDE ── */}
        <section className='reveal'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Tension Guide
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Find Your Sweet Spot
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              A rough starting point by playing level — our stringers will talk
              you through it in-store.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {TENSIONS.map((t, i) => (
              <div
                key={t.level}
                className={`rounded-2xl p-6 border ${i === 1 ? 'bg-[#0A1F44] border-[#0A1F44] text-white' : 'bg-white border-gray-100'}`}
              >
                <p
                  className={`text-xs font-montserrat font-bold uppercase tracking-wider mb-2 ${i === 1 ? 'text-[#FFC453]' : 'text-[#E8553A]'}`}
                >
                  {t.level}
                </p>
                <p
                  className={`font-montserrat font-black text-2xl mb-3 ${i === 1 ? 'text-white' : 'text-[#0A1F44]'}`}
                >
                  {t.range}
                </p>
                <p
                  className={`text-sm font-lato leading-relaxed ${i === 1 ? 'text-white/70' : 'text-gray-500'}`}
                >
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DO I NEED A RESTRING ── */}
        <section className='reveal'>
          <div className='bg-[#0A1F44] rounded-3xl p-8 md:p-10 relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-64 h-64 rounded-full bg-[#E8553A]/10 -translate-y-1/3 translate-x-1/3' />
            <div className='relative'>
              <p className='text-xs font-montserrat font-bold text-[#FFC453] tracking-widest uppercase mb-3 text-center'>
                Signs to Look For
              </p>
              <h2 className='font-montserrat font-black text-2xl text-white text-center mb-8'>
                Do I Need A Restring?
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto'>
                {NEEDS_RESTRING.map((n) => (
                  <div
                    key={n}
                    className='flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5'
                  >
                    <span className='text-[#FFC453] font-montserrat font-black mt-0.5 shrink-0'>
                      ✓
                    </span>
                    <p className='text-white/80 font-lato text-sm leading-relaxed'>
                      {n}
                    </p>
                  </div>
                ))}
              </div>
              <p className='text-white/40 font-lato text-xs text-center mt-6'>
                If any of these sound familiar, it's probably time for a fresh
                string job.
              </p>
            </div>
          </div>
        </section>

        {/* ── PROCESS TIMELINE ── */}
        <section className='reveal'>
          <div className='text-center mb-12'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Our Process
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              What Happens To Your Racket
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              Five steps, zero shortcuts. From the moment you drop it off to the
              moment you pick it up.
            </p>
          </div>
          <StringingTimeline steps={PROCESS} />
        </section>

        {/* ── FAQ ── */}
        <section className='reveal'>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
                FAQs
              </p>
              <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
                Squash Stringing FAQs
              </h2>
            </div>
            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='space-y-3'
              rowClassName='bg-[#F8F9FB] rounded-2xl border border-gray-100 overflow-hidden'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44] px-6 py-5'
              contentClassName='text-sm text-gray-500 font-lato leading-relaxed px-6 pb-5'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <div className='reveal-scale bg-[#0A1F44] rounded-3xl p-10 text-white text-center relative overflow-hidden'>
          <div
            className='absolute inset-0 opacity-5'
            style={{
              backgroundImage:
                'radial-gradient(circle at 80% 20%, #E8553A 0%, transparent 60%)',
            }}
          />
          <div className='relative'>
            <h2 className='font-montserrat font-black text-2xl mb-2 text-white'>
              Ready To Book?
            </h2>
            <p className='text-white/60 font-lato mb-2 max-w-sm mx-auto'>
              Visit us in-store or fill in the enquiry form above.
            </p>
            <p className='text-white/40 font-lato text-sm mb-8'>
              📍 {primaryAddress}
            </p>
            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <Link
                href='/local-store/stringing'
                className='inline-block bg-white/10 hover:bg-white/20 border border-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
              >
                ← Back to Stringing
              </Link>
              <Link
                href='/contact'
                className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors shadow-[0_4px_16px_rgba(232,85,58,0.4)]'
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
