import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
export const metadata = {
  title: `Sponsorship Programme | ${SITE_NAME}`,
  description: 'We support promising athletes, coaches and clubs across badminton, tennis, squash and padel with equipment support and discounts.',
  keywords: 'racket sports sponsorship, athlete sponsorship uk, badminton tennis squash club sponsorship'
};
const TIERS = [{
  icon: '🌱',
  title: 'Emerging Talent',
  desc: 'For juniors and up-and-coming players competing regionally — equipment discounts and priority stringing.',
  items: ['Regional-level juniors', 'Equipment discounts', 'Priority stringing']
}, {
  icon: '🥇',
  title: 'Competitive Athlete',
  desc: 'For players competing at national level — deeper discounts, demo access, and event support.',
  items: ['National-level players', 'Deeper equipment discounts', 'Demo access & event support']
}, {
  icon: '🏟️',
  title: 'Club & Team Sponsorship',
  desc: 'For clubs and teams looking for an equipment partner — kit support, discounts for members, and event sponsorship.',
  items: ['Clubs & teams', 'Kit support', 'Member discounts & event sponsorship']
}, {
  icon: '🎯',
  title: 'Coach Support',
  desc: "For coaches running sessions or academies — equipment support for the players you're developing.",
  items: ['Coaches running sessions or academies', 'Equipment support for your players']
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
export default function SponsorshipPage() {
  return <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='reveal relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-8'>
            <Link href='/local-store' className='hover:text-white/70'>
              Local Store
            </Link>{' '}
            &nbsp;/&nbsp; Sponsorship
          </p>
          <Eyebrow>Athletes, Coaches & Clubs</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl mb-5 leading-tight max-w-2xl'>
            Sponsorship <span className='text-[#E8553A]'>Programme</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-xl'>
            We support promising athletes, coaches and clubs in badminton,
            tennis, squash and padel. Applications are reviewed case-by-case.
          </p>
        </div>
      </section>

      {}
      <section className='reveal max-w-5xl mx-auto px-4 md:px-6 py-16'>
        <Eyebrow>Support Tiers</Eyebrow>
        <h2 className='font-montserrat font-black text-[#0A1F44] text-3xl mb-10'>
          Who We Support
        </h2>
        <div className='grid md:grid-cols-2 gap-6'>
          {TIERS.map(t => <div key={t.title} className='bg-white border border-[#0A1F44]/8 rounded-2xl p-8'>
              <span className='text-3xl block mb-3'>{t.icon}</span>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-xl mb-2'>
                {t.title}
              </h3>
              <p className='text-gray-400 text-sm leading-relaxed mb-4'>
                {t.desc}
              </p>
              <ul className='space-y-1.5'>
                {t.items.map(item => <li key={item} className='text-gray-500 text-xs flex gap-2'>
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
            Apply For Sponsorship
          </h2>
          <p className='text-white/70 text-sm mb-6 max-w-lg mx-auto leading-relaxed'>
            Tell us about yourself or your club — playing level, competitions
            entered, and what kind of support you&apos;re looking for.
          </p>
          <Link href='/contact' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors'>
            Get In Touch
          </Link>
        </div>
      </section>
    </div>;
}
