import SportBlogHub from '@/components/website/blog/SportBlogHub';
import { getSportBySlug } from '@/lib/blog-sports';
import { SITE_NAME } from '@/lib/constants';
export const revalidate = 120;
export async function generateMetadata() {
  const sport = getSportBySlug('padel')!;
  return {
    title: `${sport.name} Guides | ${SITE_NAME}`,
    description: sport.tagline
  };
}
export default function PadelBlogPage() {
  const sport = getSportBySlug('padel')!;
  return <SportBlogHub sport={sport} />;
}
