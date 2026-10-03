// Full-size thermal receipt (continuous 80mm roll, portrait) for Star
// PassPRNT on iPad. PassPRNT rasterises the HTML at the paper's dot width
// (576 dots for 3"/80mm), so everything here is sized in px for that width
// and the layout is fluid (width:100%) — no fixed mm page like the label
// layout in label-print.ts, which is what made receipts come out as a small
// landscape slip with tiny text.
//
// Layout follows the Shopify-style receipt: logo, address, SALE rule, items
// ("1 x £2.50" under each name), subtotal, VAT table, boxed ORDER TOTAL,
// payment row, date + receipt number, thank-you line and a tracking QR.

import qrcodegen from 'qrcode-generator'
import type { ReceiptData } from './escpos'

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
  return qr.createDataURL(6, 0)
}

function absoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

export function buildThermalReceiptHtml(
  data: ReceiptData & { vatNumber?: string | null },
): string {
  const cur = esc(data.currencySymbol)
  const fmt = (n: number) => cur + (Math.round(n * 100) / 100).toFixed(2)
  const row = (l: string, r: string, cls = '') =>
    `<div class="row ${cls}"><span>${l}</span><span class="amt">${r}</span></div>`

  const items = data.items
    .map((i) => {
      const gross = i.lineTotal + (i.discount ?? 0)
      const unit = i.quantity > 0 ? gross / i.quantity : gross
      return `<div class="item">
        <div class="row b"><span class="nm">${esc(i.name)}</span><span class="amt">${fmt(i.lineTotal)}</span></div>
        ${i.variantTitle ? `<div class="sub">${esc(i.variantTitle)}</div>` : ''}
        <div class="sub">${i.quantity} x ${fmt(unit)}</div>
        ${i.discount && i.discount > 0 ? `<div class="sub">Discount -${fmt(i.discount)}</div>` : ''}
      </div>`
    })
    .join('')

  const totals: string[] = [row('Subtotal', fmt(data.subtotal), 'b big')]
  if (data.discountAmount > 0)
    totals.push(row(esc(data.discountLabel), `-${fmt(data.discountAmount)}`))
  if (data.shippingAmount && data.shippingAmount > 0)
    totals.push(row('Shipping', fmt(data.shippingAmount)))
  if (data.giftCardAmount > 0)
    totals.push(
      row(
        `Gift card${data.giftCardMasked ? ` (${esc(data.giftCardMasked)})` : ''}`,
        `-${fmt(data.giftCardAmount)}`,
      ),
    )

  const base = Math.max(0, data.total - data.tax)
  const taxTable = `<table class="tax">
    <tr><th class="l">Tax</th><th>Base</th><th>Amount</th><th>Total</th></tr>
    <tr><td class="l">GB VAT (${esc(data.vatPct)}%)</td><td>${fmt(base)}</td><td>${fmt(data.tax)}</td><td>${fmt(data.total)}</td></tr>
    <tr class="tt"><td class="l">TOTAL</td><td>${fmt(base)}</td><td>${fmt(data.tax)}</td><td>${fmt(data.total)}</td></tr>
  </table>`

  const pay: string[] = [
    row(esc(data.payMethodLabel || 'Payment'), fmt(data.total)),
  ]
  for (const s of data.splitPayments ?? [])
    pay.push(row(esc(s.label), fmt(s.amount), 'small'))
  if (data.change > 0) pay.push(row('Change', fmt(data.change)))
  if (data.rounding > 0)
    pay.push(row('Cash rounding', fmt(data.rounding), 'small'))

  const shipTo = data.shipTo
    ? `<hr /><div class="b">Ship to</div><div>${esc(data.shipTo.name)}</div>
       <div>${esc(data.shipTo.address1)}</div><div>${esc(data.shipTo.cityPostcode)}</div>`
    : ''
  const note = data.orderNote
    ? `<hr /><div class="b">Order note</div><div class="pre">${esc(data.orderNote)}</div>`
    : ''
  const logo = data.logoUrl
    ? `<img class="logo" src="${esc(absoluteUrl(data.logoUrl))}" alt="${esc(data.storeName)}" />`
    : `<div class="store">${esc(data.storeName)}</div>`
  const qr = data.trackingUrl
    ? `<div class="c"><img class="qr" src="${qrDataUrl(data.trackingUrl)}" alt="" />
       <div class="b">Scan to track your order</div></div>`
    : ''

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000;
    -webkit-font-smoothing: none; }
  body { width: 100%; padding: 8px 6px; font-family: Helvetica, Arial, sans-serif;
    font-size: 24px; line-height: 1.3; font-weight: 600; }
  .c { text-align: center; } .b { font-weight: 800; }
  .big { font-size: 27px; } .small { font-size: 21px; }
  .logo { display: block; margin: 0 auto 14px; max-width: 70%; height: auto;
    filter: grayscale(1) contrast(1.6); }
  .store { font-size: 36px; font-weight: 900; text-align: center; margin-bottom: 10px; }
  .addr { text-align: center; font-size: 22px; }
  hr { border: 0; border-top: 3px solid #000; margin: 12px 0; }
  .sale { font-weight: 800; font-size: 26px; padding-bottom: 4px; border-bottom: 3px solid #000; margin: 14px 0 12px; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .row .nm { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .row .amt { white-space: nowrap; text-align: right; }
  .item { margin-bottom: 14px; } .sub { font-size: 22px; font-weight: 600; }
  table.tax { width: 100%; border-collapse: collapse; font-size: 19px; margin-top: 12px;
    border-bottom: 3px solid #000; }
  .tax th, .tax td { text-align: right; padding: 3px 2px; font-weight: 700; }
  .tax .l { text-align: left; } .tax tr.tt td { border-top: 2px solid #000; }
  .box { border: 3px solid #000; border-radius: 10px; text-align: center;
    padding: 14px 6px; margin: 22px 0; }
  .box .t { font-size: 24px; font-weight: 800; letter-spacing: 1px; }
  .box .v { font-size: 46px; font-weight: 900; }
  .pre { white-space: pre-wrap; overflow-wrap: anywhere; }
  .qr { width: 220px; height: 220px; image-rendering: pixelated; display: block; margin: 12px auto 6px; }
  .meta { text-align: center; margin: 22px 0 10px; }
  .gap { height: 40px; }
</style></head>
<body>
  ${logo}
  <div class="addr">${esc(data.addressLine1)}<br />${esc(data.addressLine2)}</div>
  <div class="addr" style="margin-top:6px">${esc(data.phone)}</div>
  <div class="sale">SALE</div>
  ${items}
  <hr />
  ${totals.join('')}
  ${taxTable}
  ${data.vatNumber ? `<div style="margin-top:8px">GB VAT Reg: ${esc(data.vatNumber)}</div>` : ''}
  <div class="box"><div class="t">ORDER TOTAL</div><div class="v">${fmt(data.total)}</div></div>
  ${pay.join('')}
  ${shipTo}
  ${note}
  <div class="meta">
    <div>${esc(data.dateStr)}, ${esc(data.timeStr)}</div>
    <div>Receipt: #${esc(data.orderId)}</div>
//     <div class="small">Staff: ${esc(data.cashier)}</div>
    <div style="margin-top:10px">${esc(data.footerLine1 ?? 'Thank you for shopping with us!')}</div>
    ${data.footerLine2 ? `<div class="small">${esc(data.footerLine2)}</div>` : ''}
  </div>
  ${qr}
  <div class="gap"></div>
</body></html>`
}
