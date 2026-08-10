import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'

export const metadata = {
  title: `Club Kit Printing Service — Custom Sports Apparel | ${SITE_NAME}`,
  description:
    'Professional kit printing and design services for clubs and universities. Branded and non-branded options available at competitive prices. Custom logos, team wear, and bulk discounts.',
  keywords:
    'club kit printing, custom team kit, racket club merchandise, university sports kit printing uk',
}

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
    title: 'Premium Branded',
    desc: 'Full custom design with your club logo, sponsor logos, and premium materials.',
  },
  {
    title: 'Budget Non-Branded',
    desc: 'Quality kits at very competitive prices - perfect for training or casual club wear.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Contact Us',
    desc: 'Get in touch with your requirements.',
  },
  {
    step: '2',
    title: 'Design & Quote',
    desc: 'We create designs and provide pricing.',
  },
  {
    step: '3',
    title: 'Approve',
    desc: 'Review and approve your design.',
  },
  {
    step: '4',
    title: 'Production',
    desc: 'We print and deliver your kits.',
  },
]

export default function KitPrintingPage() {
  return (
    <div className='bg-white'>
      <LuxuryHero
        title='Club Kit Printing Service'
        subtitle='Professional design and printing services for clubs and universities across the UK'
        breadcrumbs={[
          { label: 'Local Store', href: '/local-store' },
          { label: 'Kit Printing' },
        ]}
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* What We Offer */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            What We Offer
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
            {WHAT_WE_OFFER.map((f) => (
              <div
                key={f.title}
                className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6'
              >
                <span className='text-3xl'>{f.icon}</span>
                <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                  {f.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
          <div className='text-center'>
            <Link
              href='/contact'
              className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
            >
              Request a Quote
            </Link>
          </div>
        </div>

        {/* Our Services */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Our Services
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className='ls-card reveal bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100'
              >
                <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mb-1.5'>
                  {s.icon} {s.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato mb-2'>{s.desc}</p>
                <ul className='space-y-1'>
                  {s.items.map((item) => (
                    <li
                      key={item}
                      className='text-xs text-gray-500 font-lato leading-relaxed flex gap-1.5'
                    >
                      <span className='text-[#E8553A]'>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Flexible Pricing */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Flexible Pricing for Every Budget
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-8'>
            {PRICING.map((p) => (
              <div
                key={p.title}
                className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6 text-center'
              >
                <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1.5'>
                  {p.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
          <p className='text-center text-sm text-gray-500 font-lato mt-6'>
            Volume discounts available for larger orders
          </p>
        </div>

        {/* How It Works */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            How It Works
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {HOW_IT_WORKS.map((h) => (
              <div
                key={h.step}
                className='ls-card reveal bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100'
              >
                <span className='font-montserrat font-black text-2xl text-[#E8553A]/30'>
                  {h.step}
                </span>
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mt-2 mb-1.5'>
                  {h.title}
                </h3>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to Get Started */}
        <div className='reveal-scale bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Ready to Get Started?
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Whether you need premium branded kits or budget-friendly options,
            we&rsquo;re here to help. Contact us today for a free quote.
          </p>
          <p className='text-white/90 font-lato text-sm mb-1'>
            📧 Email:{' '}
            <a href='mailto:sales@smashuk.co' className='font-semibold'>
              sales@smashuk.co
            </a>
          </p>
          <p className='text-white/90 font-lato text-sm mb-6'>
            📞 Phone: Contact us for details
          </p>
          <Link
            href='/contact'
            className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Request a Quote
          </Link>
        </div>

        <div className='max-w-2xl mx-auto text-center mt-14'>
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
