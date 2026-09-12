import type { PaperWidth, ReceiptData } from './escpos'

const PASSPRNT_ANDROID_PACKAGE = 'jp.star_m.passprnt'
const PASSPRNT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=jp.star_m.passprnt'

const PAPER_MM: Record<PaperWidth, number> = {
  '58mm': 58,
  '80mm': 80,
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

function fmtMoney(symbol: string, n: number): string {
  return symbol + (Math.round(n * 100) / 100).toFixed(2)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
function launchPassPrnt(html: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Star PassPRNT can only be triggered from the browser.'),
    )
  }
  const backUrl = window.location.href
  const uri = buildPassPrntUri(html, backUrl)
  window.location.href = uri
  return Promise.resolve()
}

export async function printViaPassPRNT(
  data: ReceiptData,
  paperWidth: PaperWidth,
): Promise<void> {
  await launchPassPrnt(buildReceiptHtml(data, paperWidth))
}

export async function printTestPageViaPassPRNT(
  paperWidth: PaperWidth,
): Promise<void> {
  await launchPassPrnt(buildTestHtml(paperWidth))
}

export { isAndroid as isAndroidDevice }