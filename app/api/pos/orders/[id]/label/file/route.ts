import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

// POS version of /api/admin/orders/[id]/shipping-label/file — see that
// file's comment for why this proxy exists (avoids handing the browser
// Parcel2Go's cross-origin label URL, which breaks the print iframe with
// "Blocked a frame ... from accessing a cross-origin frame").
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

function parseDataUri(
  uri: string,
): { contentType: string; buffer: Buffer } | null {
  const match = /^data:([^;,]*)?(;base64)?,([\s\S]*)$/.exec(uri)
  if (!match) return null
  const contentType = match[1] || 'application/octet-stream'
  const isBase64 = Boolean(match[2])
  const buffer = isBase64
    ? Buffer.from(match[3], 'base64')
    : Buffer.from(decodeURIComponent(match[3]), 'utf-8')
  return { contentType, buffer }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const labelRes = await medusaServiceFetch(
      `/admin/orders/${id}/shipping-label`,
    )
    if (!labelRes.ok) {
      return NextResponse.json(
        { error: `Backend returned ${labelRes.status}` },
        { status: labelRes.status },
      )
    }
    const { label_url: labelUrl } = await labelRes
      .json()
      .catch(() => ({}) as { label_url?: string })
    if (!labelUrl) {
      return NextResponse.json(
        { error: 'Parcel2Go has not returned a label URL yet.' },
        { status: 404 },
      )
    }

    const dataUri = parseDataUri(labelUrl)
    let contentType: string
    let body: Buffer
    if (dataUri) {
      contentType = dataUri.contentType
      body = dataUri.buffer
    } else {
      const fileRes = await fetch(labelUrl)
      if (!fileRes.ok) {
        return NextResponse.json(
          {
            error: `Could not download the label (status ${fileRes.status}).`,
          },
          { status: 502 },
        )
      }
      contentType = fileRes.headers.get('content-type') || 'application/pdf'
      body = Buffer.from(await fileRes.arrayBuffer())
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="shipping-label"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch shipping label' },
      { status: 500 },
    )
  }
}
