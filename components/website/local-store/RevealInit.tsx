'use client'

// Lightweight scroll-reveal engine for the local-store section.
// Any element with className "reveal" / "reveal-scale" / "reveal-line" /
// "reveal-line-x" / "reveal-badge" fades, slides, grows or pops into view
// the first time it enters the viewport. No per-page JS needed — just add
// the class name. Respects prefers-reduced-motion via CSS.
//
// NOTE: this previously looked for ".local-store-luxury" but nothing in
// the app ever rendered that class — the actual wrapper class (and all the
// matching transition CSS) in app/globals.css is ".ls-luxury", applied to
// <main> in app/(website)/layout.tsx. That mismatch (plus this component
// never being mounted anywhere) meant the reveal CSS silently did nothing.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const REVEAL_SELECTOR =
  '.ls-luxury .reveal, .ls-luxury .reveal-scale, .ls-luxury .reveal-line, ' +
  '.ls-luxury .reveal-line-x, .ls-luxury .reveal-badge'

export default function RevealInit() {
  const pathname = usePathname()

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        REVEAL_SELECTOR.split(', ')
          .map((s) => `${s}:not(.reveal-visible)`)
          .join(', '),
      ),
    )
    if (els.length === 0) return

    if (prefersReduced) {
      els.forEach((el) => el.classList.add('reveal-visible'))
      return
    }

    // Stagger children within the same section a touch, based on order.
    const groups = new Map<Element | null, HTMLElement[]>()
    els.forEach((el) => {
      const parent = el.parentElement
      const list = groups.get(parent) ?? []
      list.push(el)
      groups.set(parent, list)
    })
    groups.forEach((list) => {
      list.forEach((el, i) => {
        if (!el.style.transitionDelay) {
          el.style.transitionDelay = `${Math.min(i, 5) * 90}ms`
        }
      })
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // Re-scan whenever the route changes so client-side navigations
    // between pages still get their reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
