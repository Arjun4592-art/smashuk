import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Manchester Padel Store | ${SITE_NAME}`,
  description:
    "Manchester's premier padel tennis store offering a wide range of equipment, apparel, and accessories from top brands like Babolat, Head, Tecnifibre, and Adidas. Elevate your game with us!",
  keywords:
    'manchester padel store, padel racket shop manchester, padel specialist store, babolat padel, bullpadel manchester',
}

const WHY_VISIT = [
  {
    icon: '🎯',
    title: 'Custom advice',
    desc: 'Get personalised recommendations from our padel specialists based on your playing style and skill level.',
  },
  {
    icon: '✋',
    title: 'Feel the rackets',
    desc: 'Try before you buy. Handle and test our full range of padel rackets in store to find your perfect match.',
  },
  {
    icon: '🎾',
    title: 'Demo rackets',
    desc: 'Take rackets out on court with our demo programme. Test them in real playing conditions before making your decision.',
  },
]

const RACKET_TIERS = [
  {
    level: 'Beginner',
    title: 'Fiberglass rackets',
    desc: 'User-friendly fiberglass rackets designed for beginners. Perfect for learning the fundamentals with forgiving sweet spots and easy handling.',
  },
  {
    level: 'Intermediate',
    title: 'Carbon rackets',
    desc: 'Powerful rackets with carbon construction to increase feel and control. Ideal for players developing their technique and power game.',
  },
  {
    level: 'Advanced',
    title: 'Premium rackets',
    desc: 'Premium rackets designed with the latest technology and highest grade carbon to provide excellent spin, feel, shock absorption and power in shots.',
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

export default function ManchesterPadelStorePage() {
  return (
    <div className='bg-[#F5F3EF] min-h-screen'>
      {/* Hero */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Padel Store
          </p>
          <Eyebrow>🏓 Padel Specialist</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Manchester&rsquo;s{' '}
            <span className='text-[#E8553A]'>padel specialist</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl'>
            Visit our Manchester store for expert advice from padel specialists
            who understand your game. We&rsquo;re here to help you find the
            perfect equipment.
          </p>
        </div>
      </section>

      {/* Why visit */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='grid sm:grid-cols-3 gap-6 mb-14'>
          {WHY_VISIT.map((w) => (
            <div
              key={w.title}
              className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6 text-center'
            >
              <span className='text-3xl block mb-3'>{w.icon}</span>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-base mb-2'>
                {w.title}
              </h3>
              <p className='text-gray-400 text-sm leading-relaxed'>{w.desc}</p>
            </div>
          ))}
        </div>

        {/* Visit us */}
        <div className='bg-[#0A1F44] rounded-2xl p-8 md:p-10 text-center'>
          <Eyebrow>Visit us</Eyebrow>
          <p className='font-montserrat font-black text-white text-xl mb-1'>
            {SITE_NAME}
          </p>
          <p className='text-white/60 text-sm leading-relaxed mb-6'>
            112A Hulme High Street
            <br />
            Manchester, M15 5JP
          </p>
          <Link
            href='/local-store'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Visit us
          </Link>
        </div>
      </section>

      {/* Rackets for all players */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Find your level</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
            Rackets for all players
          </h2>
          <div className='grid md:grid-cols-3 gap-6'>
            {RACKET_TIERS.map((tier) => (
              <div
                key={tier.level}
                className='bg-[#F5F3EF] rounded-2xl border border-[#0A1F44]/8 p-6'
              >
                <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.15em] uppercase text-[#E8553A] mb-3'>
                  {tier.level}
                </span>
                <h3 className='font-montserrat font-black text-[#0A1F44] text-lg mb-2'>
                  {tier.title}
                </h3>
                <p className='text-gray-400 text-sm leading-relaxed'>
                  {tier.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog CTA */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center'>
          <div>
            <Eyebrow>Guide</Eyebrow>
            <h2 className='font-montserrat font-black text-white text-2xl mb-2'>
              Top 5 Adidas Rackets For All Players
            </h2>
            <p className='text-white/60 text-sm leading-relaxed max-w-lg'>
              We break down the best Adidas padel rackets for all different
              playing styles in this blog.
            </p>
          </div>
          <Link
            href='/blog'
            className='inline-block whitespace-nowrap bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Read Now
          </Link>
        </div>
      </section>

      {/* Gift card banner */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 pb-16'>
        <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-8 md:p-10 text-center'>
          <Eyebrow>🎁 Perfect gift</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-2xl mb-2'>
            Shop Our Gift Cards
          </h2>
          <p className='text-gray-400 text-sm leading-relaxed max-w-lg mx-auto mb-1'>
            Let them choose their perfect racket, shoes, or gear. Our gift cards
            are the ideal present for any racket sports enthusiast.
          </p>
          <p className='text-gray-400 text-xs mb-6'>
            Physical cards available in-store!
          </p>
          <Link
            href='/gift-cards'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Shop Gift Cards
          </Link>
        </div>
      </section>

      {/* Store info */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16 text-center'>
          <Eyebrow>Padel Specialist Store</Eyebrow>
          <p className='font-montserrat font-black text-[#0A1F44] text-lg mb-1'>
            112A Hulme High Street, Manchester M15 5JP
          </p>
          <p className='text-gray-400 text-sm mb-6'>
            Monday&ndash;Saturday 10am&ndash;6pm
          </p>
          <Link
            href='/local-store'
            className='inline-block bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Visit us
          </Link>
        </div>
      </section>

      {/* Who we are */}
      <section className='reveal max-w-2xl mx-auto px-4 md:px-6 py-16 text-center'>
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
