import Link from 'next/link';
import { getShopPageTitle } from '@/lib/shopTitle';
function GridTexture() {
  return <svg className='absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'>
      {Array.from({
      length: 20
    }).map((_, i) => <line key={'v' + i} x1={`${i * 5.5}%`} y1='0' x2={`${i * 5.5 + 3}%`} y2='100%' stroke='white' strokeWidth='1' />)}
      {Array.from({
      length: 12
    }).map((_, i) => <line key={'h' + i} x1='0' y1={`${i * 9}%`} x2='100%' y2={`${i * 9 + 2}%`} stroke='white' strokeWidth='1' />)}
    </svg>;
}
export default function ShopHeader({
  q,
  sport,
  badge
}: {
  q?: string;
  sport?: string;
  badge?: string;
}) {
  const pageTitle = getShopPageTitle({
    q,
    sport,
    badge
  });
  return <div className='relative bg-[#0A1F44] py-12 overflow-hidden'>
      <GridTexture />
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-4'>
          <Link href='/' className='hover:text-white/70 transition-colors'>
            Home
          </Link>
          &nbsp;/&nbsp;
          <Link href='/shop' className='hover:text-white/70 transition-colors'>
            Shop
          </Link>
          {(sport || badge || q) && <>
              &nbsp;/&nbsp;
              <span className='text-white/70'>{pageTitle}</span>
            </>}
        </p>
        <h1 className='reveal font-montserrat font-black text-3xl sm:text-4xl text-white mb-2'>
          {pageTitle}
        </h1>
        {}
      </div>
    </div>;
}
