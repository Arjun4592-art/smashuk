import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Racket Demo Service — Try Before You Buy | ${SITE_NAME}`,
  description:
    'Test the latest badminton, tennis and padel rackets before you buy. £10 demo fee per racket with a fully refundable deposit. Book your demo session in-store.',
  keywords:
    'racket demo service, try before you buy racket, badminton racket trial, tennis racket demo, padel racket demo, racket demo manchester, test a racket before buying',
}

const SPORTS = [
  {
    icon: '🏸',
    title: 'Badminton',
    desc: 'Test the latest frames from Yonex, Victor, Li-Ning and more.',
  },
  {
    icon: '🎾',
    title: 'Tennis',
    desc: 'Try premium rackets from Babolat, Head, Yonex and more.',
  },
  {
    icon: '🥎',
    title: 'Padel',
    desc: 'Find your ideal racket, from beginner to advanced-performance frames.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Pick Your Rackets',
    desc: 'Choose up to 2 frames to test side-by-side and directly compare.',
  },
  {
    step: '02',
    title: 'Pay The Demo Fee',
    desc: 'A £10 fee per racket, plus a refundable deposit equal to the racket\'s full retail price, held securely on card.',
  },
  {
    step: '03',
    title: 'Play & Decide',
    desc: 'Feel the real difference in weight, balance and performance in actual playing conditions — not just swinging it in the shop.',
  },
  {
    step: '04',
    title: 'Return Or Buy',
    desc: 'Bring it back in good condition for a full deposit refund, or buy it — either way, you made an informed choice.',
  },
]

export default function RacketDemoServicePage() {
  return (
    <div className='bg-white'>
      <div className='bg-[#0A1F44] text-white'>
        <div className='max-w-5xl mx-auto px-4 py-14 text-center'>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Racket Demo Service
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Buying an expensive racket blind is a gamble. Test it in real
            playing conditions before you commit.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-14'>
          {SPORTS.map((s) => (
            <div
              key={s.title}
              className='bg-white rounded-2xl border border-gray-100 p-6 text-center'
            >
              <span className='text-3xl'>{s.icon}</span>
              <h2 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                {s.title}
              </h2>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className='bg-[#FFF8E7] border border-[#FFC453]/40 rounded-2xl p-6 text-center mb-14'>
          <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
            £10 per racket
          </p>
          <p className='text-sm text-gray-500 font-lato mt-1'>
            Plus a fully refundable deposit — equal to the racket&rsquo;s retail
            price — held on your card and returned when you bring the racket
            back in good condition.
          </p>
        </div>

        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            How It Works
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {HOW_IT_WORKS.map((h) => (
              <div
                key={h.step}
                className='bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100'
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

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Book A Demo Session
          </h2>
          <p className='text-white/70 font-lato mb-5'>
            Availability depends on stock — contact us to check what&rsquo;s
            demoable right now.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Book Your Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
