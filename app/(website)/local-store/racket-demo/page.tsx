import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import DemoBrandAccordion from '@/components/website/DemoBrandAccordion'
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
      { brand: 'Yonex', items: ['V-Core 98', 'V-Core 100', 'E-Zone 100'] },
      { brand: 'Head', items: ['Radical MP'] },
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

const HOW_IT_WORKS = [
  {
    n: '01',
    title: '£10 Demo Fee',
    body: 'Per racket, maximum 2 rackets at a time.',
  },
  {
    n: '02',
    title: 'Refundable Deposit',
    body: "Equal to the racket's full retail price, held securely on card.",
  },
  {
    n: '03',
    title: 'Full Demo Period',
    body: 'Test the racket on court in real playing conditions.',
  },
  {
    n: '04',
    title: 'Expert Guidance',
    body: 'Personalised recommendations based on your game and skill level.',
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

export default function RacketDemoServicePage() {
  return (
    <div className='bg-[#F5F3EF] min-h-screen'>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Racket Demo
          </p>
          <Eyebrow>Try Before You Buy</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Racket Demo <span className='text-[#E8553A]'>Service</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl mb-2'>
            Not sure which racket is right for you? Test the latest rackets from
            top brands across badminton, tennis, and padel before making your
            investment.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>How It Works</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Our Demo Service, Step By Step
        </h2>

        <div className='hidden md:flex gap-0 relative mb-4'>
          <div className='absolute top-9 left-9 right-9 h-[2px] bg-gradient-to-r from-[#E8553A]/20 via-[#E8553A]/60 to-[#E8553A]/20' />
          {HOW_IT_WORKS.map((p) => (
            <div key={p.n} className='flex-1 flex flex-col items-center px-3'>
              <div className='relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center mb-5'>
                <span className='font-montserrat font-black text-[#E8553A] text-lg'>
                  {p.n}
                </span>
              </div>
              <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm text-center mb-2'>
                {p.title}
              </h3>
              <p className='text-gray-400 text-xs text-center leading-relaxed'>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <div className='md:hidden space-y-0 relative mb-6'>
          <div className='absolute left-[23px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#E8553A]/60 to-[#E8553A]/10' />
          {HOW_IT_WORKS.map((p) => (
            <div key={p.n} className='flex gap-6 py-5'>
              <div className='relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full border-2 border-[#E8553A] bg-[#F5F3EF] flex items-center justify-center'>
                <span className='font-montserrat font-black text-[#E8553A] text-sm'>
                  {p.n}
                </span>
              </div>
              <div className='pt-2'>
                <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm mb-1'>
                  {p.title}
                </h3>
                <p className='text-gray-400 text-xs leading-relaxed'>
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className='text-center text-sm text-gray-400'>
          📍 Demos are only available for in-store collection in Manchester
        </p>
      </section>

      {/* ── CHOOSE YOUR SPORT ────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <Eyebrow>Choose Your Sport</Eyebrow>
          <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-2'>
            Available Demo Rackets
          </h2>
          <p className='text-gray-400 text-sm mb-10 max-w-md'>
            Select your sport below to view available demo rackets and book your
            session.
          </p>
          <div className='grid md:grid-cols-3 gap-6'>
            {SPORTS.map((s) => (
              <div
                key={s.title}
                className='bg-[#F5F3EF] rounded-2xl border border-[#0A1F44]/8 p-6'
              >
                <div className='text-center mb-4'>
                  <span className='text-3xl'>{s.icon}</span>
                  <h3 className='font-montserrat font-black text-[#0A1F44] text-lg mt-3 mb-1.5'>
                    {s.title}
                  </h3>
                  <p className='text-gray-400 text-sm leading-relaxed'>
                    {s.desc}
                  </p>
                </div>
                {s.comingSoon ? (
                  <p className='text-xs text-gray-400 text-center italic'>
                    Coming soon — contact us for availability
                  </p>
                ) : (
                  <DemoBrandAccordion brands={s.brands} />
                )}
              </div>
            ))}
          </div>
          <p className='text-center text-sm text-gray-400 mt-8'>
            📞 Need help? Give us a call or drop us an email at{' '}
            <a
              href='mailto:sales@smashuk.co'
              className='text-[#E8553A] font-semibold'
            >
              sales@smashuk.co
            </a>
          </p>
        </div>
      </section>

      {/* ── PRICE CALLOUT ────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-8 text-center'>
          <p className='font-montserrat font-black text-3xl text-white'>
            £10 per racket
          </p>
          <p className='text-white/60 text-sm mt-2 max-w-lg mx-auto leading-relaxed'>
            Plus a fully refundable deposit — equal to the racket&rsquo;s retail
            price — held on your card and returned when you bring the racket
            back in good condition.
          </p>
        </div>
      </section>

      {/* ── WHY DEMO ─────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 pb-16'>
        <Eyebrow>Why Demo</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Why Demo a Racket?
        </h2>
        <div className='grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-[#0A1F44]/6 border border-[#0A1F44]/6 rounded-2xl overflow-hidden'>
          {WHY_DEMO.map((w) => (
            <div
              key={w.title}
              className='bg-white p-6 hover:bg-[#F5F3EF] transition-colors text-center'
            >
              <span className='text-2xl block mb-3'>{w.icon}</span>
              <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm mb-2'>
                {w.title}
              </h3>
              <p className='text-gray-400 text-xs leading-relaxed'>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className='reveal bg-white border-y border-[#0A1F44]/8'>
        <div className='max-w-5xl mx-auto px-4 md:px-6 py-16'>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <Eyebrow>FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl'>
                Frequently Asked Questions
              </h2>
            </div>
            <Accordion
              defaultOpenId={FAQS[0]?.q}
              containerClassName='divide-y divide-[#0A1F44]/8 border-t border-b border-[#0A1F44]/8'
              rowClassName='py-4'
              triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44]'
              contentClassName='text-sm text-gray-400 leading-relaxed pt-2'
              items={FAQS.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
            />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-10 text-white text-center'>
          <h2 className='font-montserrat font-black text-2xl mb-2'>
            Ready to Find Your Perfect Racket?
          </h2>
          <p className='text-white/70 text-sm mb-6 max-w-lg mx-auto leading-relaxed'>
            Book your demo session today and experience the difference before
            you buy. Our experts are here to help you make the right choice.
          </p>
          <Link
            href='/contact'
            className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'
          >
            Book Your Demo Session Now
          </Link>
        </div>
      </section>

      {/* ── FOOTER NOTE ──────────────────────────────────────────────── */}
      <section className='reveal max-w-2xl mx-auto px-4 md:px-6 pb-16 text-center'>
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
