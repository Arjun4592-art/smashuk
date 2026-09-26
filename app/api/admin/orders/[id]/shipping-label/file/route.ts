import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'

// Parcel2Go's label URL (or a data: URI containing it) lives on a different
// origin than this site. Loading it directly into the print iframe/popup in
// lib/printer/print-shipping-label.ts makes that frame cross-origin, and the
// browser then blocks `iframe.contentWindow.addEventListener(...)` with:
// "Blocked a frame with origin ... from accessing a cross-origin frame."
//
// Fixed by never handing the browser Parcel2Go's URL at all: this route
// fetches it here on the server (no CORS/cross-origin restrictions apply to
// server-to-server requests) and streams the bytes back from our own origin,
// so the print iframe only ever loads same-origin content.
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeaderRaw = await getAdminAuthHeader(req, { allowPos: true })
  if (!authHeaderRaw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const labelRes = await fetch(
    new URL(`/admin/orders/${id}/shipping-label`, MEDUSA_URL).toString(),
    { headers: { Authorization: authHeaderRaw } },
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
        { error: `Could not download the label (status ${fileRes.status}).` },
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
}
