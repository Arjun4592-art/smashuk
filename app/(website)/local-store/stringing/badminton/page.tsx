import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import {
  BADMINTON_TENSIONS as TENSIONS,
  BADMINTON_STRING_BRANDS as STRING_BRANDS,
} from '@/lib/stringing-options'
import Accordion from '@/components/website/local-store/Accordion'
import StringingTimeline from '@/components/website/StringingTimeline'

export const metadata = {
  title: `Badminton Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description:
    'Professional badminton racket stringing from £16. Tension advice for beginner to advanced players, popular string types in stock, 24-hour or 40-minute express turnaround.',
  keywords:
    'badminton stringing service, badminton racket restring, badminton string tension guide, badminton restring manchester, badminton string types',
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
const IconDroplet = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <path d='M12 2.69s6 7.03 6 11.31a6 6 0 0 1-12 0c0-4.28 6-11.31 6-11.31z' />
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
const IconClock = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon
    {...p}
    glyph={
      <>
        <circle cx='12' cy='12' r='10' />
        <polyline points='12 6 12 12 16 14' />
      </>
    }
  />
)
/* ──────────────────────────────────────────────────────────────── */

const RESTRING_SIGNS = [
  {
    title: 'Dead sound off the frame',
    desc: 'A dull "thud" instead of a crisp "ping" usually means the strings have lost their bed tension.',
  },
  {
    title: 'Shots landing short',
    desc: 'If clears that used to reach the back line now fall in mid-court, tension has likely dropped.',
  },
  {
    title: 'Visible fraying or notching',
    desc: 'Strings wearing thin where they cross is a sign they could snap mid-rally.',
  },
  {
    title: "It's been 3+ months",
    desc: 'Even without a break, badminton strings relax over time — regular players restring every 2–3 months.',
  },
]

const STRING_TYPES = [
  {
    name: 'Synthetic Gut',
    best: 'Beginners & casual players',
    power: 3,
    control: 2,
    durability: 4,
    feel: 2,
    note: "Affordable, forgiving, and holds up well if you're still learning technique.",
  },
  {
    name: 'Multifilament',
    best: 'Intermediate players wanting feel',
    power: 3,
    control: 4,
    durability: 3,
    feel: 5,
    note: 'Softer on the arm with a plusher response — popular for doubles and touch shots.',
  },
  {
    name: 'Thin-Gauge Repel',
    best: 'Advanced / competitive players',
    power: 5,
    control: 5,
    durability: 2,
    feel: 3,
    note: 'Crisp, high-repulsion string that rewards clean technique but wears faster.',
  },
]

const PROCESS = [
  {
    step: '01',
    title: 'Frame Inspection',
    desc: 'We check your frame and grommets for cracks or wear before anything else — a compromised frame changes how we approach the job.',
    icon: IconInspect,
  },
  {
    step: '02',
    title: 'Player Consultation',
    desc: "We ask about your level, how hard you hit, and what you've played on before, so the tension we set actually matches your swing.",
    icon: IconConsult,
  },
  {
    step: '03',
    title: 'Machine Stringing',
    desc: 'Strung on a fully-automatic, constant-pull machine — the tension you ask for is the tension that lands in the frame.',
    icon: IconString,
  },
  {
    step: '04',
    title: 'Quality Check',
    desc: 'We verify tension across the pattern and give the frame a final once-over before it leaves the bench.',
    icon: IconCheck,
  },
  {
    step: '05',
    title: 'Collection & Care Tips',
    desc: "We message you the moment it's ready, along with a few notes on how to get the most out of your new strings.",
    icon: IconCollect,
  },
]

const CARE_TIPS = [
  {
    icon: IconSun,
    title: 'Keep it out of direct heat',
    desc: "Don't leave your racket in a hot car or in direct sun — heat accelerates tension loss.",
  },
  {
    icon: IconDroplet,
    title: 'Dry strings after play',
    desc: 'Wipe down sweat and moisture after each session to stop strings degrading early.',
  },
  {
    icon: IconClock,
    title: 'Restring on a schedule',
    desc: 'A good rule of thumb: restring as many times a year as you play per week.',
  },
]

const FAQS = [
  {
    q: 'What tension should I ask for?',
    a: "Tell us your level and how hard you hit and we'll recommend a starting point — you can always adjust next time based on how it feels.",
  },
  {
    q: 'How often should I restring?',
    a: 'A common rule of thumb is to restring as many times a year as you play per week — more if you play often or break strings regularly.',
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll only charge the labour cost for stringing it.",
  },
  {
    q: 'Will higher tension always help my game?',
    a: 'Not necessarily — higher tension gives more control but less power and a smaller sweet spot. It only helps if your swing speed and technique can support it.',
  },
  {
    q: 'How long does a restring take?',
    a: 'Standard turnaround is 24 hours with no surcharge. If you need it sooner, book our 40-minute express slot.',
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

export default function BadmintonStringingPage() {
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
            &nbsp;/&nbsp; Badminton
          </p>

          <div className='grid md:grid-cols-2 gap-12 items-end'>
            <div>
              <Eyebrow>🏸 Badminton Stringing</Eyebrow>
              <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-5'>
                Precision Stringing.{' '}
                <span className='text-[#E8553A]'>Every Time.</span>
              </h1>
              <p className='text-white/60 text-sm leading-relaxed max-w-sm mb-8'>
                From social players to competitive club level — we string to
                your exact spec, on machines built for consistency, not
                guesswork.
              </p>
              <div className='flex flex-wrap gap-3'>
                <Link
                  href='/local-store/stringing#book'
                  className='bg-[#E8553A] hover:bg-[#D4441F] text-white px-7 py-3.5 rounded-full text-sm font-montserrat font-bold transition-colors'
                >
                  Book Your Slot →
                </Link>
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
                  From £16
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
        {/* ── SIGNS YOU NEED A RESTRING ────────────────────────────────── */}
        <section>
          <div className='bg-white border border-[#0A1F44]/8 rounded-3xl p-8 md:p-10'>
            <p className='text-center'>
              <Eyebrow>Not Sure If You Need One?</Eyebrow>
            </p>
            <h2 className='font-montserrat font-black text-2xl md:text-3xl text-[#0A1F44] text-center mb-8'>
              Signs Your Racket Needs Restringing
            </h2>
            <div className='grid sm:grid-cols-2 gap-4'>
              {RESTRING_SIGNS.map((s) => (
                <div
                  key={s.title}
                  className='flex gap-3 bg-[#F5F3EF] rounded-xl border border-[#0A1F44]/8 px-5 py-4'
                >
                  <span className='text-[#E8553A] mt-0.5 shrink-0'>
                    <IconCheck />
                  </span>
                  <div>
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                      {s.title}
                    </p>
                    <p className='text-xs text-gray-400 leading-relaxed'>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TENSION GUIDE ────────────────────────────────────────────── */}
        <section id='tension'>
          <div className='text-center mb-10'>
            <Eyebrow>Tension Guide</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Find Your Sweet Spot
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto'>
              A starting point by playing level — our stringers will refine it
              with you in-store based on how you play.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {TENSIONS.map((t, i) => (
              <div
                key={t.level}
                className={`rounded-2xl p-6 border ${i === 1 ? 'bg-[#0A1F44] border-[#0A1F44]' : 'bg-white border-[#0A1F44]/8'}`}
              >
                <p
                  className={`text-xs font-montserrat font-bold uppercase tracking-wider mb-2 ${i === 1 ? 'text-[#E8553A]' : 'text-[#E8553A]'}`}
                >
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

        {/* ── WHICH STRING SHOULD I CHOOSE ─────────────────────────────── */}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>Choosing a String</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Which String Type Fits Your Game?
            </h2>
            <p className='text-gray-400 mt-3 max-w-md mx-auto'>
              Every string trades off power, control, durability and feel —
              here's roughly where the main types land.
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
              Five steps, zero shortcuts — from drop-off to collection.
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
                Book a slot, drop it off, grab a coffee and collect your freshly
                strung racket.
              </p>
            </div>
            <Link
              href='/local-store/stringing#book'
              className='inline-block mt-6 bg-white text-[#E8553A] font-montserrat font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors w-fit'
            >
              Book Express →
            </Link>
          </div>
        </section>

        {/* ── STRINGS WE CARRY ─────────────────────────────────────────── */}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>Our Stock</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              What Strings Do We Carry?
            </h2>
            <p className='text-gray-400 mt-3'>
              Prices from <span className='font-bold text-[#0A1F44]'>£16</span>{' '}
              to <span className='font-bold text-[#0A1F44]'>£22</span> — all
              inclusive.
            </p>
          </div>
          <Accordion
            defaultOpenId={STRING_BRANDS[0]?.brand}
            containerClassName='bg-white rounded-2xl border border-[#0A1F44]/8 divide-y divide-[#0A1F44]/8'
            triggerClassName='font-montserrat font-bold text-base text-[#0A1F44] px-6 py-5'
            icon='chevron'
            iconWrapClassName='w-7 h-7 text-xs'
            contentClassName='px-6 pb-5'
            items={STRING_BRANDS.map((b) => ({
              id: b.brand,
              title: b.brand,
              content: (
                <ol className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2'>
                  {(b.items ?? []).map((item, idx) => (
                    <li
                      key={item}
                      className='text-sm text-gray-500 flex items-center gap-2'
                    >
                      <span className='text-[#E8553A] font-montserrat font-bold text-xs w-5 shrink-0'>
                        {idx + 1}.
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              ),
            }))}
          />
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

        {/* ── GUIDE CARD ───────────────────────────────────────────────── */}
        <section>
          <div className='text-center mb-8'>
            <Eyebrow>Learn More</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Helpful Badminton Guides
            </h2>
          </div>
          <Link
            href='/blog/how-to-choose-a-badminton-racket'
            className='group flex flex-col sm:flex-row max-w-xl mx-auto bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden hover:border-[#E8553A]/30 transition-all'
          >
            <div className='sm:w-48 shrink-0 aspect-[4/3] sm:aspect-auto bg-gray-100'>
              <img
                src='https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80'
                alt='Badminton guide'
                className='w-full h-full object-cover'
              />
            </div>
            <div className='p-6 flex flex-col justify-center'>
              <p className='text-xs text-[#E8553A] font-montserrat font-bold uppercase tracking-wider mb-2'>
                Guide
              </p>
              <h3 className='font-montserrat font-bold text-base text-[#0A1F44] leading-snug group-hover:text-[#E8553A] transition-colors'>
                How to Choose the Right Badminton Racket
              </h3>
              <p className='text-xs text-gray-400 mt-2'>
                By Kal · Read guide →
              </p>
            </div>
          </Link>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <Eyebrow>FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
                Badminton Stringing FAQs
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
            <p className='text-white/60 mb-8 max-w-sm mx-auto'>
              Head back to the main stringing page to book your slot or get in
              touch.
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
