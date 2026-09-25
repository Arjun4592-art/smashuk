'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SPORTS } from '@/lib/constants'
import { isValidHref } from '@/lib/hero-slides-shared'
import { errorMessage } from '@/lib/error-message'
import {
  HOME_BADGE_OPTIONS,
  HOME_BLOCK_LABELS,
  HOME_REPEATABLE_TYPES,
  HOME_SORT_OPTIONS,
  PRODUCT_PRESETS,
  buildDefaultHomeLayout,
  newCategoriesBlock,
  newPromoBlock,
  type HomeBlock,
  type HomeBlockType,
  type HomeProductsBlock,
  type LegacyPromoBanner,
} from '@/lib/home-layout-shared'
import ProductsBlockEditor, {
  type HomeTaxonomy,
} from '@/components/dashboard/home/ProductsBlockEditor'
import {
  CategoriesEditor,
  NewsletterEditor,
  PromoEditor,
  TrustEditor,
} from '@/components/dashboard/home/SimpleBlockEditors'
import {
  Toggle,
  dangerBtn,
  ghostBtn,
  iconBtn,
  primaryOutlineBtn,
} from '@/components/dashboard/home/ui'

export type HomeView = 'all' | 'banners' | 'products'

interface ViewConfig {
  title: string
  description: string
  /** null = every kind of section */
  types: HomeBlockType[] | null
  canAddProductRows: boolean
  canAddPromo: boolean
  canAddTiles: boolean
  emptyText: string
}

const VIEWS: Record<HomeView, ViewConfig> = {
  all: {
    title: 'Home Page — All Sections & Order',
    description:
      'Every section of the homepage in one list. Switch sections on or off and move them up or down to change the order.',
    types: null,
    canAddProductRows: true,
    canAddPromo: true,
    canAddTiles: true,
    emptyText: 'No sections yet.',
  },
  banners: {
    title: 'Home Page Banners',
    description:
      'Discount / promo banners, the photo tiles (browse by sport) and the trust strip. Add as many discount banners as you like.',
    types: ['promo', 'categories', 'trust'],
    canAddProductRows: false,
    canAddPromo: true,
    canAddTiles: true,
    emptyText: 'No banners yet — use “+ Add” below.',
  },
  products: {
    title: 'Home Page Products',
    description:
      'The product rows on the homepage — Featured, New Arrivals, Best Sellers, a single sport like Badminton, or hand-picked products.',
    types: ['products'],
    canAddProductRows: true,
    canAddPromo: false,
    canAddTiles: false,
    emptyText: 'No product rows yet — use “+ Add” below.',
  },
}

const BLOCK_EMOJI: Record<HomeBlockType, string> = {
  hero: '🖼',
  trust: '✅',
  categories: '🗂',
  products: '🛍',
  promo: '🏷',
  brands: '🏢',
  reviews: '⭐',
  newsletter: '✉️',
}

const optionLabel = (list: { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value

function blockTitle(b: HomeBlock): string {
  switch (b.type) {
    case 'products':
      return b.title || 'Product section (no title)'
    case 'categories':
      return b.heading || HOME_BLOCK_LABELS.categories
    case 'promo':
      return b.linkedToPromoBanner
        ? 'Discount banner'
        : b.heading || 'Discount banner'
    case 'newsletter':
      return b.heading || HOME_BLOCK_LABELS.newsletter
    default:
      return HOME_BLOCK_LABELS[b.type]
  }
}

function blockSubtitle(b: HomeBlock): string {
  switch (b.type) {
    case 'hero':
      return 'Slides are edited under Marketing → Home Slider'
    case 'trust':
      return `${b.items.length} short promise${b.items.length === 1 ? '' : 's'}`
    case 'categories':
      return `${b.tiles.length} tile${b.tiles.length === 1 ? '' : 's'}`
    case 'products': {
      if (b.source === 'manual') {
        return `${b.products.length} hand-picked product${b.products.length === 1 ? '' : 's'}`
      }
      const parts: string[] = []
      if (b.filters.sport) parts.push(`Sport: ${b.filters.sport}`)
      if (b.filters.category) parts.push(`Category: ${b.filters.category}`)
      if (b.filters.brand) parts.push(`Brand: ${b.filters.brand}`)
      if (b.filters.badge)
        parts.push(optionLabel(HOME_BADGE_OPTIONS, b.filters.badge))
      if (parts.length === 0) parts.push('All products')
      parts.push(optionLabel(HOME_SORT_OPTIONS, b.sort))
      parts.push(`up to ${b.limit}`)
      return parts.join(' · ')
    }
    case 'promo':
      return b.linkedToPromoBanner
        ? 'Uses the store Promo Banner settings'
        : [b.code && `Code ${b.code}`, b.ctaText].filter(Boolean).join(' · ') ||
            'Custom banner'
    case 'brands':
      return 'Brand logos from your catalogue — automatic'
    case 'reviews':
      return 'Latest customer reviews — automatic'
    case 'newsletter':
      return 'Email sign-up box'
  }
}

function validate(blocks: HomeBlock[]): string | null {
  if (!blocks.some((b) => b.enabled)) {
    return 'Keep at least one section switched on'
  }
  const bad = (v: string) => !!v.trim() && !isValidHref(v)
  const linkHelp =
    'links must start with / (e.g. /shop?sport=padel) or https://'
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (!b.enabled) continue
    const where = `“${blockTitle(b)}”`
    switch (b.type) {
      case 'products':
        if (b.source === 'manual' && b.products.length === 0)
          return `${where}: add at least one product, or switch the section off`
        if (!!b.viewAllLabel.trim() !== !!b.viewAllHref.trim())
          return `${where}: the “View all” button needs both text and a link`
        if (bad(b.viewAllHref)) return `${where}: ${linkHelp}`
        break
      case 'promo':
        if (b.linkedToPromoBanner) break
        if (!b.heading.trim()) return `${where}: add a big heading`
        if (bad(b.ctaLink)) return `${where}: ${linkHelp}`
        break
      case 'categories':
        if (b.tiles.length === 0)
          return `${where}: add at least one tile, or switch the section off`
        if (!!b.ctaLabel.trim() !== !!b.ctaHref.trim())
          return `${where}: the button needs both text and a link`
        if (bad(b.ctaHref)) return `${where}: ${linkHelp}`
        for (let t = 0; t < b.tiles.length; t++) {
          const tile = b.tiles[t]
          if (!tile.label.trim()) return `${where}: tile ${t + 1} needs a name`
          if (!tile.href.trim() || !isValidHref(tile.href))
            return `${where}: tile ${t + 1} ${linkHelp}`
        }
        break
      case 'trust':
        if (b.items.some((it) => !it.title.trim() && it.desc.trim()))
          return `${where}: an item has small text but no title`
        break
    }
  }
  return null
}

interface AdminCategory {
  id: string
  name?: string
  handle?: string
  parent_category_id?: string | null
  is_active?: boolean
}

const capitalise = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s

export default function HomeLayoutManager({ view }: { view: HomeView }) {
  const cfg = VIEWS[view]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<HomeBlock[]>([])
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [legacyPromo, setLegacyPromo] = useState<LegacyPromoBanner | null>(null)
  const [taxonomy, setTaxonomy] = useState<HomeTaxonomy>({
    sports: SPORTS.map((s) => ({ value: s.slug, label: s.label })),
    categories: [],
    brands: [],
  })
  const [openId, setOpenId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const scrollToId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/home-layout', {
          credentials: 'include',
        })
        if (!res.ok) {
          toast.error('Failed to load home page settings')
          return
        }
        const data = await res.json()
        if (cancelled) return
        setStoreId(data.storeId)
        setIsCustom(!!data.isCustom)
        setBlocks(data.layout.blocks)
        setSavedSnapshot(JSON.stringify(data.layout.blocks))
        if (data.promoBanner) {
          setLegacyPromo({
            enabled: data.promoBanner.enabled !== false,
            eyebrow: data.promoBanner.eyebrow ?? '',
            heading: data.promoBanner.heading ?? '',
            subtext: data.promoBanner.subtext ?? '',
            code: data.promoBanner.code ?? '',
            ctaText: data.promoBanner.ctaText ?? '',
            ctaLink: data.promoBanner.ctaLink ?? '',
          })
        }
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load home page settings'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Sport / category / brand dropdown options. Failures are non-fatal: the
  // built-in sport list still works and saved values are always kept.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [catRes, brandRes] = await Promise.allSettled([
        fetch('/api/admin/categories?limit=200', { credentials: 'include' }),
        fetch('/api/store/brands'),
      ])
      const next: HomeTaxonomy = {
        sports: SPORTS.map((s) => ({ value: s.slug, label: s.label })),
        categories: [],
        brands: [],
      }
      try {
        if (catRes.status === 'fulfilled' && catRes.value.ok) {
          const data = await catRes.value.json()
          const cats = (
            (data.product_categories ?? []) as AdminCategory[]
          ).filter((c) => c?.handle && c.is_active !== false)
          const byId = new Map<string, AdminCategory>(
            cats.map((c) => [c.id, c]),
          )
          for (const c of cats.filter((c) => !c.parent_category_id)) {
            const handle = c.handle ?? ''
            if (!next.sports.some((s) => s.value === handle))
              next.sports.push({ value: handle, label: c.name ?? handle })
          }
          next.categories = cats
            .filter((c) => c.parent_category_id)
            .map((c) => ({
              value: c.handle ?? '',
              label: `${byId.get(c.parent_category_id ?? '')?.name ?? ''} › ${c.name ?? c.handle}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        }
      } catch {
        /* keep defaults */
      }
      try {
        if (brandRes.status === 'fulfilled' && brandRes.value.ok) {
          const data = await brandRes.value.json()
          next.brands = ((data.brands ?? []) as { name?: string }[])
            .map((b) => String(b.name ?? ''))
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b))
        }
      } catch {
        /* keep defaults */
      }
      next.sports = next.sports.map((s) => ({
        ...s,
        label: capitalise(s.label),
      }))
      if (!cancelled) setTaxonomy(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const inView = useCallback(
    (b: HomeBlock) => !cfg.types || cfg.types.includes(b.type),
    [cfg],
  )

  const shown = useMemo(() => blocks.filter(inView), [blocks, inView])

  const dirty = useMemo(
    () => !loading && JSON.stringify(blocks) !== savedSnapshot,
    [blocks, savedSnapshot, loading],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // After "Add section", bring the new card into view once it has rendered.
  useEffect(() => {
    if (!scrollToId.current) return
    const el = document.getElementById(`home-block-${scrollToId.current}`)
    scrollToId.current = null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [blocks])

  const update = useCallback(
    (id: string, changes: Partial<HomeBlock>) =>
      setBlocks((all) =>
        all.map((b) => (b.id === id ? ({ ...b, ...changes } as HomeBlock) : b)),
      ),
    [],
  )

  // Moves a section past the next/previous section that is visible on this
  // screen (on the filtered screens hidden kinds are stepped over).
  const move = (id: string, dir: -1 | 1) =>
    setBlocks((all) => {
      const visible = all
        .map((b, index) => ({ b, index }))
        .filter((v) => inView(v.b))
      const pos = visible.findIndex((v) => v.b.id === id)
      const other = visible[pos + dir]
      if (pos < 0 || !other) return all
      const next = [...all]
      const a = visible[pos].index
      const c = other.index
      ;[next[a], next[c]] = [next[c], next[a]]
      return next
    })

  const remove = (block: HomeBlock) => {
    if (
      !window.confirm(`Delete “${blockTitle(block)}”? (Applies when you Save.)`)
    )
      return
    setBlocks((all) => all.filter((b) => b.id !== block.id))
    if (openId === block.id) setOpenId(null)
  }

  // New sections land next to their own kind (after the last product row for a
  // product row …), otherwise just above the brands strip, never below the
  // newsletter box.
  const addBlock = (block: HomeBlock) => {
    scrollToId.current = block.id
    setBlocks((all) => {
      let at = -1
      all.forEach((b, i) => {
        if (b.type === block.type) at = i + 1
      })
      if (at < 0) {
        const brands = all.findIndex((b) => b.type === 'brands')
        at = brands >= 0 ? brands : all.length
      }
      return [...all.slice(0, at), block, ...all.slice(at)]
    })
    setOpenId(block.id)
    setAddOpen(false)
  }

  const resetToDefault = () => {
    if (
      !window.confirm(
        'Put the homepage back to the original layout (all original sections and text)? Your changes are only lost if you Save.',
      )
    )
      return
    setBlocks(buildDefaultHomeLayout().blocks)
    setOpenId(null)
  }

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Store not loaded yet')
      return
    }
    const problem = validate(blocks)
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/home-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, layout: { version: 1, blocks } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save home page')
      }
      setSavedSnapshot(JSON.stringify(blocks))
      setIsCustom(true)
      toast.success('Home page saved — the website is being refreshed')
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save home page'))
    } finally {
      setSaving(false)
    }
  }

  const renderEditor = (block: HomeBlock) => {
    switch (block.type) {
      case 'products':
        return (
          <ProductsBlockEditor
            block={block}
            taxonomy={taxonomy}
            onChange={(c) => update(block.id, c)}
          />
        )
      case 'trust':
        return (
          <TrustEditor block={block} onChange={(c) => update(block.id, c)} />
        )
      case 'categories':
        return (
          <CategoriesEditor
            block={block}
            onChange={(c) => update(block.id, c)}
          />
        )
      case 'promo':
        return (
          <PromoEditor
            block={block}
            legacy={legacyPromo}
            onChange={(c) => update(block.id, c)}
          />
        )
      case 'newsletter':
        return (
          <NewsletterEditor
            block={block}
            onChange={(c) => update(block.id, c)}
          />
        )
      case 'hero':
        return (
          <div className='space-y-3'>
            <p className='text-[12.5px] text-[#6D7175] m-0'>
              The big image slider at the very top. Use the switch above to show
              or hide it, and the arrows to move it. To change the slides
              themselves (images, headings, buttons):
            </p>
            <Link
              href='/dashboard/settings/hero-slider'
              className={`${primaryOutlineBtn} no-underline inline-block`}
            >
              Edit slides
            </Link>
          </div>
        )
      case 'brands':
        return (
          <p className='text-[12.5px] text-[#6D7175] m-0'>
            The scrolling brand logos. They come from the brand names on your
            products, so there is nothing to edit here — just show, hide or move
            it.
          </p>
        )
      case 'reviews':
        return (
          <div className='space-y-3'>
            <p className='text-[12.5px] text-[#6D7175] m-0'>
              The customer-reviews slider. Reviews are picked up automatically;
              approve or remove them on the Reviews page.
            </p>
            <Link
              href='/dashboard/reviews'
              className={`${primaryOutlineBtn} no-underline inline-block`}
            >
              Open Reviews
            </Link>
          </div>
        )
    }
  }

  return (
    <div className='space-y-5 max-w-[980px]'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            {cfg.title}
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5 max-w-[560px]'>
            {cfg.description}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {dirty && (
            <span className='text-[12px] text-[#B98900] font-medium'>
              Unsaved changes
            </span>
          )}
          <Link
            href='/'
            target='_blank'
            className='px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] text-[#202223] font-medium rounded-lg no-underline'
          >
            View homepage
          </Link>
          <button
            type='button'
            onClick={handleSave}
            disabled={saving || loading}
            className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 text-[13px] text-[#6D7175]'>
          Loading...
        </div>
      ) : (
        <>
          {!isCustom && (
            <div className='bg-[#F1F8F5] border border-[#B7DCCB] rounded-xl px-4 py-3 text-[12.5px] text-[#1F5F48]'>
              You’re looking at the original homepage. Nothing changes on the
              website until you edit something and click <b>Save</b>.
            </div>
          )}

          {shown.length === 0 && (
            <div className='bg-white border border-dashed border-[#C9CCCF] rounded-xl p-6 text-[13px] text-[#6D7175] text-center'>
              {cfg.emptyText}
            </div>
          )}

          <ol className='m-0 p-0 list-none space-y-3'>
            {shown.map((block, i) => {
              const open = openId === block.id
              return (
                <li
                  key={block.id}
                  id={`home-block-${block.id}`}
                  className={`bg-white border rounded-xl ${
                    block.enabled ? 'border-[#E1E3E5]' : 'border-[#F5C26B]'
                  }`}
                >
                  <div className='flex items-center gap-3 p-3.5 flex-wrap'>
                    <Toggle
                      on={block.enabled}
                      onClick={() =>
                        update(block.id, { enabled: !block.enabled })
                      }
                      label={`Show ${blockTitle(block)}`}
                    />
                    <button
                      type='button'
                      onClick={() => setOpenId(open ? null : block.id)}
                      className='flex-1 min-w-[200px] text-left bg-transparent border-none cursor-pointer p-0 flex items-center gap-3'
                      aria-expanded={open}
                    >
                      <span className='text-[20px] leading-none'>
                        {BLOCK_EMOJI[block.type]}
                      </span>
                      <span className='min-w-0'>
                        <span className='block text-[14px] font-semibold text-[#202223] truncate'>
                          {blockTitle(block)}
                        </span>
                        <span className='block text-[11.5px] text-[#6D7175] truncate'>
                          {HOME_BLOCK_LABELS[block.type]} ·{' '}
                          {block.enabled ? (
                            blockSubtitle(block)
                          ) : (
                            <span className='text-[#B98900] font-medium'>
                              Hidden on the website
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <div className='flex items-center gap-1.5'>
                      <button
                        type='button'
                        className={iconBtn}
                        onClick={() => move(block.id, -1)}
                        disabled={i === 0}
                        title='Move up'
                        aria-label='Move section up'
                      >
                        ↑
                      </button>
                      <button
                        type='button'
                        className={iconBtn}
                        onClick={() => move(block.id, 1)}
                        disabled={i === shown.length - 1}
                        title='Move down'
                        aria-label='Move section down'
                      >
                        ↓
                      </button>
                      <button
                        type='button'
                        className={ghostBtn}
                        onClick={() => setOpenId(open ? null : block.id)}
                      >
                        {open ? 'Close' : 'Edit'}
                      </button>
                      {HOME_REPEATABLE_TYPES.includes(block.type) && (
                        <button
                          type='button'
                          className={dangerBtn}
                          onClick={() => remove(block)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {open && (
                    <div className='border-t border-[#E1E3E5] p-4'>
                      {renderEditor(block)}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>

          <div className='bg-white border border-[#E1E3E5] rounded-xl p-4 space-y-3'>
            <div className='flex items-center gap-3 flex-wrap'>
              <button
                type='button'
                onClick={() => setAddOpen((v) => !v)}
                className={primaryOutlineBtn}
              >
                {addOpen ? '− Close' : '+ Add'}
              </button>
              {view === 'all' && (
                <button
                  type='button'
                  onClick={resetToDefault}
                  className={ghostBtn}
                >
                  Reset to original homepage
                </button>
              )}
              <span className='text-[12px] text-[#8C9196]'>
                Changes go live when you click Save
                {view !== 'all' && (
                  <>
                    {' · '}
                    <Link
                      href='/dashboard/settings/home-page'
                      className='text-[#008060] no-underline hover:underline'
                    >
                      Change where things sit on the page
                    </Link>
                  </>
                )}
              </span>
            </div>
            {addOpen && (
              <div className='space-y-3'>
                {cfg.canAddProductRows && (
                  <div>
                    <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide mb-2'>
                      Product row
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {PRODUCT_PRESETS.map((p) => (
                        <button
                          key={p.key}
                          type='button'
                          className={`${ghostBtn} text-left`}
                          onClick={() =>
                            addBlock(p.make() as HomeProductsBlock)
                          }
                        >
                          <span className='block font-semibold'>{p.label}</span>
                          <span className='block text-[11px] text-[#6D7175] font-normal'>
                            {p.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(cfg.canAddPromo || cfg.canAddTiles) && (
                  <div>
                    <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide mb-2'>
                      Banner
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {cfg.canAddPromo && (
                        <button
                          type='button'
                          className={`${ghostBtn} text-left`}
                          onClick={() => addBlock(newPromoBlock())}
                        >
                          <span className='block font-semibold'>
                            Discount banner
                          </span>
                          <span className='block text-[11px] text-[#6D7175] font-normal'>
                            Offer with code and button
                          </span>
                        </button>
                      )}
                      {cfg.canAddTiles && (
                        <button
                          type='button'
                          className={`${ghostBtn} text-left`}
                          onClick={() => addBlock(newCategoriesBlock())}
                        >
                          <span className='block font-semibold'>
                            Photo tiles
                          </span>
                          <span className='block text-[11px] text-[#6D7175] font-normal'>
                            Another “browse by” row
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
