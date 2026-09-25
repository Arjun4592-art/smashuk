import { generateStaticMetadata } from '@/lib/seo'
import HomeBlocks from '@/components/website/HomeBlocks'
import { getHomeLayout } from '@/lib/home-layout'
import { getHeroSlides } from '@/lib/hero-slides'
export const generateMetadata = () => generateStaticMetadata('home')
export const revalidate = 3600

export default async function HomePage() {
  const [layout, heroSlides] = await Promise.all([
    getHomeLayout(),
    getHeroSlides(),
  ])
  return <HomeBlocks layout={layout} heroSlides={heroSlides} />
}
