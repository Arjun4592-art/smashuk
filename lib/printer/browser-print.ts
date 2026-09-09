// Prints by handing off to the OS/browser print dialog, instead of talking
// to the printer directly (WebUSB / Web Bluetooth). This is the one printing
// path that works on every OS and every browser, because it doesn't depend
// on any browser hardware API — it just asks the OS to print, the same way
// printing a webpage or a PDF does.
//
// Why this exists: WebUSB and Web Bluetooth are Chrome/Edge-only — Safari
// (desktop macOS *and* iPadOS) implements neither, so on a Mac/iPad those
// two options silently can't work no matter what. On top of that, most
// budget thermal printers — including the Star TSP100 series — use classic
// Bluetooth (SPP), not BLE, and Web Bluetooth can only ever speak BLE (see
// bluetooth-transport.ts). Once such a printer is paired in the OS's
// Bluetooth settings and its driver installed, though, it shows up as an
// ordinary system printer — and `window.print()` can reach it on Windows,
// macOS, and (via AirPrint-capable drivers) iPadOS alike.
//
// This module only implements a standalone *test* page. Full receipts are
// already printed this way at the call sites (billing page / order detail
// modal): they call `window.print()` on the actual on-screen receipt when
// no hardware transport is configured or when the hardware transport fails
// (see NoPrinterConnectedError in print-receipt.ts) — that reuses the
// richer on-page receipt (logo, QR code) instead of building a second
// parallel HTML template here.

import type { PaperWidth } from './escpos'

// Physical paper width in millimetres, used for @page sizing so the print
// preview/output isn't scaled to A4/Letter.
const PAPER_MM: Record<PaperWidth, number> = {
  '58mm': 58,
  '80mm': 80,
}

function buildTestHtml(width: PaperWidth): string {
  const mm = PAPER_MM[width]
  const now = new Date().toLocaleString()
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
    line-height: 1.4;
    color: #000;
    width: ${mm}mm;
  }
  h1 { font-size: 15px; text-align: center; margin: 0 0 6px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  p { margin: 2px 0; text-align: center; }
</style>
</head>
<body>
  <h1>TEST PRINT</h1>
  <hr />
  <p>If you can read this clearly,</p>
  <p>your printer is connected and</p>
  <p>working correctly.</p>
  <hr />
  <p>${now}</p>
  <p>Sent via browser print (${width})</p>
</body>
</html>`
}

// Renders `html` into a hidden iframe and triggers the OS print dialog.
// Using an iframe (rather than navigating the current page or opening a
// popup) means we don't lose app state and don't hit Safari's popup
// blocker. The iframe is removed shortly after the print dialog closes.
function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Printing is only available in the browser.'))
      return
    }
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')

    let settled = false
    const cleanup = () => {
      if (settled) return
      settled = true
      window.removeEventListener('afterprint', onAfterPrint)
      // Give the print dialog a beat before we tear the iframe down —
      // removing it too early can cancel printing on some browsers.
      setTimeout(() => iframe.remove(), 500)
    }
    const onAfterPrint = () => {
      cleanup()
      resolve()
    }

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow
        if (!win) throw new Error('Could not open the print preview.')
        window.addEventListener('afterprint', onAfterPrint)
        win.focus()
        win.print()
        // Safari doesn't reliably fire `afterprint` on an iframe's content
        // window, so make sure we resolve (and eventually clean up) even
        // if that event never arrives.
        setTimeout(() => {
          if (!settled) {
            settled = true
            setTimeout(() => iframe.remove(), 1000)
            resolve()
          }
        }, 1000)
      } catch (err) {
        cleanup()
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }

    iframe.srcdoc = html
    document.body.appendChild(iframe)
  })
}

export async function printTestPageViaBrowser(
  width: PaperWidth,
): Promise<void> {
  await printHtml(buildTestHtml(width))
}
