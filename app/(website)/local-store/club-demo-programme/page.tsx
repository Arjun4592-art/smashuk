import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import Accordion from '@/components/website/local-store/Accordion';
import StringingTimeline from '@/components/website/StringingTimeline';
export const metadata = {
  title: `Club Demo Racket Programme | Free Try Before You Buy | ${SITE_NAME}`,
  description: 'Free racket demo programme for tennis, badminton and padel clubs. We bring the latest rackets to your club nights with expert advice. No cost to clubs. Book your demo day today.',
  keywords: 'club demo racket programme, free racket demo club, club night racket trial, tennis badminton padel club demo, racket demo manchester club'
};
const Icon = ({
  glyph,
  ...p
}: {
  glyph: React.ReactNode;
} & React.SVGProps<SVGSVGElement>) => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...p}>
    {glyph}
  </svg>;
const IconVan = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M3 17h13V6H3z' />
        <path d='M16 10h3.5l2.5 3v4h-6z' />
        <circle cx='7' cy='19' r='2' />
        <circle cx='18' cy='19' r='2' />
      </>} />;
const IconRacket = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='9' cy='9' r='6.5' />
        <path d='M13.5 13.5L21 21' />
      </>} />;
const IconChat = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />} />;
const IconTag = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.82 0l4.6-4.6a2 2 0 0 0 0-2.99z' />
        <circle cx='7.5' cy='7.5' r='1' />
      </>} />;
const IconUsers = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
        <path d='M16 3.13a4 4 0 0 1 0 7.75' />
      </>} />;
const IconStar = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />} />;
const IconShield = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<path d='M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5z' />} />;
const IconCalendar = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <rect x='3' y='4' width='18' height='18' rx='2' />
        <line x1='16' y1='2' x2='16' y2='6' />
        <line x1='8' y1='2' x2='8' y2='6' />
        <line x1='3' y1='10' x2='21' y2='10' />
      </>} />;
const IconCheck = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
        <polyline points='22 4 12 14.01 9 11.01' />
      </>} />;
const HOW_IT_WORKS = [{
  step: '01',
  title: 'We Show Up',
  desc: 'We arrive at your club night with a bag full of the latest rackets from all major brands, set up and ready before your session starts.',
  icon: IconVan
}, {
  step: '02',
  title: 'Players Try',
  desc: 'Your members test different rackets on court, side by side, in real conditions — not a five-second swing in a shop.',
  icon: IconRacket
}, {
  step: '03',
  title: 'Expert Advice',
  desc: 'We watch how each player moves and hits, then talk through recommendations based on style, level and grip preference.',
  icon: IconChat
}, {
  step: '04',
  title: '10% Off Purchase',
  desc: 'Found the one? Get 10% off the frame when you purchase with us on the day — no separate trip needed.',
  icon: IconTag
}];
const WHY_IT_WORKS = [{
  icon: IconRacket,
  title: 'Run by Players',
  desc: "We're not just sellers — we play at club to county level ourselves, so we know what actually matters on court."
}, {
  icon: IconStar,
  title: 'All Major Brands',
  desc: "Babolat, HEAD, Yonex, Wilson, Bullpadel, Adidas and more — one visit covers the full range, not one brand's line-up."
}, {
  icon: IconChat,
  title: 'Custom Advice',
  desc: 'Recommendations are based on your swing, level and goals — not on whatever we most want to sell that week.'
}, {
  icon: IconShield,
  title: 'No Cost to Clubs',
  desc: 'Completely free to run — we bring the stock, the setup and the staff. Your club just provides the court time.'
}];
const SPORTS = [{
  icon: '🎾',
  title: 'Tennis',
  desc: 'Latest rackets from Babolat, HEAD, Wilson, Yonex and more.',
  tags: ['Power frames', 'Control frames', 'Junior sizes']
}, {
  icon: '🏸',
  title: 'Badminton',
  desc: 'Premium rackets from Yonex, Victor, Li-Ning and more.',
  tags: ['Attack-weighted', 'Even-balance', 'Flexible shafts']
}, {
  icon: '🎾',
  title: 'Padel',
  desc: 'Top padel rackets from Bullpadel, HEAD, Babolat, Adidas and more.',
  tags: ['Round shape', 'Teardrop', 'Diamond']
}];
const MEMBER_BENEFITS = [{
  title: 'Try before buying',
  desc: 'No more guessing which racket is right — hit with it before you commit.'
}, {
  title: 'Expert guidance',
  desc: 'Get advice from people who play the sport, not just sell the gear.'
}, {
  title: 'Compare models side by side',
  desc: 'Test two or three rackets back to back in the same session.'
}, {
  title: 'Special member pricing',
  desc: 'Exclusive discounts on demo day purchases, on top of any club rate.'
}, {
  title: 'No travel required',
  desc: 'It happens at your regular club night — nothing to plan around.'
}, {
  title: 'No pressure',
  desc: "Try at your own pace; there's no obligation to buy on the day."
}];
const CLUB_BENEFITS = [{
  title: 'Zero cost or admin',
  desc: 'We handle stock, setup, staffing and takedown — your committee does nothing but confirm a date.'
}, {
  title: 'A genuine member perk',
  desc: 'Something tangible to offer members beyond court time — good for retention and renewals.'
}, {
  title: 'No selling pressure on you',
  desc: 'We run the demo and any sales conversations directly with players, not through the club.'
}, {
  title: 'Flexible around your schedule',
  desc: 'We fit around an existing club night or social — no separate event to organise.'
}];
const FAQS = [{
  q: 'Is there really no cost to the club?',
  a: 'Correct — we cover the rackets, staffing and setup ourselves. The only thing we ask for is court access during your normal session.'
}, {
  q: 'How much space or court time do you need?',
  a: "A demo typically runs alongside your existing club night, using a court or two on rotation — it doesn't need a dedicated slot."
}, {
  q: 'Is there a minimum number of members?',
  a: 'No strict minimum, though demo days work best with at least a handful of players so we can bring a range worth trying.'
}, {
  q: 'Do members have to buy anything?',
  a: "Not at all — it's a genuine try-before-you-buy session. The 10% discount only applies if someone chooses to purchase on the day."
}, {
  q: 'How far in advance should we book?',
  a: "A couple of weeks' notice helps us bring the right mix of rackets for your sport and typical member levels, but get in touch and we'll do our best to fit your date."
}];
function Eyebrow({
  children
}: {
  children: React.ReactNode;
}) {
  return <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>;
}
function GridTexture() {
  return <svg className='absolute inset-0 w-full h-full opacity-[0.06]' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'>
      {Array.from({
      length: 20
    }).map((_, i) => <line key={'v' + i} x1={`${i * 5.5}%`} y1='0' x2={`${i * 5.5 + 3}%`} y2='100%' stroke='white' strokeWidth='1' />)}
      {Array.from({
      length: 12
    }).map((_, i) => <line key={'h' + i} x1='0' y1={`${i * 9}%`} x2='100%' y2={`${i * 9 + 2}%`} stroke='white' strokeWidth='1' />)}
    </svg>;
}
export default function ClubDemoProgrammePage() {
  return <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Club Demo Programme
          </p>
          <Eyebrow>100% Free For Clubs</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Club Demo <span className='text-[#E8553A]'>Racket Programme</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl mb-8'>
            Try before you buy — free racket demos at your club.
          </p>

          <div className='flex flex-wrap gap-6 text-white/40 text-xs font-mono tracking-wide'>
            <span className='flex items-center gap-2'>
              <IconShield width={14} height={14} className='text-[#E8553A]' />{' '}
              Free to run — no cost to your club
            </span>
            <span className='flex items-center gap-2'>
              <IconStar width={14} height={14} className='text-[#E8553A]' /> All
              major tennis, badminton & padel brands
            </span>
            <span className='flex items-center gap-2'>
              <IconUsers width={14} height={14} className='text-[#E8553A]' /> No
              pressure, no obligation to buy
            </span>
          </div>
        </div>
      </section>

      <div className='max-w-5xl mx-auto px-4 md:px-6 py-16 space-y-20'>
        {}
        <section className='reveal max-w-3xl mx-auto text-center'>
          <Eyebrow>About the Programme</Eyebrow>
          <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-5'>
            Try the Latest Rackets at Your Club
          </h2>
          <p className='text-sm text-gray-400 leading-relaxed mb-3'>
            We bring our extensive range of rackets directly to your club
            nights, giving your members the chance to try the latest models from
            top brands before making a purchase. As a specialist store run by
            players, we understand what you need and provide expert advice
            tailored to your game.
          </p>
          <p className='text-xs text-gray-400 italic mb-8'>
            Available for Tennis, Badminton &amp; Padel clubs
          </p>
          <Link href='/contact' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'>
            Book Your Demo Day
          </Link>
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-12'>
            <Eyebrow>The Process</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl md:text-4xl text-[#0A1F44]'>
              How It Works
            </h2>
          </div>
          <StringingTimeline steps={HOW_IT_WORKS.map(h => ({
          ...h,
          icon: <h.icon />
        }))} />
        </section>

        {}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>Our Approach</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Why Our Demo Programme Works
            </h2>
          </div>
          <div className='grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-[#0A1F44]/6 border border-[#0A1F44]/6 rounded-2xl overflow-hidden'>
            {WHY_IT_WORKS.map(w => {
            const IconEl = w.icon;
            return <div key={w.title} className='bg-white p-6 hover:bg-[#F5F3EF] transition-colors'>
                  <span className='inline-flex w-10 h-10 rounded-full bg-[#F5F3EF] items-center justify-center text-[#E8553A] mb-4'>
                    <IconEl />
                  </span>
                  <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
                    {w.title}
                  </h3>
                  <p className='text-xs text-gray-400 leading-relaxed'>
                    {w.desc}
                  </p>
                </div>;
          })}
          </div>
        </section>

        {}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>What We Bring</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Sports We Cover
            </h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {SPORTS.map(s => <div key={s.title} className='bg-white rounded-2xl p-6 border border-[#0A1F44]/8'>
                <span className='text-3xl'>{s.icon}</span>
                <h3 className='font-montserrat font-black text-lg text-[#0A1F44] mt-3 mb-1.5'>
                  {s.title}
                </h3>
                <p className='text-sm text-gray-400 leading-relaxed mb-4'>
                  {s.desc}
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {s.tags.map(t => <span key={t} className='text-[10px] font-montserrat font-semibold text-[#0A1F44] bg-[#F5F3EF] border border-[#0A1F44]/8 rounded-full px-2.5 py-1'>
                      {t}
                    </span>)}
                </div>
              </div>)}
          </div>
        </section>

        {}
        <section>
          <div className='text-center mb-10'>
            <Eyebrow>What You Get</Eyebrow>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Built to Benefit Everyone
            </h2>
          </div>
          <div className='grid md:grid-cols-2 gap-5'>
            <div className='bg-white border border-[#0A1F44]/8 rounded-2xl p-7'>
              <h3 className='font-montserrat font-bold text-base text-[#0A1F44] mb-5 flex items-center gap-2'>
                <span className='text-[#E8553A]'>
                  <IconRacket width={18} height={18} />
                </span>
                For Your Members
              </h3>
              <ul className='space-y-4'>
                {MEMBER_BENEFITS.map(b => <li key={b.title} className='flex gap-3'>
                    <span className='text-[#E8553A] mt-0.5 shrink-0'>
                      <IconCheck width={16} height={16} />
                    </span>
                    <div>
                      <p className='font-montserrat font-semibold text-sm text-[#0A1F44]'>
                        {b.title}
                      </p>
                      <p className='text-xs text-gray-400 leading-relaxed'>
                        {b.desc}
                      </p>
                    </div>
                  </li>)}
              </ul>
            </div>
            <div className='bg-[#0A1F44] rounded-2xl p-7 text-white'>
              <h3 className='font-montserrat font-bold text-base text-white mb-5 flex items-center gap-2'>
                <span className='text-[#E8553A]'>
                  <IconShield width={18} height={18} />
                </span>
                For Your Club
              </h3>
              <ul className='space-y-4'>
                {CLUB_BENEFITS.map(b => <li key={b.title} className='flex gap-3'>
                    <span className='text-[#E8553A] mt-0.5 shrink-0'>
                      <IconCheck width={16} height={16} />
                    </span>
                    <div>
                      <p className='font-montserrat font-semibold text-sm text-white'>
                        {b.title}
                      </p>
                      <p className='text-xs text-white/60 leading-relaxed'>
                        {b.desc}
                      </p>
                    </div>
                  </li>)}
              </ul>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className='bg-[#0A1F44] rounded-2xl p-8 md:p-10 text-white relative overflow-hidden'>
            <div className='absolute inset-0 opacity-5' style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, #E8553A 0%, transparent 60%)'
          }} />
            <div className='relative grid md:grid-cols-[1.2fr_1fr] gap-10 items-center'>
              <div>
                <h2 className='font-montserrat font-black text-2xl mb-3'>
                  Book a Demo Day for Your Club
                </h2>
                <p className='text-white/70 mb-6 leading-relaxed'>
                  Ready to give your members the chance to try the latest
                  rackets? Get in touch to schedule a demo day at your club —
                  completely free of charge.
                </p>
                <Link href='/contact' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'>
                  Book Your Demo Day
                </Link>
                <p className='text-white/60 text-xs mt-4'>
                  Or email us at{' '}
                  <a href='mailto:partnership@smashuk.co' className='font-semibold text-white'>
                    partnership@smashuk.co
                  </a>
                </p>
              </div>
              <div className='bg-white/5 border border-white/10 rounded-2xl p-6'>
                <p className='font-montserrat font-bold text-white text-sm mb-4 flex items-center gap-2'>
                  <IconCalendar width={16} height={16} className='text-[#E8553A]' />
                  What we need from you
                </p>
                <ul className='space-y-2.5 text-sm text-white/75'>
                  <li className='flex gap-2'>
                    <span className='text-[#E8553A]'>•</span> Your club name and
                    location
                  </li>
                  <li className='flex gap-2'>
                    <span className='text-[#E8553A]'>•</span> Preferred date and
                    time for the demo
                  </li>
                  <li className='flex gap-2'>
                    <span className='text-[#E8553A]'>•</span> Sport (Tennis,
                    Badminton, or Padel)
                  </li>
                  <li className='flex gap-2'>
                    <span className='text-[#E8553A]'>•</span> Approximate number
                    of members expected
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <Eyebrow>FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
                Club Demo Day FAQs
              </h2>
            </div>
            <Accordion defaultOpenId={FAQS[0]?.q} containerClassName='space-y-3' rowClassName='bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden' triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44] px-6 py-5' contentClassName='text-sm text-gray-400 leading-relaxed px-6 pb-5' items={FAQS.map(f => ({
            id: f.q,
            title: f.q,
            content: f.a
          }))} />
          </div>
        </section>

        {}
        <section className='reveal max-w-2xl mx-auto text-center'>
          <h2 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
            Who we are
          </h2>
          <p className='text-xs text-gray-400 leading-relaxed'>
            With a team coming from a diverse background, we are run by players
            who are actively playing at club to county level in badminton,
            tennis and squash. We love to share our knowledge so feel free to
            give us a ring with any questions!
          </p>
        </section>
      </div>
    </div>;
}
