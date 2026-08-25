import Link from 'next/link';
import Image from 'next/image';
import { SITE_NAME, SITE_LOGO } from '@/lib/constants';
export default function NotFound() {
  return <div className='min-h-screen bg-[#F2F4F7] flex flex-col'>
      <div className='flex-1 flex items-center justify-center px-6 py-16'>
        <div className='max-w-lg w-full text-center'>
          <Link href='/' className='inline-block mb-10'>
            <Image src={SITE_LOGO} alt={SITE_NAME} width={200} height={64} className='h-12 w-auto mx-auto' priority />
          </Link>

          <div className='relative inline-block mb-6'>
            <span className='font-poppins text-[110px] sm:text-[140px] leading-none font-extrabold text-[#0A1F44] tracking-tight'>
              404
            </span>
            <span className='absolute -right-3 top-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#E8553A]' />
          </div>

          <h1 className='font-poppins text-2xl sm:text-[28px] font-bold text-[#0A1F44] mb-3'>
            This page could not be found
          </h1>
          <p className='text-[15px] text-[#4B5563] mb-10 max-w-sm mx-auto'>
            Looks like this one got smashed out of bounds. The page you&apos;re
            looking for doesn&apos;t exist or may have been moved.
          </p>

          <div className='flex flex-wrap items-center justify-center gap-3'>
            <Link href='/' className='px-6 py-3 text-[14px] font-semibold text-white bg-[#E8553A] rounded-full no-underline hover:bg-[#D4441F] transition-colors'>
              Go home
            </Link>
            <Link href='/shop' className='px-6 py-3 text-[14px] font-semibold text-[#0A1F44] bg-white border border-[#E5E7EB] rounded-full no-underline hover:bg-[#F2F4F7] transition-colors'>
              Browse shop
            </Link>
          </div>
        </div>
      </div>

      <div className='py-6 text-center text-[12px] text-[#9CA3AF]'>
        {SITE_NAME}
      </div>
    </div>;
}
