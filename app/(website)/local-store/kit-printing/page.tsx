import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Club Kit Printing Service — Custom Sports Apparel | ${SITE_NAME}`,
  description:
    'Professional kit printing and design services for clubs and universities. Branded and non-branded options available at competitive prices. Custom logos, team wear, and bulk discounts.',
  keywords:
    'club kit printing, custom team kit, racket club merchandise, university sports kit printing uk',
}

// ── Data (content unchanged, structure lightly expanded for the new layout) ─

const WHAT_WE_OFFER = [
  {
    icon: '🎨',
    title: 'Custom Design',
    desc: "Our team can design unique kits that reflect your club's identity and values.",
  },
  {
    icon: '✨',
    title: 'Branded Kits',
    desc: 'Premium branded apparel featuring your club logo and sponsor logos.',
  },
  {
    icon: '💰',
    title: 'Budget-Friendly Options',
    desc: 'Non-branded kits available at very competitive prices for clubs on a budget.',
  },
  {
    icon: '⚡',
    title: 'Quick Turnaround',
    desc: 'Fast delivery options available to meet your urgent deadlines and event schedules.',
  },
]

const SERVICES = [
  {
    icon: '🏫',
    title: 'University Teams',
    desc: 'Complete kit solutions for university sports teams:',
    items: [
      'Match day kits',
      'Training wear',
      'Hoodies & tracksuits',
      'Team bags',
      'Bulk order discounts',
    ],
  },
  {
    icon: '🎾',
    title: 'Sports Clubs',
    desc: 'Professional kits for tennis, badminton & padel clubs:',
    items: [
      'Club polo shirts',
      'Performance wear',
      'Warm-up jackets',
      'Custom racket bags',
      'Personalisation options',
    ],
  },
]

const PRICING = [
  {
    title: 'Budget Non-Branded',
    tag: 'Standard',
    desc: 'Quality kits at very competitive prices - perfect for training or casual club wear.',
    points: ['No design fee', 'Fast reorder', 'Great for training wear'],
    accent: false,
  },
  {
    title: 'Premium Branded',
    tag: 'Most Popular',
    desc: 'Full custom design with your club logo, sponsor logos, and premium materials.',
    points: [
      'Club + sponsor logos',
      'Custom design process',
      'Premium materials',
    ],
    accent: true,
  },
]

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Contact Us',
    body: 'Get in touch with your requirements.',
  },
  {
    n: '02',
    title: 'Design & Quote',
    body: 'We create designs and provide pricing.',
  },
  { n: '03', title: 'Approve', body: 'Review and approve your design.' },
  { n: '04', title: 'Production', body: 'We print and deliver your kits.' },
]

// ── Shared design primitives (matches the stringing page redesign) ─────────

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

export default function KitPrintingPage() {
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
            &nbsp;/&nbsp; Kit Printing
          </p>
          <Eyebrow>Custom Team Apparel</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Club Kit Printing <span className='text-[#E8553A]'>Service</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl mb-8'>
            Professional design and printing services for clubs and universities
            across the UK — branded or budget, with bulk discounts either way.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Request a Quote
          </Link>
        </div>
      </section>

      {/* ── WHAT WE OFFER ────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>What We Offer</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Everything Your Club Needs
        </h2>
        <div className='grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-[#0A1F44]/6 border border-[#0A1F44]/6 rounded-2xl overflow-hidden'>
          {WHAT_WE_OFFER.map((f) => (
            <div
              key={f.title}
              className='bg-white p-6 hover:bg-[#F5F3EF] transition-colors'
            >
              <span className='text-2xl block mb-3'>{f.icon}</span>
              <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm mb-2'>
                {f.title}
              </h3>
              <p className='text-gray-400 text-xs leading-relaxed'>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <section className='reveal bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Our Services</Eyebrow>
          <h2 className='font-montserrat font-black text-white text-3xl mb-10'>
            Kitted Out For Every Team
          </h2>
          <div className='grid md:grid-cols-2 gap-6'>
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className='bg-white/5 border border-white/10 rounded-2xl p-8'
              >
                <p className='text-4xl mb-4'>{s.icon}</p>
                <h3 className='font-montserrat font-black text-white text-xl mb-2'>
                  {s.title}
                </h3>
                <p className='text-white/50 text-sm leading-relaxed mb-4'>
                  {s.desc}
                </p>
                <ul className='space-y-1.5'>
                  {s.items.map((item) => (
                    <li key={item} className='text-white/60 text-xs flex gap-2'>
                      <span className='text-[#E8553A]'>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>Pricing</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-2'>
          Flexible Pricing for Every Budget
        </h2>
        <p className='text-gray-400 text-sm mb-10'>
          Volume discounts available for larger orders.
        </p>
        <div className='grid md:grid-cols-2 gap-6'>
          {PRICING.map((p) =>
            p.accent ? (
              <div
                key={p.title}
                className='bg-[#E8553A] rounded-2xl p-8 relative overflow-hidden'
              >
                <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12' />
                <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-white bg-white/15 px-3 py-1 rounded-full mb-4'>
                  {p.tag}
                </span>
                <h3 className='font-montserrat font-black text-white text-xl mb-2'>
                  {p.title}
                </h3>
                <p className='text-white/80 text-sm leading-relaxed mb-4'>
                  {p.desc}
                </p>
                <ul className='space-y-1.5'>
                  {p.points.map((pt) => (
                    <li key={pt} className='text-white/80 text-xs flex gap-2'>
                      <span className='text-white'>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link
                  href='/contact'
                  className='mt-6 inline-block bg-white text-[#E8553A] font-montserrat font-bold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-colors'
                >
                  Request a Quote →
                </Link>
              </div>
            ) : (
              <div
                key={p.title}
                className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'
              >
                <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#0A1F44]/40 bg-[#0A1F44]/5 px-3 py-1 rounded-full mb-4'>
                  {p.tag}
                </span>
                <h3 className='font-montserrat font-black text-[#0A1F44] text-xl mb-2'>
                  {p.title}
                </h3>
                <p className='text-gray-400 text-sm leading-relaxed mb-4'>
                  {p.desc}
                </p>
                <ul className='space-y-1.5'>
                  {p.points.map((pt) => (
                    <li key={pt} className='text-gray-500 text-xs flex gap-2'>
                      <span className='text-[#E8553A]'>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>How It Works</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-12'>
          From Enquiry to Delivery
        </h2>

        <div className='hidden md:flex gap-0 relative mb-4'>
          <div className='absolute top-9 left-9 right-9 h-[2px] bg-gradient-to-r from-[#E8553A]/20 via-[#E8553A]/60 to-[#E8553A]/20' />
          {HOW_IT_WORKS.map((p) => (
            <div key={p.n} className='flex-1 flex flex-col items-center px-3'>
              <div className='relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center mb-5'>
                <span className='font-montserrat font-black text-[#E8553A] text-lg'>
                  {p.n}
                </span>
              </div>
              <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm text-center mb-2'>
                {p.title}
              </h3>
              <p className='text-gray-400 text-xs text-center leading-relaxed'>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <div className='md:hidden space-y-0 relative'>
          <div className='absolute left-[23px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#E8553A]/60 to-[#E8553A]/10' />
          {HOW_IT_WORKS.map((p) => (
            <div key={p.n} className='flex gap-6 py-5'>
              <div className='relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center'>
                <span className='font-montserrat font-black text-[#E8553A] text-sm'>
                  {p.n}
                </span>
              </div>
              <div className='pt-2'>
                <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm mb-1'>
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

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 pb-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-10 text-white text-center'>
          <h2 className='font-montserrat font-black text-2xl mb-2'>
            Ready to Get Started?
          </h2>
          <p className='text-white/70 text-sm mb-5 max-w-lg mx-auto leading-relaxed'>
            Whether you need premium branded kits or budget-friendly options,
            we&rsquo;re here to help. Contact us today for a free quote.
          </p>
          <p className='text-white/90 text-sm mb-1'>
            📧 Email:{' '}
            <a href='mailto:sales@smashuk.co' className='font-semibold'>
              sales@smashuk.co
            </a>
          </p>
          <p className='text-white/90 text-sm mb-6'>
            📞 Phone: Contact us for details
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Request a Quote
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
