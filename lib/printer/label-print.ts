// Prints receipts on a LABEL PRINTER (Zebra / TSC / Xprinter / Brother /
// Munbyn etc.) through the OS print dialog + the printer's normal driver.
//
// How it works (same idea as the "Smash String Recorder" ticket printer, but
// hardened):
//   1. The receipt is turned into a *standalone* HTML document (own CSS, no
//      Tailwind, no dependency on what is on screen) — so it prints the same
//      from POS (new sale / old order) and from the dashboard.
//   2. `@page { size: <W>mm <H>mm }` tells the browser/driver the label size.
//   3. The document is rendered in a hidden iframe (a popup on iPhone/iPad,
//      where iframe printing is broken), we wait for the logo/QR to load,
//      then window.print() opens the OS dialog where the label printer is
//      picked. A receipt longer than one label simply continues on the next
//      label, and every label gets a small "Receipt #…" header line.
//
// Label height 0 = continuous roll: the page height is measured from the
// content at print time, so you get exactly one label as long as the receipt.

import qrcodegen from 'qrcode-generator'
import { usePrinterStore } from '@/store/printerStore'
import type { ReceiptData } from './escpos'

export interface LabelSize {
  widthMm: number
  /** 0 = continuous roll (height follows the content). */
  heightMm: number
}

export const LABEL_PRESETS: {
  id: string
  label: string
  widthMm: number
  heightMm: number
}[] = [
  { id: '4x2', label: '4×2 in', widthMm: 101.6, heightMm: 50.8 },
  { id: '4x3', label: '4×3 in', widthMm: 101.6, heightMm: 76.2 },
  { id: '4x6', label: '4×6 in', widthMm: 101.6, heightMm: 152.4 },
  { id: '3x2', label: '3×2 in', widthMm: 76.2, heightMm: 50.8 },
  { id: '100x50', label: '100×50 mm', widthMm: 100, heightMm: 50 },
  { id: '58x40', label: '58×40 mm', widthMm: 58, heightMm: 40 },
]

const MARGIN_X_MM = 2.5
const MARGIN_Y_MM = 2
const PX_PER_MM = 96 / 25.4

export function getLabelSize(): LabelSize {
  const { labelWidthMm, labelHeightMm } = usePrinterStore.getState()
  return {
    widthMm: Number(labelWidthMm) > 0 ? Number(labelWidthMm) : 101.6,
    heightMm: Number(labelHeightMm) >= 0 ? Number(labelHeightMm) : 50.8,
  }
}

export function describeLabelSize(size: LabelSize): string {
  const w = Math.round(size.widthMm * 10) / 10
  const h = Math.round(size.heightMm * 10) / 10
  return size.heightMm > 0 ? `${w} × ${h} mm` : `${w} mm wide · continuous`
}

// ── helpers ──────────────────────────────────────────────────────────────

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c])

function qrDataUrl(text: string): string {
  const qr = qrcodegen(0, 'M')
  qr.addData(text)
  qr.make()
  return qr.createDataURL(4, 0)
}

function absoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac with a touch screen.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// ── HTML ─────────────────────────────────────────────────────────────────

function baseCss(size: LabelSize): string {
  const continuous = size.heightMm <= 0
  const fs = size.widthMm >= 90 ? 8.5 : size.widthMm >= 70 ? 8 : 7.5
  const pageRule = continuous
    ? `@page { size: ${size.widthMm}mm auto; margin: 0; }`
    : `@page { size: ${size.widthMm}mm ${size.heightMm}mm; margin: ${MARGIN_Y_MM}mm ${MARGIN_X_MM}mm; }`
  const bodyPad = continuous
    ? `padding: ${MARGIN_Y_MM}mm ${MARGIN_X_MM}mm;`
    : ''
  return `
${pageRule}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: ${fs}pt;
  line-height: 1.25; ${bodyPad} }
table.doc { width: 100%; border-collapse: collapse; }
table.doc td { padding: 0; }
table.doc thead { display: none; }
html.multi table.doc thead { display: table-header-group; }
.run { font-size: ${fs - 1}pt; font-weight: 700; padding-bottom: 0.6mm;
  margin-bottom: 0.8mm; border-bottom: 0.2mm solid #000; }
.c { text-align: center; }
.b { font-weight: 700; }
.small { font-size: ${fs - 1}pt; }
.logo { height: 8mm; width: auto; display: block; margin: 0 auto 0.8mm;
  filter: grayscale(1) contrast(1.4); }
.store { font-size: ${fs + 3}pt; font-weight: 800; letter-spacing: 0.02em; }
hr { border: 0; border-top: 0.2mm dashed #000; margin: 1.2mm 0; }
.row { display: flex; justify-content: space-between; align-items: flex-start;
  gap: 2mm; }
.row .amt { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
.item { break-inside: avoid; page-break-inside: avoid; margin-bottom: 0.6mm; }
.item .nm { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.item .sub { padding-left: 2mm; font-size: ${fs - 1}pt; }
.total { font-size: ${fs + 2.5}pt; font-weight: 800; margin: 0.6mm 0; }
.block { break-inside: avoid; page-break-inside: avoid; }
.qr { display: flex; align-items: center; gap: 2.5mm; margin-top: 1.2mm;
  break-inside: avoid; page-break-inside: avoid; }
.qr img { width: 20mm; height: 20mm; image-rendering: pixelated; flex: none; }
.pre { white-space: pre-wrap; overflow-wrap: anywhere; }
`
}

export function buildReceiptLabelHtml(
  data: ReceiptData,
  size: LabelSize,
): string {
  const fmt = (n: number) =>
    esc(data.currencySymbol) + (Math.round(n * 100) / 100).toFixed(2)
  const tiny = size.heightMm > 0 && size.heightMm < 70
  const money = (label: string, value: string, cls = '') =>
    `<div class="row ${cls}"><span>${label}</span><span class="amt">${value}</span></div>`

  const logo =
    !tiny && data.logoUrl
      ? `<img class="logo" src="${esc(absoluteUrl(data.logoUrl))}" alt="" />`
      : ''

  const header = tiny
    ? `<div class="c"><span class="store">${esc(data.storeName)}</span>
        <div class="small">${esc(data.addressLine1)}, ${esc(data.addressLine2)} · ${esc(data.phone)}</div></div>`
    : `<div class="c">${logo}
        <div class="store">${esc(data.storeName)}</div>
        <div class="small">${esc(data.addressLine1)}</div>
        <div class="small">${esc(data.addressLine2)}</div>
        <div class="small">${esc(data.phone)}</div></div>`

  const meta = `<div class="row small"><span class="b">Receipt #${esc(data.orderId)}</span><span>${esc(data.dateStr)}, ${esc(data.timeStr)}</span></div>
    <div class="small">Staff: ${esc(data.cashier)}</div>`

  const items = data.items
    .map(
      (i) => `<div class="item">
        <div class="row"><span class="nm">${esc(i.name)} ×${i.quantity}</span><span class="amt">${fmt(i.lineTotal)}</span></div>
        ${i.variantTitle ? `<div class="sub">${esc(i.variantTitle)}</div>` : ''}
      </div>`,
    )
    .join('')

  const totals: string[] = []
  totals.push(money('Subtotal', fmt(data.subtotal)))
  if (data.discountAmount > 0) {
    totals.push(money(esc(data.discountLabel), `-${fmt(data.discountAmount)}`))
  }
  if (data.shippingAmount && data.shippingAmount > 0) {
    totals.push(money('Shipping', fmt(data.shippingAmount)))
  }
  if (data.giftCardAmount > 0) {
    totals.push(
      money(
        `Gift card${data.giftCardMasked ? ` (${esc(data.giftCardMasked)})` : ''}`,
        `-${fmt(data.giftCardAmount)}`,
      ),
    )
  }
  totals.push('<hr />')
  totals.push(money('TOTAL', fmt(data.total), 'total'))
  totals.push(money(`Incl. VAT (${data.vatPct}%)`, fmt(data.tax), 'small'))
  if (data.rounding > 0)
    totals.push(money('Cash rounding', fmt(data.rounding), 'small'))

  const pay: string[] = [money('Payment', esc(data.payMethodLabel))]
  for (const s of data.splitPayments ?? []) {
    pay.push(money(`&nbsp;&nbsp;${esc(s.label)}`, fmt(s.amount), 'small'))
  }
  if (data.change > 0) pay.push(money('Change', fmt(data.change)))

  const shipTo = data.shipTo
    ? `<div class="block"><hr /><div class="b">Ship to</div>
        <div>${esc(data.shipTo.name)}</div>
        <div>${esc(data.shipTo.address1)}</div>
        <div>${esc(data.shipTo.cityPostcode)}</div></div>`
    : ''

  const note = data.orderNote
    ? `<div class="block"><hr /><div class="b">Order note</div>
        <div class="pre">${esc(data.orderNote)}</div></div>`
    : ''

  const qr = data.trackingUrl
    ? `<div class="qr"><img src="${qrDataUrl(data.trackingUrl)}" alt="" />
        <div><div class="b">Scan to track your order</div>
        <div class="small">${esc(data.footerLine1 ?? 'Thank you for shopping with us!')}</div></div></div>`
    : `<div class="c b" style="margin-top:1.2mm">${esc(data.footerLine1 ?? 'Thank you for shopping with us!')}</div>`

  const footer2 = data.footerLine2
    ? `<div class="c small">${esc(data.footerLine2)}</div>`
    : ''

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Receipt ${esc(data.orderId)}</title>
<style>${baseCss(size)}</style></head>
<body>
<table class="doc">
  <thead><tr><td><div class="run">${esc(data.storeName)} · Receipt #${esc(data.orderId)}</div></td></tr></thead>
  <tbody><tr><td>
    ${header}
    <hr />
    ${meta}
    <hr />
    ${items}
    <hr />
    <div class="block">${totals.join('')}</div>
    <div class="block">${pay.join('')}</div>
    ${shipTo}
    ${note}
    ${qr}
    ${footer2}
  </td></tr></tbody>
</table>
</body></html>`
}

function buildTestLabelHtml(size: LabelSize): string {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Test label</title>
<style>${baseCss(size)}
.frame { border: 0.4mm solid #000; padding: 1.5mm; }</style></head>
<body><div class="frame c">
  <div class="store">TEST LABEL</div>
  <div>${esc(describeLabelSize(size))}</div>
  <div class="small">If the border is fully visible and nothing is cut off, the label size is right.</div>
  <div class="small">${esc(new Date().toLocaleString())}</div>
</div></body></html>`
}

// ── printing ─────────────────────────────────────────────────────────────

function waitForDocReady(doc: Document, timeoutMs = 3000): Promise<void> {
  const imgs = Array.from(doc.images).filter((i) => !i.complete)
  const waits: Promise<unknown>[] = imgs.map(
    (img) =>
      new Promise<void>((res) => {
        img.addEventListener('load', () => res(), { once: true })
        img.addEventListener('error', () => res(), { once: true })
      }),
  )
  const fonts = (doc as Document & { fonts?: { ready?: Promise<unknown> } })
    .fonts
  if (fonts?.ready) waits.push(fonts.ready.catch(() => undefined))
  if (waits.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(waits).then(() => undefined),
    new Promise<void>((res) => setTimeout(res, timeoutMs)),
  ])
}

// Continuous roll: measure the content and pin the page height to it.
// Fixed label: if the content is taller than one label, switch on the
// repeating per-label "Receipt #…" header.
function fitPageToContent(doc: Document, size: LabelSize) {
  const html = doc.documentElement
  if (size.heightMm <= 0) {
    const mm = Math.ceil(html.scrollHeight / PX_PER_MM) + 2
    const style = doc.createElement('style')
    style.textContent = `@page { size: ${size.widthMm}mm ${mm}mm; margin: 0; }
      html, body { height: ${mm}mm; overflow: hidden; }`
    doc.head.appendChild(style)
    return
  }
  const availPx = (size.heightMm - MARGIN_Y_MM * 2) * PX_PER_MM
  if (doc.body.scrollHeight > availPx + 1) html.classList.add('multi')
}

function layoutWidthMm(size: LabelSize): number {
  return size.heightMm <= 0 ? size.widthMm : size.widthMm - MARGIN_X_MM * 2
}

function printViaIframe(html: string, size: LabelSize): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    // Off-screen but with the real label width, so measuring the layout
    // (continuous height / multi-label check) matches what gets printed.
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;height:10mm;width:${layoutWidthMm(size)}mm;`

    let removed = false
    const remove = () => {
      if (removed) return
      removed = true
      iframe.remove()
    }
    // Safety net only — normally removed on `afterprint`.
    const safety = setTimeout(remove, 5 * 60 * 1000)

    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow
        if (!win) throw new Error('Could not open the print preview.')
        await waitForDocReady(win.document)
        fitPageToContent(win.document, size)
        // Some mobile browsers (seen on Android/iPadOS Chrome & Safari)
        // treat this frame as cross-origin-like for scripting even though
        // it's an in-page srcdoc frame, and `addEventListener` throws
        // "Blocked a frame ... from accessing a cross-origin frame." That
        // must not abort printing — fall back to a timer-based cleanup.
        let gotAfterPrintSignal = false
        try {
          win.addEventListener('afterprint', () => {
            gotAfterPrintSignal = true
            clearTimeout(safety)
            setTimeout(remove, 300)
          })
        } catch {
          // Ignored — handled by the safety-net timeout below.
        }
        win.focus()
        win.print()
        if (!gotAfterPrintSignal) {
          clearTimeout(safety)
          setTimeout(remove, 60 * 1000)
        }
        // Chrome blocks here until the dialog closes; Safari/Firefox return
        // straight away — either way the job has been handed to the OS.
        resolve()
      } catch (err) {
        clearTimeout(safety)
        remove()
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }

    iframe.srcdoc = html
    document.body.appendChild(iframe)
  })
}

// iPhone/iPad Safari prints the WHOLE parent page when asked to print an
// iframe, so there we use a popup instead. window.open must run
// synchronously inside the tap, before any await.
async function printViaPopup(html: string, size: LabelSize): Promise<void> {
  const win = window.open('', '_blank')
  if (!win) {
    throw new Error(
      'Pop-up blocked. Allow pop-ups for this site to print on the label printer.',
    )
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  await waitForDocReady(win.document)
  fitPageToContent(win.document, size)
  try {
    win.addEventListener('afterprint', () => win.close())
  } catch {
    // Same cross-origin-like restriction as in printViaIframe above — skip
    // the auto-close signal rather than throwing and skipping print().
  }
  win.focus()
  win.print()
}

function printLabelHtml(html: string, size: LabelSize): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(
      new Error('Printing is only available in the browser.'),
    )
  }
  return isIOS() ? printViaPopup(html, size) : printViaIframe(html, size)
}

// ── public API ───────────────────────────────────────────────────────────

/** Print a receipt on the label printer (label size comes from settings). */
export function printReceiptOnLabel(data: ReceiptData): Promise<void> {
  const size = getLabelSize()
  return printLabelHtml(buildReceiptLabelHtml(data, size), size)
}

/** Print a test label so the size / alignment can be checked. */
export function printTestLabel(): Promise<void> {
  const size = getLabelSize()
  return printLabelHtml(buildTestLabelHtml(size), size)
}
