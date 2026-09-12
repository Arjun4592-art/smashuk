// Star PassPRNT transport.
//
// WHY THIS EXISTS: the Star TSP100III's Bluetooth models (TSP100IIIBI) pair
// with Android as classic Bluetooth SPP, not BLE — so bluetooth-transport.ts
// (Web Bluetooth, BLE-only) can never see it, and Web Serial
// (serial-transport.ts) isn't implemented on Android Chrome at all. There is
// no direct browser API path to this printer on an Android tablet. Star's
// own PassPRNT app is the supported bridge: it holds the paired connection
// to the printer, and a web page hands it a receipt via a URL scheme instead
// of talking to the printer directly.
//
// HOW PASSPRNT PRINTING WORKS (confirmed against Star's PassPRNT Web SDK /
// "Data Specifications" manual, Sept 2026):
//   - The receipt is passed as literal HTML in the `html` query param (URL
//     encoded) — NOT a URL PassPRNT fetches. PassPRNT renders that HTML and
//     rasterizes it for the printer, so no server round-trip is needed here.
//   - `back` is the URL PassPRNT returns to after printing (this is what
//     sends the tablet back to the POS browser tab — plan step 6).
//   - Path is always v1/print/nopreview (preview screen disabled).
//   - On Android, Chrome will not navigate a plain `starpassprnt://` link
//     reliably — it needs the `intent://...#Intent;...;end` wrapper
//     (see https://developer.chrome.com/docs/android/intents). iOS Safari
//     and desktop browsers (for bench-testing the HTML) can use the plain
//     scheme directly.
//   - Printer selection (which Bluetooth printer, paper width) lives inside
//     the PassPRNT app itself, configured once during setup — this transport
//     deliberately does not pass a `size` query override, so it always uses
//     whatever printer profile the person configured in the app.
//
// CAVEAT: unlike the other transports, there is no callback that tells the
// web page printing actually succeeded or failed — `back` just means
// PassPRNT handed control back to the browser, not that paper came out. If
// PassPRNT isn't installed, or no printer is configured inside it, Chrome's
// "Open with" resolution can silently do nothing. Worth a real test print
// (see printTestPageViaPassPRNT) before relying on this for live sales.

import type { PaperWidth, ReceiptData } from './escpos'

const PASSPRNT_ANDROID_PACKAGE = 'jp.star_m.passprnt'
const PASSPRNT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=jp.star_m.passprnt'

const PAPER_MM: Record<PaperWidth, number> = {
  '58mm': 58,
  '80mm': 80,
}

function isAndroid(): boolean {
  return (
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  )
}

function fmtMoney(symbol: string, n: number): string {
  return symbol + (Math.round(n * 100) / 100).toFixed(2)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Builds a self-contained HTML receipt PassPRNT can rasterize directly.
// Deliberately plain — no external fonts/images/network calls, since
// PassPRNT renders this offline on the tablet, not in a real browser tab.
function buildReceiptHtml(data: ReceiptData, width: PaperWidth): string {
  const mm = PAPER_MM[width]
  const fmt = (n: number) => fmtMoney(data.currencySymbol, n)

  const itemsHtml = data.items
    .map((item) => {
      const variantLine = item.variantTitle
        ? `<div class="variant">${escapeHtml(item.variantTitle)}</div>`
        : ''
      return `
        <div class="item-row">
          <span class="name">${escapeHtml(item.name)} x${item.quantity}</span>
          <span class="amt">${fmt(item.lineTotal)}</span>
        </div>
        ${variantLine}`
    })
    .join('')

  const splitHtml =
    data.splitPayments && data.splitPayments.length > 0
      ? data.splitPayments
          .map(
            (s) =>
              `<div class="row"><span>${escapeHtml(s.label)}</span><span>${fmt(s.amount)}</span></div>`,
          )
          .join('')
      : ''

  const shipToHtml = data.shipTo
    ? `<hr />
       <div class="bold">Ship to</div>
       <div>${escapeHtml(data.shipTo.name)}</div>
       <div>${escapeHtml(data.shipTo.address1)}</div>
       <div>${escapeHtml(data.shipTo.cityPostcode)}</div>`
    : ''

  const orderNoteHtml = data.orderNote
    ? `<hr />
       <div class="bold">Order note</div>
       <div>${escapeHtml(data.orderNote)}</div>`
    : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${mm}mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
    width: ${mm}mm;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 16px; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
  .row, .item-row { display: flex; justify-content: space-between; gap: 4px; }
  .variant { padding-left: 3mm; color: #333; font-size: 11px; }
  .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; }
</style>
</head>
<body>
  <div class="center bold big">${escapeHtml(data.storeName)}</div>
  <div class="center">${escapeHtml(data.addressLine1)}</div>
  <div class="center">${escapeHtml(data.addressLine2)}</div>
  <div class="center">${escapeHtml(data.phone)}</div>
  <hr />
  <div class="center bold">SALE</div>
  <hr />
  ${itemsHtml}
  <hr />
  <div class="row"><span>Subtotal</span><span>${fmt(data.subtotal)}</span></div>
  ${data.discountAmount > 0 ? `<div class="row"><span>${escapeHtml(data.discountLabel)}</span><span>-${fmt(data.discountAmount)}</span></div>` : ''}
  ${data.giftCardAmount > 0 ? `<div class="row"><span>Gift card${data.giftCardMasked ? ` (${escapeHtml(data.giftCardMasked)})` : ''}</span><span>-${fmt(data.giftCardAmount)}</span></div>` : ''}
  <hr />
  <div class="total-row"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
  <div class="row"><span>Incl. VAT (${data.vatPct}%)</span><span>${fmt(data.tax)}</span></div>
  ${data.rounding > 0 ? `<div class="row"><span>Cash rounding</span><span>${fmt(data.rounding)}</span></div>` : ''}
  <br />
  <div class="row"><span>Payment</span><span>${escapeHtml(data.payMethodLabel)}</span></div>
  ${splitHtml}
  ${data.change > 0 ? `<div class="row"><span>Change</span><span>${fmt(data.change)}</span></div>` : ''}
  ${shipToHtml}
  ${orderNoteHtml}
  <hr />
  <div class="center">${escapeHtml(data.dateStr)}, ${escapeHtml(data.timeStr)}</div>
  <div class="center">Receipt: ${escapeHtml(data.orderId)}</div>
  <div class="center">Staff: ${escapeHtml(data.cashier)}</div>
  <br />
  <div class="center bold">${escapeHtml(data.footerLine1 ?? 'Thank you for shopping with us!')}</div>
  ${data.footerLine2 ? `<div class="center">${escapeHtml(data.footerLine2)}</div>` : ''}
</body>
</html>`
}

function buildTestHtml(width: PaperWidth): string {
  const mm = PAPER_MM[width]
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${mm}mm auto; margin: 2mm; }
  body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; width: ${mm}mm; text-align: center; }
  h1 { font-size: 15px; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
</style>
</head>
<body>
  <h1>TEST PRINT</h1>
  <hr />
  <p>Sent via Star PassPRNT</p>
  <p>If you can read this clearly,</p>
  <p>your printer is connected and working.</p>
  <hr />
  <p>${new Date().toLocaleString()}</p>
</body>
</html>`
}

// Builds both URI forms and picks the right one for the current platform —
// see the module header for why Android needs the intent:// wrapper.
function buildPassPrntUri(html: string, backUrl: string): string {
  const query = `html=${encodeURIComponent(html)}&back=${encodeURIComponent(backUrl)}`

  if (isAndroid()) {
    return (
      `intent://v1/print/nopreview?${query}` +
      `#Intent;scheme=starpassprnt;package=${PASSPRNT_ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(PASSPRNT_PLAY_STORE_URL)};end`
    )
  }
  return `starpassprnt://v1/print/nopreview?${query}`
}

// Fire-and-forget, like browser-print's window.print(): there is no
// PassPRNT API that reports success back into this promise, only the OS
// handing off to (and eventually back from) the app.
//
// `back` intentionally points at /pos/print-return, not the page that
// triggered the print. On Android, PassPRNT's handoff often opens a brand
// new cold tab rather than resuming the original one — see
// app/pos/print-return/page.tsx for why sending that cold tab straight
// into /pos/terminal/* was hanging.
//
// `tag` is an optional label carried through to print-return's `reason`
// query param purely for telling apart *why* a print was triggered when
// you're staring at a URL bar mid-debugging (e.g. "connect-test" from the
// Settings screen vs a real receipt print) — PassPRNT itself never sees it.
function launchPassPrnt(html: string, tag?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Star PassPRNT can only be triggered from the browser.'),
    )
  }
  const returnTo = window.location.pathname + window.location.search
  let backUrl = `${window.location.origin}/pos/print-return?returnTo=${encodeURIComponent(returnTo)}`
  if (tag) backUrl += `&reason=${encodeURIComponent(tag)}`
  const uri = buildPassPrntUri(html, backUrl)
  window.location.href = uri
  return Promise.resolve()
}

export async function printViaPassPRNT(
  data: ReceiptData,
  paperWidth: PaperWidth,
): Promise<void> {
  await launchPassPrnt(buildReceiptHtml(data, paperWidth), 'receipt')
}

export async function printTestPageViaPassPRNT(
  paperWidth: PaperWidth,
  tag: string = 'test-print',
): Promise<void> {
  await launchPassPrnt(buildTestHtml(paperWidth), tag)
}

export { isAndroid as isAndroidDevice }

// Reads the passprnt_code/passprnt_message/reason params that
// /pos/print-return forwards onward once it redirects back into the real
// app (see app/pos/print-return/page.tsx), so a page like
// app/pos/terminal/layout.tsx can show a specific result — "Printer
// connected", "Receipt printed", etc — right where the person lands.
// Returns null when there's no callback in the current URL (i.e. this
// wasn't a PassPRNT-triggered landing), and strips the params from the
// address bar via replaceState either way, so a manual refresh afterwards
// doesn't replay the same toast.
export function consumePassPrntCallback(): {
  success: boolean
  message: string | null
  action: string
} | null {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const code = url.searchParams.get('passprnt_code')
  if (code === null) return null

  const message = url.searchParams.get('passprnt_message')
  const action = url.searchParams.get('reason') || 'unknown'

  url.searchParams.delete('passprnt_code')
  url.searchParams.delete('passprnt_message')
  url.searchParams.delete('reason')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)

  return { success: code === '0', message, action }
}
