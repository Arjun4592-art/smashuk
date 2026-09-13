import { NextRequest, NextResponse } from 'next/server'
import { sendFacebookCapiEvent } from '@/lib/api/facebook-capi'

// Receives a tracking event from the browser (see lib/analytics-events.ts)
// and forwards it to Meta's Conversions API server-side, in addition to the
// existing client-side fbq() pixel call. The two share the same event_id so
// Meta deduplicates them instead of double-counting the conversion.
//
// This exists because the client-only Pixel misses conversions blocked by
// ad blockers and Safari's Intelligent Tracking Prevention — this server
// route recovers those.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ sent: false })
    }
    const {
      eventName,
      eventId,
      eventSourceUrl,
      value,
      currency,
      contentIds,
      contents,
      contentName,
      contentType,
      email,
      phone,
      fbp,
      fbc,
    } = body

    if (!eventName || !eventId || !eventSourceUrl) {
      return NextResponse.json(
        { error: 'eventName, eventId and eventSourceUrl are required' },
        { status: 400 },
      )
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null
    const userAgent = req.headers.get('user-agent')

    const result = await sendFacebookCapiEvent({
      eventName,
      eventId,
      eventSourceUrl,
      value,
      currency,
      contentIds,
      contents,
      contentName,
      contentType,
      email,
      phone,
      fbp,
      fbc,
      clientIp,
      userAgent,
    })

    // Never surface this as a hard error — tracking must never break
    // checkout or browsing, even if Meta rejects the event or the pixel
    // hasn't been configured in Dashboard > Settings > Marketing yet.
    return NextResponse.json({ sent: result.sent, reason: result.reason })
  } catch (err: any) {
    console.error('[api/store/facebook-capi]', err)
    return NextResponse.json({ sent: false })
  }
}
