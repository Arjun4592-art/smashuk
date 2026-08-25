import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
export const metadata = {
  title: `Shuttlecock Partnership Programme | ${SITE_NAME}`,
  description: 'Bulk shuttlecock supply for badminton clubs, coaching programmes and universities at partnership rates, with standing-order options.',
  keywords: 'shuttlecock partnership programme, bulk shuttlecocks club, badminton club shuttlecock supply uk'
};
const FEATURES = [{
  icon: '🏸',
  title: 'Partnership Pricing',
  desc: 'Discounted per-tube rates on feather and nylon shuttlecocks for registered clubs and coaching programmes.',
  items: ['Feather & nylon options', 'Per-tube discounted rates', 'For registered clubs & coaching programmes']
}, {
  icon: '🔁',
  title: 'Standing Orders',
  desc: 'Set up a recurring delivery so your club never runs low on match nights — adjust quantity anytime.',
  items: ['Recurring delivery schedule', 'Timed to your club nights', 'Adjust quantity anytime']
}, {
  icon: '🎓',
  title: 'Coaching & Junior Programmes',
  desc: 'Special rates for junior development and coaching programmes that go through a lot of shuttles.',
  items: ['Special junior development rates', 'Built for high-volume coaching use']
}, {
  icon: '📅',
  title: 'Tournament Supply',
  desc: 'Need a bulk one-off order for a tournament or open day? We can arrange that too.',
  items: ['One-off bulk orders', 'Tournaments & open days']
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
export default function ShuttlecockPartnershipPage() {
  return <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Shuttlecock Partnership
          </p>
          <Eyebrow>Bulk Badminton Supply</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Shuttlecock{' '}
            <span className='text-[#E8553A]'>Partnership Programme</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl'>
            Bulk shuttlecock supply for badminton clubs and coaching programmes,
            at partnership rates.
          </p>
        </div>
      </section>

      {}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>What's Included</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Built For Clubs That Go Through Shuttles
        </h2>
        <div className='grid md:grid-cols-2 gap-6'>
          {FEATURES.map(f => <div key={f.title} className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'>
              <span className='text-3xl block mb-3'>{f.icon}</span>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-xl mb-2'>
                {f.title}
              </h3>
              <p className='text-gray-400 text-sm leading-relaxed mb-4'>
                {f.desc}
              </p>
              <ul className='space-y-1.5'>
                {f.items.map(item => <li key={item} className='text-gray-500 text-xs flex gap-2'>
                    <span className='text-[#E8553A]'>•</span>
                    {item}
                  </li>)}
              </ul>
            </div>)}
        </div>
      </section>

      {}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 pb-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-10 text-white text-center'>
          <h2 className='font-montserrat font-black text-2xl mb-2'>
            Set Up A Standing Order
          </h2>
          <p className='text-white/70 text-sm mb-6 max-w-lg mx-auto leading-relaxed'>
            Tell us your club name, roughly how many tubes you go through a
            month, and preferred shuttle type/brand.
          </p>
          <Link href='/contact' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'>
            Get In Touch
          </Link>
        </div>
      </section>
    </div>;
}
