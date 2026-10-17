import { generateStaticMetadata } from '@/lib/seo'

// The contact page is a client component, so its metadata lives here. This
// also makes the dashboard's SEO > Contact settings actually take effect.
export async function generateMetadata() {
  return generateStaticMetadata('contact')
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
