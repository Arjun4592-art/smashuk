'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { usePOSStore } from '@/store/posStore'
import {
  fetchPOSIndex,
  fetchPOSDetailsForVariants,
  fetchPOSFavorites,
  updatePOSFavorites,
  type POSIndexEntry,
  type POSDetailEntry,
} from '@/lib/api/pos'
import ProductSearch from '@/components/pos/ProductSearch'
import CategoryFilter from '@/components/pos/CategoryFilter'
import NewFavoriteTabInput from '@/components/pos/NewFavoriteTabInput'
import ConfirmDialog from '@/components/pos/ConfirmDialog'
import { PencilIcon, TrashIcon } from '@/components/pos/TabActionIcons'
import ProductGrid, { POSProduct } from '@/components/pos/ProductGrid'
import VariantPickerModal from '@/components/pos/VariantPickerModal'
import { playScanBeep } from '@/lib/utils'
import { CURRENCY_SYMBOL } from '@/lib/constants'
import {
  DEFAULT_FAVORITE_TABS,
  MAX_CUSTOM_TABS,
  MAX_FAVORITES_PER_TAB,
  emptyFavorites,
  type FavoriteTab,
  type FavoriteTabId,
  type FavoritesMap,
} from '@/lib/pos/favorites'

const MAX_SEARCH_RESULTS = 60
const STOCK_PENDING_PLACEHOLDER = 9999

export default function FavoritesPage() {
  const router = useRouter()
  const { items, total, soundOnScan, addItem } = usePOSStore()
  const [tabs, setTabs] = useState<FavoriteTab[]>(DEFAULT_FAVORITE_TABS)
  const [activeTabId, setActiveTabId] = useState<FavoriteTabId>(
    DEFAULT_FAVORITE_TABS[0].id,
  )
  const [addingTab, setAddingTab] = useState(false)
  const [renamingTab, setRenamingTab] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletingTab, setDeletingTab] = useState(false)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<FavoritesMap>(() =>
    emptyFavorites(),
  )
  const [indexEntries, setIndexEntries] = useState<POSIndexEntry[]>([])
  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [detailsByVariantId, setDetailsByVariantId] = useState<
    Map<string, POSDetailEntry>
  >(new Map())
  const [variantPickerFor, setVariantPickerFor] = useState<POSProduct[] | null>(
    null,
  )
  const favoritesRef = useRef(favorites)
  favoritesRef.current = favorites
  const indexLoadInFlight = useRef(false)

  const loadIndex = useCallback(async () => {
    if (indexLoadInFlight.current) return
    indexLoadInFlight.current = true
    setIndexLoading(true)
    setIndexError(null)
    try {
      const { entries } = await fetchPOSIndex()
      setIndexEntries(entries)
    } catch (err: unknown) {
      setIndexError(
        err instanceof Error ? err.message : 'Failed to load products',
      )
    } finally {
      setIndexLoading(false)
      indexLoadInFlight.current = false
    }
  }, [])

  useEffect(() => {
    loadIndex()
  }, [loadIndex])

  useEffect(() => {
    fetchPOSFavorites()
      .then(({ favorites: saved, tabs: savedTabs }) => {
        setFavorites(saved)
        setTabs(savedTabs)
      })
      .catch(() => toast.error('Could not load Favorites'))
  }, [])

  const toggleFavorite = useCallback(
    async (tab: FavoriteTabId, productId: string) => {
      const current = favoritesRef.current
      const wasPinned = (current[tab] ?? []).includes(productId)
      if (!wasPinned && (current[tab] ?? []).length >= MAX_FAVORITES_PER_TAB) {
        toast.error(`This tab already has ${MAX_FAVORITES_PER_TAB} favorites`)
        return
      }
      const apply = (map: FavoritesMap, pin: boolean): FavoritesMap => ({
        ...map,
        [tab]: pin
          ? (map[tab] ?? []).includes(productId)
            ? map[tab]
            : [...(map[tab] ?? []), productId]
          : (map[tab] ?? []).filter((id) => id !== productId),
      })
      const optimistic = apply(current, !wasPinned)
      favoritesRef.current = optimistic
      setFavorites(optimistic)
      try {
        const saved = await updatePOSFavorites({
          action: wasPinned ? 'unpin' : 'pin',
          tab,
          productId,
        })
        favoritesRef.current = saved.favorites
        setFavorites(saved.favorites)
        setTabs(saved.tabs)
      } catch (err: unknown) {
        const reverted = apply(favoritesRef.current, wasPinned)
        favoritesRef.current = reverted
        setFavorites(reverted)
        toast.error(
          err instanceof Error ? err.message : 'Could not save favorite',
        )
      }
    },
    [],
  )

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const pinnedForTab = favorites[activeTab.id] ?? []

  const createTab = useCallback(async (label: string) => {
    const saved = await updatePOSFavorites({ action: 'addTab', label })
    favoritesRef.current = saved.favorites
    setFavorites(saved.favorites)
    setTabs(saved.tabs)
    if (saved.tabId) setActiveTabId(saved.tabId)
    setAddingTab(false)
  }, [])

  const renameActiveTab = useCallback(
    async (label: string) => {
      if (!activeTab.custom) return
      const saved = await updatePOSFavorites({
        action: 'renameTab',
        tab: activeTab.id,
        label,
      })
      favoritesRef.current = saved.favorites
      setFavorites(saved.favorites)
      setTabs(saved.tabs)
      setRenamingTab(false)
    },
    [activeTab],
  )

  const deleteActiveTab = useCallback(async () => {
    if (!activeTab.custom) return
    setDeletingTab(true)
    try {
      const saved = await updatePOSFavorites({
        action: 'deleteTab',
        tab: activeTab.id,
      })
      favoritesRef.current = saved.favorites
      setFavorites(saved.favorites)
      setTabs(saved.tabs)
      setActiveTabId(saved.tabs[0].id)
      setRenamingTab(false)
      toast.success(`Deleted "${activeTab.label}" tab`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete tab')
    } finally {
      setDeletingTab(false)
      setConfirmingDelete(false)
    }
  }, [activeTab])
  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const visibleEntries = useMemo(() => {
    if (isSearching) {
      const matches: POSIndexEntry[] = []
      const seenProducts = new Set<string>()
      for (const e of indexEntries) {
        const hit =
          (e.name ?? '').toLowerCase().includes(query) ||
          (e.sku ?? '').toLowerCase().includes(query) ||
          (e.ean ?? '').includes(query) ||
          (e.barcode ?? '').toLowerCase().includes(query)
        if (!hit) continue
        if (!seenProducts.has(e.productId)) {
          if (seenProducts.size >= MAX_SEARCH_RESULTS) continue
          seenProducts.add(e.productId)
        }
        matches.push(e)
      }
      return matches
    }
    const order = new Map(pinnedForTab.map((id, i) => [id, i]))
    return indexEntries
      .filter((e) => order.has(e.productId))
      .sort((a, b) => order.get(a.productId)! - order.get(b.productId)!)
  }, [indexEntries, isSearching, query, pinnedForTab])

  const visibleProductKey = useMemo(
    () => Array.from(new Set(visibleEntries.map((e) => e.productId))).join(','),
    [visibleEntries],
  )

  useEffect(() => {
    const productIds = Array.from(
      new Set(visibleEntries.map((e) => e.productId)),
    )
    const variantIds = visibleEntries.map((e) => e.variantId)
    if (productIds.length === 0) return
    const timer = setTimeout(() => {
      fetchPOSDetailsForVariants(productIds, variantIds)
        .then(({ byVariantId }) => {
          setDetailsByVariantId((prev) => {
            const merged = new Map(prev)
            for (const [k, v] of byVariantId) merged.set(k, v)
            return merged
          })
        })
        .catch((err) => {
          console.error('[POS] Details fetch failed:', err)
        })
    }, 250)
    return () => clearTimeout(timer)
  }, [visibleProductKey])

  const toPOSProduct = useCallback(
    (entry: POSIndexEntry): POSProduct => {
      const detail = detailsByVariantId.get(entry.variantId)
      const first = entry.sizes[0]
      return {
        id: entry.productId,
        name: entry.name,
        brand: entry.brand,
        sku: entry.sku,
        price: detail?.price ?? 0,
        stock: detail?.stock ?? STOCK_PENDING_PLACEHOLDER,
        category: entry.category,
        image: detail?.image,
        channel: detail?.channel ?? 'both',
        variantId: entry.variantId,
        size: first?.value,
        sizeOptionTitle: first?.title,
        pricePending: !detail,
      }
    },
    [detailsByVariantId],
  )

  const productGroups = useMemo(() => {
    const byId = new Map<string, POSProduct[]>()
    for (const e of visibleEntries) {
      const p = toPOSProduct(e)
      const list = byId.get(p.id)
      if (list) list.push(p)
      else byId.set(p.id, [p])
    }
    return byId
  }, [visibleEntries, toPOSProduct])

  const gridProducts = useMemo(
    () =>
      Array.from(productGroups.values()).map((group) => {
        const representative = group.find((v) => v.stock > 0) ?? group[0]
        return group.length > 1
          ? {
              ...representative,
              size: undefined,
              variantCountOverride: group.length,
            }
          : representative
      }),
    [productGroups],
  )

  const handleAdd = useCallback(
    (p: POSProduct) => {
      if (!p.variantId) {
        toast.error(`${p.name} is missing a Medusa variant`)
        return
      }
      addItem(
        {
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          stock: p.stock,
          sku: p.sku,
          category: p.category,
          images: [],
          slug: p.id,
          description: '',
          isActive: true,
          isOutOfStock: p.stock === 0,
          lowStockThreshold: 3,
          tags: [],
          variantId: p.variantId,
        } as any,
        1,
        {
          id: p.variantId,
          title: p.size,
        } as any,
      )
      if (soundOnScan) playScanBeep()
      toast.success(`Added ${p.name}${p.size ? ` — ${p.size}` : ''}`, {
        duration: 1200,
      })
    },
    [addItem, soundOnScan],
  )

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const activeLabel = activeTab.label
  const customTabCount = tabs.filter((t) => t.custom).length

  return (
    <div className='flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2.5'>
      {indexError && (
        <div
          className='flex items-center justify-between px-3 py-2 rounded-lg text-xs'
          style={{
            background: '#FFF4F4',
            border: '1px solid #FECACA',
            color: '#D82C0D',
          }}
        >
          <span>Products failed to load: {indexError}</span>
          <button
            onClick={() => loadIndex()}
            className='font-medium underline ml-2'
          >
            Retry
          </button>
        </div>
      )}

      <div className='flex items-center gap-2'>
        <div className='flex-1 min-w-0'>
          <CategoryFilter
            showAll={false}
            categories={tabs.map((t) => t.label)}
            selected={activeLabel}
            onChange={(label) => {
              const tab = tabs.find((t) => t.label === label)
              if (tab) {
                setActiveTabId(tab.id)
                setRenamingTab(false)
              }
            }}
          />
        </div>
        {customTabCount < MAX_CUSTOM_TABS && (
          <button
            type='button'
            onClick={() => {
              setAddingTab((v) => !v)
              setRenamingTab(false)
            }}
            className='shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border'
            style={{
              background: '#FFFFFF',
              color: '#008060',
              borderColor: '#008060',
            }}
          >
            + New tab
          </button>
        )}
      </div>

      {addingTab && (
        <NewFavoriteTabInput
          onSubmit={createTab}
          onCancel={() => setAddingTab(false)}
        />
      )}

      {renamingTab && activeTab.custom && (
        <NewFavoriteTabInput
          key={activeTab.id}
          initialValue={activeTab.label}
          placeholder='Tab name'
          submitLabel='Save'
          busyLabel='Saving...'
          onSubmit={renameActiveTab}
          onCancel={() => setRenamingTab(false)}
        />
      )}

      <ProductSearch value={search} onChange={setSearch} />

      <div className='flex items-center justify-between px-1'>
        <p className='text-[11px]' style={{ color: '#8C9196' }}>
          {isSearching
            ? `Search results — tap the star to add to ${activeLabel}`
            : `${pinnedForTab.length} pinned in ${activeLabel}`}
        </p>
        {activeTab.custom && !isSearching && (
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => {
                setRenamingTab((v) => !v)
                setAddingTab(false)
              }}
              aria-pressed={renamingTab}
              className='inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-[#F6F6F7]'
              style={{
                borderColor: renamingTab ? '#008060' : '#C9CCCF',
                background: renamingTab ? '#F1F8F5' : '#FFFFFF',
                color: renamingTab ? '#008060' : '#202223',
              }}
            >
              <PencilIcon size={15} />
              Rename
            </button>
            <button
              type='button'
              onClick={() => setConfirmingDelete(true)}
              className='inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-[#FFF4F4]'
              style={{
                borderColor: '#F3C4BC',
                background: '#FFFFFF',
                color: '#D82C0D',
              }}
            >
              <TrashIcon size={15} />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className='flex-1 min-h-0 overflow-y-auto'>
        <ProductGrid
          products={gridProducts}
          isLoading={indexLoading}
          pinnedIds={new Set(pinnedForTab)}
          onTogglePin={(p) => toggleFavorite(activeTab.id, p.id)}
          emptyMessage={
            isSearching
              ? 'No products found'
              : `Nothing pinned in ${activeLabel} yet — search above and tap the star to add products`
          }
          onAdd={(p) => {
            const group = productGroups.get(p.id) ?? [p]
            if (group.length > 1) {
              setVariantPickerFor(group)
              return
            }
            handleAdd(p)
          }}
        />
      </div>

      {cartCount > 0 && (
        <button
          onClick={() => router.push('/pos/terminal/billing')}
          className='shrink-0 flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold'
          style={{ background: '#008060', color: '#FFFFFF' }}
        >
          <span>
            {cartCount} item{cartCount === 1 ? '' : 's'} in cart
          </span>
          <span>
            Go to Billing · {CURRENCY_SYMBOL}
            {total.toFixed(2)}
          </span>
        </button>
      )}

      {variantPickerFor && (
        <VariantPickerModal
          productName={variantPickerFor[0].name}
          image={variantPickerFor[0].image}
          variants={variantPickerFor}
          onSelect={(v) => {
            handleAdd(v)
            setVariantPickerFor(null)
          }}
          onClose={() => setVariantPickerFor(null)}
        />
      )}

      {confirmingDelete && activeTab.custom && (
        <ConfirmDialog
          title='Delete this tab?'
          message={
            <>
              <span className='font-medium' style={{ color: '#202223' }}>
                {activeTab.label}
              </span>{' '}
              will be removed
              {pinnedForTab.length > 0 ? (
                <>
                  {' '}
                  and{' '}
                  <span className='font-medium' style={{ color: '#202223' }}>
                    {pinnedForTab.length} pinned product
                    {pinnedForTab.length !== 1 ? 's' : ''}
                  </span>{' '}
                  will be unpinned from it
                </>
              ) : null}
              . The products themselves are not deleted.
            </>
          }
          confirmLabel='Delete tab'
          busy={deletingTab}
          onConfirm={deleteActiveTab}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
