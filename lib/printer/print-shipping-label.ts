import { pdfUrlToLabelPages, pdfUrlToPrintHtml } from './pdf-to-print-html'
import { isIOSDevice, printHtmlViaPassPRNT } from './passprnt-transport'
import { usePrinterStore } from '@/store/printerStore'

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

// iPhone/iPad: show the label full-screen in the page itself and open the
// normal iOS print sheet (AirPrint) from there. Two things rule out the other
// ways of getting a print sheet on iOS Safari:
//   - printing from an iframe prints the WHOLE parent page, and
//   - a popup opened after an await (the label is fetched first) is blocked.
// Printing the page's own content is what iOS handles reliably. The overlay
// stays open (with Print / Close buttons) so the label can be reprinted if the
// sheet is dismissed, and so we never pull the content out from under the sheet.
async function printViaIOSPrintSheet(
  pages: string[],
  widthMm: number,
  heightMm: number,
): Promise<void> {
  document.getElementById('slp-root')?.remove()

  const root = document.createElement('div')
  root.id = 'slp-root'

  const style = document.createElement('style')
  style.textContent = `
    #slp-root{position:fixed;inset:0;z-index:2147483647;background:#f6f6f7;overflow:auto;-webkit-overflow-scrolling:touch;font-family:-apple-system,system-ui,sans-serif}
    #slp-root .slp-bar{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:#fff;border-bottom:1px solid #e1e3e5}
    #slp-root .slp-title{flex:1;font-size:14px;font-weight:600;color:#202223}
    #slp-root .slp-bar button{height:40px;padding:0 16px;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #c9cccf;background:#fff;color:#202223}
    #slp-root .slp-bar button.slp-primary{background:#008060;border-color:#008060;color:#fff}
    #slp-root .slp-page{width:${widthMm}mm;max-width:calc(100% - 24px);height:${heightMm}mm;margin:12px auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);overflow:hidden}
    #slp-root .slp-page img{width:100%;height:100%;display:block;object-fit:contain}
    @page{size:${widthMm}mm ${heightMm}mm;margin:0}
    @media print{
      html,body{margin:0!important;padding:0!important;height:auto!important;overflow:visible!important;background:#fff!important}
      body > *:not(#slp-root){display:none!important}
      #slp-root{position:static!important;overflow:visible!important;background:#fff!important}
      #slp-root .slp-bar{display:none!important}
      #slp-root .slp-page{width:${widthMm}mm!important;max-width:none!important;height:${heightMm}mm!important;margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always}
      #slp-root .slp-page:last-child{break-after:auto;page-break-after:auto}
    }`
  root.appendChild(style)

  const bar = document.createElement('div')
  bar.className = 'slp-bar'
  const title = document.createElement('span')
  title.className = 'slp-title'
  title.textContent = 'Shipping label'
  const printBtn = document.createElement('button')
  printBtn.className = 'slp-primary'
  printBtn.type = 'button'
  printBtn.textContent = 'Print'
  printBtn.onclick = () => window.print()
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = 'Close'
  closeBtn.onclick = () => root.remove()
  bar.append(title, printBtn, closeBtn)
  root.appendChild(bar)

  const imgs: HTMLImageElement[] = []
  for (const src of pages) {
    const page = document.createElement('div')
    page.className = 'slp-page'
    const img = document.createElement('img')
    img.src = src
    page.appendChild(img)
    root.appendChild(page)
    imgs.push(img)
  }
  document.body.appendChild(root)

  // Make sure every page is decoded and laid out before the sheet snapshots it.
  await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)))
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  window.print()
}

/** Print a Parcel2Go shipping label straight to the printer's print dialog. */
export async function printShippingLabel(labelUrl: string): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('Printing is only available in the browser.')
  }
  if (isIOSDevice()) {
    // Opt-in: the Star printer isn't visible to AirPrint, so it can only be
    // reached through PassPRNT (Settings → Printer → "Shipping labels via
    // PassPRNT"). Otherwise use the normal iOS print sheet, which is how a
    // 4x6 label printer is reached.
    if (usePrinterStore.getState().shippingLabelViaPassPRNT) {
      const html = await pdfUrlToPrintHtml(labelUrl)
      const fitted = html.replace(
        '</head>',
        '<style>.page{width:100%!important;height:auto!important;overflow:visible!important}html,body{width:100%}</style></head>',
      )
      await printHtmlViaPassPRNT(fitted, 'shipping-label')
      return
    }
    const { pages, widthMm, heightMm } = await pdfUrlToLabelPages(labelUrl)
    await printViaIOSPrintSheet(pages, widthMm, heightMm)
    return
  }
  await printHtml(await pdfUrlToPrintHtml(labelUrl))
}
