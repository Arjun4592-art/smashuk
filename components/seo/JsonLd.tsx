import { safeJsonLd } from '@/lib/seo'

/** Renders one or more schema.org objects as a JSON-LD <script>. */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  )
}
