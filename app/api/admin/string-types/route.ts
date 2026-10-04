import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { STRING_TYPES } from '@/lib/stringing'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

async function loadStore(authHeader: string) {
  const res = await fetch(
    `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
    { headers: { Authorization: authHeader } },
  )
  const data = await safeJson(res)
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to load store (${res.status})`)
  }
  const store = data.stores?.[0]
  if (!store) throw new Error('No store found')
  return store as { id: string; metadata?: Record<string, any> | null }
}

function readCustom(metadata?: Record<string, any> | null): string[] {
  const raw = metadata?.stringTypes
  if (!Array.isArray(raw)) return []
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

// GET: the owner's own string types (the built-in ones live in lib/stringing).
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const store = await loadStore(authHeader)
    return NextResponse.json({ custom: readCustom(store.metadata) })
  } catch (err: any) {
    console.error('[API] string-types GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: { action: 'add' | 'remove', label }
// A custom type is stored as its label. Products save that same text in
// metadata.string_type, and the website already shows unknown values as their
// own heading in the String Selection dropdown — so nothing else needs to change.
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const action = body?.action
    const label =
      typeof body?.label === 'string'
        ? body.label.trim().replace(/\s+/g, ' ')
        : ''
    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (!label) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (label.length > 40) {
      return NextResponse.json(
        { error: 'Name must be 40 characters or fewer' },
        { status: 400 },
      )
    }

    const store = await loadStore(authHeader)
    const current = readCustom(store.metadata)
    const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
    let next = current

    if (action === 'add') {
      const builtIn = STRING_TYPES.find(
        (t) => same(t.label, label) || same(t.value, label),
      )
      if (builtIn) {
        // Already available — hand back the existing option instead of failing.
        return NextResponse.json({
          custom: current,
          added: builtIn.value,
          builtIn: true,
        })
      }
      const existing = current.find((c) => same(c, label))
      if (existing) {
        return NextResponse.json({ custom: current, added: existing })
      }
      if (current.length >= 50) {
        return NextResponse.json(
          { error: 'Too many custom string types (limit 50)' },
          { status: 400 },
        )
      }
      next = [...current, label]
    } else {
      next = current.filter((c) => !same(c, label))
    }

    const res = await fetch(`${MEDUSA_URL}/admin/stores/${store.id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: { ...(store.metadata ?? {}), stringTypes: next },
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save string type' },
        { status: res.status },
      )
    }
    return NextResponse.json({
      custom: next,
      added: action === 'add' ? label : undefined,
    })
  } catch (err: any) {
    console.error('[API] string-types POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
