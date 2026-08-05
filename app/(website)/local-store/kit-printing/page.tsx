import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Club Kit Printing Services | ${SITE_NAME}`,
  description:
    'Custom team kit and merchandise printing for racket sports clubs and universities — branded or non-branded, custom logos, bulk-order discounts.',
  keywords:
    'club kit printing, custom team kit, racket club merchandise, university sports kit printing uk',
}

const FEATURES = [
  {
    icon: '👕',
    title: 'Custom Team Kit',
    desc: 'Shirts, polos, hoodies and warm-ups printed with your club or university crest and colours.',
  },
  {
    icon: '🎨',
    title: 'Your Design or Ours',
    desc: 'Send us your own logo/design, or our team can help put together something from scratch.',
  },
  {
    icon: '📦',
    title: 'Bulk Order Discounts',
    desc: 'The bigger the order, the better the per-unit price — ideal for whole squads or societies.',
  },
  {
    icon: '⏱️',
    title: 'Fast Turnaround',
    desc: 'Typical orders are ready in 1-2 weeks depending on quantity and design complexity.',
  },
]

export default function KitPrintingPage() {
  return (
    <div className='bg-white'>
      <div className='bg-[#0A1F44] text-white'>
        <div className='max-w-5xl mx-auto px-4 py-14 text-center'>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Club Kit Printing Services
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Custom-printed team kit for clubs, universities and societies —
            look the part on and off the court.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-14'>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className='bg-white rounded-2xl border border-gray-100 p-6'
            >
              <span className='text-3xl'>{f.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {f.title}
              </h2>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Get A Kit Printing Quote
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Tell us your club/university, rough squad size, and design ideas
            and we&apos;ll come back with pricing and options.
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
