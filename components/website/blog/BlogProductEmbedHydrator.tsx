'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'
import { normalizeProduct } from '@/lib/api/store'

const ADD_BTN_SELECTOR = '.product-embed-add-btn, .product-grid-add-btn'
const LOADING_LABEL = 'Adding...'
const ADDED_LABEL = 'Added!'
const ERROR_LABEL = "Couldn't add"

interface Props {
  containerId: string
}

// Blog post content is stored as static HTML (see ProductCardNode /
// ProductGridNode), so the "Add to Cart" buttons rendered inside it have no
// React handlers by default. This component finds those buttons after the
// post renders and wires them up to the real cart store, fetching the live
// product by its handle so price/stock/variants are always current.
export default function BlogProductEmbedHydrator({ containerId }: Props) {
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) return

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(ADD_BTN_SELECTOR),
    )
    const cleanups: Array<() => void> = []

    buttons.forEach((btn) => {
      const card = btn.closest<HTMLElement>('[data-handle]')
      const handle = card?.getAttribute('data-handle')
      const originalLabel = btn.textContent?.trim() || 'Add to Cart'
      if (!handle) {
        btn.disabled = true
        return
      }

      let resetTimer: ReturnType<typeof setTimeout> | null = null
      const resetAfter = (label: string, delay = 2000) => {
        btn.textContent = label
        resetTimer = setTimeout(() => {
          btn.textContent = originalLabel
          btn.disabled = false
        }, delay)
      }

      const onClick = async (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.disabled) return
        if (resetTimer) clearTimeout(resetTimer)
        btn.disabled = true
        btn.textContent = LOADING_LABEL
        try {
          const res = await fetch(
            `/api/store/products?handle=${encodeURIComponent(handle)}&limit=1`,
          )
          const data = await res.json()
          const raw = data.products?.[0]
          if (!res.ok || !raw) throw new Error('Product not found')

          const product = normalizeProduct(raw)

          if (!product.inStock) {
            toast.error('This product is out of stock')
            resetAfter(originalLabel, 0)
            return
          }

          if ((product.variants?.length ?? 0) > 1) {
            toast('Choose a size/option first', { icon: '👟' })
            window.location.href = `/shop/${product.slug}`
            return
          }

          addItem(product, 1)
          toast.success(`${product.name} added to cart`)
          resetAfter(ADDED_LABEL)
        } catch (err) {
          console.error('[BlogProductEmbedHydrator] Add to cart failed:', err)
          toast.error('Could not add this product right now')
          resetAfter(ERROR_LABEL)
        }
      }

      btn.addEventListener('click', onClick)
      cleanups.push(() => {
        if (resetTimer) clearTimeout(resetTimer)
        btn.removeEventListener('click', onClick)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [containerId, addItem])

  return null
}
