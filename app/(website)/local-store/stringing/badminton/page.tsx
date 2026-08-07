import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import {
  BADMINTON_TENSIONS as TENSIONS,
  BADMINTON_STRING_BRANDS as STRING_BRANDS,
} from '@/lib/stringing-options'

export const metadata = {
  title: `Badminton Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description:
    'Professional badminton racket stringing from £15. Tension advice for beginner to advanced players, popular string types in stock, 24-hour or 40-minute express turnaround.',
  keywords:
    'badminton stringing service, badminton racket restring, badminton string tension guide, badminton restring manchester, badminton string types',
}

const PROCESS = [
  {
    step: '1',
    title: 'Inspection',
    desc: 'Upon collection of your badminton racket, we conduct an initial inspection to check the overall condition of the racket.',
  },
  {
    step: '2',
    title: 'Consultation',
    desc: 'We talk through your playing style, frequency of play, string preferences, and any past issues or preferences.',
  },
  {
    step: '3',
    title: 'Stringing',
    desc: 'Armed with your preferences and the insights from our consultation, we begin the meticulous process of stringing your racket.',
  },
  {
    step: '4',
    title: 'Quality Check',
    desc: 'We verify the string tension, check the string pattern for irregularities, and inspect the frame for any damage from the process.',
  },
  {
    step: '5',
    title: 'Return & Follow-Up',
    desc: 'We hand the racket back and explain the work done, with tips on maintaining tension. A few days later, we follow up to make sure you\u2019re happy with it.',
  },
]

const FAQS = [
  {
    q: 'What tension should I ask for?',
    a: "If you're not sure, tell us your level and how hard you hit and we'll recommend a starting point — you can always adjust next time based on how it feels.",
  },
  {
    q: 'How often should I restring?',
    a: 'A common rule of thumb is to restring as many times a year as you play per week — more if you play often or break strings regularly.',
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll only charge the labour cost for stringing it.",
  },
]

export default function BadmintonStringingPage() {
  return (
    <div className='bg-white'>
      <div className='relative bg-[#0A1F44] text-white overflow-hidden'>
        {/* TODO: replace with a photo of a badminton racket being strung */}
        <img
          src='/local-store/stringing-badminton-hero.jpg'
          alt='Badminton racket stringing'
          className='absolute inset-0 w-full h-full object-cover opacity-30'
        />
        <div className='relative max-w-5xl mx-auto px-4 py-14 text-center'>
          <span className='inline-block text-xs font-montserrat font-bold text-[#FFC453] bg-white/10 rounded-full px-3 py-1 mb-4'>
            4000+ Happy Customers
          </span>
          <span className='text-4xl'>🏸</span>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mt-3 mb-3'>
            Badminton Racket Stringing
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Precision stringing for badminton rackets, from social players to
            competitive club level.
          </p>
          <p className='text-[#FFC453] font-montserrat font-black text-2xl mt-4'>
            From £15
          </p>
          <Link
            href='/local-store'
            className='inline-block mt-5 bg-white text-[#0A1F44] font-montserrat font-bold px-6 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors'
          >
            Visit Now
          </Link>
          <div className='flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-8 text-sm font-montserrat font-semibold text-white/80'>
            <span>24h Turnaround</span>
            <span className='w-1 h-1 rounded-full bg-white/30 hidden sm:block' />
            <span>15+ Years Experience</span>
            <span className='w-1 h-1 rounded-full bg-white/30 hidden sm:block' />
            <span>Over 40+ String Options</span>
          </div>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Trust stats */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Your No.1 Stringing Service in Manchester
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Run by players, we help you choose the best strings for your game.
          </p>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
            <div>
              <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                20+ Years
              </p>
              <p className='text-xs text-gray-500 font-lato mt-1'>
                Stringing Experience
              </p>
            </div>
            <div>
              <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                20,000+
              </p>
              <p className='text-xs text-gray-500 font-lato mt-1'>
                Rackets Strung
              </p>
            </div>
            <div>
              <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                UKRSA
              </p>
              <p className='text-xs text-gray-500 font-lato mt-1'>
                Certified Professionals
              </p>
            </div>
            <div>
              <p className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                24h Service
              </p>
              <p className='text-xs text-gray-500 font-lato mt-1'>
                Quick Turnaround
              </p>
            </div>
          </div>
        </div>

        {/* Tension guide */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Tension Guide
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Not sure what to ask for? Here&rsquo;s a rough starting point by
            playing level — our stringers will talk you through it in-store.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {TENSIONS.map((t) => (
              <div
                key={t.level}
                className='bg-[#F8F9FB] rounded-2xl border border-gray-100 p-6'
              >
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                  {t.level}
                </h3>
                <p className='text-[#E8553A] font-montserrat font-black text-lg mb-2'>
                  {t.range}
                </p>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* The standard process */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            The Standard
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
            {PROCESS.map((p) => (
              <div key={p.step} className='text-center'>
                <div className='w-10 h-10 rounded-full bg-[#E8553A] text-white font-montserrat font-black flex items-center justify-center mx-auto mb-3'>
                  {p.step}
                </div>
                <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                  {p.title}
                </h3>
                <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Strings we stock */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            What Strings Do We Carry?
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Prices start from £15 and go up to £20 — all inclusive.
          </p>
          <div className='max-w-2xl mx-auto divide-y divide-gray-100 border-t border-b border-gray-100'>
            {STRING_BRANDS.map((b, i) => (
              <details key={b.brand} className='group py-4' open={i === 0}>
                <summary className='font-montserrat font-bold text-base text-[#0A1F44] cursor-pointer list-none flex items-center justify-between gap-4'>
                  {b.brand}
                  <span className='text-[#E8553A] group-open:rotate-180 transition-transform text-sm leading-none'>
                    ▲
                  </span>
                </summary>
                <ol className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5'>
                  {(b.items ?? []).map((item, idx) => (
                    <li key={item} className='text-sm text-gray-600 font-lato'>
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </div>

        {/* How long does it take */}
        <div className='mb-14 rounded-2xl bg-[#F8F9FB] border border-gray-100 p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
          <div>
            <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-3'>
              How Long Does It Take?
            </h2>
            <p className='text-gray-500 font-lato leading-relaxed'>
              Four fully-automatic stringing machines let us run one of the
              fastest turnarounds in the region — standard 24-hour service, or
              same-day if you get in touch at least 24 hours ahead to secure a
              slot.
            </p>
          </div>
          <div className='text-center'>
            <span className='font-montserrat font-black text-[#0A1F44] text-7xl md:text-8xl leading-none'>
              24h
            </span>
            <p className='text-gray-400 font-lato text-sm mt-2'>
              standard turnaround
            </p>
          </div>
        </div>

        {/* 40-minute service steps */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            40-Minute Stringing Service
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='bg-white rounded-2xl border border-gray-100 p-6'>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] mb-2'>
                01. BOOKING
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed mb-3'>
                Book your slot online, ideally a day or two ahead.
              </p>
              <Link
                href='/local-store/stringing#book'
                className='text-sm font-montserrat font-bold text-[#0A1F44] underline underline-offset-2'
              >
                Booking Link
              </Link>
            </div>
            <div className='bg-white rounded-2xl border border-gray-100 p-6'>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] mb-2'>
                02. DROP-OFF
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                Drop your racket off at the booked time — grab a coffee or
                browse while you wait.
              </p>
            </div>
            <div className='bg-white rounded-2xl border border-gray-100 p-6'>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] mb-2'>
                03. COLLECT
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                Collect your freshly strung racket and get back on court.
              </p>
            </div>
          </div>
          <div className='text-center mt-8'>
            <Link
              href='/local-store/stringing#book'
              className='inline-flex items-center gap-2 bg-[#FFC453] hover:bg-[#F5B93F] text-[#0A1F44] font-montserrat font-black px-8 py-3.5 rounded-full text-sm transition-colors'
            >
              BOOK NOW »
            </Link>
          </div>
        </div>

        {/* Guides */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Helpful Badminton Guides
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Want to read more about string types, tension and choosing the right
            racket setup? Check out our guides.
          </p>
          <Link
            href='/blog/how-to-choose-a-badminton-racket'
            className='block max-w-sm mx-auto bg-[#F8F9FB] rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors'
          >
            <div className='aspect-[16/9] bg-gray-100'>
              <img
                src='https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80'
                alt='How to Choose the Right Badminton Racket'
                className='w-full h-full object-cover'
              />
            </div>
            <div className='p-5'>
              <p className='text-xs text-gray-400 font-lato mb-1'>By Kal</p>
              <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] leading-snug'>
                How to Choose the Right Badminton Racket
              </h3>
            </div>
          </Link>
        </div>

        {/* Who we are */}
        <div className='mb-14 text-center max-w-2xl mx-auto'>
          <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
            Who We Are
          </h3>
          <p className='text-gray-500 font-lato text-sm leading-relaxed'>
            With a team coming from a diverse background, we&rsquo;re run by
            players who actively play at club to county level in badminton,
            tennis and squash. We love sharing what we know — feel free to give
            us a ring with any questions.
          </p>
        </div>

        {/* FAQ */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Badminton Stringing FAQs
          </h2>
          <div className='max-w-3xl mx-auto divide-y divide-gray-100 border-t border-b border-gray-100'>
            {FAQS.map((f) => (
              <details key={f.q} className='group py-4'>
                <summary className='font-montserrat font-semibold text-sm text-[#0A1F44] cursor-pointer list-none flex items-center justify-between gap-4'>
                  {f.q}
                  <span className='text-[#E8553A] group-open:rotate-45 transition-transform text-lg leading-none'>
                    +
                  </span>
                </summary>
                <p className='text-sm text-gray-500 font-lato leading-relaxed mt-2'>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        <div className='bg-[#0A1F44] rounded-2xl p-8 text-white text-center'>
          <h2 className='font-montserrat font-black text-xl mb-2'>
            Ready To Book?
          </h2>
          <p className='text-white/70 font-lato mb-5'>
            Head back to the main stringing page to book your slot or get in
            touch.
          </p>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Link
              href='/local-store/stringing'
              className='inline-block bg-white/10 hover:bg-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
            >
              ← Back to Stringing
            </Link>
            <Link
              href='/contact'
              className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
