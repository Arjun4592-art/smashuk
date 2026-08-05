import { generateStaticMetadata } from '@/lib/seo'
import Hero from '@/components/website/Hero'
import BrandsBar from '@/components/website/BrandsBar'
import CategoryFilter from '@/components/website/CategoryFilter'
import HomepageProducts from '@/components/website/HomePageProducts'
import NewsletterForm from '@/components/website/NewsletterForm'

import {
  TruckIcon,
  ShieldIcon,
  RefreshIcon,
  HeartIcon,
} from '@/components/ui/Icons'
import { formatCurrency } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import Link from 'next/link'
import ReviewsSlider from '@/components/website/ReviewsSlider'

export const generateMetadata = () => generateStaticMetadata('home')

const TRUST_FEATURES = [
  {
    icon: <TruckIcon size={24} />,
    title: 'Free Shipping',
    desc: `On orders above ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`,
  },
  {
    icon: <ShieldIcon size={24} />,
    title: '100% Authentic',
    desc: 'Genuine products guaranteed',
  },
  {
    icon: <RefreshIcon size={24} />,
    title: 'Easy Returns',
    desc: '7-day hassle-free returns',
  },
  {
    icon: <HeartIcon size={24} />,
    title: 'Expert Support',
    desc: 'By sports enthusiasts',
  },
]

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className='bg-[#0A1F44] py-6'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
            {TRUST_FEATURES.map((f) => (
              <div key={f.title} className='flex items-center gap-3'>
                <div className='text-[#E8553A] shrink-0'>{f.icon}</div>
                <div>
                  <p className='font-montserrat font-bold text-white text-sm'>
                    {f.title}
                  </p>
                  <p className='font-lato text-white/60 text-xs mt-0.5'>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CategoryFilter />

      {/* Products — Medusa se */}
      <HomepageProducts />

      {/* Sale Banner */}
      <section className='py-12 bg-[#E8553A] relative overflow-hidden'>
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-4 left-8 text-8xl'>⚽</div>
          <div className='absolute top-2 right-24 text-7xl'>🏏</div>
          <div className='absolute bottom-4 left-48 text-6xl'>🎾</div>
          <div className='absolute bottom-2 right-8 text-8xl'>🏀</div>
        </div>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
          <div className='flex flex-col lg:flex-row items-center justify-between gap-6'>
            <div className='text-center lg:text-left'>
              <p className='font-lato text-white/80 text-sm uppercase tracking-widest mb-2'>
                Limited Time Offer
              </p>
              <h2 className='font-montserrat font-black text-white text-4xl sm:text-5xl mb-3'>
                UP TO 40% OFF
              </h2>
              <p className='font-lato text-white/80 text-lg'>
                On selected sports equipment
              </p>
            </div>
            <div className='flex flex-col items-center gap-3'>
              <div className='flex items-center gap-3 text-white font-lato text-sm'>
                <span>Use code:</span>
                <span className='bg-white text-[#E8553A] font-montserrat font-black px-4 py-1.5 rounded-full text-base'>
                  Smash10
                </span>
              </div>
              <Link
                href='/shop?badge=SALE'
                className='bg-white text-[#E8553A] font-montserrat font-black px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors shadow-lg text-lg'
              >
                Shop Sale Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BrandsBar />
      <ReviewsSlider />

      {/* Newsletter */}
      <section className='py-16 bg-[#F2F4F7]'>
        <div className='max-w-2xl mx-auto px-4 text-center'>
          <p className='text-xs font-semibold text-[#E8553A] uppercase tracking-widest font-montserrat mb-2'>
            Stay in the Game
          </p>
          <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-3'>
            Get Exclusive Deals
          </h2>
          <p className='font-lato text-gray-500 mb-8'>
            Subscribe and get 10% off your first order.
          </p>
          <NewsletterForm variant='light' />
        </div>
      </section>
    </>
  )
}
