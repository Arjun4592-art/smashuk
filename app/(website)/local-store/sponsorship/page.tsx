import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'

export const metadata = {
  title: `Sponsorship Programme | ${SITE_NAME}`,
  description:
    'We support promising athletes, coaches and clubs across badminton, tennis, squash and padel with equipment support and discounts.',
  keywords:
    'racket sports sponsorship, athlete sponsorship uk, badminton tennis squash club sponsorship',
}

const TIERS = [
  {
    icon: '🌱',
    title: 'Emerging Talent',
    desc: 'For juniors and up-and-coming players competing regionally — equipment discounts and priority stringing.',
  },
  {
    icon: '🥇',
    title: 'Competitive Athlete',
    desc: 'For players competing at national level — deeper discounts, demo access, and event support.',
  },
  {
    icon: '🏟️',
    title: 'Club & Team Sponsorship',
    desc: 'For clubs and teams looking for an equipment partner — kit support, discounts for members, and event sponsorship.',
  },
  {
    icon: '🎯',
    title: 'Coach Support',
    desc: "For coaches running sessions or academies — equipment support for the players you're developing.",
  },
]

export default function SponsorshipPage() {
  return (
    <div className='bg-white'>
      <LuxuryHero
        title='Sponsorship Programme'
        subtitle="We support promising athletes, coaches and clubs in badminton, tennis, squash and padel. Applications are reviewed case-by-case."
        breadcrumbs={[
          { label: 'Local Store', href: '/local-store' },
          { label: 'Sponsorship' },
        ]}
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          {TIERS.map((t) => (
            <div
              key={t.title}
              className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6'
            >
              <span className='ls-card-icon inline-block text-3xl'>{t.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {t.title}
              </h2>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {t.desc}
              </p>
            </div>
          ))}
        </div>

        <div className='reveal-scale bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Apply For Sponsorship
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Tell us about yourself or your club — playing level, competitions
            entered, and what kind of support you&apos;re looking for.
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
