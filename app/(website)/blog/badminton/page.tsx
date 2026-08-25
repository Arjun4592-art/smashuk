import SportBlogHub from '@/components/website/blog/SportBlogHub';
import { getSportBySlug } from '@/lib/blog-sports';
import { SITE_NAME } from '@/lib/constants';
export const revalidate = 120;
export async function generateMetadata() {
  const sport = getSportBySlug('badminton')!;
  return {
    title: `${sport.name} Guides | ${SITE_NAME}`,
    description: sport.tagline
  };
}
export default function BadmintonBlogPage() {
  const sport = getSportBySlug('badminton')!;
  return <SportBlogHub sport={sport} />;
}
