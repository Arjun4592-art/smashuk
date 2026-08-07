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
    cta: { label: 'Find Out More', href: '/local-store/club-demo-programme' },
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
    cta: null,
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
    cta: { label: 'Find Out More', href: '/local-store/kit-printing' },
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
    cta: { label: 'Find Out More', href: '/local-store/sponsorship' },
  },
]

const WHY_US = [
  {
    title: 'Multi-Sport Expertise',
    desc: 'Tennis, badminton & padel specialists',
  },
  {
    title: 'Premium Brands',
    desc: 'Babolat, HEAD, Bullpadel, Adidas & more',
  },
  {
    title: 'Local Manchester Service',
    desc: 'Run by players, for players',
  },
  {
    title: 'Expert Support',
    desc: 'Dedicated account management',
  },
]

export default function PartnershipsPage() {
  return (
    <div className='bg-white'>
      <div className='relative bg-[#0A1F44] text-white overflow-hidden'>
        {/* TODO: replace with a club/team/kit photo */}
        <img
          src='/local-store/partnerships-hero.jpg'
          alt='Club partnership programme'
          className='absolute inset-0 w-full h-full object-cover opacity-30'
        />
        <div className='relative max-w-5xl mx-auto px-4 py-14 text-center'>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Club Partnership Programme
          </h1>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Who We Are */}
        <div className='max-w-3xl mx-auto text-center mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-4'>
            Who We Are
          </h2>
          <p className='text-sm text-gray-500 font-lato leading-relaxed mb-3'>
            We&rsquo;re a local racket sports specialist based in Manchester,
            run by passionate players who understand the game. Our mission is to
            partner with tennis, badminton, and padel clubs across the region to
            support and grow the racket sports community together.
          </p>
          <p className='text-sm text-gray-500 font-lato leading-relaxed mb-6'>
            Whether you&rsquo;re a small community club or a competitive
            training centre, we&rsquo;re here to provide the equipment,
            expertise, and support your members deserve.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Get Started Today
          </Link>
        </div>

        {/* Partnership Benefits */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Partnership Benefits
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className='bg-white rounded-2xl border border-gray-100 p-6'
              >
                <span className='text-3xl'>{b.icon}</span>
                <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                  {b.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato mb-2'>{b.desc}</p>
                <ul className='space-y-1 mb-4'>
                  {b.items.map((item) => (
                    <li
                      key={item}
                      className='text-xs text-gray-500 font-lato leading-relaxed flex gap-1.5'
                    >
                      <span className='text-[#E8553A]'>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {b.cta && (
                  <Link
                    href={b.cta.href}
                    className='text-xs font-montserrat font-bold text-[#E8553A] hover:text-[#D4441F]'
                  >
                    {b.cta.label} →
                  </Link>
                )}
                {b.ctas && (
                  <div className='flex flex-col gap-1'>
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Why Clubs Choose Us */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Why Clubs Choose Us
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {WHY_US.map((w) => (
              <div
                key={w.title}
                className='bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100 text-center'
              >
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1.5'>
                  {w.title}
                </h3>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to Partner */}
        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Ready to Partner?
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Join the growing network of clubs benefiting from our partnership
            programme. Get in touch to discuss how we can support your club.
          </p>
          <p className='text-white/90 font-lato text-sm mb-1'>
            📧 Email:{' '}
            <a href='mailto:partnership@smashuk.co' className='font-semibold'>
              partnership@smashuk.co
            </a>
          </p>
          <p className='text-white/90 font-lato text-sm mb-6'>
            📞 Phone: 0161 536 3594
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Get Started Today
          </Link>
        </div>

        <div className='max-w-2xl mx-auto text-center'>
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
