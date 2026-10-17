import SportBlogHub from '@/components/website/blog/SportBlogHub'
import { getSportBySlug } from '@/lib/blog-sports'
export const revalidate = 120
export async function generateMetadata() {
  const sport = getSportBySlug('badminton')!
  return {
    title: `${sport.name} Guides`,
    description: sport.tagline,
    alternates: { canonical: '/blog/badminton' },
  }
}
export default function BadmintonBlogPage() {
  const sport = getSportBySlug('badminton')!
  return <SportBlogHub sport={sport} />
}
