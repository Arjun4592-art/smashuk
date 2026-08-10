import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import DemoBrandAccordion from '@/components/website/DemoBrandAccordion'
import LuxuryHero from '@/components/website/local-store/LuxuryHero'
import Accordion from '@/components/website/local-store/Accordion'

export const metadata = {
  title: `Racket Demo Service — Try Before You Buy | ${SITE_NAME}`,
  description:
    'Test premium rackets before you buy! Demo the latest badminton, tennis, and padel rackets from top brands. £10 per racket with refundable deposit. Book your demo session today.',
  keywords:
    'racket demo service, try before you buy racket, badminton racket trial, tennis racket demo, padel racket demo, racket demo manchester, test a racket before buying',
}

const SPORTS = [
  {
    icon: '🏸',
    title: 'Badminton',
    desc: 'Test the latest badminton rackets from Yonex, Victor, Li-Ning, and more.',
    brands: [
      {
        brand: 'Victor',
        items: [
          'Victor Thruster Ryuga Metallic',
          'Victor Thruster Ryuga II Pro B',
          'Victor Auraspeed 90K Metallic R',
          'Victor Auraspeed HS Plus B',
          'Victor Drive X 10 Metallic',
          'Victor Thruster F Ultra (New)',
          'Victor Auraspeed Fantome (New)',
        ],
      },
      {
        brand: 'Yonex',
        items: [
          'Yonex ArcSaber 11 Pro 3U',
          'Yonex ArcSaber 11 Pro 4U',
          'Yonex Astrox 100 ZZ KRNI 4U',
          'Yonex Astrox 88D Pro (3rd Gen) 4U',
          'Yonex Astrox 88SPro (3rd Gen) 4U',
          'Yonex Nanoflare 700 Pro 4U',
          'Yonex Nanoflare 1000Z 4U',
          'Yonex Nanoflare 800 Pro 3U',
          'Yonex Nanoflare 800 Pro 4U',
        ],
      },
      {
        brand: 'Li-Ning',
        items: ['Li-Ning BladeX 900 Moon 4U', 'Li-Ning BladeX 900 Sun 4U'],
      },
    ],
  },
  {
    icon: '🎾',
    title: 'Tennis',
    desc: 'Experience premium tennis rackets from Babolat, Head, Yonex, and more.',
    brands: [
      {
        brand: 'Babolat',
        items: [
          'Pure Drive Gen 11',
          'Pure Drive Team Gen 11',
          'Pure Aero',
          'Pure Aero Team',
          'Pure Strike 100 2024',
          'Pure Strike Team 2024',
          'Evo Drive Gen 11',
          'Evo Drive Lite Gen 11',
          'Evo Drive Tour Gen 11',
          'Evo Aero',
        ],
      },
      {
        brand: 'Yonex',
        items: ['V-Core 98', 'V-Core 100', 'E-Zone 100'],
      },
      {
        brand: 'Head',
        items: ['Radical MP'],
      },
    ],
  },
  {
    icon: '🥎',
    title: 'Padel',
    desc: 'Discover your ideal padel racket from beginner to advanced performance frames.',
    brands: [],
    comingSoon: true,
  },
]

const WHY_DEMO = [
  {
    icon: '✓',
    title: 'Make an Informed Decision',
    desc: 'Feel the difference in weight, balance, and performance in real playing conditions before committing to a purchase.',
  },
  {
    icon: '⚖️',
    title: 'Compare Multiple Options',
    desc: 'Test up to 2 rackets side-by-side to directly compare performance and find your perfect match.',
  },
  {
    icon: '💷',
    title: 'Risk-Free Testing',
    desc: 'Fully refundable deposit with only a £10 demo fee per racket. Try with confidence.',
  },
  {
    icon: '🎯',
    title: 'Expert Support',
    desc: 'Get personalized recommendations based on your skill level, playing style, and specific needs.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: '£10 Demo Fee',
    desc: 'Per racket, maximum 2 rackets at a time.',
  },
  {
    step: '02',
    title: 'Refundable Deposit',
    desc: "Equal to the racket's full retail price, held securely on card.",
  },
  {
    step: '03',
    title: 'Full Demo Period',
    desc: 'Test the racket on court in real playing conditions.',
  },
  {
    step: '04',
    title: 'Expert Guidance',
    desc: 'Personalised recommendations based on your game and skill level.',
  },
]

const FAQS = [
  {
    q: 'How long can I demo a racket?',
    a: 'Demo periods are typically arranged at the time of booking to suit your schedule. Contact us to discuss the timeframe that works best for you.',
  },
  {
    q: 'What if I decide to purchase the racket?',
    a: "Excellent! Your deposit will be applied toward the purchase price, and you'll only pay the remaining balance plus the £10 demo fee.",
  },
  {
    q: 'How many rackets can I demo at once?',
    a: 'You can demo up to 2 rackets at a time, which allows you to compare different models side-by-side and make the best decision.',
  },
  {
    q: 'What happens to my deposit?',
    a: "Your deposit (equal to the racket's full retail price) is held securely via card payment and is fully refunded when you return the racket in good condition.",
  },
  {
    q: "Can I demo rackets if I'm a beginner?",
    a: "Absolutely! Our demo service is perfect for players of all levels. We'll help you find a racket that suits your current skill level and supports your development.",
  },
]

export default function RacketDemoServicePage() {
  return (
    <div className='bg-white'>
      <LuxuryHero
        title='Try Before You Buy: Racket Demo Service'
        subtitle='Not sure which racket is right for you? Test the latest rackets from top brands across badminton, tennis, and padel before making your investment.'
        image='/local-store/racket-demo-hero.jpg'
        imageAlt='Racket demo service'
        breadcrumbs={[
          { label: 'Local Store', href: '/local-store' },
          { label: 'Racket Demo' },
        ]}
      />

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* How the demo service works */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            How Our Demo Service Works
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
          <p className='text-center text-sm text-gray-500 font-lato mt-6'>
            📍 Demos are only available for in-store collection in Manchester
          </p>
        </div>

        {/* Choose your sport + available rackets */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Choose Your Sport
          </h2>
          <p className='text-center text-sm text-gray-500 font-lato mb-8'>
            Select your sport below to view available demo rackets and book your
            session
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {SPORTS.map((s) => (
              <div
                key={s.title}
                className='ls-card reveal bg-white rounded-2xl border border-gray-100 p-6'
              >
                <div className='text-center mb-4'>
                  <span className='text-3xl'>{s.icon}</span>
                  <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mt-3 mb-1.5'>
                    {s.title}
                  </h3>
                  <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                    {s.desc}
                  </p>
                </div>

                {s.comingSoon ? (
                  <p className='text-xs text-gray-400 font-lato text-center italic'>
                    Coming soon — contact us for availability
                  </p>
                ) : (
                  <DemoBrandAccordion brands={s.brands} />
                )}
              </div>
            ))}
          </div>
          <p className='text-center text-sm text-gray-500 font-lato mt-8'>
            📞 Need help? Give us a call or drop us an email at{' '}
            <a
              href='mailto:sales@smashuk.co'
              className='text-[#E8553A] font-semibold'
            >
              sales@smashuk.co
            </a>
          </p>
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

        {/* Why demo a racket */}
        <div className='mb-14 reveal'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Why Demo a Racket?
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {WHY_DEMO.map((w) => (
              <div
                key={w.title}
                className='ls-card reveal bg-[#F8F9FB] rounded-2xl p-6 border border-gray-100 text-center'
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

        {/* FAQ — split into a left intro column + right accordion column */}
        <div className='mb-14 reveal'>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <span className='ls-eyebrow text-[#E8553A] text-xs font-montserrat font-bold uppercase mb-2 inline-flex'>
                FAQs
              </span>
              <h2 className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                Frequently Asked Questions
              </h2>
            </div>
            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='divide-y divide-gray-100 border-t border-b border-gray-100'
              rowClassName='py-4'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44]'
              contentClassName='text-sm text-gray-500 font-lato leading-relaxed pt-2'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </div>

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center mb-14'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Ready to Find Your Perfect Racket?
          </h2>
          <p className='text-white/70 font-lato mb-5'>
            Book your demo session today and experience the difference before
            you buy. Our experts are here to help you make the right choice.
          </p>
          <Link
            href='/contact'
            className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
          >
            Book Your Demo Session Now
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
