import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { getPublicStoreContact } from '@/lib/store-contact'
import StringingEnquiryForm from '@/components/website/StringingEnquiryForm'
import {
  SQUASH_TENSIONS as TENSIONS,
  SQUASH_STRINGS as STRINGS,
  SQUASH_BRANDS as BRANDS,
} from '@/lib/stringing-options'
import Accordion from '@/components/website/local-store/Accordion'
import StringingTimeline from '@/components/website/StringingTimeline'

export const metadata = {
  title: `Squash Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description:
    'Professional squash racket stringing from £22. Tension advice for beginner to advanced players, popular string types in stock, 24-hour or 40-minute express turnaround.',
  keywords:
    'squash stringing service, squash racket restring, squash string tension guide, squash restring manchester, squash string types',
}

/* ─────────────────────────── Icons ─────────────────────────── */
const Icon = ({
  glyph,
  ...p
}: { glyph: React.ReactNode } & React.SVGProps<SVGSVGElement>) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    {...p}
  >
    {glyph}
  </svg>
)
const IconInspect = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <circle cx='11' cy='11' r='8' />
        <line x1='21' y1='21' x2='16.65' y2='16.65' />
        <line x1='11' y1='8' x2='11' y2='14' />
        <line x1='8' y1='11' x2='14' y2='11' />
      </>
    }
  />
)
const IconConsult = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
        <line x1='9' y1='10' x2='15' y2='10' />
        <line x1='9' y1='14' x2='13' y2='14' />
      </>
    }
  />
)
const IconString = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <circle cx='12' cy='12' r='10' />
        <line x1='2' y1='12' x2='22' y2='12' />
        <line x1='12' y1='2' x2='12' y2='22' />
        <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
        <line x1='19.07' y1='4.93' x2='4.93' y2='19.07' />
      </>
    }
  />
)
const IconCheck = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
        <polyline points='22 4 12 14.01 9 11.01' />
      </>
    }
  />
)
const IconCollect = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.45 5.45l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' />
    }
  />
)
const IconWrench = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' />
    }
  />
)
const IconSun = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <circle cx='12' cy='12' r='4' />
        <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' />
      </>
    }
  />
)
const IconRepeat = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <polyline points='17 1 21 5 17 9' />
        <path d='M3 11V9a4 4 0 0 1 4-4h14' />
        <polyline points='7 23 3 19 7 15' />
        <path d='M21 13v2a4 4 0 0 1-4 4H3' />
      </>
    }
  />
)
/* ──────────────────────────────────────────────────────────────── */

const NEEDS_RESTRING = [
  {
    title: 'Shots lacking power',
    desc: 'Loose strings absorb energy instead of returning it to the ball.',
  },
  {
    title: 'Spin and slices feel flat',
    desc: 'If bite off the racket has faded, the strings have likely relaxed past their working tension.',
  },
  {
    title: 'Dull, dead sound',
    desc: 'A muted thud instead of a crisp response is one of the clearest tension warning signs.',
  },
  {
    title: 'A broken string',
    desc: 'Once one string goes, the rest of the bed is under uneven load — restring rather than patch.',
  },
]

const STRING_TYPES = [
  {
    name: 'Durability-Focused',
    best: 'Frequent players / hard hitters',
    power: 3,
    control: 3,
    durability: 5,
    feel: 2,
    note: "Built to survive squash's high-impact rallies without snapping early — the practical choice for regulars.",
  },
  {
    name: 'Power-Focused',
    best: 'Players wanting more pace',
    power: 5,
    control: 3,
    durability: 2,
    feel: 3,
    note: 'Livelier response off the racket for more free pace, at the cost of shorter string life.',
  },
  {
    name: 'Control-Focused',
    best: 'Advanced / tactical players',
    power: 3,
    control: 5,
    durability: 3,
    feel: 4,
    note: 'Firmer feedback that rewards precise placement over raw power.',
  },
]

const PROCESS = [
  {
    step: '01',
    title: 'Frame Check',
    desc: "We inspect your frame thoroughly for cracks — we won't restring a racket with a compromised frame.",
    icon: IconInspect,
  },
  {
    step: '02',
    title: 'Grommet Check',
    desc: 'Worn grommets shorten string life — we replace any that need it before stringing.',
    icon: IconWrench,
  },
  {
    step: '03',
    title: 'String Advice',
    desc: "Durability, power or control — we'll recommend a string to match what you're after.",
    icon: IconConsult,
  },
  {
    step: '04',
    title: 'Tension Advice',
    desc: "Based on your level and play style, we'll recommend the tension that gets the most from your racket.",
    icon: IconString,
  },
  {
    step: '05',
    title: "We'll Let You Know",
    desc: "Once done we'll message or email you so you can collect your freshly strung racket.",
    icon: IconCollect,
  },
]

const CARE_TIPS = [
  {
    icon: IconSun,
    title: 'Store away from heat',
    desc: 'Squash bags left in hot cars lose tension fastest — keep your racket somewhere cool.',
  },
  {
    icon: IconRepeat,
    title: 'Expect faster tension loss',
    desc: "Squash's high-impact rallies relax strings quicker than other racket sports — check tension more often.",
  },
  {
    icon: IconCheck,
    title: 'Restring every few months',
    desc: 'Most regular players restring every 2–3 months rather than waiting for a string to break.',
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
  { value: '20+', label: 'Years experience' },
  { value: '20,000+', label: 'Rackets strung' },
  { value: 'UKRSA', label: 'Certified stringers' },
  { value: '24h', label: 'Standard turnaround' },
]

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className='flex gap-1'>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${i < value ? 'bg-[#E8553A]' : 'bg-[#0A1F44]/10'}`}
        />
      ))}
    </div>
  )
}

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
    <div className='bg-[#F5F3EF] min-h-screen'>
      {/* ── HERO (grid-texture navy, no image/noise/glow) ────────────── */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store/stringing' className='hover:text-white/70'>
              Stringing
            </Link>{' '}
            &nbsp;/&nbsp; Squash
          </p>

          <div className='grid md:grid-cols-2 gap-12 items-end'>
            <div>
              <Eyebrow>🥎 Squash Stringing</Eyebrow>
              <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-5'>
                Strung For the{' '}
                <span className='text-[#E8553A]'>Intensity of Squash.</span>
              </h1>
              <p className='text-white/60 text-sm leading-relaxed max-w-sm mb-8'>
                Squash rallies punish loose strings fast — precise tension and
                careful frame checks keep your racket match-ready.
              </p>
              <div className='flex flex-wrap gap-3'>
                <a
                  href='#enquire'
                  className='bg-[#E8553A] hover:bg-[#D4441F] text-white px-7 py-3.5 rounded-full text-sm font-montserrat font-bold transition-colors'
                >
                  Enquire Now →
                </a>
                <a
                  href='#tension'
                  className='border border-white/20 hover:border-white/40 text-white/70 hover:text-white px-7 py-3.5 rounded-full text-sm font-montserrat transition-colors'
                >
                  Find My Tension
                </a>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 sm:gap-4'>
              <div className='bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5'>
                <p className='text-[#E8553A] font-montserrat font-black text-xl sm:text-2xl'>
                  From £22
                </p>
                <p className='text-white/50 text-xs mt-1'>All inclusive</p>
              </div>
              <div className='bg-[#E8553A] rounded-2xl p-4 sm:p-5'>
                <p className='text-white font-montserrat font-black text-xl sm:text-2xl'>
                  40 min
                </p>
                <p className='text-white/80 text-xs mt-1'>Express option</p>
              </div>
            </div>
          </div>
        </div>

        <div className='relative border-t border-white/10'>
          <div className='max-w-5xl mx-auto px-4 md:px-6 py-5 flex flex-wrap justify-between gap-y-3 gap-x-8'>
            {STATS.map((s) => (
              <div key={s.label} className='flex items-baseline gap-2'>
                <span className='font-montserrat font-black text-lg text-[#E8553A]'>
                  {s.value}
                </span>
                <span className='text-xs text-white/50'>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className='max-w-4xl mx-auto px-4 md:px-6 py-16 space-y-20'>
        {/* ── SIGNS ────────────────────────────────────────────────────── */}
        <section>
          <div className='bg-[#0A1F44] rounded-3xl p-8 md:p-10 relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-64 h-64 rounded-full bg-[#E8553A]/10 -translate-y-1/3 translate-x-1/3' />
            <div className='relative'>
              <p className='text-center'>
                <Eyebrow>Signs to Look For</Eyebrow>
              </p>
              <h2 className='font-montserrat font-black text-2xl text-white text-center mb-8'>
                Do I Need A Restring?
              </h2>
              <div className='grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto'>
                {NEEDS_RESTRING.map((n) => (
                  <div
                    key={n.title}
                    className='flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5'
                  >
                    <span className='text-[#E8553A] font-montserrat font-black mt-0.5 shrink-0'>
                      ✓
                    </span>
                    <div>
                      <p className='font-montserrat font-bold text-sm text-white mb-1'>
                        {n.title}
                      </p>
                      <p className='text-white/60 text-xs leading-relaxed'>
                        {n.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className='text-white/40 text-xs text-center mt-6'>
                If any of these sound familiar, it's probably time for a fresh
                string job.
              </p>
            </div>
          </div>
        </section>

        {/* ── ENQUIRY FORM ─────────────────────────────────────────────── */}
        <section
          id='enquire'
          className='reveal bg-[#F8F9FB] rounded-3xl p-6 md:p-12 -mx-4 sm:mx-0'
        >
          <div className='text-center mb-10'>
            <Eyebrow>Book In</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl md:text-4xl text-[#0A1F44]'>
              Enquiry Form
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto text-base'>
              Fill in your details and we'll get back to you to confirm your
              slot.
            </p>
          </div>
          <StringingEnquiryForm sport='Squash' />
        </section>

        {/* ── TENSION GUIDE ────────────────────────────────────────────── */}
        <section id='tension'>
          <div className='text-center mb-10'>
            <Eyebrow>Tension Guide</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Find Your Sweet Spot
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto'>
              A rough starting point by playing level — our stringers will talk
              you through it in-store.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {TENSIONS.map((t, i) => (
              <div
                key={t.level}
                className={`rounded-2xl p-6 border ${i === 1 ? 'bg-[#0A1F44] border-[#0A1F44] text-white' : 'bg-white border-[#0A1F44]/8'}`}
              >
                <p className='text-xs font-montserrat font-bold uppercase tracking-wider mb-2 text-[#E8553A]'>
                  {t.level}
                </p>
                <p
                  className={`font-montserrat font-black text-2xl mb-3 ${i === 1 ? 'text-white' : 'text-[#0A1F44]'}`}
                >
                  {t.range}
                </p>
                <p
                  className={`text-sm leading-relaxed ${i === 1 ? 'text-white/70' : 'text-gray-400'}`}
                >
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STRING TYPE COMPARISON ───────────────────────────────────── */}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>Choosing a String</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Power, Control, or Durability?
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto'>
              Squash strings tend to specialise in one direction — here's
              roughly what to expect from each.
            </p>
          </div>
          <div className='space-y-4'>
            {STRING_TYPES.map((s) => (
              <div
                key={s.name}
                className='bg-white border border-[#0A1F44]/8 rounded-2xl p-6 grid md:grid-cols-[1fr_1.3fr] gap-6'
              >
                <div>
                  <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1'>
                    {s.name}
                  </h3>
                  <p className='text-xs font-montserrat font-semibold text-[#E8553A] uppercase tracking-wide mb-3'>
                    Best for: {s.best}
                  </p>
                  <p className='text-sm text-gray-400 leading-relaxed'>
                    {s.note}
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-x-6 gap-y-3 content-center'>
                  {[
                    ['Power', s.power],
                    ['Control', s.control],
                    ['Durability', s.durability],
                    ['Feel', s.feel],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className='flex justify-between mb-1'>
                        <span className='text-xs text-gray-400'>{label}</span>
                      </div>
                      <RatingBar value={Number(val)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROCESS — animated timeline ─────────────────────────────── */}
        <section className='reveal'>
          <div className='text-center mb-12'>
            <Eyebrow>Our Process</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl md:text-4xl text-[#0A1F44]'>
              What Happens To Your Racket
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto'>
              Five steps, zero shortcuts. From the moment you drop it off to the
              moment you pick it up.
            </p>
          </div>
          <StringingTimeline
            steps={PROCESS.map((p) => ({ ...p, icon: <p.icon /> }))}
          />
        </section>

        {/* ── TURNAROUND ───────────────────────────────────────────────── */}
        <section className='reveal grid grid-cols-1 md:grid-cols-2 gap-5'>
          <div className='bg-[#0A1F44] rounded-2xl p-8 text-white flex flex-col justify-between'>
            <div>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-3'>
                Standard
              </p>
              <h3 className='font-montserrat font-black text-5xl text-white mb-2'>
                24h
              </h3>
              <p className='text-white/60 text-sm leading-relaxed'>
                Drop off today, collect tomorrow. No surcharge, no fuss — just
                reliable turnaround.
              </p>
            </div>
            <p className='text-white/40 text-xs mt-6'>
              Four fully-automatic machines in-store
            </p>
          </div>
          <div className='bg-[#E8553A] rounded-2xl p-8 text-white flex flex-col justify-between'>
            <div>
              <p className='text-xs font-montserrat font-bold text-white/60 tracking-widest uppercase mb-3'>
                Express
              </p>
              <h3 className='font-montserrat font-black text-5xl text-white mb-2'>
                40 min
              </h3>
              <p className='text-white/80 text-sm leading-relaxed'>
                Pre-book to avoid the same-day surcharge, or ask in-store if we
                can fit you in on the spot.
              </p>
            </div>
            <a
              href='#enquire'
              className='inline-block mt-6 bg-white text-[#E8553A] font-montserrat font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors w-fit'
            >
              Enquire Now →
            </a>
          </div>
        </section>

        {/* ── CARE TIPS ────────────────────────────────────────────────── */}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>After Your Restring</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Make Your Strings Last
            </h2>
          </div>
          <div className='grid sm:grid-cols-3 gap-5'>
            {CARE_TIPS.map((c) => {
              const IconEl = c.icon
              return (
                <div
                  key={c.title}
                  className='bg-white border border-[#0A1F44]/8 rounded-2xl p-6 text-center'
                >
                  <span className='inline-flex w-11 h-11 rounded-full bg-[#F5F3EF] border border-[#E8553A]/20 items-center justify-center text-[#E8553A] mb-4'>
                    <IconEl />
                  </span>
                  <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
                    {c.title}
                  </h3>
                  <p className='text-xs text-gray-400 leading-relaxed'>
                    {c.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <Eyebrow>FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
                Squash Stringing FAQs
              </h2>
            </div>
            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='space-y-3'
              rowClassName='bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44] px-6 py-5'
              contentClassName='text-sm text-gray-400 leading-relaxed px-6 pb-5'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <div className='bg-[#0A1F44] rounded-3xl p-10 text-white text-center relative overflow-hidden'>
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
            <p className='text-white/60 mb-2 max-w-sm mx-auto'>
              Visit us in-store or fill in the enquiry form above.
            </p>
            <p className='text-white/40 text-sm mb-8'>📍 {primaryAddress}</p>
            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <Link
                href='/local-store/stringing'
                className='inline-block bg-white/10 hover:bg-white/20 border border-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
              >
                ← Back to Stringing
              </Link>
              <Link
                href='/contact'
                className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
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
