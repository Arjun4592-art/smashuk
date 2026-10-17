import SportBlogHub from '@/components/website/blog/SportBlogHub'
import { getSportBySlug } from '@/lib/blog-sports'
export const revalidate = 120
export async function generateMetadata() {
  const sport = getSportBySlug('padel')!
  return {
    title: `${sport.name} Guides`,
    description: sport.tagline,
    alternates: { canonical: '/blog/padel' },
  }
}
export default function PadelBlogPage() {
  const sport = getSportBySlug('padel')!
  return <SportBlogHub sport={sport} />
}
