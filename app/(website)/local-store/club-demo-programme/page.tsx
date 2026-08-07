import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'

export const metadata = {
  title: `Club Demo Racket Programme | Free Try Before You Buy | ${SITE_NAME}`,
  description:
    'Free racket demo programme for tennis, badminton and padel clubs. We bring the latest rackets to your club nights with expert advice. No cost to clubs. Book your demo day today.',
  keywords:
    'club demo racket programme, free racket demo club, club night racket trial, tennis badminton padel club demo, racket demo manchester club',
}

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'We Show Up',
    desc: 'We arrive at your club night with a bag full of the latest rackets from all major brands.',
  },
  {
    step: '2',
    title: 'Players Try',
    desc: 'Your members test different rackets on court to find their perfect match.',
  },
  {
    step: '3',
    title: 'Expert Advice',
    desc: 'We provide personalized recommendations based on playing style, skill level, and specific needs.',
  },
  {
    step: '4',
    title: '10% Off Purchase',
    desc: 'Get 10% off the frame when you purchase with us on demo day.',
  },
]

const WHY_IT_WORKS = [
  {
    icon: '🎾',
    title: 'Run by Players',
    desc: "We're not just sellers - we're passionate players who understand the game and your needs.",
  },
  {
    icon: '⭐',
    title: 'All Major Brands',
    desc: 'Babolat, HEAD, Yonex, Wilson, Bullpadel, Adidas and more - we stock them all.',
  },
  {
    icon: '🎯',
    title: 'Custom Advice',
    desc: 'Personalized recommendations based on your playing style, level, and specific requirements.',
  },
  {
    icon: '💯',
    title: 'No Cost to Clubs',
    desc: 'Completely free service - we handle everything from setup to advice.',
  },
]

const SPORTS = [
  {
    icon: '🎾',
    title: 'Tennis',
    desc: 'Latest rackets from Babolat, HEAD, Wilson, Yonex and more.',
  },
  {
    icon: '🏸',
    title: 'Badminton',
    desc: 'Premium rackets from Yonex, Victor, Li-Ning and more.',
  },
  {
    icon: '🎾',
    title: 'Padel',
    desc: 'Top padel rackets from Bullpadel, HEAD, Babolat, Adidas and more.',
  },
]

const MEMBER_BENEFITS = [
  'Try before buying - No more guessing which racket is right',
  'Expert guidance - Get advice from experienced players',
  'Compare models - Test multiple rackets side by side',
  'Special member pricing - Exclusive discounts on demo day purchases',
  'Convenient - No need to travel to a store',
  'No pressure - Try at your own pace during your regular club session',
]

export default function ClubDemoProgrammePage() {
  return (
    <div className='bg-white'>
      <div className='relative bg-[#0A1F44] text-white overflow-hidden'>
        <img
          src='/local-store/club-demo-hero.jpg'
          alt='Club demo racket programme'
          className='absolute inset-0 w-full h-full object-cover opacity-30'
        />
        <div className='relative max-w-5xl mx-auto px-4 py-14 text-center'>
          <span className='inline-block bg-[#E8553A] text-white text-xs font-montserrat font-bold px-3 py-1 rounded-full mb-4'>
            100% FREE for clubs
          </span>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mb-3'>
            Club Demo Racket Programme
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Try before you buy — free racket demos at your club
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Intro */}
        <div className='max-w-3xl mx-auto text-center mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-4'>
            Try the Latest Rackets at Your Club
          </h2>
          <p className='text-sm text-gray-500 font-lato leading-relaxed mb-3'>
            We bring our extensive range of rackets directly to your club
            nights, giving your members the chance to try the latest models from
            top brands before making a purchase. As a specialist store run by
            players, we understand what you need and provide expert advice
            tailored to your game.
          </p>
          <p className='text-xs text-gray-400 font-lato italic mb-6'>
            Available for Tennis, Badminton &amp; Padel clubs
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Book Your Demo Day
          </Link>
        </div>

        {/* How It Works */}
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

        {/* Why Our Demo Programme Works */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Why Our Demo Programme Works
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {WHY_IT_WORKS.map((w) => (
              <div
                key={w.title}
                className='bg-white rounded-2xl border border-gray-100 p-6 text-center'
              >
                <span className='text-2xl'>{w.icon}</span>
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mt-2 mb-1.5'>
                  {w.title}
                </h3>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sports We Cover */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Sports We Cover
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {SPORTS.map((s) => (
              <div
                key={s.title}
                className='bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100 text-center'
              >
                <span className='text-3xl'>{s.icon}</span>
                <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                  {s.title}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits for Your Members */}
        <div className='mb-14 max-w-2xl mx-auto'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Benefits for Your Members
          </h2>
          <ul className='space-y-2'>
            {MEMBER_BENEFITS.map((b) => (
              <li
                key={b}
                className='text-sm text-gray-600 font-lato leading-relaxed flex gap-2'
              >
                <span className='text-[#E8553A] font-bold'>✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Book a Demo Day */}
        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Book a Demo Day for Your Club
          </h2>
          <p className='text-white/70 font-lato mb-5 max-w-lg mx-auto'>
            Ready to give your members the chance to try the latest rackets? Get
            in touch to schedule a demo day at your club — completely free of
            charge.
          </p>
          <div className='text-left max-w-sm mx-auto text-white/80 font-lato text-sm mb-6'>
            <p className='font-montserrat font-bold text-white mb-2'>
              What we need from you:
            </p>
            <ul className='space-y-1'>
              <li>• Your club name and location</li>
              <li>• Preferred date and time for the demo</li>
              <li>• Sport (Tennis, Badminton, or Padel)</li>
              <li>• Approximate number of members expected</li>
            </ul>
          </div>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Book Your Demo Day
          </Link>
          <p className='text-white/60 font-lato text-xs mt-4'>
            Or email us at{' '}
            <a href='mailto:partnership@smashuk.co' className='font-semibold'>
              partnership@smashuk.co
            </a>
          </p>
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
