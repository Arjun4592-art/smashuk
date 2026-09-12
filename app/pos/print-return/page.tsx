'use client'

// Why this page exists, and why it's here and not under /pos/terminal:
//
// PassPRNT hands control back by opening the `back` URL — on Android this
// is a plain link open, not a guaranteed "switch to the exact original
// tab", so it often opens a brand new tab/cold page load instead of
// resuming the backgrounded one. If that URL pointed straight at
// /pos/terminal/billing or /pos/terminal/settings, it would load
// app/pos/terminal/layout.tsx on a cold tab, whose auth check reads a
// persisted Zustand store that hasn't rehydrated yet on first render —
// authUser is briefly null, the layout redirects to /pos and also
// `return`s null before <AuthProvider> (which would otherwise re-check the
// real session) ever gets a chance to mount. That's what was showing up as
// a stuck blank tab after a successful print.
//
// This page sits outside /pos/terminal entirely, so none of that runs on
// the cold tab. Once its own (tiny, dependency-free) bundle has loaded, it
// hands off to the real POS with a normal client-side router.replace()
// rather than a fresh HTTP navigation — by then the app's JS runtime is
// already up, so the persisted auth store has had a real chance to
// rehydrate before that page's own guard runs.
//
// It forwards PassPRNT's result params (passprnt_code / passprnt_message,
// per Star's Data Specifications manual) plus the `reason` tag onward to
// the destination, rather than swallowing them — see
// consumePassPrntCallback in lib/printer/passprnt-transport.ts, which is
// what app/pos/terminal/layout.tsx uses to turn this into a specific toast
// ("Printer connected", "Receipt printed", etc) right where the person
// lands, instead of just this page's generic message.

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const DEFAULT_RETURN = '/pos/terminal/billing'

function buildDestination(returnTo: string, params: URLSearchParams): string {
  const [path, existingQuery] = returnTo.split('?')
  const merged = new URLSearchParams(existingQuery)
  for (const key of ['passprnt_code', 'passprnt_message', 'reason']) {
    const value = params.get(key)
    if (value !== null) merged.set(key, value)
  }
  const query = merged.toString()
  return query ? `${path}?${query}` : path
}

// Next.js requires useSearchParams() to sit inside a Suspense boundary so
// this page can still be statically rendered — the actual logic lives in
// PrintReturnInner below, this just wraps it.
export default function PrintReturnPage() {
  return (
    <Suspense fallback={null}>
      <PrintReturnInner />
    </Suspense>
  )
}

function PrintReturnInner() {
  const router = useRouter()
  const params = useSearchParams()

  const code = params.get('passprnt_code')
  const message = params.get('passprnt_message')
  const returnTo = params.get('returnTo') || DEFAULT_RETURN
  const reason = params.get('reason')
  // No code at all means this page was opened some other way (not a real
  // PassPRNT callback) — still just send them onward rather than showing
  // an error for a case that isn't actually a failure.
  const success = code === null || code === '0'
  const destination = buildDestination(returnTo, params)

  useEffect(() => {
    // Forward on regardless of outcome — the destination page's own
    // consumePassPrntCallback() shows the actual success/failure toast, so
    // there's no need to make the person tap through a failure here too.
    // Success gets a short beat so a fast-moving cashier barely notices
    // this page at all; failure gets a bit longer since it's worth a
    // second to register before the toast takes over.
    const t = setTimeout(
      () => router.replace(destination),
      success ? 500 : 1200,
    )
    return () => clearTimeout(t)
  }, [success, destination, router])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#F6F6F7',
      }}
    >
      {success ? (
        <>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Printed</div>
          <div style={{ fontSize: 14, color: '#666' }}>
            Returning to the POS…
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            Print didn't go through
          </div>
          <div style={{ fontSize: 14, color: '#666', maxWidth: 320 }}>
            {message || 'PassPRNT reported an error printing the receipt.'}
            {code ? ` (code ${code})` : ''}
            {reason ? ` — while: ${reason}` : ''}
          </div>
        </>
      )}
    </div>
  )
}
