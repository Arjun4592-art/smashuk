import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Club Partnership Programme | ${SITE_NAME}`,
  description:
    'Partner with us for exclusive club benefits including free demo days, bulk discounts on equipment, custom printing, and player sponsorships for tennis, badminton, and padel clubs.',
  keywords:
    'club partnership programme, university sports partnership, racket club sponsorship, custom kit printing club, shuttlecock partnership programme, tennis ball club supply, sports club discounts uk',
}

const BENEFITS = [
  {
    icon: '🎾',
    title: 'Free Demo Days',
    desc: 'We bring the latest rackets to your club nights:',
    items: [
      'Tennis, badminton & padel demos',
      'All major brands in stock',
      'Expert fitting & advice on-site',
      'Try before you buy',
      'Member-only pricing',
    ],
    ctas: [
      { label: 'Find Out More', href: '/local-store/club-demo-programme' },
    ],
  },
  {
    icon: '🎯',
    title: 'Bulk Discounts',
    desc: 'Exclusive pricing on essential club supplies:',
    items: [
      'Tennis balls & shuttlecocks',
      'Training equipment',
      'Court accessories',
      'Volume pricing available',
    ],
    ctas: [
      {
        label: 'Shuttlecock Partnership',
        href: '/local-store/shuttlecock-partnership',
      },
      {
        label: 'Tennis Balls Partnership',
        href: '/local-store/tennis-ball-partnership',
      },
    ],
  },
  {
    icon: '👕',
    title: 'Club Printing Kit',
    desc: 'Professional branding for your club:',
    items: [
      'Custom logo printing',
      'Team apparel & bags',
      'Personalised racket bags',
      'Fast turnaround times',
    ],
    ctas: [{ label: 'Find Out More', href: '/local-store/kit-printing' }],
  },
  {
    icon: '⭐',
    title: 'Player Sponsorships',
    desc: 'Support your rising stars:',
    items: [
      'Equipment sponsorships',
      'Tournament support',
      'Junior development programmes',
      'Performance discounts',
    ],
    ctas: [{ label: 'Find Out More', href: '/local-store/sponsorship' }],
  },
]

const WHY_US = [
  {
    icon: '🎾',
    title: 'Multi-Sport Expertise',
    desc: 'Tennis, badminton & padel specialists',
  },
  {
    icon: '🏷️',
    title: 'Premium Brands',
    desc: 'Babolat, HEAD, Bullpadel, Adidas & more',
  },
  {
    icon: '📍',
    title: 'Local Manchester Service',
    desc: 'Run by players, for players',
  },
  { icon: '🤝', title: 'Expert Support', desc: 'Dedicated account management' },
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

export default function PartnershipsPage() {
  return (
    <div className='bg-[#F5F3EF] min-h-screen'>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Partnerships
          </p>
          <Eyebrow>Clubs & Universities</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Club Partnership <span className='text-[#E8553A]'>Programme</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl mb-8'>
            We&rsquo;re a local racket sports specialist based in Manchester,
            run by passionate players. We partner with tennis, badminton, and
            padel clubs across the region to support and grow the community
            together.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* ── WHO WE ARE ───────────────────────────────────────────────── */}
      <section className='reveal max-w-3xl mx-auto px-4 md:px-6 py-16 text-center'>
        <Eyebrow>Our Story</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-4'>
          Who We Are
        </h2>
        <p className='text-gray-400 text-sm leading-relaxed mb-3'>
          We&rsquo;re a local racket sports specialist based in Manchester, run
          by passionate players who understand the game. Our mission is to
          partner with tennis, badminton, and padel clubs across the region to
          support and grow the racket sports community together.
        </p>
        <p className='text-gray-400 text-sm leading-relaxed'>
          Whether you&rsquo;re a small community club or a competitive training
          centre, we&rsquo;re here to provide the equipment, expertise, and
          support your members deserve.
        </p>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>Partnership Benefits</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          What You Get
        </h2>
        <div className='grid md:grid-cols-2 gap-6'>
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'
            >
              <span className='text-3xl block mb-3'>{b.icon}</span>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-xl mb-2'>
                {b.title}
              </h3>
              <p className='text-gray-400 text-sm mb-3'>{b.desc}</p>
              <ul className='space-y-1.5 mb-5'>
                {b.items.map((item) => (
                  <li key={item} className='text-gray-500 text-xs flex gap-2'>
                    <span className='text-[#E8553A]'>•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className='flex flex-col gap-1.5'>
                {b.ctas.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className='text-xs font-montserrat font-bold text-[#E8553A] hover:text-[#D4441F]'
                  >
                    {c.label} →
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ───────────────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Why Us</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
            Why Clubs Choose Us
          </h2>
          <div className='grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-[#0A1F44]/6 border border-[#0A1F44]/6 rounded-2xl overflow-hidden'>
            {WHY_US.map((w) => (
              <div
                key={w.title}
                className='bg-white p-6 hover:bg-[#F5F3EF] transition-colors text-center'
              >
                <span className='text-2xl block mb-3'>{w.icon}</span>
                <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm mb-2'>
                  {w.title}
                </h3>
                <p className='text-gray-400 text-xs leading-relaxed'>
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-10 text-white text-center'>
          <h2 className='font-montserrat font-black text-2xl mb-2'>
            Ready to Partner?
          </h2>
          <p className='text-white/70 text-sm mb-5 max-w-lg mx-auto leading-relaxed'>
            Join the growing network of clubs benefiting from our partnership
            programme. Get in touch to discuss how we can support your club.
          </p>
          <p className='text-white/90 text-sm mb-1'>
            📧 Email:{' '}
            <a href='mailto:partnership@smashuk.co' className='font-semibold'>
              partnership@smashuk.co
            </a>
          </p>
          <p className='text-white/90 text-sm mb-6'>📞 Phone: 0161 536 3594</p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Get Started Today
          </Link>
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
