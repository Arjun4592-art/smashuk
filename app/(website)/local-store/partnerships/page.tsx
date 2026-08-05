import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Club & University Partnerships — Kit Printing & Sponsorship | ${SITE_NAME}`,
  description:
    'Partner with us for club and university racket sports kit, bulk shuttlecock/ball supply, custom kit printing, and athlete or club sponsorship.',
  keywords:
    'club partnership programme, university sports partnership, racket club sponsorship, custom kit printing club, shuttlecock partnership programme, tennis ball club supply, sports club discounts uk',
}

const PROGRAMMES = [
  {
    icon: '🎓',
    title: 'Club & University Partnerships',
    desc: 'Running a badminton, tennis, squash or padel club/society? Get preferential pricing on equipment for your members, plus support setting up sessions and events.',
    href: '/local-store/partnerships',
  },
  {
    icon: '🔄',
    title: 'Club Demo Racket Programme',
    desc: "Bring a set of demo rackets to a club night so your members can try before they buy — great for beginner-heavy clubs and taster sessions.",
    href: '/local-store/racket-demo',
  },
  {
    icon: '👕',
    title: 'Kit Printing Services',
    desc: 'Custom team kit and merchandise for clubs and universities — branded or non-branded options, custom logos, with bulk-order discounts.',
    href: '/local-store/kit-printing',
  },
  {
    icon: '🏸',
    title: 'Shuttlecock Partnership',
    desc: 'Bulk shuttlecock supply for badminton clubs and coaching programmes at partnership rates — ask us about a standing order.',
    href: '/local-store/shuttlecock-partnership',
  },
  {
    icon: '🎾',
    title: 'Tennis Ball Partnership',
    desc: 'Bulk tennis ball supply for clubs, academies and coaching programmes at partnership rates — ask us about a standing order.',
    href: '/local-store/tennis-ball-partnership',
  },
  {
    icon: '🏆',
    title: 'Sponsorship Programme',
    desc: 'We support promising athletes, coaches and clubs in racket sports. Applications are reviewed case-by-case and can include discounts or equipment support.',
    href: '/local-store/sponsorship',
  },
]

export default function PartnershipsPage() {
  return (
    <div className='bg-white'>
      <div className='bg-[#0A1F44] text-white'>
        <div className='max-w-5xl mx-auto px-4 py-14 text-center'>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Club, University & Sponsorship Programmes
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            We work with local clubs, university societies, coaches and
            athletes across badminton, tennis, squash and padel.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          {PROGRAMMES.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className='block bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#E8553A]/30 hover:shadow-[0_8px_24px_rgba(232,85,58,0.08)] transition-all'
            >
              <span className='text-3xl'>{p.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {p.title}
              </h2>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {p.desc}
              </p>
            </Link>
          ))}
        </div>

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Set Up A Partnership
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Tell us a bit about your club, university or sponsorship request
            and we’ll get back to you — most enquiries get a response within
            a couple of working days.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Get In Touch
          </Link>
        </div>
      </div>
    </div>
  )
}
