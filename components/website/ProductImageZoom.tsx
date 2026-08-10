'use client'

import { useRef, useState } from 'react'

interface Props {
  src: string
  alt: string
  // How much bigger the magnified panel shows the image, relative to the
  // main image's natural display size. 2.5 is a comfortable "see the
  // stringing pattern/texture" level without being disorienting.
  zoom?: number
  children?: React.ReactNode // badges etc., absolutely positioned over the image
}

// Cursor-following magnifier: hover the main image and a lens box tracks
// the cursor, with a magnified crop shown in an adjacent panel — the same
// interaction pattern most product pages use (Amazon, most Shopify themes,
// including the old smashuk.co store) since a plain pinch/click zoom loses
// the "look exactly where I'm pointing" feel this gives for free.
//
// Hover-only by design: on touch devices there's no cursor to track, so the
// zoom panel/lens are hidden below the `lg` breakpoint and mouse handlers
// are harmless no-ops there (touch doesn't fire mousemove in a way that
// would show a stuck lens).
export default function ProductImageZoom({
  src,
  alt,
  zoom = 2.5,
  children,
}: Props) {
  const imgWrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 50 }) // percentage, for background-position
  const [lensPx, setLensPx] = useState({ x: 0, y: 0, size: 160 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top

    // Lens box (visual square that follows the cursor on the main image),
    // clamped so it never renders partially outside the image.
    const lensSize = Math.min(rect.width, rect.height) / zoom
    const lensX = Math.min(
      Math.max(relX - lensSize / 2, 0),
      rect.width - lensSize,
    )
    const lensY = Math.min(
      Math.max(relY - lensSize / 2, 0),
      rect.height - lensSize,
    )
    setLensPx({ x: lensX, y: lensY, size: lensSize })

    // Magnified panel's background-position — percentage of cursor position
    // across the image, which is what actually produces the "look where
    // you're pointing" effect in the side panel.
    const pctX = (relX / rect.width) * 100
    const pctY = (relY / rect.height) * 100
    setPos({
      x: Math.min(Math.max(pctX, 0), 100),
      y: Math.min(Math.max(pctY, 0), 100),
    })
  }

  return (
    <div className='relative'>
      <div
        ref={imgWrapRef}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onMouseMove={handleMouseMove}
        className='relative aspect-square bg-[#F2F4F7] rounded-2xl overflow-hidden cursor-zoom-in'
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className='w-full h-full object-cover' />
        {children}

        {/* Lens box — desktop only, tracks the cursor over the image */}
        {active && (
          <div
            className='hidden lg:block absolute border-2 border-[#E8553A] bg-white/20 pointer-events-none'
            style={{
              left: lensPx.x,
              top: lensPx.y,
              width: lensPx.size,
              height: lensPx.size,
            }}
          />
        )}
      </div>

      {/* Magnified panel — floats beside the image on large screens only,
          same layout as the reference (main image left, zoomed crop right)
          instead of overlapping content or requiring a click/modal. */}
      {active && (
        <div
          className='hidden lg:block absolute top-0 left-[calc(100%+1.5rem)] w-full aspect-square rounded-2xl border border-[#E5E7EB] shadow-xl bg-[#F2F4F7] bg-no-repeat pointer-events-none z-30'
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoom * 100}%`,
            backgroundPosition: `${pos.x}% ${pos.y}%`,
          }}
        />
      )}
    </div>
  )
}
