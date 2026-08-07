import Link from 'next/link'
import { SITE_NAME } from '@/lib/constants'
import { getPublicStoreContact } from '@/lib/store-contact'
import StringingEnquiryForm from '@/components/website/StringingEnquiryForm'
import {
  SQUASH_TENSIONS as TENSIONS,
  SQUASH_STRINGS as STRINGS,
  SQUASH_BRANDS as BRANDS,
} from '@/lib/stringing-options'

export const metadata = {
  title: `Squash Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description:
    'Professional squash racket stringing from £15. Tension advice for beginner to advanced players, popular string types in stock, 24-hour or 40-minute express turnaround.',
  keywords:
    'squash stringing service, squash racket restring, squash string tension guide, squash restring manchester, squash string types',
}

const NEEDS_RESTRING = [
  'Your shots are lacking in power',
  'Your spin and slices aren\u2019t as sharp as they used to be',
  'The string sounds dull and dead off the racket',
  'You have a broken string',
]

const PROCESS = [
  {
    step: '1',
    title: 'Frame Check',
    desc: 'We inspect the frame thoroughly for cracks or damage first — we won\u2019t restring a racket with a compromised frame.',
  },
  {
    step: '2',
    title: 'Grommet Check',
    desc: 'Worn or damaged grommets shorten a new string\u2019s life, so we replace any that need it — especially near where the old string broke.',
  },
  {
    step: '3',
    title: 'String Advice',
    desc: 'Durability, power or control — we\u2019ll talk through what you\u2019re after and recommend a string to match.',
  },
  {
    step: '4',
    title: 'Tension Advice',
    desc: 'Based on your level and how you play, we\u2019ll recommend the tension that gets the best out of your racket.',
  },
  {
    step: '5',
    title: 'We\u2019ll Let You Know',
    desc: 'Once it\u2019s done we\u2019ll message or email you so you can come and collect your freshly strung racket.',
  },
]

const FAQS = [
  {
    q: 'What tension should I choose for squash?',
    a: "Tell us your level and playing style and we'll recommend a starting tension — squash strings tend to move/relax with play, so slight adjustments over time are normal.",
  },
  {
    q: 'How do I know what string and tension I require?',
    a: 'Our experienced staff will gladly help you choose the right string and tension to bring out the best in your game — just ask us in-store, or check our squash string guide below for more detail.',
  },
  {
    q: 'How often do squash strings need replacing?',
    a: 'Squash strings can lose tension faster than other racket sports due to the intensity of the game — most regular players restring every few months.',
  },
  {
    q: 'Can I bring my own string?',
    a: "Yes — bring your own string and we'll charge a £15 labour fee for stringing it.",
  },
  {
    q: 'Is there a charge for same-day service?',
    a: 'Standard 24h turnaround is included in the price. Same-day service carries a small £4 surcharge, or book our on-the-spot slot for no extra charge.',
  },
  {
    q: "I'm coming from far — can I get it strung on the spot?",
    a: 'It depends how busy we are. The safest option is to pre-book via the contact form or email so we can guarantee a slot for you.',
  },
]

export default async function SquashStringingPage() {
  const contact = await getPublicStoreContact()
  const primaryAddress = [
    contact.address.line1,
    contact.address.line2,
    contact.address.city,
    contact.address.pincode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className='bg-white'>
      <div className='relative bg-[#0A1F44] text-white overflow-hidden'>
        {/* TODO: replace with a photo of a squash racket being strung */}
        <img
          src='/local-store/stringing-squash-hero.jpg'
          alt='Squash racket stringing'
          className='absolute inset-0 w-full h-full object-cover opacity-30'
        />
        <div className='relative max-w-5xl mx-auto px-4 py-14 text-center'>
          <span className='text-4xl'>🥎</span>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl mt-3 mb-3'>
            Squash Racket Stringing
          </h1>
          <p className='text-white/70 font-lato max-w-xl mx-auto'>
            Precision stringing for squash rackets, with attention to detail for
            players of every level.
          </p>
          <p className='text-[#FFC453] font-montserrat font-black text-2xl mt-4'>
            From £15
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 py-14'>
        {/* Professional service intro */}
        <div className='mb-14 text-center max-w-2xl mx-auto'>
          <span className='inline-block text-xs font-montserrat font-bold text-[#E8553A] bg-[#FFF3E9] rounded-full px-3 py-1 mb-4'>
            24h Turnaround!
          </span>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-3'>
            Professional Squash Stringing
          </h2>
          <p className='text-gray-500 font-lato leading-relaxed'>
            Our team of stringers have a wealth of experience stringing squash
            rackets and are ERSA qualified. With three fully-automatic premium
            machines running, we can offer a 24h turnaround — and even 1-hour
            depending on availability.
          </p>
        </div>

        {/* Enquiry form */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Enquiry Form
          </h2>
          <StringingEnquiryForm sport='Squash' />
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

        {/* Do I need a restring */}
        <div className='mb-14 bg-[#0A1F44] rounded-2xl p-8 md:p-10'>
          <h2 className='font-montserrat font-black text-xl text-white text-center mb-6'>
            Do I Need A Restring?
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto'>
            {NEEDS_RESTRING.map((n) => (
              <div key={n} className='flex items-start gap-2.5'>
                <span className='text-[#FFC453] font-montserrat font-black mt-0.5'>
                  ✓
                </span>
                <p className='text-white/80 font-lato text-sm leading-relaxed'>
                  {n}
                </p>
              </div>
            ))}
          </div>
          <p className='text-white/50 font-lato text-xs text-center mt-6'>
            If any of these sound familiar, it&rsquo;s probably time for a fresh
            string job.
          </p>
        </div>

        {/* Strings we stock */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Popular Squash Strings We Stock
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {STRINGS.map((s) => (
              <div
                key={s.name}
                className='bg-white rounded-2xl border border-gray-100 p-6'
              >
                <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mb-1.5'>
                  {s.name}
                </h3>
                <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
          <div className='mt-6 flex flex-wrap gap-2 justify-center'>
            {BRANDS.map((b) => (
              <span
                key={b}
                className='text-xs font-montserrat font-semibold text-[#0A1F44] bg-[#F8F9FB] border border-gray-100 rounded-full px-3 py-1.5'
              >
                {b}
              </span>
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
              With three fully-automatic stringing machines running, our
              standard turnaround is 24 hours — and a 1-hour restring may be
              possible depending on availability, so it's worth calling ahead if
              you need it fast.
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

        {/* Process */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            What Happens To Your Racket
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

        <div className='max-w-2xl mx-auto text-center mb-14'>
          <Link
            href='/local-store/stringing#book'
            className='inline-flex items-center gap-2 bg-[#FFC453] hover:bg-[#F5B93F] text-[#0A1F44] font-montserrat font-black px-8 py-3.5 rounded-full text-sm transition-colors'
          >
            BOOK NOW »
          </Link>
        </div>

        {/* Find us */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-8'>
            Find Us
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto'>
            <div className='bg-[#F8F9FB] rounded-2xl border border-gray-100 p-6'>
              <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mb-2'>
                {contact.name}
              </h3>
              <p className='text-sm text-gray-500 font-lato leading-relaxed mb-1'>
                {primaryAddress}
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed mb-1'>
                {contact.phone}
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                Mon–Sat, 11am–7pm
              </p>
            </div>
            {/* NOTE: sourced from the reference site's second location —
                confirm/replace with your actual second store's real
                address and phone before going live. Not wired to Medusa
                since store-contact.ts currently only supports one store. */}
            <div className='bg-[#F8F9FB] rounded-2xl border border-dashed border-gray-300 p-6'>
              <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mb-2'>
                Second Location{' '}
                <span className='text-gray-400 font-normal'>
                  (verify before launch)
                </span>
              </h3>
              <p className='text-sm text-gray-500 font-lato leading-relaxed mb-1'>
                100 Derby Lane, Liverpool, L13 3DW
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed mb-1'>
                Add phone number here
              </p>
              <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                Mon–Sat, 11am–7pm
              </p>
            </div>
          </div>
        </div>

        {/* Guides */}
        <div className='mb-14'>
          <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-2'>
            Helpful Squash Guides
          </h2>
          <p className='text-gray-500 font-lato text-center mb-8 max-w-xl mx-auto'>
            Want to read more about string types and tension for squash? Check
            out our guides.
          </p>
          <Link
            href='/blog/squash-string-tension-guide'
            className='block max-w-sm mx-auto bg-[#F8F9FB] rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors'
          >
            <div className='aspect-[16/9] bg-gray-100'>
              <img
                src='https://images.unsplash.com/photo-1613918431703-aa50889a3c19?w=1200&q=80'
                alt='Squash String & Tension: A Practical Guide'
                className='w-full h-full object-cover'
              />
            </div>
            <div className='p-5'>
              <p className='text-xs text-gray-400 font-lato mb-1'>By Kal</p>
              <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] leading-snug'>
                Squash String &amp; Tension: A Practical Guide
              </h3>
            </div>
          </Link>
        </div>

        {/* About this store */}
        <div className='mb-14 max-w-2xl mx-auto'>
          <h2 className='font-montserrat font-black text-xl text-[#0A1F44] text-center mb-4'>
            Manchester Squash Stringing Service
          </h2>
          <div className='space-y-3 text-sm text-gray-500 font-lato leading-relaxed'>
            <p>
              Our local squash store is set up to give players everything they
              need to play their best game, backed by top-quality products and a
              professional restringing service for every level.
            </p>
            <p>
              Our experienced team keeps your racket in top condition using
              trusted string brands, strung exactly to your specification — so
              you can play with confidence.
            </p>
            <p>
              Beyond stringing, we stock a full range of squash gear — racquets,
              balls, shoes, bags and more — and our team is always happy to
              advise on any part of your game.
            </p>
          </div>
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
            Squash Stringing FAQs
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
