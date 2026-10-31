'use client'

import Image from 'next/image'

const OPTIMIZED_HOSTS = [
  ...(
    process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? 'cdn.shopify.com,images.smashuk.co'
  )
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
  // Medusa can also serve locally-uploaded product images directly — same
  // NEXT_PUBLIC_MEDUSA_BACKEND_URL next.config.ts derives medusaHost from.
  ...(() => {
    try {
      return [
        new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? '').hostname,
      ]
    } catch {
      return []
    }
  })(),
]

function isOptimizable(src: string): boolean {
  if (!src) return false
  if (src.startsWith('/')) return true // local /public asset
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname)
  } catch {
    return false
  }
}

export default function ProductImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  /** Match the real rendered width so the browser picks a sane srcset entry. */
  sizes: string
  /** Only for above-the-fold cards — everything else must stay lazy. */
  priority?: boolean
}) {
  const safeSrc = src || '/placeholder.png'

  if (isOptimizable(safeSrc)) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        quality={75}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    )
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding='async'
      fetchPriority={priority ? 'high' : 'low'}
      sizes={sizes}
    />
  )
}
