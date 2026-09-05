import Link from 'next/link'
import type { Metadata } from 'next'
import {
  SITE_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
} from '@/lib/constants'
import { getAllCollections } from '@/lib/collections-data'

export function generateMetadata(): Metadata {
  const title = `Shop All Collections — ${SITE_NAME}`
  const description =
    'Browse every badminton, tennis, padel and clothing collection at Smash Racket Pro — rackets, shoes, bags, balls and accessories by brand, sport and category.'
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/collections` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/collections`,
      siteName: SITE_NAME,
      type: 'website',
    },
  }
}

const GROUP_META: Record<string, { label: string; icon: string }> = {
  badminton: { label: 'Badminton', icon: '🏸' },
  tennis: { label: 'Tennis', icon: '🎾' },
  padel: { label: 'Padel', icon: '🎾' },
  squash: { label: 'Squash', icon: '🏸' },
  clothing: { label: 'Clothing', icon: '👕' },
  other: { label: 'Shop by Brand', icon: '🏷️' },
}

const GROUP_ORDER = [
  'badminton',
  'tennis',
  'padel',
  'squash',
  'clothing',
  'other',
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>
  )
}

function GridTexture() {
  return (
    <svg
      className='absolute inset-0 w-full h-full opacity-[0.06]'
      preserveAspectRatio='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={'v' + i}
          x1={`${i * 5.5}%`}
          y1='0'
          x2={`${i * 5.5 + 3}%`}
          y2='100%'
          stroke='white'
          strokeWidth='1'
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={'h' + i}
          x1='0'
          y1={`${i * 9}%`}
          x2='100%'
          y2={`${i * 9 + 2}%`}
          stroke='white'
          strokeWidth='1'
        />
      ))}
    </svg>
  )
}

export default function CollectionsIndexPage() {
  const collections = getAllCollections()
  const groups = new Map<string, typeof collections>()
  for (const c of collections) {
    const key = c.isVendorIndex ? 'other' : (c.filters.sport ?? 'other')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }
  const activeGroupKeys = GROUP_ORDER.filter((key) => groups.has(key))
  const sportCount = activeGroupKeys.filter((k) => k !== 'other').length
  const brandCount = new Set(
    collections.map((c) => c.filters.brand).filter(Boolean),
  ).size

  return (
    <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-6xl mx-auto px-4 md:px-6 pt-16 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-6'>
            <Link href='/' className='hover:text-white/70 transition-colors'>
              Home
            </Link>
            &nbsp;/&nbsp;
            <span className='text-white/70'>Collections</span>
          </p>
          <Eyebrow>🗂️ Every range, one page</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-4'>
            Shop All <span className='text-[#E8553A]'>Collections</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-lg mb-8'>
            Every racket, shoe, brand and accessory range in one place — jump
            straight to what you&apos;re after.
          </p>
          <div className='flex flex-wrap gap-4 text-white/40 text-xs font-mono tracking-wide'>
            <span>{collections.length} collections</span>
            <span>{sportCount} sports covered</span>
            <span>{brandCount} brands stocked</span>
          </div>
        </div>
      </section>

      {}
      <section className='bg-white border-b border-[#0A1F44]/8 sticky top-0 z-10'>
        <div className='max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-2 overflow-x-auto'>
          {activeGroupKeys.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className='px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap bg-gray-100 text-gray-500 hover:bg-[#E8553A] hover:text-white'
            >
              <span className='mr-1'>{GROUP_META[key]?.icon}</span>
              {GROUP_META[key]?.label ?? key}
            </a>
          ))}
        </div>
      </section>

      {}
      <div className='max-w-6xl mx-auto px-4 md:px-6 py-12 flex flex-col gap-6'>
        {activeGroupKeys.map((key) => {
          const meta = GROUP_META[key] ?? { label: key, icon: '🏷️' }
          const items = groups.get(key)!
          return (
            <section
              key={key}
              id={key}
              className='scroll-mt-24 bg-white rounded-2xl border border-[#0A1F44]/8 p-6 md:p-8'
            >
              <div className='flex items-center gap-3 mb-6'>
                <span className='flex-shrink-0 w-10 h-10 rounded-full bg-[#E8553A]/8 flex items-center justify-center text-lg'>
                  {meta.icon}
                </span>
                <div>
                  <h2 className='font-montserrat font-black text-lg text-[#0A1F44]'>
                    {meta.label}
                  </h2>
                  <p className='text-xs text-gray-400 font-lato'>
                    {items.length} collection{items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                {items.map((c) => (
                  <Link
                    key={c.handle}
                    href={`/collections/${c.handle}`}
                    className='group flex items-center justify-between gap-2 bg-[#F5F3EF] hover:bg-[#0A1F44] border border-transparent hover:border-[#0A1F44] rounded-xl px-4 py-3 font-lato text-sm text-[#0A1F44] hover:text-white transition-colors'
                  >
                    <span className='truncate'>{c.breadcrumb}</span>
                    <span className='flex-shrink-0 text-[#E8553A] group-hover:translate-x-0.5 transition-transform'>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {}
      <section className='max-w-6xl mx-auto px-4 md:px-6 pb-16'>
        <div className='bg-[#0A1F44] rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
          <div>
            <h2 className='font-montserrat font-black text-white text-xl mb-2'>
              Can&apos;t find what you&apos;re after?
            </h2>
            <p className='text-white/50 text-sm leading-relaxed max-w-md'>
              Our team plays badminton, tennis, squash and padel — give us a
              call or drop us a message and we&rsquo;ll point you the right way.
            </p>
            <p className='text-white/40 text-xs font-mono tracking-wide mt-4'>
              📞 {CONTACT_PHONE} · ✉️ {CONTACT_EMAIL}
            </p>
          </div>
          <Link
            href='/contact'
            className='flex-shrink-0 bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3.5 rounded-full text-sm transition-colors whitespace-nowrap'
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}
