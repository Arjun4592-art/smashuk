'use client'

import { useState, useMemo } from 'react'
import { ArrowRightIcon } from '@/components/ui/Icons'
import { useBrandStats } from '@/hooks/useProducts'
const BRAND_INFO: Record<
  string,
  {
    description: string
    initial: string
  }
> = {
  Yonex: {
    description: 'Badminton & Tennis',
    initial: 'YX',
  },
  Victor: {
    description: 'Badminton',
    initial: 'VC',
  },
  'Li-Ning': {
    description: 'Badminton',
    initial: 'LN',
  },
  Babolat: {
    description: 'Tennis & Badminton',
    initial: 'BB',
  },
  Head: {
    description: 'Tennis & Squash',
    initial: 'HD',
  },
  Wilson: {
    description: 'Tennis & Squash',
    initial: 'WL',
  },
  'K-Swiss': {
    description: 'Tennis Shoes',
    initial: 'KS',
  },
  Adidas: {
    description: 'Tennis & Padel',
    initial: 'AD',
  },
  Bullpadel: {
    description: 'Padel',
    initial: 'BP',
  },
  Tecnifibre: {
    description: 'Padel & Tennis',
    initial: 'TF',
  },
  Dunlop: {
    description: 'Padel & Squash',
    initial: 'DL',
  },
  Ashaway: {
    description: 'Badminton & Squash Strings',
    initial: 'AW',
  },
  Luxilon: {
    description: 'Tennis Strings',
    initial: 'LX',
  },
  Prince: {
    description: 'Tennis & Squash',
    initial: 'PR',
  },
  'FZ Forza': {
    description: 'Badminton',
    initial: 'FZ',
  },
  Salming: {
    description: 'Squash',
    initial: 'SA',
  },
  Karakal: {
    description: 'Badminton & Squash',
    initial: 'KA',
  },
  Snowpeak: {
    description: 'Badminton',
    initial: 'SN',
  },
  Slazenger: {
    description: 'Tennis',
    initial: 'SL',
  },
}
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
function BrandLogo({
  logo,
  initial,
  name,
  size = 'md',
}: {
  logo: string
  initial: string
  name: string
  size?: 'md' | 'sm'
}) {
  const [failed, setFailed] = useState(false)
  const dim = size === 'md' ? 'w-14 h-14' : 'w-9 h-9'
  if (failed) {
    return (
      <span className='font-montserrat font-black text-[11px] tracking-wide text-[#0A1F44] group-hover:text-[#E8553A] transition-colors duration-300'>
        {initial}
      </span>
    )
  }
  return (
    <img
      src={logo}
      alt={`${name} logo`}
      className={`${dim} object-contain`}
      onError={() => setFailed(true)}
    />
  )
}
export default function BrandsBar() {
  const { data, isLoading } = useBrandStats()
  const BRANDS = useMemo(() => {
    const list = data?.brands ?? []
    return list.map((b) => {
      const info = BRAND_INFO[b.name]
      return {
        name: b.name,
        slug: slugify(b.name),
        description:
          info?.description ?? `${b.count} product${b.count === 1 ? '' : 's'}`,
        initial: info?.initial ?? b.name.slice(0, 2).toUpperCase(),
        logo: `/brands/${slugify(b.name)}.svg`,
      }
    })
  }, [data])
  const STATS = [
    {
      num: data?.brandCount ? `${data.brandCount}+` : '—',
      label: 'Premium Brands',
    },
    {
      num: data?.productCount ? `${data.productCount}+` : '—',
      label: 'Products',
    },
    {
      num: '100%',
      label: 'Authentic',
    },
  ]
  const BRANDS_DOUBLED = [...BRANDS, ...BRANDS]
  if (!isLoading && BRANDS.length === 0) return null
  if (isLoading) return null
  return (
    <section className='py-16 bg-white border-y border-[#E5E7EB] overflow-hidden'>
      {}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center'>
        <p className='text-[10px] font-bold text-[#E8553A] uppercase tracking-[0.22em] font-montserrat mb-3'>
          Trusted Brands
        </p>
        <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] tracking-tight'>
          We Stock The <span className='text-[#E8553A]'>World&apos;s Best</span>
        </h2>
        <p className='mt-2 text-sm text-[#4B5563] font-lato'>
          {data?.brandCount ?? BRANDS.length}+ premium racket sports brands —
          Badminton, Tennis, Padel &amp; Squash
        </p>
      </div>

      {}
      <div className='relative mb-3'>
        <div className='absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-white to-transparent z-10 pointer-events-none' />
        <div className='absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white to-transparent z-10 pointer-events-none' />

        <div className='overflow-hidden'>
          <div className='flex items-center gap-3.5 py-1.5 w-max animate-scroll'>
            {BRANDS_DOUBLED.map((brand, i) => (
              <div
                key={`${brand.name}-${i}`}
                className='shrink-0 group cursor-pointer relative flex flex-col items-center gap-2 px-3.5 py-3 min-w-[92px] rounded-[18px] border border-[#E5E7EB] bg-white hover:border-[#E8553A]/40 hover:shadow-[0_8px_24px_rgba(232,85,58,0.10)] hover:-translate-y-[3px] transition-all duration-300'
              >
                {}
                <div className='absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,rgba(232,85,58,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />

                {}
                <div className='w-16 h-16 rounded-xl bg-[#F2F4F7] group-hover:bg-[#E8553A]/[0.08] border border-transparent group-hover:border-[#E8553A]/20 flex items-center justify-center transition-all duration-300 overflow-hidden'>
                  <BrandLogo
                    logo={brand.logo}
                    initial={brand.initial}
                    name={brand.name}
                    size='md'
                  />
                </div>

                {}
                <div className='text-center relative z-10'>
                  <p className='font-montserrat font-bold text-xs text-[#0A1F44] group-hover:text-[#E8553A] whitespace-nowrap transition-colors duration-300'>
                    {brand.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className='relative'>
        <div className='absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-white to-transparent z-10 pointer-events-none' />
        <div className='absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white to-transparent z-10 pointer-events-none' />

        <div className='overflow-hidden'>
          <div className='flex items-center gap-3.5 w-max animate-scroll-reverse'>
            {[...BRANDS_DOUBLED].reverse().map((brand, i) => (
              <div
                key={`${brand.name}-rev-${i}`}
                className='shrink-0 group cursor-pointer flex items-center gap-2 px-3.5 py-2 pr-4 rounded-full border border-[#E5E7EB] bg-white hover:border-[#E8553A]/40 hover:bg-[#E8553A]/[0.04] hover:-translate-y-px transition-all duration-200'
              >
                <div className='w-10 h-10 rounded-lg bg-[#0A1F44]/[0.06] group-hover:bg-[#E8553A]/10 flex items-center justify-center shrink-0 transition-colors duration-200 overflow-hidden'>
                  <BrandLogo
                    logo={brand.logo}
                    initial={brand.initial}
                    name={brand.name}
                    size='sm'
                  />
                </div>
                <span className='font-montserrat font-semibold text-xs text-[#0A1F44] group-hover:text-[#E8553A] whitespace-nowrap transition-colors duration-200'>
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className='max-w-[520px] mx-auto mt-9 px-4'>
        <div className='flex items-center bg-[#F2F4F7] border border-[#E5E7EB] rounded-[20px] px-6 py-5'>
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex-1 text-center px-4 ${idx > 0 ? 'border-l border-[#E5E7EB]' : ''}`}
            >
              <p className='font-montserrat font-black text-2xl text-[#0A1F44] leading-none'>
                {stat.num}
              </p>
              <p className='font-lato text-[11px] text-[#9CA3AF] mt-1'>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className='text-center mt-7'>
        <a
          href='/shop'
          className='inline-flex items-center gap-1.5 text-sm font-bold text-[#E8553A] font-montserrat px-[22px] py-2.5 rounded-full border border-[#E8553A]/25 hover:bg-[#E8553A]/[0.06] hover:border-[#E8553A]/50 hover:gap-2.5 transition-all duration-200 group'
        >
          Shop all brands
          <ArrowRightIcon
            size={14}
            className='group-hover:translate-x-1 transition-transform duration-200'
          />
        </a>
      </div>
    </section>
  )
}
