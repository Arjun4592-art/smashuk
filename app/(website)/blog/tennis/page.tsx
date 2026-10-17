import SportBlogHub from '@/components/website/blog/SportBlogHub'
import { getSportBySlug } from '@/lib/blog-sports'
export const revalidate = 120
export async function generateMetadata() {
  const sport = getSportBySlug('tennis')!
  return {
    title: `${sport.name} Guides`,
    description: sport.tagline,
    alternates: { canonical: '/blog/tennis' },
  }
}
export default function TennisBlogPage() {
  const sport = getSportBySlug('tennis')!
  return <SportBlogHub sport={sport} />
}
