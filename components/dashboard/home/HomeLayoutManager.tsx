'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
  Button,
  Chip,
  DeleteButton,
  Icon,
  IconButton,
  PageHeader,
  Toggle,
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

const BLOCK_ICON: Record<HomeBlockType, (p: { size?: number }) => ReactNode> = {
  hero: (p) => <Icon.Image {...p} />,
  trust: (p) => <Icon.Shield {...p} />,
  categories: (p) => <Icon.Grid {...p} />,
  products: (p) => <Icon.Bag {...p} />,
  promo: (p) => <Icon.Tag {...p} />,
  brands: (p) => <Icon.Building {...p} />,
  reviews: (p) => <Icon.Star {...p} />,
  newsletter: (p) => <Icon.Mail {...p} />,
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
  const [confirmReset, setConfirmReset] = useState(false)
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
    setBlocks(buildDefaultHomeLayout().blocks)
    setOpenId(null)
    setConfirmReset(false)
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

  const openAndScroll = (id: string) => {
    scrollToId.current = id
    setOpenId(id)
    // blocks did not change, so scroll right away
    requestAnimationFrame(() => {
      const el = document.getElementById(`home-block-${id}`)
      if (el) {
        scrollToId.current = null
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
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

  const enabledCount = shown.filter((b) => b.enabled).length

  return (
    <div className='w-full'>
      <PageHeader
        icon={<Icon.Layout size={20} />}
        title={cfg.title}
        description={
          loading
            ? cfg.description
            : isCustom
              ? 'Using your custom homepage.'
              : 'Showing the original homepage.'
        }
        status={loading ? null : dirty ? 'dirty' : 'saved'}
      >
        <a
          href='/'
          target='_blank'
          rel='noreferrer'
          className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2D5D8] bg-white px-3.5 text-[12.5px] font-semibold text-[#202223] no-underline transition-colors hover:bg-[#F6F6F7]'
        >
          <Icon.External size={14} /> View homepage
        </a>
        {view === 'all' &&
          (confirmReset ? (
            <Button onClick={resetToDefault}>
              <span className='text-[#D72C0D]'>Confirm reset?</span>
            </Button>
          ) : (
            <Button onClick={() => setConfirmReset(true)} disabled={loading}>
              <Icon.Reset size={14} /> Reset to original
            </Button>
          ))}
        <Button
          variant='primary'
          onClick={handleSave}
          disabled={saving || loading || !dirty}
        >
          {saving ? <Icon.Spinner size={14} /> : <Icon.Save size={14} />}
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </PageHeader>

      {loading ? (
        <div className='space-y-3'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className='h-[66px] animate-pulse rounded-xl border border-[#E1E3E5] bg-[#F6F7F8]'
            />
          ))}
        </div>
      ) : (
        <div className='space-y-6 pb-10'>
          {!isCustom && (
            <div className='flex items-start gap-2 rounded-xl border border-[#B7DCCB] bg-[#F1F8F5] px-4 py-3 text-[12.5px] text-[#1F5F48]'>
              <span className='mt-0.5 shrink-0'>
                <Icon.Info size={15} />
              </span>
              <span>
                You’re looking at the original homepage. Nothing changes on the
                website until you edit something and click <b>Save changes</b>.
              </span>
            </div>
          )}

          {shown.length > 0 && (
            <div className='rounded-xl border border-[#E1E3E5] bg-white p-4'>
              <div className='mb-2.5 flex items-center justify-between'>
                <p className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
                  Page outline
                </p>
                <p className='text-[11.5px] text-[#8C9196]'>
                  Top to bottom as visitors see it · click a section to edit
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-1.5 rounded-lg border border-[#F1F2F3] bg-[#FAFAFA] p-2'>
                {shown.map((b, i) => (
                  <button
                    key={b.id}
                    type='button'
                    onClick={() => openAndScroll(b.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                      b.enabled
                        ? 'border-[#E1E3E5] bg-white text-[#202223] hover:border-[#008060] hover:text-[#008060]'
                        : 'border-dashed border-[#C9CCCF] bg-transparent text-[#8C9196] line-through'
                    }`}
                  >
                    <span className='text-[10.5px] font-semibold text-[#8C9196] no-underline'>
                      {i + 1}
                    </span>
                    {blockTitle(b)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className='space-y-3'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[#202223]'>
                  Sections
                </h2>
                <p className='text-[12.5px] text-[#6D7175]'>
                  {cfg.description}{' '}
                  <span className='text-[#8C9196]'>
                    ({enabledCount} of {shown.length} visible)
                  </span>
                </p>
              </div>
              <Button onClick={() => setAddOpen((v) => !v)}>
                {addOpen ? (
                  <>
                    <Icon.Close size={14} /> Close
                  </>
                ) : (
                  <>
                    <Icon.Plus size={14} /> Add section
                  </>
                )}
              </Button>
            </div>

            {addOpen && (
              <div className='space-y-4 rounded-xl border border-[#E1E3E5] bg-[#FAFBFB] p-4'>
                {cfg.canAddProductRows && (
                  <div>
                    <p className='mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
                      Product row
                    </p>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                      {PRODUCT_PRESETS.map((p) => (
                        <button
                          key={p.key}
                          type='button'
                          className='flex items-start gap-2.5 rounded-lg border border-[#E1E3E5] bg-white p-3 text-left cursor-pointer transition-colors hover:border-[#008060] hover:bg-[#F1F8F5]'
                          onClick={() =>
                            addBlock(p.make() as HomeProductsBlock)
                          }
                        >
                          <span className='mt-0.5 text-[#008060]'>
                            <Icon.Bag size={16} />
                          </span>
                          <span className='min-w-0'>
                            <span className='block text-[13px] font-semibold text-[#202223]'>
                              {p.label}
                            </span>
                            <span className='block text-[11.5px] text-[#6D7175]'>
                              {p.hint}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(cfg.canAddPromo || cfg.canAddTiles) && (
                  <div>
                    <p className='mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
                      Banner
                    </p>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                      {cfg.canAddPromo && (
                        <button
                          type='button'
                          className='flex items-start gap-2.5 rounded-lg border border-[#E1E3E5] bg-white p-3 text-left cursor-pointer transition-colors hover:border-[#008060] hover:bg-[#F1F8F5]'
                          onClick={() => addBlock(newPromoBlock())}
                        >
                          <span className='mt-0.5 text-[#008060]'>
                            <Icon.Tag size={16} />
                          </span>
                          <span className='min-w-0'>
                            <span className='block text-[13px] font-semibold text-[#202223]'>
                              Discount banner
                            </span>
                            <span className='block text-[11.5px] text-[#6D7175]'>
                              Offer with code and button
                            </span>
                          </span>
                        </button>
                      )}
                      {cfg.canAddTiles && (
                        <button
                          type='button'
                          className='flex items-start gap-2.5 rounded-lg border border-[#E1E3E5] bg-white p-3 text-left cursor-pointer transition-colors hover:border-[#008060] hover:bg-[#F1F8F5]'
                          onClick={() => addBlock(newCategoriesBlock())}
                        >
                          <span className='mt-0.5 text-[#008060]'>
                            <Icon.Grid size={16} />
                          </span>
                          <span className='min-w-0'>
                            <span className='block text-[13px] font-semibold text-[#202223]'>
                              Photo tiles
                            </span>
                            <span className='block text-[11.5px] text-[#6D7175]'>
                              Another “browse by” row
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {shown.length === 0 && (
              <div className='rounded-xl border border-dashed border-[#C9CCCF] py-8 text-center text-[13px] text-[#8C9196]'>
                {cfg.emptyText}
              </div>
            )}

            <ol className='m-0 list-none space-y-3 p-0'>
              {shown.map((block, i) => {
                const open = openId === block.id
                return (
                  <li
                    key={block.id}
                    id={`home-block-${block.id}`}
                    className={`scroll-mt-24 rounded-xl border transition-shadow ${
                      open
                        ? 'border-[#B8BCC0] shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
                        : 'border-[#E1E3E5]'
                    } ${block.enabled ? 'bg-white' : 'bg-[#FAFBFB]'}`}
                  >
                    <div className='flex items-center gap-3 px-4 py-3'>
                      <button
                        type='button'
                        onClick={() => setOpenId(open ? null : block.id)}
                        aria-expanded={open}
                        className='flex min-w-0 flex-1 items-center gap-3 border-none bg-transparent p-0 text-left cursor-pointer'
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                            block.enabled
                              ? 'border-[#E1E3E5] bg-[#F6F7F8] text-[#4A4F55]'
                              : 'border-dashed border-[#C9CCCF] bg-white text-[#8C9196] opacity-60'
                          }`}
                        >
                          {BLOCK_ICON[block.type]({ size: 18 })}
                        </span>
                        <span className='min-w-0'>
                          <span
                            className={`block truncate text-[14px] font-semibold ${
                              block.enabled
                                ? 'text-[#202223]'
                                : 'text-[#8C9196]'
                            }`}
                          >
                            {blockTitle(block)}
                          </span>
                          <span className='mt-0.5 flex flex-wrap items-center gap-1.5'>
                            <Chip>{HOME_BLOCK_LABELS[block.type]}</Chip>
                            <span className='truncate text-[11.5px] text-[#6D7175]'>
                              {blockSubtitle(block)}
                            </span>
                            {!block.enabled && (
                              <Chip tone='amber'>Hidden on website</Chip>
                            )}
                          </span>
                        </span>
                      </button>

                      <div className='flex shrink-0 items-center gap-1'>
                        <span className='mr-1.5 hidden items-center gap-2 sm:flex'>
                          <span className='text-[12px] text-[#6D7175]'>
                            {block.enabled ? 'Visible' : 'Hidden'}
                          </span>
                          <Toggle
                            on={block.enabled}
                            onClick={() =>
                              update(block.id, { enabled: !block.enabled })
                            }
                            label={`Show ${blockTitle(block)}`}
                          />
                        </span>
                        <span className='sm:hidden'>
                          <Toggle
                            on={block.enabled}
                            onClick={() =>
                              update(block.id, { enabled: !block.enabled })
                            }
                            label={`Show ${blockTitle(block)}`}
                          />
                        </span>
                        <span className='mx-1 h-5 w-px bg-[#E1E3E5]' />
                        <IconButton
                          label='Move section up'
                          disabled={i === 0}
                          onClick={() => move(block.id, -1)}
                        >
                          <Icon.Up size={15} />
                        </IconButton>
                        <IconButton
                          label='Move section down'
                          disabled={i === shown.length - 1}
                          onClick={() => move(block.id, 1)}
                        >
                          <Icon.Down size={15} />
                        </IconButton>
                        {HOME_REPEATABLE_TYPES.includes(block.type) && (
                          <DeleteButton
                            label='Delete section'
                            onConfirm={() => remove(block)}
                          />
                        )}
                        <IconButton
                          label={open ? 'Collapse' : 'Edit section'}
                          onClick={() => setOpenId(open ? null : block.id)}
                        >
                          <Icon.Chevron
                            size={16}
                            className={`transition-transform duration-200 ${
                              open ? 'rotate-180' : ''
                            }`}
                          />
                        </IconButton>
                      </div>
                    </div>
                    {open && (
                      <div className='border-t border-[#E1E3E5] px-5 py-5'>
                        {renderEditor(block)}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            {view !== 'all' && (
              <p className='text-[12px] text-[#8C9196]'>
                Want to change where things sit on the page?{' '}
                <Link
                  href='/dashboard/settings/home-page'
                  className='font-medium text-[#008060] no-underline hover:underline'
                >
                  Open All Sections & Order
                </Link>
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
