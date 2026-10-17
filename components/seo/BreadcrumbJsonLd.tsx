import JsonLd from '@/components/seo/JsonLd'
import { generateBreadcrumbSchema } from '@/lib/seo'

export default function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; path: string }>
}) {
  return <JsonLd data={generateBreadcrumbSchema(items)} />
}
