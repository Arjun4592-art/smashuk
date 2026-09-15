'use client'

import Image from 'next/image'

// PERF / correctness compromise.
//
// Product cards were rendering a bare <img src={product.images[0]}> with no
// lazy loading, no intrinsic size and no resizing — so every card pulled the
// full-resolution original straight from the origin. That is where the ~19MB
// of "resources" on a collection page came from: a dozen 1-2MB product shots
// downloaded at full size and then painted into a ~300px box.
//
// next/image fixes that properly (resize + AVIF/WebP + srcset + lazy), but in
// Next 16 it hard-fails with a 400 "url parameter is not allowed" for any host
// missing from images.remotePatterns. Breaking every image is a far worse
// outcome than serving them unoptimised, so this component only routes a URL
// through next/image when its host is one already configured there, and falls
// back to a properly lazy <img> otherwise.
//
// Host list comes from NEXT_PUBLIC_IMAGE_HOSTS — the SAME env var
// next.config.ts reads for images.remotePatterns — so there is exactly one
// place to configure this, not two lists to keep in sync. See the comment in
// next.config.ts for how to find your real image host; nothing in this repo
// reveals it, since product images live in Medusa's database.
const OPTIMIZED_HOSTS = [
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? 'cdn.shopify.com')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
  // Medusa can also serve locally-uploaded product images directly — same
  // NEXT_PUBLIC_MEDUSA_BACKEND_URL next.config.ts derives medusaHost from.
  ...(() => {
    try {
      return [new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? '').hostname]
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
