import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'

export const metadata = {
  title: `Tennis Ball Partnership Programme | ${SITE_NAME}`,
  description:
    'Bulk tennis ball supply for clubs, coaching programmes and universities at partnership rates, with standing-order options.',
  keywords:
    'tennis ball partnership, bulk tennis balls club, tennis club ball supply uk',
}

const FEATURES = [
  {
    icon: '🎾',
    title: 'Partnership Pricing',
    desc: 'Discounted per-can and per-case rates on pressurised and pressureless tennis balls for clubs and academies.',
  },
  {
    icon: '🔁',
    title: 'Standing Orders',
    desc: 'Set up a recurring delivery timed to your club nights and league fixtures so you never run short.',
  },
  {
    icon: '🎓',
    title: 'Coaching & Academies',
    desc: 'Higher-volume rates for coaching programmes and academies going through cases every week.',
  },
  {
    icon: '🏆',
    title: 'Tournament & League Supply',
    desc: 'One-off bulk orders for tournaments, open days or league fixtures — just ask.',
  },
]

export default function TennisBallPartnershipPage() {
  return (
    <div className='bg-white'>
      <LuxuryHero
        title='Tennis Ball Partnership Programme'
        subtitle="Bulk tennis ball supply for clubs, academies and coaching programmes, at partnership rates."
        breadcrumbs={[
          { label: 'Local Store', href: '/local-store' },
          { label: 'Tennis Ball Partnership' },
        ]}
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6'
            >
              <span className='ls-card-icon inline-block text-3xl'>{f.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {f.title}
              </h2>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className='reveal-scale bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Set Up A Standing Order
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Tell us your club name, roughly how many cases you go through a
            month, and preferred ball type/brand.
          </p>
          <Link
            href='/contact'
            className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Get In Touch
          </Link>
        </div>
      </div>
    </div>
  )
}
