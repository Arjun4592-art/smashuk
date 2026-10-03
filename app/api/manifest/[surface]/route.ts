import { NextResponse } from 'next/server'
import { SITE_NAME } from '@/lib/constants'

// One manifest per surface so "Add to Home Screen" from /dashboard or /pos
// launches that surface instead of the storefront (the root manifest's
// start_url is "/").
const SURFACES = {
  dashboard: {
    name: `${SITE_NAME} Dashboard`,
    short_name: 'SRP Dashboard',
    start_url: '/dashboard',
    scope: '/dashboard',
    id: '/dashboard',
  },
  pos: {
    name: `${SITE_NAME} POS`,
    short_name: 'SRP POS',
    start_url: '/pos',
    scope: '/pos',
    id: '/pos',
  },
} as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params
  const cfg = SURFACES[surface as keyof typeof SURFACES]
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(
    {
      ...cfg,
      display: 'standalone',
      background_color: '#F6F6F7',
      theme_color: '#008060',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
