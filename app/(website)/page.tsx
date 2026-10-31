import { generateStaticMetadata } from '@/lib/seo'
import HomeBlocks from '@/components/website/HomeBlocks'
import { getHomeLayout } from '@/lib/home-layout'
import { getHeroSlides } from '@/lib/hero-slides'
import { loadBrandStatsSafe } from '@/lib/brand-stats-server'
export const generateMetadata = () => generateStaticMetadata('home')
// The homepage now contains real product sections rendered on the server, so
// refresh it every 5 minutes (stock / prices / new arrivals stay reasonably
// current) instead of hourly.
export const revalidate = 300

export default async function HomePage() {
  const [layout, heroSlides, brandStats] = await Promise.all([
    getHomeLayout(),
    getHeroSlides(),
    loadBrandStatsSafe(),
  ])
  return (
    <HomeBlocks
      layout={layout}
      heroSlides={heroSlides}
      brandStats={brandStats}
    />
  )
}
