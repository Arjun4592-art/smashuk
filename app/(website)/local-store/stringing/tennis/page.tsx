import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { TENNIS_TENSIONS as TENSIONS, TENNIS_STRING_BRANDS as STRING_BRANDS } from '@/lib/stringing-options';
import Accordion from '@/components/website/local-store/Accordion';
import StringingTimeline from '@/components/website/StringingTimeline';
export const metadata = {
  title: `Tennis Racket Stringing — Tension Guide & Prices | ${SITE_NAME}`,
  description: 'Professional tennis racket stringing from £22. Tension advice, popular string types (polyester, multifilament, hybrid setups), 24-hour or 40-minute express turnaround.',
  keywords: 'tennis stringing service, tennis racket restring, tennis string tension guide, tennis restring manchester, tennis string types, hybrid tennis strings'
};
const Icon = ({
  glyph,
  ...p
}: {
  glyph: React.ReactNode;
} & React.SVGProps<SVGSVGElement>) => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' {...p}>
    {glyph}
  </svg>;
const IconInspect = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='11' cy='11' r='8' />
        <line x1='21' y1='21' x2='16.65' y2='16.65' />
        <line x1='11' y1='8' x2='11' y2='14' />
        <line x1='8' y1='11' x2='14' y2='11' />
      </>} />;
const IconConsult = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
        <line x1='9' y1='10' x2='15' y2='10' />
        <line x1='9' y1='14' x2='13' y2='14' />
      </>} />;
const IconString = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='12' cy='12' r='10' />
        <line x1='2' y1='12' x2='22' y2='12' />
        <line x1='12' y1='2' x2='12' y2='22' />
        <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
        <line x1='19.07' y1='4.93' x2='4.93' y2='19.07' />
      </>} />;
const IconCheck = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
        <polyline points='22 4 12 14.01 9 11.01' />
      </>} />;
const IconCollect = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.45 5.45l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' />} />;
const IconWrench = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' />} />;
const IconSun = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='12' cy='12' r='4' />
        <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' />
      </>} />;
const IconTarget = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='12' cy='12' r='9' />
        <circle cx='12' cy='12' r='5' />
        <circle cx='12' cy='12' r='1' />
      </>} />;
const IconClock = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p} glyph={<>
        <circle cx='12' cy='12' r='10' />
        <polyline points='12 6 12 12 16 14' />
      </>} />;
const RESTRING_SIGNS = [{
  title: 'Notching or fraying',
  desc: "Grooves cut into the strings where mains and crosses meet mean they're close to snapping."
}, {
  title: 'Movement between hits',
  desc: "If strings won't stay in place after you straighten them, they've lost their grip on each other."
}, {
  title: 'Loss of spin or pop',
  desc: 'Flatter shots and less bite on the ball are classic signs tension has dropped off.'
}, {
  title: "It's been 6+ months",
  desc: 'Even unused strings lose tension sitting in the frame — restring at least twice a year if you play regularly.'
}];
const STRING_TYPES = [{
  name: 'Multifilament',
  best: 'Comfort-focused / arm concerns',
  power: 4,
  control: 3,
  durability: 2,
  feel: 5,
  note: 'Softest option on the arm, closest feel to natural gut, but wears fastest.'
}, {
  name: 'Polyester (Poly)',
  best: 'Advanced players & big hitters',
  power: 3,
  control: 5,
  durability: 5,
  feel: 2,
  note: 'Holds tension well and gives serious spin potential, at the cost of a firmer, stiffer feel.'
}, {
  name: 'Hybrid (Poly + Multi)',
  best: 'Players wanting the best of both',
  power: 4,
  control: 4,
  durability: 4,
  feel: 4,
  note: 'Poly mains for control and durability, softer multi crosses for comfort — a common club-level setup.'
}];
const PROCESS = [{
  step: '01',
  title: 'Inspection',
  desc: 'We examine your frame and grommets for damage before we touch a single string.',
  icon: IconInspect
}, {
  step: '02',
  title: 'Consultation',
  desc: 'We discuss your level, playing style, and whether you prefer power, control or comfort.',
  icon: IconConsult
}, {
  step: '03',
  title: 'Stringing',
  desc: 'Strung on our fully-automatic machine to your exact tension spec — mains and crosses.',
  icon: IconString
}, {
  step: '04',
  title: 'Quality Check',
  desc: 'Tension verified, string pattern checked, frame inspected front and back.',
  icon: IconCheck
}, {
  step: '05',
  title: 'Collection',
  desc: "We message you the moment it's done, with care tips for your new strings.",
  icon: IconCollect
}];
const CARE_TIPS = [{
  icon: IconSun,
  title: 'Avoid heat build-up',
  desc: 'A hot car boot is the fastest way to lose tension — keep your bag somewhere shaded.'
}, {
  icon: IconTarget,
  title: 'Rotate two rackets',
  desc: 'If you play often, rotating between two similarly-strung rackets evens out wear and extends string life.'
}, {
  icon: IconClock,
  title: 'Restring twice a year, minimum',
  desc: 'Even if nothing breaks, plan on at least two restrings a year if you play weekly.'
}];
const FAQS = [{
  q: 'How do I know which tension to choose?',
  a: "Tell us your level, how often you play, and whether you want more power or control, and we'll suggest a starting tension."
}, {
  q: "What's a hybrid string setup?",
  a: 'A hybrid uses two different strings — often a durable polyester for the mains (up-and-down) and a softer multifilament for the crosses — to balance durability, comfort and spin.'
}, {
  q: 'How long does tennis stringing take?',
  a: 'Standard turnaround is 24 hours with no extra charge, or you can book our 40-minute express service if you need it sooner.'
}, {
  q: 'Can I bring my own string?',
  a: "Yes — bring your own string and we'll charge a £12 labour fee for stringing it."
}, {
  q: 'Is there a charge for same-day service?',
  a: 'Standard 24h turnaround is included in the price. Same-day service carries a small £4 surcharge, or book our on-the-spot slot for no extra charge.'
}, {
  q: "I'm coming from far — can I get it strung on the spot?",
  a: 'It depends how busy we are. The safest option is to pre-book via the contact form or email so we can guarantee a slot for you.'
}];
const STATS = [{
  value: '20+',
  label: 'Years experience'
}, {
  value: '20,000+',
  label: 'Rackets strung'
}, {
  value: 'UKRSA',
  label: 'Certified stringers'
}, {
  value: '24h',
  label: 'Standard turnaround'
}];
function RatingBar({
  value,
  max = 5
}: {
  value: number;
  max?: number;
}) {
  return <div className='flex gap-1'>
      {Array.from({
      length: max
    }).map((_, i) => <span key={i} className={`h-1.5 w-4 rounded-full ${i < value ? 'bg-[#E8553A]' : 'bg-[#0A1F44]/10'}`} />)}
    </div>;
}
export default function TennisStringingPage() {
  return <div className='bg-white'>
      {}
      <div className='ls-hero ls-hero-noise relative text-white overflow-hidden'>
        <span className='ls-hero-glow hidden md:block' style={{
        width: 300,
        height: 300,
        top: '-10%',
        left: '-4%'
      }} />
        <span className='ls-hero-glow hidden md:block' style={{
        width: 260,
        height: 260,
        bottom: '-12%',
        right: '8%',
        animationDelay: '2.4s'
      }} />
        <div className='absolute inset-0' style={{
        backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(232,85,58,0.16) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,196,83,0.12) 0%, transparent 45%)'
      }} />
        <div className='absolute inset-0 opacity-5' style={{
        backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',
        backgroundSize: '20px 20px'
      }} />
        <div className='relative max-w-6xl mx-auto px-6 pt-16 pb-16 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-start'>
          <div className='md:col-span-2'>
            <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
              <Link href='/local-store/stringing' className='hover:text-white/70'>
                Stringing
              </Link>{' '}
              &nbsp;/&nbsp; Tennis
            </p>
          </div>
          <div>
            <span className='ls-hero-eyebrow inline-flex items-center gap-1.5 text-xs font-montserrat font-bold text-[#FFC453] bg-[#FFC453]/10 border border-[#FFC453]/20 rounded-full px-4 py-1.5 mb-6'>
              🎾 Tennis Stringing
            </span>
            <h1 className='ls-hero-title font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-5'>
              String It Right.
              <br />
              <span className='text-[#FFC453]'>Play Your Best.</span>
            </h1>
            <p className='ls-hero-subtitle text-white/70 font-lato text-lg max-w-md mb-8'>
              From recreational to competitive players — precision stringing,
              hybrid setups, and tension advice tailored to your game.
            </p>
            <div className='ls-hero-cta flex flex-wrap gap-3'>
              <Link href='/local-store/stringing#book' className='ls-btn-shine inline-flex items-center gap-2 bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors shadow-[0_8px_24px_rgba(232,85,58,0.35)]'>
                Book Your Slot →
              </Link>
              <a href='#tension' className='inline-flex items-center gap-2 border border-white/25 hover:border-white/50 text-white/80 hover:text-white font-montserrat font-semibold px-7 py-3.5 rounded-full text-sm transition-colors'>
                Find My Tension
              </a>
            </div>
          </div>
          <div className='relative mt-2'>
            <div className='ls-card rounded-3xl overflow-hidden border border-white/10 aspect-[4/3] relative' style={{
            background: 'linear-gradient(155deg, #12285C 0%, #0A1F44 55%, #081837 100%)'
          }}>
              <svg className='absolute inset-0 w-full h-full opacity-[0.15]' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'>
                {Array.from({
                length: 14
              }).map((_, i) => <line key={'v' + i} x1={`${i * 8}%`} y1='0' x2={`${i * 8}%`} y2='100%' stroke='white' strokeWidth='1' />)}
                {Array.from({
                length: 10
              }).map((_, i) => <line key={'h' + i} x1='0' y1={`${i * 11}%`} x2='100%' y2={`${i * 11}%`} stroke='white' strokeWidth='1' />)}
              </svg>
              <div className='absolute inset-0' style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(232,85,58,0.35) 0%, transparent 55%)'
            }} />
              <div className='absolute inset-0' style={{
              backgroundImage: "url('/local-store/stringing-tennis-hero.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} role='img' aria-label='Tennis racket stringing' />
              <div className='absolute inset-x-4 bottom-4 flex flex-wrap gap-3 z-10'>
                <div className='ls-card bg-[#0A1F44]/95 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-3 shadow-xl'>
                  <p className='font-montserrat font-black text-xl text-[#FFC453] leading-none'>
                    From £22
                  </p>
                  <p className='text-[11px] text-white/60 font-lato mt-1'>
                    All inclusive
                  </p>
                </div>
                <div className='ls-card bg-[#E8553A]/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl'>
                  <p className='font-montserrat font-black text-xl text-white leading-none'>
                    40 min
                  </p>
                  <p className='text-[11px] text-white/80 font-lato mt-1'>
                    Express option
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='relative border-t border-white/10'>
          <div className='max-w-6xl mx-auto px-6 py-5 flex flex-wrap justify-between gap-y-3 gap-x-8'>
            {STATS.map(s => <div key={s.label} className='flex items-baseline gap-2'>
                <span className='font-montserrat font-black text-lg text-[#FFC453]'>
                  {s.value}
                </span>
                <span className='text-xs text-white/50 font-lato'>
                  {s.label}
                </span>
              </div>)}
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-6 py-16 space-y-20'>
        {}
        <section className='reveal'>
          <div className='bg-[#F8F9FB] border border-gray-100 rounded-3xl p-8 md:p-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2 text-center'>
              Not Sure If You Need One?
            </p>
            <h2 className='font-montserrat font-black text-2xl md:text-3xl text-[#0A1F44] text-center mb-8'>
              Signs Your Racket Needs Restringing
            </h2>
            <div className='grid sm:grid-cols-2 gap-4'>
              {RESTRING_SIGNS.map(s => <div key={s.title} className='flex gap-3 bg-white rounded-xl border border-gray-100 px-5 py-4'>
                  <span className='text-[#E8553A] mt-0.5 shrink-0'>
                    <IconCheck />
                  </span>
                  <div>
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                      {s.title}
                    </p>
                    <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                      {s.desc}
                    </p>
                  </div>
                </div>)}
            </div>
          </div>
        </section>

        {}
        <section id='tension' className='reveal'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Tension Guide
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Find Your Sweet Spot
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              A rough starting point by playing level — our stringers will
              fine-tune it with you in-store.
            </p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {TENSIONS.map((t, i) => <div key={t.level} className={`rounded-2xl p-6 border ${i === 1 ? 'bg-[#0A1F44] border-[#0A1F44] text-white' : 'bg-white border-gray-100'}`}>
                <p className={`text-xs font-montserrat font-bold uppercase tracking-wider mb-2 ${i === 1 ? 'text-[#FFC453]' : 'text-[#E8553A]'}`}>
                  {t.level}
                </p>
                <p className={`font-montserrat font-black text-2xl mb-3 ${i === 1 ? 'text-white' : 'text-[#0A1F44]'}`}>
                  {t.range}
                </p>
                <p className={`text-sm font-lato leading-relaxed ${i === 1 ? 'text-white/70' : 'text-gray-500'}`}>
                  {t.note}
                </p>
              </div>)}
          </div>
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Choosing a String
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Poly, Multi, or Hybrid?
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              The three most common setups we string, and what each one trades
              off.
            </p>
          </div>
          <div className='space-y-4'>
            {STRING_TYPES.map(s => <div key={s.name} className='bg-white border border-gray-100 rounded-2xl p-6 grid md:grid-cols-[1fr_1.3fr] gap-6'>
                <div>
                  <h3 className='font-montserrat font-bold text-lg text-[#0A1F44] mb-1'>
                    {s.name}
                  </h3>
                  <p className='text-xs font-montserrat font-semibold text-[#E8553A] uppercase tracking-wide mb-3'>
                    Best for: {s.best}
                  </p>
                  <p className='text-sm text-gray-500 font-lato leading-relaxed'>
                    {s.note}
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-x-6 gap-y-3 content-center'>
                  {[['Power', s.power], ['Control', s.control], ['Durability', s.durability], ['Feel', s.feel]].map(([label, val]) => <div key={label}>
                      <div className='flex justify-between mb-1'>
                        <span className='text-xs font-lato text-gray-500'>
                          {label}
                        </span>
                      </div>
                      <RatingBar value={Number(val)} />
                    </div>)}
                </div>
              </div>)}
          </div>
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-12'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Our Process
            </p>
            <h2 className='font-montserrat font-black text-3xl md:text-4xl text-[#0A1F44]'>
              What Happens To Your Racket
            </h2>
            <p className='text-gray-500 font-lato mt-3 max-w-md mx-auto'>
              Five steps, zero shortcuts — from drop-off to collection.
            </p>
          </div>
          <StringingTimeline steps={PROCESS.map(p => ({
          ...p,
          icon: <p.icon />
        }))} />
        </section>

        {}
        <section className='reveal grid grid-cols-1 md:grid-cols-2 gap-5'>
          <div className='bg-[#0A1F44] rounded-2xl p-8 text-white flex flex-col justify-between'>
            <div>
              <p className='text-xs font-montserrat font-bold text-[#FFC453] tracking-widest uppercase mb-3'>
                Standard
              </p>
              <h3 className='font-montserrat font-black text-5xl text-white mb-2'>
                24h
              </h3>
              <p className='text-white/60 font-lato text-sm leading-relaxed'>
                Drop off today, collect tomorrow. No surcharge, no fuss — just
                reliable turnaround.
              </p>
            </div>
            <p className='text-white/40 font-lato text-xs mt-6'>
              Four fully-automatic machines in-store
            </p>
          </div>
          <div className='bg-[#E8553A] rounded-2xl p-8 text-white flex flex-col justify-between'>
            <div>
              <p className='text-xs font-montserrat font-bold text-white/60 tracking-widest uppercase mb-3'>
                Express
              </p>
              <h3 className='font-montserrat font-black text-5xl text-white mb-2'>
                40 min
              </h3>
              <p className='text-white/80 font-lato text-sm leading-relaxed'>
                Book a slot, drop it off, grab a coffee and collect your freshly
                strung racket — ready to play.
              </p>
            </div>
            <Link href='/local-store/stringing#book' className='inline-block mt-6 bg-white text-[#E8553A] font-montserrat font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors w-fit'>
              Book Express →
            </Link>
          </div>
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Our Stock
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              What Strings Do We Carry?
            </h2>
            <p className='text-gray-500 font-lato mt-3'>
              Prices from <span className='font-bold text-[#0A1F44]'>£22</span>{' '}
              to <span className='font-bold text-[#0A1F44]'>£40</span> — all
              inclusive.
            </p>
          </div>
          <Accordion defaultOpenId={STRING_BRANDS[0]?.brand} containerClassName='ls-card bg-[#F8F9FB] rounded-2xl border border-gray-100 divide-y divide-gray-100' triggerClassName='font-montserrat font-bold text-base text-[#0A1F44] px-6 py-5' icon='chevron' iconWrapClassName='w-7 h-7 text-xs' contentClassName='px-6 pb-5' items={STRING_BRANDS.map(b => ({
          id: b.brand,
          title: b.brand,
          content: <>
                  {b.intro && <p className='text-sm text-gray-500 font-lato leading-relaxed mb-4'>
                      {b.intro}
                    </p>}
                  {b.groups ? <div className='space-y-4'>
                      {b.groups.map(g => <div key={g.label}>
                          <p className='text-xs font-montserrat font-bold text-[#0A1F44] mb-2 uppercase tracking-wider'>
                            {g.label}
                          </p>
                          <ul className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5'>
                            {g.items.map(item => <li key={item} className='text-sm text-gray-600 font-lato flex items-center gap-2'>
                                <span className='w-1 h-1 rounded-full bg-[#E8553A] shrink-0' />
                                {item}
                              </li>)}
                          </ul>
                        </div>)}
                    </div> : <ol className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2'>
                      {b.items?.map((item, idx) => <li key={item} className='text-sm text-gray-600 font-lato flex items-center gap-2'>
                          <span className='text-[#E8553A] font-montserrat font-bold text-xs w-5 shrink-0'>
                            {idx + 1}.
                          </span>
                          {item}
                        </li>)}
                    </ol>}
                </>
        }))} />
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-10'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              After Your Restring
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Make Your Strings Last
            </h2>
          </div>
          <div className='grid sm:grid-cols-3 gap-5'>
            {CARE_TIPS.map(c => {
            const IconEl = c.icon;
            return <div key={c.title} className='bg-[#F8F9FB] border border-gray-100 rounded-2xl p-6 text-center'>
                  <span className='inline-flex w-11 h-11 rounded-full bg-white border border-[#E8553A]/20 items-center justify-center text-[#E8553A] mb-4'>
                    <IconEl />
                  </span>
                  <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
                    {c.title}
                  </h3>
                  <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                    {c.desc}
                  </p>
                </div>;
          })}
          </div>
        </section>

        {}
        <section className='reveal'>
          <div className='text-center mb-8'>
            <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
              Learn More
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
              Helpful Tennis Guides
            </h2>
          </div>
          <Link href='/blog/tennis-racket-grip-size-guide' className='group flex flex-col sm:flex-row gap-0 max-w-xl mx-auto bg-[#F8F9FB] rounded-2xl border border-gray-100 overflow-hidden hover:border-[#E8553A]/30 hover:shadow-[0_8px_24px_rgba(232,85,58,0.08)] transition-all'>
            <div className='sm:w-48 shrink-0 aspect-[4/3] sm:aspect-auto bg-gray-100'>
              <img src='https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=800&q=80' alt='Tennis Racket Grip Size Guide' className='w-full h-full object-cover' />
            </div>
            <div className='p-6 flex flex-col justify-center'>
              <p className='text-xs text-[#E8553A] font-montserrat font-bold uppercase tracking-wider mb-2'>
                Guide
              </p>
              <h3 className='font-montserrat font-bold text-base text-[#0A1F44] leading-snug group-hover:text-[#E8553A] transition-colors'>
                Tennis Racket Grip Size: How to Get It Right
              </h3>
              <p className='text-xs text-gray-500 font-lato mt-2'>
                By Kal · Read guide →
              </p>
            </div>
          </Link>
        </section>

        {}
        <section className='reveal'>
          <div className='grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-10 md:gap-14'>
            <div className='md:sticky md:top-24 md:self-start'>
              <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-2'>
                FAQs
              </p>
              <h2 className='font-montserrat font-black text-3xl text-[#0A1F44]'>
                Tennis Stringing FAQs
              </h2>
            </div>
            <Accordion defaultOpenId={FAQS[0]?.q} containerClassName='space-y-3' rowClassName='bg-[#F8F9FB] rounded-2xl border border-gray-100 overflow-hidden' triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44] px-6 py-5' contentClassName='text-sm text-gray-500 font-lato leading-relaxed px-6 pb-5' items={FAQS.map(f => ({
            id: f.q,
            title: f.q,
            content: f.a
          }))} />
          </div>
        </section>

        {}
        <div className='reveal-scale bg-[#0A1F44] rounded-3xl p-10 text-white text-center relative overflow-hidden'>
          <div className='absolute inset-0 opacity-5' style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, #E8553A 0%, transparent 60%)'
        }} />
          <div className='relative'>
            <h2 className='font-montserrat font-black text-2xl mb-2 text-white'>
              Ready To Book?
            </h2>
            <p className='text-white/60 font-lato mb-8 max-w-sm mx-auto'>
              Head back to the main stringing page to book your slot or get in
              touch.
            </p>
            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <Link href='/local-store/stringing' className='inline-block bg-white/10 hover:bg-white/20 border border-white/20 text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'>
                ← Back to Stringing
              </Link>
              <Link href='/contact' className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors shadow-[0_4px_16px_rgba(232,85,58,0.4)]'>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
