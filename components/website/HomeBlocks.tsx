import { Fragment } from 'react'
import Link from 'next/link'
import Hero from '@/components/website/Hero'
import BrandsBar from '@/components/website/BrandsBar'
import CategoryFilter from '@/components/website/CategoryFilter'
import HomeProductSection from '@/components/website/HomePageProducts'
import NewsletterForm from '@/components/website/NewsletterForm'
import ReviewsSlider from '@/components/website/ReviewsSlider'
import {
  BoltIcon,
  CheckIcon,
  ClockIcon,
  GiftIcon,
  HeartIcon,
  PackageIcon,
  PhoneIcon,
  RefreshIcon,
  ShieldIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
} from '@/components/ui/Icons'
import type { HeroSlide } from '@/lib/hero-slides-shared'
import type {
  HomeBlock,
  HomeLayout,
  HomeNewsletterBlock,
  HomePromoBlock,
  HomeTrustBlock,
  HomeTrustIcon,
} from '@/lib/home-layout-shared'

// Renders the homepage from the layout saved in Dashboard → Marketing → Home
// Page. Every block is switched on/off and ordered there; this file only knows
// how to draw each kind of block.

const TRUST_ICONS: Record<
  HomeTrustIcon,
  React.ComponentType<{ size?: number }>
> = {
  truck: TruckIcon,
  shield: ShieldIcon,
  refresh: RefreshIcon,
  heart: HeartIcon,
  star: StarIcon,
  gift: GiftIcon,
  tag: TagIcon,
  package: PackageIcon,
  clock: ClockIcon,
  bolt: BoltIcon,
  phone: PhoneIcon,
  check: CheckIcon,
}

function TrustStrip({ block }: { block: HomeTrustBlock }) {
  if (block.items.length === 0) return null
  return (
    <section className='bg-[#0A1F44] py-6'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
          {block.items.map((item, i) => {
            const Icon = TRUST_ICONS[item.icon] ?? CheckIcon
            return (
              <div
                key={`${item.title}-${i}`}
                className='flex items-center gap-3'
              >
                <div className='text-[#E8553A] shrink-0'>
                  <Icon size={24} />
                </div>
                <div>
                  <p className='font-montserrat font-bold text-white text-sm'>
                    {item.title}
                  </p>
                  {item.desc && (
                    <p className='font-lato text-white/60 text-xs mt-0.5'>
                      {item.desc}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const PROMO_THEMES = {
  orange: {
    section: 'bg-[#E8553A]',
    eyebrow: 'text-white/80',
    heading: 'text-white',
    subtext: 'text-white/80',
    codeLabel: 'text-white',
    codePill: 'bg-white text-[#E8553A]',
    button: 'bg-white text-[#E8553A] hover:bg-gray-100',
  },
  navy: {
    section: 'bg-[#0A1F44]',
    eyebrow: 'text-white/70',
    heading: 'text-white',
    subtext: 'text-white/75',
    codeLabel: 'text-white',
    codePill: 'bg-[#E8553A] text-white',
    button: 'bg-[#E8553A] text-white hover:bg-[#d24a31]',
  },
  light: {
    section: 'bg-[#F2F4F7]',
    eyebrow: 'text-[#E8553A]',
    heading: 'text-[#0A1F44]',
    subtext: 'text-[#4B5563]',
    codeLabel: 'text-[#0A1F44]',
    codePill: 'bg-[#0A1F44] text-white',
    button: 'bg-[#E8553A] text-white hover:bg-[#d24a31]',
  },
} as const

function PromoBanner({ block }: { block: HomePromoBlock }) {
  if (!block.heading) return null
  const t = PROMO_THEMES[block.theme] ?? PROMO_THEMES.orange
  return (
    <section className={`py-12 ${t.section} relative overflow-hidden`}>
      <div className='absolute inset-0 opacity-10'>
        <div className='absolute top-4 left-8 text-8xl'>⚽</div>
        <div className='absolute top-2 right-24 text-7xl'>🏏</div>
        <div className='absolute bottom-4 left-48 text-6xl'>🎾</div>
        <div className='absolute bottom-2 right-8 text-8xl'>🏀</div>
      </div>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='flex flex-col lg:flex-row items-center justify-between gap-6'>
          <div className='text-center lg:text-left'>
            {block.eyebrow && (
              <p
                className={`font-lato ${t.eyebrow} text-sm uppercase tracking-widest mb-2`}
              >
                {block.eyebrow}
              </p>
            )}
            <h2
              className={`font-montserrat font-black ${t.heading} text-4xl sm:text-5xl mb-3`}
            >
              {block.heading}
            </h2>
            {block.subtext && (
              <p className={`font-lato ${t.subtext} text-lg`}>
                {block.subtext}
              </p>
            )}
          </div>
          <div className='flex flex-col items-center gap-3'>
            {block.code && (
              <div
                className={`flex items-center gap-3 ${t.codeLabel} font-lato text-sm`}
              >
                <span>Use code:</span>
                <span
                  className={`${t.codePill} font-montserrat font-black px-4 py-1.5 rounded-full text-base`}
                >
                  {block.code}
                </span>
              </div>
            )}
            {block.ctaText && (
              <Link
                href={block.ctaLink || '/shop'}
                className={`${t.button} font-montserrat font-black px-8 py-3.5 rounded-full transition-colors shadow-lg text-lg`}
              >
                {block.ctaText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Newsletter({ block }: { block: HomeNewsletterBlock }) {
  return (
    <section className='py-16 bg-[#F2F4F7]'>
      <div className='max-w-2xl mx-auto px-4 text-center'>
        {block.eyebrow && (
          <p className='text-xs font-semibold text-[#E8553A] uppercase tracking-widest font-montserrat mb-2'>
            {block.eyebrow}
          </p>
        )}
        {block.heading && (
          <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-3'>
            {block.heading}
          </h2>
        )}
        {block.subtext && (
          <p className='font-lato text-gray-500 mb-8'>{block.subtext}</p>
        )}
        <NewsletterForm variant='light' />
      </div>
    </section>
  )
}

function renderBlock(block: HomeBlock, heroSlides: HeroSlide[]) {
  switch (block.type) {
    case 'hero':
      return <Hero slides={heroSlides} />
    case 'trust':
      return <TrustStrip block={block} />
    case 'categories':
      if (block.tiles.length === 0) return null
      return (
        <CategoryFilter
          eyebrow={block.eyebrow}
          heading={block.heading}
          subheading={block.subheading}
          ctaLabel={block.ctaLabel}
          ctaHref={block.ctaHref}
          tiles={block.tiles}
        />
      )
    case 'products':
      return <HomeProductSection block={block} />
    case 'promo':
      return <PromoBanner block={block} />
    case 'brands':
      return <BrandsBar />
    case 'reviews':
      return <ReviewsSlider />
    case 'newsletter':
      return <Newsletter block={block} />
    default:
      return null
  }
}

export default function HomeBlocks({
  layout,
  heroSlides,
}: {
  layout: HomeLayout
  heroSlides: HeroSlide[]
}) {
  return (
    <>
      {layout.blocks
        .filter((b) => b.enabled)
        .map((b) => (
          <Fragment key={b.id}>{renderBlock(b, heroSlides)}</Fragment>
        ))}
    </>
  )
}
