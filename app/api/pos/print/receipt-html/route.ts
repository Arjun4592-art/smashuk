import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import {
  putReceiptHtml,
  takeReceiptHtml,
  peekReceiptHtml,
} from '@/lib/printer/receipt-cache'

export const runtime = 'nodejs'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

// Called from the POS (authenticated) right before triggering PassPRNT —
// stashes the already-built receipt HTML and hands back a token short
// enough to embed in the intent URI in place of the full HTML.
export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { html?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.html || typeof body.html !== 'string') {
    return NextResponse.json({ error: 'html is required' }, { status: 400 })
  }

  const token = putReceiptHtml(body.html)
  return NextResponse.json({ token })
}

// Android/Chrome (and some HTTP clients PassPRNT uses under the hood) issue
// a HEAD request to validate a URL before the real GET that fetches content.
// Without this handler, Next.js silently serves HEAD requests through the
// GET handler below, which would consume the single-use token before
// PassPRNT ever does its real fetch — receipt "prints" nothing, no error.
// HEAD must NOT delete the entry, only report whether it's still there.
export async function HEAD(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const exists = token ? peekReceiptHtml(token) : false
  return new NextResponse(null, {
    status: exists ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Called by PassPRNT itself (no auth — it's a separate native app, not a
// browser tab with our session cookie). Safe because tokens are single-use,
// expire quickly, and are unguessable (crypto.randomUUID).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const html = token ? takeReceiptHtml(token) : null

  if (!html) {
    return new NextResponse('Receipt link expired or already used.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
