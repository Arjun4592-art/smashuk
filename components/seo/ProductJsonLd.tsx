import JsonLd from '@/components/seo/JsonLd'
import { generateProductSchema } from '@/lib/seo'

export default function ProductJsonLd({
  product,
}: {
  product: Parameters<typeof generateProductSchema>[0]
}) {
  return <JsonLd data={generateProductSchema(product)} />
}
