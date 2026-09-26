import { pdfUrlToPrintHtml } from './pdf-to-print-html'

// Renders `html` into a hidden iframe and triggers the OS print dialog.
// Same technique as lib/printer/browser-print.ts and label-print.ts: the
// `afterprint` listener goes on the TOP-level `window`, not on the iframe's
// `contentWindow` — that's what keeps this safe to call on every browser,
// including the mobile ones that would otherwise throw "Blocked a frame
// ... from accessing a cross-origin frame" (see pdf-to-print-html.ts for
// why that error happens and why we render to plain HTML first).
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
        // Some browsers don't reliably fire `afterprint` for an iframe's
        // content, so make sure we resolve (and eventually clean up) even
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

/** Print a Parcel2Go shipping label straight to the printer's print dialog. */
export async function printShippingLabel(labelUrl: string): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('Printing is only available in the browser.')
  }
  const html = await pdfUrlToPrintHtml(labelUrl)
  await printHtml(html)
}
