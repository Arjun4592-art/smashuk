import Link from 'next/link';
import { VENDOR_BRAND_LIST } from '@/lib/collections-data';

export default function VendorIndex() {
  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
        {VENDOR_BRAND_LIST.map((brand) => (
          <Link
            key={brand.slug}
            href={`/shop?brand=${brand.slug}`}
            className='group relative flex flex-col items-center justify-center gap-2 text-center bg-white border border-[#E5E7EB] rounded-[18px] py-8 px-4 hover:border-[#E8553A]/40 hover:shadow-[0_8px_24px_rgba(232,85,58,0.10)] hover:-translate-y-[3px] transition-all duration-300'
          >
            <div className='absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,rgba(232,85,58,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
            <span className='relative font-montserrat font-bold text-sm text-[#0A1F44] group-hover:text-[#E8553A] transition-colors duration-300'>
              {brand.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
