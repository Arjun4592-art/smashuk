import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  resolveSalesChannels,
  type SellingChannel,
} from '@/lib/api/selling-channels'
import { invalidateCatalog } from '@/lib/catalog/source'
import {
  getDefaultStockLocationId,
  syncVariantInventory,
} from '@/lib/api/inventory-sync'
import {
  markAdminProductsStale,
  removeAdminProduct,
  upsertAdminProduct,
} from '@/lib/api/admin-products-server'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Give the hosting platform room to finish a chunk (ignored where unsupported).
export const maxDuration = 60

// The dashboard sends products in small chunks (and shows progress), so a
// single request never has to touch more than this many.
const MAX_IDS_PER_REQUEST = 25
// Medusa has been sensitive to load, so only a few calls at a time.
const CONCURRENCY = 3
// Up to this many updated products are refreshed one by one in the dashboard
// list cache; more than that just marks the cache stale (one refresh later).
const UPSERT_LIMIT = 15

const STATUSES = ['published', 'draft', 'rejected'] as const
const CHANNELS = ['both', 'website', 'store'] as const

const CATEGORY_MODES = ['replace', 'add', 'remove'] as const
const CROSS_SELL_MODES = ['add', 'replace', 'clear'] as const
// Same sane limits the product page uses (discount 1–99 %).
const MAX_CROSS_SELLS = 20

interface BulkCrossSellItem {
  productId: string
  productTitle: string
  discountPct: number
}

interface BulkChanges {
  status?: (typeof STATUSES)[number]
  /**
   * The category to apply. What happens to it depends on `categoryMode`:
   * 'replace' (default) -> ALL categories of each product become just this one,
   * 'add'               -> it is added next to the categories the product has,
   * 'remove'            -> it is taken off the product (others are kept).
   */
  categoryId?: string
  categoryMode?: (typeof CATEGORY_MODES)[number]
  /**
   * 'add'     -> items are added to each product's existing cross-sells
   *              (same product again just updates its discount),
   * 'replace' -> each product's cross-sells become exactly these items,
   * 'clear'   -> every cross-sell is removed (items ignored).
   */
  crossSells?: {
    mode: (typeof CROSS_SELL_MODES)[number]
    items: BulkCrossSellItem[]
  }
  brand?: string
  sport?: string
  /** '' removes the badge. undefined = leave as is. */
  badge?: string
  sellingChannel?: SellingChannel
}

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {} as any
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 200) } as any
  }
}

function errorText(data: any, status: number) {
  return String(data?.message ?? data?.error ?? `HTTP ${status}`).slice(0, 200)
}

async function runPool<T>(
  items: string[],
  worker: (item: string) => Promise<T>,
): Promise<void> {
  let next = 0
  const lanes = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++]
        await worker(item)
      }
    },
  )
  await Promise.all(lanes)
}

export async function POST(req: NextRequest) {
  try {
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => null)
    const action = body?.action
    const ids: string[] = Array.isArray(body?.ids)
      ? Array.from(
          new Set(
            body.ids.filter(
              (i: unknown) => typeof i === 'string' && i.startsWith('prod_'),
            ),
          ),
        )
      : []

    if (action !== 'delete' && action !== 'update' && action !== 'stock') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No products given' }, { status: 400 })
    }
    if (ids.length > MAX_IDS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Send at most ${MAX_IDS_PER_REQUEST} products per request` },
        { status: 400 },
      )
    }

    const ok: string[] = []
    const failed: { id: string; error: string }[] = []

    // ---------------------------------------------------------------- delete
    if (action === 'delete') {
      await runPool(ids, async (id) => {
        try {
          const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
            method: 'DELETE',
            headers: { Authorization: authorization },
          })
          const data = await safeJson(res)
          if (!res.ok) {
            failed.push({ id, error: errorText(data, res.status) })
            return
          }
          removeAdminProduct(id)
          ok.push(id)
        } catch (err: any) {
          failed.push({ id, error: err?.message ?? 'Delete failed' })
        }
      })
      if (ok.length > 0) invalidateCatalog()
      return NextResponse.json({ ok, failed })
    }

    // ----------------------------------------------------------------- stock
    // Sets the AVAILABLE stock of every variant of every given product to the
    // same number (0 = reset). Single-variant and multi-variant products are
    // treated the same: all their variants get the quantity.
    if (action === 'stock') {
      const quantity = Number(body?.quantity ?? 0)
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) {
        return NextResponse.json(
          { error: 'Quantity must be a whole number, 0 or more' },
          { status: 400 },
        )
      }
      const locationId = await getDefaultStockLocationId(authorization).catch(
        () => null,
      )
      if (!locationId) {
        return NextResponse.json(
          {
            error:
              'No stock location found. Add one in Medusa → Settings → Stock Locations.',
          },
          { status: 502 },
        )
      }
      await runPool(ids, async (id) => {
        try {
          const r = await syncVariantInventory(
            id,
            authorization,
            locationId,
            {},
            quantity,
            { applyDefaultToAllVariants: true, skipSharedCheck: true },
          )
          if (r.error) {
            failed.push({ id, error: r.error })
          } else if (r.failed > 0) {
            failed.push({
              id,
              error: `${r.failed} variant${r.failed !== 1 ? 's' : ''} could not be updated`,
            })
          } else {
            ok.push(id)
          }
        } catch (err: any) {
          failed.push({ id, error: err?.message ?? 'Stock update failed' })
        }
      })
      if (ok.length > 0) {
        invalidateCatalog()
        if (ok.length <= UPSERT_LIMIT) {
          for (const id of ok) await upsertAdminProduct(id, authorization)
        } else {
          markAdminProductsStale()
        }
      }
      return NextResponse.json({ ok, failed })
    }

    // ---------------------------------------------------------------- update
    const raw = (body?.changes ?? {}) as Record<string, unknown>
    const changes: BulkChanges = {}
    if (raw.status !== undefined) {
      if (!STATUSES.includes(raw.status as any)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      changes.status = raw.status as BulkChanges['status']
    }
    if (typeof raw.categoryId === 'string' && raw.categoryId) {
      changes.categoryId = raw.categoryId
      if (raw.categoryMode !== undefined) {
        if (!CATEGORY_MODES.includes(raw.categoryMode as any)) {
          return NextResponse.json(
            { error: 'Invalid category mode' },
            { status: 400 },
          )
        }
        changes.categoryMode = raw.categoryMode as BulkChanges['categoryMode']
      }
    }
    if (raw.crossSells !== undefined) {
      const cs = raw.crossSells as any
      const mode = cs?.mode
      if (!CROSS_SELL_MODES.includes(mode)) {
        return NextResponse.json(
          { error: 'Invalid cross-sell mode' },
          { status: 400 },
        )
      }
      const items: BulkCrossSellItem[] = []
      if (mode !== 'clear') {
        const seen = new Set<string>()
        for (const it of Array.isArray(cs?.items) ? cs.items : []) {
          const productId =
            typeof it?.productId === 'string' ? it.productId : ''
          const pct = Number(it?.discountPct)
          if (!productId.startsWith('prod_') || seen.has(productId)) continue
          if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
            return NextResponse.json(
              { error: 'Cross-sell discount must be between 1 and 99 %' },
              { status: 400 },
            )
          }
          seen.add(productId)
          items.push({
            productId,
            productTitle: String(it?.productTitle ?? '').slice(0, 300),
            discountPct: pct,
          })
        }
        if (items.length === 0) {
          return NextResponse.json(
            { error: 'Add at least one cross-sell product' },
            { status: 400 },
          )
        }
        if (items.length > MAX_CROSS_SELLS) {
          return NextResponse.json(
            { error: `At most ${MAX_CROSS_SELLS} cross-sell products` },
            { status: 400 },
          )
        }
      }
      changes.crossSells = { mode, items }
    }
    if (typeof raw.brand === 'string') changes.brand = raw.brand.trim()
    if (typeof raw.sport === 'string') changes.sport = raw.sport.trim()
    if (typeof raw.badge === 'string') changes.badge = raw.badge.trim()
    if (raw.sellingChannel !== undefined) {
      if (!CHANNELS.includes(raw.sellingChannel as any)) {
        return NextResponse.json(
          { error: 'Invalid selling channel' },
          { status: 400 },
        )
      }
      changes.sellingChannel = raw.sellingChannel as SellingChannel
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
    }

    const touchesMetadata =
      changes.brand !== undefined ||
      changes.sport !== undefined ||
      changes.badge !== undefined ||
      changes.crossSells !== undefined
    const categoryMode = changes.categoryMode ?? 'replace'
    // Adding / removing a category needs the product's current categories;
    // replacing it does not.
    const needsCurrentCategories =
      !!changes.categoryId && categoryMode !== 'replace'

    const channels = changes.sellingChannel
      ? await resolveSalesChannels(
          changes.sellingChannel,
          authorization,
          MEDUSA_URL,
        )
      : undefined
    if (changes.sellingChannel && !channels) {
      return NextResponse.json(
        { error: 'Could not resolve sales channels' },
        { status: 502 },
      )
    }

    await runPool(ids, async (id) => {
      try {
        const payload: Record<string, unknown> = {}
        if (changes.status) payload.status = changes.status
        if (changes.categoryId && categoryMode === 'replace')
          payload.categories = [{ id: changes.categoryId }]
        if (channels) payload.sales_channels = channels

        if (touchesMetadata || needsCurrentCategories) {
          // Metadata is sent back whole (like the edit form does), so read the
          // current one first and only change the keys that were asked for.
          // The current categories come with the same call (add / remove).
          const curRes = await fetch(
            `${MEDUSA_URL}/admin/products/${id}?fields=${encodeURIComponent('id,metadata,*categories')}`,
            { headers: { Authorization: authorization } },
          )
          const cur = await safeJson(curRes)
          if (!curRes.ok || !cur.product) {
            failed.push({ id, error: errorText(cur, curRes.status) })
            return
          }

          if (needsCurrentCategories && changes.categoryId) {
            const currentIds: string[] = (cur.product.categories ?? [])
              .map((c: any) => c?.id)
              .filter((cid: unknown): cid is string => typeof cid === 'string')
            const nextIds =
              categoryMode === 'add'
                ? Array.from(new Set([...currentIds, changes.categoryId]))
                : currentIds.filter((cid) => cid !== changes.categoryId)
            payload.categories = nextIds.map((cid) => ({ id: cid }))
          }

          if (touchesMetadata) {
            const metadata: Record<string, unknown> = {
              ...(cur.product.metadata ?? {}),
            }
            const apply = (key: string, value: string | undefined) => {
              if (value === undefined) return
              if (value === '') delete metadata[key]
              else metadata[key] = value
            }
            apply('brand', changes.brand)
            apply('sport', changes.sport)
            apply('badge', changes.badge)

            if (changes.crossSells) {
              const { mode, items } = changes.crossSells
              // A product is never offered as a cross-sell of itself.
              const incoming = items.filter((it) => it.productId !== id)
              if (mode === 'clear') {
                // An empty list (not a deleted key) so it also clears
                // cross-sells if Medusa merges metadata instead of replacing.
                metadata.cross_sells = []
              } else if (mode === 'replace') {
                metadata.cross_sells = incoming
              } else {
                const existing: any[] = Array.isArray(metadata.cross_sells)
                  ? (metadata.cross_sells as any[])
                  : []
                const merged = existing.filter(
                  (e) => !incoming.some((it) => it.productId === e?.productId),
                )
                metadata.cross_sells = [...merged, ...incoming]
              }
            }
            payload.metadata = metadata
          }
        }

        const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify(payload),
        })
        const data = await safeJson(res)
        if (!res.ok) {
          failed.push({ id, error: errorText(data, res.status) })
          return
        }
        ok.push(id)
      } catch (err: any) {
        failed.push({ id, error: err?.message ?? 'Update failed' })
      }
    })

    if (ok.length > 0) {
      // Shop snapshot + dashboard list must reflect the change right away.
      invalidateCatalog()
      if (ok.length <= UPSERT_LIMIT) {
        for (const id of ok) await upsertAdminProduct(id, authorization)
      } else {
        markAdminProductsStale()
      }
    }
    return NextResponse.json({ ok, failed })
  } catch (err: any) {
    console.error('[POST products/bulk]', err)
    return NextResponse.json(
      { error: err?.message ?? 'Bulk request failed' },
      { status: 500 },
    )
  }
}
