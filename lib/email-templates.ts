import {
  SITE_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
} from './constants'

const NAVY = '#0A1F44'
const CORAL = '#E8553A'
const GREEN = '#10B981'
const TEXT = '#0A1F44'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'

const fmt = (n: number) => '£' + (Number(n) || 0).toFixed(2)

// Small coloured pill shown above the heading — 'confirmed' | 'shipped' | 'refunded'
function statusBadge(kind: 'confirmed' | 'shipped' | 'refunded') {
  const map = {
    confirmed: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'ORDER CONFIRMED' },
    shipped: { bg: '#ECFDF5', fg: GREEN, label: 'ORDER SHIPPED' },
    refunded: { bg: '#FDF0ED', fg: CORAL, label: 'REFUND PROCESSED' },
  }[kind]
  return `
    <span style="display:inline-block;background:${map.bg};color:${map.fg};font-size:11px;font-weight:700;letter-spacing:0.5px;padding:6px 12px;border-radius:999px;">
      ${map.label}
    </span>
  `
}

function itemsTable(items: any[]) {
  const rows = (items ?? [])
    .map((i: any) => {
      const name = i.product_title ?? i.title ?? 'Item'
      const variant = i.variant_title
        ? ` <span style="color:${MUTED};font-size:12px;">(${i.variant_title})</span>`
        : ''
      return `
        <tr>
          <td style="padding:14px 0;font-size:14px;color:${TEXT};border-bottom:1px solid #F3F4F6;">${name}${variant}</td>
          <td style="padding:14px 0;font-size:14px;color:${MUTED};border-bottom:1px solid #F3F4F6;text-align:center;">×${i.quantity}</td>
          <td style="padding:14px 0;font-size:14px;color:${TEXT};font-weight:600;border-bottom:1px solid #F3F4F6;text-align:right;white-space:nowrap;">${fmt(i.unit_price * i.quantity)}</td>
        </tr>`
    })
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:20px;">
      <thead>
        <tr>
          <td style="padding:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">Item</td>
          <td style="padding:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};text-align:center;">Qty</td>
          <td style="padding:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};text-align:right;">Price</td>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function totalRow(label: string, amount: number, accent = false) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:${accent ? '4' : '2'}px;">
      <tr>
        <td style="padding:6px 0;font-size:${accent ? '15' : '13'}px;font-weight:${accent ? '700' : '400'};color:${accent ? TEXT : MUTED};">${label}</td>
        <td style="padding:6px 0;font-size:${accent ? '20' : '13'}px;font-weight:700;color:${accent ? CORAL : MUTED};text-align:right;">${fmt(amount)}</td>
      </tr>
    </table>
  `
}

function ctaButton(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="border-radius:8px;background:${NAVY};">
          <a href="${href}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">${label}</a>
        </td>
      </tr>
    </table>
  `
}

// Shared shell — navy header band, white card body, footer with contact info.
// Table-based layout on purpose: it's the one thing every email client
// (Gmail, Outlook, Apple Mail) renders the same way.
function shell(badge: string, title: string, bodyHtml: string) {
  return `
  <div style="background:#F2F4F7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="background:${NAVY};padding:26px 32px;border-radius:12px 12px 0 0;text-align:center;">
          <span style="font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:0.5px;">${SITE_NAME.toUpperCase()}</span>
        </td>
      </tr>
      <tr>
        <td style="background:#FFFFFF;padding:36px 32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          ${badge}
          <h1 style="margin:16px 0 6px;font-size:21px;line-height:1.3;color:${TEXT};">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#F9FAFB;padding:24px 32px;border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">
            Questions about your order?
            <a href="mailto:${CONTACT_EMAIL}" style="color:${CORAL};text-decoration:none;font-weight:600;">Email us</a>
            or call ${CONTACT_PHONE}
          </p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            ${STORE_DISPLAY_NAME} · ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}
          </p>
        </td>
      </tr>
    </table>
  </div>
  `
}

export function orderNumberOf(order: any) {
  return order.display_id ? `#${order.display_id}` : order.id
}

export function orderConfirmationEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Order confirmed ${orderNumber} — ${SITE_NAME}`
  const html = shell(
    statusBadge('confirmed'),
    `Thanks for your order, ${(order.customer?.first_name || '').trim() || 'there'}!`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We've received order <strong style="color:${TEXT};">${orderNumber}</strong> and we're getting it ready. You'll get another email the moment it ships.
      </p>
      ${itemsTable(order.items ?? [])}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Order total', order.total, true)}
      </div>
      ${ctaButton('View your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order confirmed ${orderNumber} — Total ${fmt(order.total)}. We'll email you again once it ships.`
  return { subject, html, text }
}

export function shippingConfirmationEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Your order ${orderNumber} has shipped — ${SITE_NAME}`
  const address = order.shipping_address
  const addressLine = address
    ? [
        address.address_1,
        address.address_2,
        address.city,
        address.postal_code,
        address.country_code,
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  const html = shell(
    statusBadge('shipped'),
    'Your order is on its way!',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Good news — order <strong style="color:${TEXT};">${orderNumber}</strong> has left the building and is headed your way.
      </p>
      ${itemsTable(order.items ?? [])}
      ${
        addressLine
          ? `
        <div style="margin-top:20px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Shipping to</p>
          <p style="margin:0;font-size:14px;color:${TEXT};">${addressLine}</p>
        </div>`
          : ''
      }
      ${ctaButton('Track your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order ${orderNumber} has shipped.${addressLine ? ` Shipping to: ${addressLine}` : ''}`
  return { subject, html, text }
}

export function refundConfirmationEmail(
  order: any,
  refundAmount: number,
  items?: any[],
) {
  const orderNumber = orderNumberOf(order)
  const subject = `Refund processed for order ${orderNumber} — ${SITE_NAME}`
  const html = shell(
    statusBadge('refunded'),
    'Your refund has been processed',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We've processed a refund for order <strong style="color:${TEXT};">${orderNumber}</strong>. It can take a few business days to appear on your original payment method.
      </p>
      ${items && items.length ? itemsTable(items) : ''}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Refund amount', refundAmount, true)}
      </div>
    `,
  )
  const text = `Refund of ${fmt(refundAmount)} processed for order ${orderNumber}. It can take a few business days to appear on your original payment method.`
  return { subject, html, text }
}
