import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Give the hosting platform room to finish a chunk (ignored where unsupported).
export const maxDuration = 60

// The dashboard sends customers in small chunks (and shows progress), so a
// single request never has to touch more than this many.
const MAX_IDS_PER_REQUEST = 25
// Medusa has been sensitive to load, so only a few calls at a time.
const CONCURRENCY = 3

async function readJson(res: Response) {
  const text = await res.text()
  if (!text) return {} as any
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 200) } as any
  }
}

async function runPool(
  items: string[],
  worker: (item: string) => Promise<void>,
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

// POST { action: 'delete', ids: string[] } -> { ok: string[], failed: [{id, error}] }
// Manager-only on purpose (no POS sessions): this permanently removes customers.
export async function POST(req: NextRequest) {
  try {
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (body?.action !== 'delete') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    // Only well-formed ids go into the URL path.
    const ids: string[] = Array.isArray(body?.ids)
      ? Array.from(
          new Set(
            body.ids.filter(
              (i: unknown) =>
                typeof i === 'string' && /^[A-Za-z0-9_-]{3,100}$/.test(i),
            ),
          ),
        )
      : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No customers given' }, { status: 400 })
    }
    if (ids.length > MAX_IDS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Send at most ${MAX_IDS_PER_REQUEST} customers per request` },
        { status: 400 },
      )
    }

    const ok: string[] = []
    const failed: { id: string; error: string }[] = []

    await runPool(ids, async (id) => {
      try {
        const res = await fetch(`${MEDUSA_URL}/admin/customers/${id}`, {
          method: 'DELETE',
          headers: { Authorization: authorization },
          signal: AbortSignal.timeout(45_000),
        })
        // 404 = already gone, which is the state the user asked for.
        if (res.ok || res.status === 404) {
          ok.push(id)
          return
        }
        const data = await readJson(res)
        failed.push({
          id,
          error: String(
            data?.message ?? data?.error ?? `HTTP ${res.status}`,
          ).slice(0, 200),
        })
      } catch (err: any) {
        failed.push({ id, error: String(err?.message ?? 'Request failed') })
      }
    })

    console.log(
      `[customers bulk delete] requested ${ids.length}, deleted ${ok.length}, failed ${failed.length}`,
    )
    return NextResponse.json({ ok, failed })
  } catch (err: any) {
    console.error('[admin/customers/bulk] POST error:', err)
    return NextResponse.json(
      { error: 'Failed to delete customers' },
      { status: 500 },
    )
  }
}
