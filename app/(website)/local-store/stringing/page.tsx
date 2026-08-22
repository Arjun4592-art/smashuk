// StringingServicesPage — redesigned layout
// Drop-in replacement: same data arrays, new visual structure.
// Uses Tailwind utility classes + inline style where Tailwind can't reach.

import StringingBookingForm from '@/components/website/StringingBookingForm'
import StringingBookNowTrigger from '@/components/website/StringingBookNowTrigger'

const PRICING = [
  {
    sport: 'Badminton',
    sportKey: 'badminton' as const,
    icon: '🏸',
    from: '£16',
    note: 'Syn. gut to premium multifilament',
    href: '/local-store/stringing/badminton',
  },
  {
    sport: 'Tennis',
    sportKey: 'tennis' as const,
    icon: '🎾',
    from: '£22',
    note: 'Poly, multifilament & natural gut',
    href: '/local-store/stringing/tennis',
  },
  {
    sport: 'Squash',
    sportKey: 'squash' as const,
    icon: '🏓',
    from: '£22',
    note: 'Durable thin-gauge squash strings',
    href: '/local-store/stringing/squash',
  },
]

const WHY = [
  {
    icon: '👨‍🔧',
    title: 'UKRSA-Certified',
    body: "Every stringer on our team holds UKRSA certification — the UK's professional standard for racket stringing.",
  },
  {
    icon: '🏆',
    title: '10,000+ Rackets',
    body: "We've strung rackets for club players, county athletes, and competitors at major national tournaments.",
  },
  {
    icon: '⚡',
    title: '40-Minute Express',
    body: 'Book a slot, wait in-store, walk out ready to play. No next-day wait before a big match.',
  },
  {
    icon: '🎯',
    title: 'String Library',
    body: 'We stock 30+ strings across tension ranges and materials — and can usually source a specific one on request.',
  },
  {
    icon: '💡',
    title: 'Free Consultation',
    body: 'Not sure what tension or gauge suits your style? Our team will walk you through the options before we string a thing.',
  },
  {
    icon: '🎁',
    title: 'Loyalty Stamps',
    body: 'Collect a stamp with every restring. After enough visits, your next stringing is on us.',
  },
]

const PROCESS = [
  {
    n: '01',
    title: 'Frame Inspection',
    body: 'We check your frame and grommets for cracks, wear, or anything that could affect the string job or shorten string life.',
  },
  {
    n: '02',
    title: 'Player Consultation',
    body: "We talk through your playing frequency, style, and any tension or string you've used before — or want to try.",
  },
  {
    n: '03',
    title: 'Machine Stringing',
    body: 'Strung on one of four fully-automatic machines. Constant-pull technology means the tension you ask for is the tension you get.',
  },
  {
    n: '04',
    title: 'Quality Check',
    body: 'We verify tension across the pattern and inspect the frame before anything leaves the bench.',
  },
  {
    n: '05',
    title: 'Collection & Tips',
    body: "We'll message you when it's ready. You'll also get a few notes on how to look after the new string job.",
  },
]

const GUIDES = [
  {
    sport: 'Badminton',
    desc: 'String gauge, tension ranges, and which strings suit your level of play.',
    href: '/local-store/stringing/badminton',
  },
  {
    sport: 'Tennis',
    desc: 'Poly vs multifilament vs natural gut — and how tension affects feel and spin.',
    href: '/local-store/stringing/tennis',
  },
  {
    sport: 'Squash',
    desc: 'Durability, gauge selection, and why squash stringing differs from tennis.',
    href: '/local-store/stringing/squash',
  },
]

// ── String Tension SVG divider ─────────────────────────────────────────────
function StringDivider({ inverted = false }: { inverted?: boolean }) {
  const line = inverted ? '#FFFFFF18' : '#0A1F4412'
  const accent = inverted ? '#E8553A55' : '#E8553A33'
  return (
    <svg
      viewBox='0 0 1200 40'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full'
      style={{ height: 40, display: 'block' }}
    >
      {/* Simulate taut strings — thin diagonal lines across the full width */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <line
          key={i}
          x1={i * 110}
          y1='0'
          x2={i * 110 + 60}
          y2='40'
          stroke={i === 5 ? accent : line}
          strokeWidth={i === 5 ? '1.5' : '1'}
        />
      ))}
      {/* Cross strings */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={'c' + i}
          x1='0'
          y1={i * 10}
          x2='1200'
          y2={i * 10 + 5}
          stroke={line}
          strokeWidth='0.8'
        />
      ))}
    </svg>
  )
}

// ── Pill label ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-block font-mono text-[10px] tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>
  )
}

export default function StringingServicesPageRedesign() {
  return (
    <div className='bg-[#F5F3EF] min-h-screen font-lato'>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        {/* String grid background */}
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

        <div className='relative max-w-5xl mx-auto px-6 pt-16 pb-20'>
          {/* Breadcrumb */}
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            Local Store &nbsp;/&nbsp; Stringing
          </p>

          <div className='grid md:grid-cols-2 gap-12 items-end'>
            <div>
              <Eyebrow>Manchester · UKRSA Certified</Eyebrow>
              <h1
                className='font-black text-white text-5xl md:text-6xl mb-6 font-montserrat'
                style={{ lineHeight: 1.08 }}
              >
                Racket
                <br />
                Stringing
                <br />
                <span className='text-[#E8553A]'>Done Right.</span>
              </h1>
              <p className='text-white/60 text-sm leading-relaxed max-w-sm mb-8'>
                Four fully-automatic machines, UKRSA-qualified stringers, and
                over 10,000 rackets strung — including players preparing for
                major tournaments.
              </p>
              <div className='flex flex-wrap gap-3'>
                <StringingBookNowTrigger className='bg-[#E8553A] hover:bg-[#D4441F] text-white px-7 py-3.5 rounded-full text-sm font-bold transition-colors font-montserrat'>
                  📅 Book Your Stringing
                </StringingBookNowTrigger>
                <a
                  href='#pricing'
                  className='border border-white/20 hover:border-white/40 text-white/70 hover:text-white px-7 py-3.5 rounded-full text-sm transition-colors font-montserrat'
                >
                  View Pricing
                </a>
              </div>
            </div>

            {/* Stats column */}
            <div className='grid grid-cols-2 gap-4'>
              {[
                { n: '10k+', label: 'Rackets strung' },
                { n: '40', label: 'Minute express turnaround' },
                { n: '30+', label: 'Strings in stock' },
                { n: '4', label: 'Auto-tensioning machines' },
              ].map((s) => (
                <div
                  key={s.n}
                  className='bg-white/5 border border-white/10 rounded-2xl p-5'
                >
                  <p className='text-[#E8553A] font-black text-3xl font-montserrat'>
                    {s.n}
                  </p>
                  <p className='text-white/50 text-xs mt-1 leading-snug'>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Address bar */}
          <div className='mt-12 flex flex-wrap gap-6 text-white/40 text-xs font-mono tracking-wide'>
            <span>📍 Manchester City Centre</span>
            <span>🕐 Mon–Sat · 11am–7pm</span>
            <span>🧵 Bring your own string — labour fee only</span>
          </div>
        </div>
      </section>

      <StringDivider inverted />

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id='pricing' className='max-w-5xl mx-auto px-6 py-16'>
        <div className='flex items-baseline gap-4 mb-10'>
          <Eyebrow>Pricing</Eyebrow>
        </div>
        <h2 className='font-black text-[#0A1F44] text-3xl mb-10 font-montserrat'>
          Choose Your Sport
        </h2>

        {/* Menu-style pricing rows */}
        <div className='divide-y divide-[#0A1F44]/8 border-y border-[#0A1F44]/8'>
          {PRICING.map((p) => (
            <a
              key={p.sport}
              href={p.href}
              className='flex items-center gap-6 py-6 group hover:bg-[#E8553A]/4 -mx-4 px-4 rounded-xl transition-colors cursor-pointer'
            >
              <span className='text-3xl w-10 text-center'>{p.icon}</span>
              <div className='flex-1'>
                <h3 className='font-black text-[#0A1F44] text-xl font-montserrat'>
                  {p.sport}
                </h3>
                <p className='text-gray-400 text-sm mt-0.5'>{p.note}</p>
              </div>
              <div className='text-right'>
                <p className='font-black text-[#E8553A] text-2xl font-montserrat'>
                  {p.from}
                </p>
                <p className='text-[#0A1F44]/40 text-xs font-mono'>
                  starting from
                </p>
              </div>
              <span className='text-[#E8553A] opacity-0 group-hover:opacity-100 transition-opacity text-lg ml-2'>
                →
              </span>
            </a>
          ))}
        </div>

        {/* BYOS note */}
        <div className='mt-8 bg-white border border-[#0A1F44]/8 rounded-2xl px-6 py-5 flex gap-4 items-start'>
          <span className='text-2xl mt-0.5'>🧵</span>
          <div>
            <p className='font-bold text-[#0A1F44] text-sm mb-1 font-montserrat'>
              Bring Your Own String
            </p>
            <p className='text-gray-500 text-sm leading-relaxed'>
              If you already have a string you love, bring it in — we only
              charge the labour fee. We also stock 30+ strings from major
              brands, and can source most others on request.
            </p>
          </div>
        </div>
      </section>

      {/* ── TURNAROUND OPTIONS ──────────────────────────────────────────── */}
      <section className='reveal bg-[#0A1F44]'>
        <StringDivider inverted />
        <div className='max-w-5xl mx-auto px-6 py-16'>
          <Eyebrow>Turnaround</Eyebrow>
          <h2 className='font-black text-white text-3xl mb-10 font-montserrat'>
            Two Ways to Get Strung
          </h2>
          <div className='grid md:grid-cols-2 gap-6'>
            {/* Standard */}
            <div className='bg-white/5 border border-white/10 rounded-2xl p-8'>
              <p className='text-4xl mb-4'>⏱️</p>
              <h3 className='font-black text-white text-xl mb-2 font-montserrat'>
                24-Hour Standard
              </h3>
              <p className='text-white/50 text-sm leading-relaxed mb-4'>
                Drop your racket off, come back the next day. No extra charge —
                this is our default service. Perfect when you're not in a rush.
              </p>
              <ul className='space-y-1.5'>
                {[
                  'No booking required',
                  'Full string selection available',
                  'Included in all base prices',
                ].map((l) => (
                  <li key={l} className='text-white/60 text-xs flex gap-2'>
                    <span className='text-[#E8553A]'>✓</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            {/* Express */}
            <div className='bg-[#E8553A] rounded-2xl p-8 relative overflow-hidden'>
              <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12' />
              <p className='text-4xl mb-4'>⚡</p>
              <h3 className='font-black text-white text-xl mb-2 font-montserrat'>
                40-Minute Express
              </h3>
              <p className='text-white/80 text-sm leading-relaxed mb-4'>
                Book a slot in advance, come in at your time, wait in-store, and
                walk out ready. Ideal if you've got a match later today. A small
                same-day surcharge applies if not pre-booked.
              </p>
              <ul className='space-y-1.5'>
                {[
                  'Pre-book for no surcharge',
                  'Wait in-store',
                  'Play within the hour',
                ].map((l) => (
                  <li key={l} className='text-white/80 text-xs flex gap-2'>
                    <span className='text-white'>✓</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Book button — sits between/below both cards rather than
              inside just the Express one, since either card can lead into
              the same "Choose Your Service Option" modal. */}
          <div className='flex justify-center mt-6'>
            <StringingBookNowTrigger className='inline-block bg-white text-[#E8553A] font-bold text-sm px-8 py-3 rounded-full hover:bg-white/90 transition-colors font-montserrat'>
              Book Express Slot →
            </StringingBookNowTrigger>
          </div>
        </div>
        <StringDivider inverted />
      </section>

      {/* ── BOOKING ─────────────────────────────────────────────────────── */}
      {/* White bg + top/bottom border so it's visually distinct from the
          Process section right below it — both otherwise sit on the same
          page background (#F5F3EF) and were blending into one block. */}
      <section
        id='book'
        className='reveal bg-white border-y border-[#0A1F44]/8'
      >
        <div className='max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-start'>
          <div>
            <Eyebrow>Book Now</Eyebrow>
            <h2 className='font-black text-[#0A1F44] text-3xl mb-4 font-montserrat'>
              Reserve Your Stringing Slot
            </h2>
            <p className='text-gray-400 text-sm leading-relaxed mb-6'>
              Use the form to book our 40-minute express service, or request a
              standard 24-hour drop-off. We'll confirm your slot by message or
              email.
            </p>
            <div className='space-y-3 text-sm text-gray-500'>
              <p>📍 Manchester City Centre</p>
              <p>🕐 Open Mon–Sat · 11am–7pm</p>
              <p>📞 Can also book by phone or WhatsApp</p>
            </div>
          </div>
          {/* StringingBookingForm already ships its own card styling
              (bg/border/rounded/padding), so it's rendered directly here
              without an extra wrapping card. */}
          <StringingBookingForm />
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-6 py-16'>
        <Eyebrow>The Process</Eyebrow>
        <h2 className='font-black text-[#0A1F44] text-3xl mb-12 font-montserrat'>
          What Happens to Your Racket
        </h2>

        {/* Horizontal tape — desktop */}
        <div className='hidden md:flex gap-0 relative mb-12'>
          {/* Connector line */}
          <div className='reveal-line-x absolute top-9 left-9 right-9 h-[2px] bg-gradient-to-r from-[#E8553A]/20 via-[#E8553A]/60 to-[#E8553A]/20' />
          {PROCESS.map((p, i) => (
            <div
              key={p.n}
              className='reveal flex-1 flex flex-col items-center px-3'
            >
              <div className='ls-tap relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center mb-5 transition-transform duration-300 hover:scale-110'>
                <span className='font-black text-[#E8553A] text-lg tracking-tight font-montserrat'>
                  {p.n}
                </span>
              </div>
              <h3 className='font-bold text-[#0A1F44] text-sm text-center mb-2 font-montserrat'>
                {p.title}
              </h3>
              <p className='text-gray-400 text-xs text-center leading-relaxed'>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Vertical — mobile */}
        <div className='md:hidden space-y-0 relative'>
          <div className='reveal-line absolute left-[35px] top-10 bottom-10 w-[2px] bg-gradient-to-b from-[#E8553A]/60 to-[#E8553A]/10' />
          {PROCESS.map((p) => (
            <div key={p.n} className='reveal flex gap-6 py-5'>
              <div className='relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center'>
                <span className='font-black text-[#E8553A] text-sm font-montserrat'>
                  {p.n}
                </span>
              </div>
              <div className='pt-2'>
                <h3 className='font-bold text-[#0A1F44] text-sm mb-1 font-montserrat'>
                  {p.title}
                </h3>
                <p className='text-gray-400 text-xs leading-relaxed'>
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY CHOOSE US ───────────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-6 py-16'>
          <Eyebrow>Why Us</Eyebrow>
          <h2 className='font-black text-[#0A1F44] text-3xl mb-10 font-montserrat'>
            What Sets Our Stringing Apart
          </h2>
          <div className='grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-[#0A1F44]/6 border border-[#0A1F44]/6 rounded-2xl overflow-hidden'>
            {WHY.map((w, i) => (
              <div
                key={w.title}
                className='bg-white p-6 hover:bg-[#F5F3EF] transition-colors'
              >
                <span className='text-2xl block mb-3'>{w.icon}</span>
                <h3 className='font-bold text-[#0A1F44] text-sm mb-2 font-montserrat'>
                  {w.title}
                </h3>
                <p className='text-gray-400 text-xs leading-relaxed'>
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUIDES ──────────────────────────────────────────────────────── */}
      <section className='reveal bg-[#0A1F44]'>
        <StringDivider inverted />
        <div className='max-w-5xl mx-auto px-6 py-16'>
          <Eyebrow>Learn</Eyebrow>
          <h2 className='font-black text-white text-3xl mb-2 font-montserrat'>
            Stringing Guides
          </h2>
          <p className='text-white/40 text-sm mb-10 max-w-md'>
            Not sure where to start? Our sport-specific guides cover string
            types, tension, gauge selection, and more.
          </p>
          <div className='grid md:grid-cols-3 gap-4'>
            {GUIDES.map((g) => (
              <a
                key={g.sport}
                href={g.href}
                className='block bg-white/5 border border-white/10 hover:border-[#E8553A]/50 hover:bg-white/8 rounded-2xl p-6 transition-all group'
              >
                <h3 className='font-bold text-white text-base mb-2 group-hover:text-[#E8553A] transition-colors font-montserrat'>
                  {g.sport} Stringing Guide
                </h3>
                <p className='text-white/40 text-xs leading-relaxed mb-4'>
                  {g.desc}
                </p>
                <span className='text-[#E8553A] text-xs font-mono tracking-wide'>
                  READ GUIDE →
                </span>
              </a>
            ))}
          </div>
        </div>
        <StringDivider inverted />
      </section>

      {/* ── CONTACT FALLBACK ────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-6 py-16 text-center'>
        <p className='text-gray-400 text-sm mb-2'>
          Prefer a call or message instead?
        </p>
        <h2 className='font-black text-[#0A1F44] text-2xl mb-5 font-montserrat'>
          We'll sort a slot for you.
        </h2>
        <a
          href='/contact'
          className='inline-block bg-[#0A1F44] hover:bg-[#142d5e] text-white font-bold px-8 py-3.5 rounded-full text-sm transition-colors font-montserrat'
        >
          Contact Us
        </a>
      </section>
    </div>
  )
}
