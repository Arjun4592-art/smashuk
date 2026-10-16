import {
  SITE_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  GIFT_CARD_PRODUCT_HANDLE,
} from './constants'
import { qrInlineAttachment } from './qr'
import { signOrderTrackToken } from './api/order-track-token'

const NAVY = '#0A1F44'
const CORAL = '#E8553A'
const GREEN = '#10B981'
const TEXT = '#0A1F44'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'

const fmt = (n: number) => '£' + (Number(n) || 0).toFixed(2)

function statusBadge(
  kind:
    | 'confirmed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'refunded'
    | 'welcome'
    | 'admin'
    | 'subscribed'
    | 'staff'
    | 'invoice'
    | 'payment_failed'
    | 'dispute'
    | 'ready_for_pickup'
    | 'return_requested'
    | 'return_declined'
    | 'return_label'
    | 'mail_in_label'
    | 'message_received'
    | 'stock_alert',
) {
  const map = {
    confirmed: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'ORDER CONFIRMED' },
    shipped: { bg: '#ECFDF5', fg: GREEN, label: 'ORDER SHIPPED' },
    out_for_delivery: {
      bg: '#FFF7ED',
      fg: '#C2410C',
      label: 'OUT FOR DELIVERY',
    },
    delivered: { bg: '#ECFDF5', fg: GREEN, label: 'ORDER DELIVERED' },
    cancelled: { bg: '#FDF0ED', fg: CORAL, label: 'ORDER CANCELLED' },
    refunded: { bg: '#FDF0ED', fg: CORAL, label: 'REFUND PROCESSED' },
    welcome: { bg: '#ECFDF5', fg: GREEN, label: 'ACCOUNT CREATED' },
    admin: { bg: '#F3F4F6', fg: MUTED, label: 'STORE NOTIFICATION' },
    subscribed: { bg: '#ECFDF5', fg: GREEN, label: 'SUBSCRIBED' },
    staff: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'TEAM INVITE' },
    invoice: { bg: '#ECFDF5', fg: GREEN, label: 'INVOICE' },
    payment_failed: { bg: '#FDF0ED', fg: CORAL, label: 'PAYMENT FAILED' },
    dispute: { bg: '#FDF0ED', fg: CORAL, label: 'DISPUTE OPENED' },
    ready_for_pickup: {
      bg: '#ECFDF5',
      fg: GREEN,
      label: 'READY FOR COLLECTION',
    },
    return_requested: {
      bg: '#FFF7ED',
      fg: '#C2410C',
      label: 'RETURN REQUESTED',
    },
    return_declined: { bg: '#FDF0ED', fg: CORAL, label: 'RETURN DECLINED' },
    return_label: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'RETURN LABEL' },
    mail_in_label: { bg: '#EFF6FF', fg: '#1D4ED8', label: 'MAIL-IN LABEL' },
    message_received: {
      bg: '#EFF6FF',
      fg: '#1D4ED8',
      label: 'MESSAGE RECEIVED',
    },
    stock_alert: { bg: '#ECFDF5', fg: GREEN, label: 'STOCK ALERT SET' },
  }[kind]
  return pillBadge(map.label, map.bg, map.fg)
}

export function pillBadge(label: string, bg: string, fg: string) {
  return `
    <span style="display:inline-block;background:${bg};color:${fg};font-size:11px;font-weight:700;letter-spacing:0.5px;padding:6px 12px;border-radius:999px;">
      ${label}
    </span>
  `
}

export function itemsTable(items: any[]) {
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

export function totalRow(label: string, amount: number, accent = false) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:${accent ? '4' : '2'}px;">
      <tr>
        <td style="padding:6px 0;font-size:${accent ? '15' : '13'}px;font-weight:${accent ? '700' : '400'};color:${accent ? TEXT : MUTED};">${label}</td>
        <td style="padding:6px 0;font-size:${accent ? '20' : '13'}px;font-weight:700;color:${accent ? CORAL : MUTED};text-align:right;">${fmt(amount)}</td>
      </tr>
    </table>
  `
}

// Inline QR block — the image itself is attached separately as a `cid:`
// inline attachment (see lib/qr.ts) rather than a base64 data URI, which
// some clients (older Outlook builds in particular) strip from HTML email.
function qrBlock(cid: string, caption: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="padding:20px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:10px;text-align:center;">
          <img src="cid:${cid}" width="132" height="132" alt="Order QR code" style="display:block;margin:0 auto 12px;border-radius:6px;" />
          <p style="margin:0;font-size:12.5px;line-height:1.5;color:${MUTED};">${caption}</p>
        </td>
      </tr>
    </table>
  `
}

export function ctaButton(label: string, href: string) {
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

// Public logo used in every email header. Absolute https URL on purpose:
// emails (and the Resend dashboard templates built from this file) can only
// load images from a public address. Override with EMAIL_LOGO_URL if needed.
const LOGO_URL =
  process.env.EMAIL_LOGO_URL || 'https://smashuk.co/icons/logo.png'

// Numbered "what happens next" list — used for step-by-step instructions.
export function stepList(steps: { title: string; body?: string }[]) {
  const rows = steps
    .map(
      (s, i) => `
        <tr>
          <td valign="top" style="width:36px;padding:0 0 18px;">
            <div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:${NAVY};color:#FFFFFF;font-size:12px;font-weight:700;text-align:center;">${i + 1}</div>
          </td>
          <td valign="top" style="padding:2px 0 18px;">
            <p style="margin:0;font-size:14px;font-weight:700;line-height:1.4;color:${TEXT};">${s.title}</p>
            ${s.body ? `<p style="margin:3px 0 0;font-size:13.5px;line-height:1.6;color:${MUTED};">${s.body}</p>` : ''}
          </td>
        </tr>`,
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${rows}
    </table>
  `
}

// Titled info panel (tracking number, order summary, tips ...).
export function infoBox(label: string, innerHtml: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr>
        <td style="padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-left:3px solid ${CORAL};border-radius:8px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${MUTED};">${label}</p>
          ${innerHtml}
        </td>
      </tr>
    </table>
  `
}

// Small section heading inside an email body.
export function sectionHeading(text: string) {
  return `<p style="margin:26px 0 10px;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${MUTED};border-bottom:1px solid ${BORDER};padding-bottom:8px;">${text}</p>`
}

// ---------------------------------------------------------------------------
// Building blocks shared by every customer email.
//
// The reference design is mailInLabelEmail() (bottom of this file): a
// personalised "Hi <name>," intro -> titled sections (numbered steps or a tick
// list) -> coral-edged info panels -> one clear call to action -> a "reply to
// this email" help line. New customer emails should be assembled from these
// pieces so they all look and read the same.
// ---------------------------------------------------------------------------

// First name for the greeting, falling back to "there" (never an empty "Hi ,").
export function firstNameOf(order: any) {
  return (
    (
      order?.customer?.first_name ||
      order?.shipping_address?.first_name ||
      ''
    ).trim() || 'there'
  )
}

export const strong = (s: string) =>
  `<strong style="color:${TEXT};">${s}</strong>`

// Opening paragraph (same size/spacing as the mail-in label email).
export function introText(html: string) {
  return `<p style="margin:0;font-size:14.5px;line-height:1.65;color:${MUTED};">${html}</p>`
}

// Secondary paragraph that sits under a section.
export function bodyText(html: string) {
  return `<p style="margin:20px 0 0;font-size:13.5px;line-height:1.6;color:${MUTED};">${html}</p>`
}

// Info panel holding one key fact (tracking number, address, amount ...).
export function factBox(label: string, value: string) {
  return infoBox(
    label,
    `<p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT};"><strong>${value}</strong></p>`,
  )
}

// Info panel holding a short explanatory note.
export function noteBox(label: string, text: string) {
  return infoBox(
    label,
    `<p style="margin:0;font-size:13.5px;line-height:1.6;color:${MUTED};">${text}</p>`,
  )
}

// Tick list — same layout as stepList(), for things that are not sequential
// (account perks, what a subscription includes ...).
export function checkList(items: { title: string; body?: string }[]) {
  const rows = items
    .map(
      (s) => `
        <tr>
          <td valign="top" style="width:36px;padding:0 0 18px;">
            <div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:#ECFDF5;color:${GREEN};font-size:13px;font-weight:700;text-align:center;">&#10003;</div>
          </td>
          <td valign="top" style="padding:2px 0 18px;">
            <p style="margin:0;font-size:14px;font-weight:700;line-height:1.4;color:${TEXT};">${s.title}</p>
            ${s.body ? `<p style="margin:3px 0 0;font-size:13.5px;line-height:1.6;color:${MUTED};">${s.body}</p>` : ''}
          </td>
        </tr>`,
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${rows}
    </table>
  `
}

// Ruled total line that sits under an items table.
export function totalBlock(label: string, amount: number) {
  return `
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow(label, amount, true)}
      </div>`
}

// Shared shell used by EVERY email: white card, logo header with a brand
// accent bar, body, then a footer with contact details and quick links.
// Table-based layout on purpose: it's the one thing every email client
// (Gmail, Outlook, Apple Mail) renders the same way.
//
// This produces the local fallback `html` used when the matching Resend
// Template for a given email type hasn't been synced yet (see
// scripts/sync-resend-templates.ts) — once it has, lib/email.ts sends via
// that dedicated Resend Template instead (each email type has its own, see
// scripts/resend-templates.generated.json), and this html is unused for
// that send but still returned so nothing else has to change shape.
// After changing this shell, re-run scripts/generate-resend-templates.ts and
// scripts/sync-resend-templates.ts to push the new look to Resend.
export function renderShell(
  badge: string,
  title: string,
  bodyHtml: string,
): string {
  const link = (label: string, href: string) =>
    `<a href="${href}" style="color:${NAVY};text-decoration:none;font-weight:600;">${label}</a>`
  return `
  <div style="background:#F2F4F7;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:0;font-size:0;line-height:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="72%" style="background:${NAVY};height:5px;font-size:0;line-height:0;">&nbsp;</td>
            <td width="28%" style="background:${CORAL};height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 32px 22px;background:#FFFFFF;border-bottom:1px solid ${BORDER};">
          <a href="${SITE_URL}" style="text-decoration:none;">
            <img src="${LOGO_URL}" width="160" alt="${SITE_NAME}" style="display:block;border:0;outline:none;height:auto;max-width:160px;margin:0 auto;" />
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:34px 32px 30px;">
          ${badge}
          <h1 style="margin:16px 0 10px;font-size:22px;line-height:1.3;color:${TEXT};">${title}</h1>
          ${bodyHtml}
          <p style="margin:30px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
            Thank you,<br /><strong style="color:${TEXT};">The ${SITE_NAME} team</strong>
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#F9FAFB;padding:24px 32px;border-top:1px solid ${BORDER};text-align:center;">
          <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${MUTED};">
            Need help? <a href="mailto:${CONTACT_EMAIL}" style="color:${CORAL};text-decoration:none;font-weight:600;">${CONTACT_EMAIL}</a>
            &nbsp;·&nbsp; ${CONTACT_PHONE}
          </p>
          <p style="margin:0 0 12px;font-size:12.5px;color:${MUTED};">
            ${link('Shop', `${SITE_URL}/shop`)} &nbsp;|&nbsp; ${link('Track your order', `${SITE_URL}/track`)} &nbsp;|&nbsp; ${link('Shipping', `${SITE_URL}/shipping`)} &nbsp;|&nbsp; ${link('Returns', `${SITE_URL}/returns`)}
          </p>
          <p style="margin:0;font-size:11.5px;line-height:1.6;color:#9CA3AF;">
            ${STORE_DISPLAY_NAME} · ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}<br />
            © ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.
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

// True when every line on the order is a gift card (emailed, never shipped).
export function isGiftCardOnlyOrder(order: any) {
  const items: any[] = order?.items ?? []
  return (
    items.length > 0 &&
    items.every(
      (i) =>
        (i?.product_handle ?? i?.variant?.product?.handle) ===
        GIFT_CARD_PRODUCT_HANDLE,
    )
  )
}

export function orderConfirmationEmail(order: any) {
  if (isGiftCardOnlyOrder(order)) return giftCardOrderReceiptEmail(order)
  const orderNumber = orderNumberOf(order)
  const isPickup = order.metadata?.fulfillment_type === 'pickup'
  const greetingName = firstNameOf(order)
  const trackingUrl = `${SITE_URL}/track/${order.id}?t=${signOrderTrackToken(order.id)}`
  const qrCid = 'order-qr'

  const subject = isPickup
    ? `Order confirmed ${orderNumber} — ready for collection soon — ${SITE_NAME}`
    : `Order confirmed ${orderNumber} — ${SITE_NAME}`

  const intro = isPickup
    ? `Hi ${greetingName}, thank you for your order. We have received order ${strong(orderNumber)} and it is now being prepared for collection in store. Here is what happens next:`
    : `Hi ${greetingName}, thank you for your order. We have received order ${strong(orderNumber)} and it is being prepared for dispatch. Here is what happens next:`

  const steps = isPickup
    ? [
        {
          title: 'We prepare your order',
          body: 'Our team picks and packs your items, ready for collection in store.',
        },
        {
          title: 'We email you when it is ready',
          body: 'You will get a "ready for collection" email as soon as it is waiting for you.',
        },
        {
          title: `Collect it from ${STORE_DISPLAY_NAME}`,
          body: `Bring a form of ID or your order confirmation: ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}.`,
        },
      ]
    : [
        {
          title: 'We pack your order',
          body: 'Our team picks and carefully packs your items.',
        },
        {
          title: 'We ship it and email you',
          body: 'You will receive another email with your tracking details as soon as it is on its way.',
        },
        {
          title: 'It arrives',
          body: 'Track it at any time with the button or QR code below.',
        },
      ]

  const qrCaption = isPickup
    ? 'Scan this code at any time to view your order status and confirm when it is ready for collection.'
    : 'Scan this code at any time to view your order status and tracking details once your order has shipped.'

  const html = renderShell(
    statusBadge('confirmed'),
    'Your order is confirmed',
    `
      ${introText(intro)}
      ${sectionHeading('What happens next')}
      ${stepList(steps)}
      ${sectionHeading('Your order')}
      ${itemsTable(order.items ?? [])}
      ${totalBlock('Order total', order.total)}
      ${qrBlock(qrCid, qrCaption)}
      ${ctaButton('View your order', trackingUrl)}
    `,
  )
  const text = isPickup
    ? `Hi ${greetingName}, order confirmed ${orderNumber} — Total ${fmt(order.total)}. It is being prepared for collection in store; we will notify you once it is ready. Track it any time at ${trackingUrl}`
    : `Hi ${greetingName}, order confirmed ${orderNumber} — Total ${fmt(order.total)}. We will email you again once it has shipped. Track it any time at ${trackingUrl}`

  const resendTemplate = {
    name: isPickup ? 'order-confirmation-pickup' : 'order-confirmation',
    variables: {
      CUSTOMER_FIRST_NAME: greetingName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ORDER_TOTAL: fmt(order.total),
      ITEMS_HTML: itemsTable(order.items ?? []),
      TRACKING_URL: trackingUrl,
    },
  }

  return {
    subject,
    html,
    text,
    resendTemplate,
    attachments: [qrInlineAttachment(trackingUrl, qrCid)],
  }
}

export function shippingConfirmationEmail(
  order: any,
  opts: { trackingNumber?: string } = {},
) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
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
  const trackingNumber =
    opts.trackingNumber ?? order.fulfillments?.[0]?.tracking_numbers?.[0]
  const royalMailTrackUrl = trackingNumber
    ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`
    : null
  const html = renderShell(
    statusBadge('shipped'),
    'Your order has shipped',
    `
      ${introText(`Hi ${firstName}, good news — order ${strong(orderNumber)} has left our warehouse and is on its way to you via Royal Mail.`)}
      ${trackingNumber ? factBox('Royal Mail tracking number', trackingNumber) : ''}
      ${addressLine ? factBox('Shipping to', addressLine) : ''}
      ${sectionHeading('What happens next')}
      ${stepList([
        {
          title: 'Follow your parcel',
          body: trackingNumber
            ? 'Use the tracking number above, or the button below, to follow its journey.'
            : 'Use the button below to follow its journey.',
        },
        {
          title: 'Out for delivery',
          body: 'We will email you on the day the courier has it out for delivery.',
        },
        {
          title: 'Delivered',
          body: 'Once it arrives we will send a final confirmation. If anything is wrong, just reply to this email.',
        },
      ])}
      ${sectionHeading('In this parcel')}
      ${itemsTable(order.items ?? [])}
      ${ctaButton('Track your order', royalMailTrackUrl ?? `${SITE_URL}/orders`)}
    `,
  )
  const text = `Hi ${firstName}, order ${orderNumber} has shipped.${trackingNumber ? ` Royal Mail tracking number: ${trackingNumber}.` : ''}${addressLine ? ` Shipping to: ${addressLine}` : ''}`
  const resendTemplate = {
    name: 'shipping-confirmation',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      TRACKING_NUMBER: trackingNumber ?? '',
      ITEMS_HTML: itemsTable(order.items ?? []),
      ADDRESS_LINE: addressLine,
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer once the courier has the parcel out for delivery.
export function outForDeliveryEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `Out for delivery: order ${orderNumber} — ${SITE_NAME}`
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
  const html = renderShell(
    statusBadge('out_for_delivery'),
    'Your order is out for delivery',
    `
      ${introText(`Hi ${firstName}, order ${strong(orderNumber)} is out for delivery and is expected to arrive today.`)}
      ${addressLine ? factBox('Delivering to', addressLine) : ''}
      ${sectionHeading('Before it arrives')}
      ${stepList([
        {
          title: 'Keep an eye out for the courier',
          body: 'If you are not at home, check for a delivery card from the courier with details of what to do next.',
        },
        {
          title: 'Check your parcel',
          body: 'Make sure everything is there and undamaged. If anything is missing or not as expected, reply to this email and we will help.',
        },
      ])}
      ${ctaButton('Track your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Hi ${firstName}, order ${orderNumber} is out for delivery and should arrive today.${addressLine ? ` Delivering to: ${addressLine}` : ''}`
  const resendTemplate = {
    name: 'out-for-delivery',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ADDRESS_LINE: addressLine,
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer once the order is marked delivered.
export function deliveryConfirmationEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `Your order ${orderNumber} has been delivered — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('delivered'),
    'Your order has been delivered',
    `
      ${introText(`Hi ${firstName}, order ${strong(orderNumber)} has been delivered. We hope you enjoy it!`)}
      ${sectionHeading('Your order')}
      ${itemsTable(order.items ?? [])}
      ${noteBox('Something not right?', `If anything is missing or not as expected, just reply to this email and we will sort it out. You can also read our <a href="${SITE_URL}/returns" style="color:${CORAL};font-weight:600;text-decoration:none;">returns information</a>.`)}
      ${ctaButton('View your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Hi ${firstName}, order ${orderNumber} has been delivered. If anything is missing or not as expected, please reply to this email and we will assist.`
  const resendTemplate = {
    name: 'delivery-confirmation',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ITEMS_HTML: itemsTable(order.items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer when their order is cancelled.
export function orderCancelledEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `Order ${orderNumber} has been cancelled — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('cancelled'),
    'Your order has been cancelled',
    `
      ${introText(`Hi ${firstName}, order ${strong(orderNumber)} has been cancelled.`)}
      ${noteBox('Your refund', 'If payment had already been taken, the amount will be refunded to your original payment method within a few business days.')}
      ${sectionHeading('Cancelled items')}
      ${itemsTable(order.items ?? [])}
      ${noteBox('Did not request this?', 'If you did not ask us to cancel, or you have any questions, just reply to this email and we will help.')}
    `,
  )
  const text = `Hi ${firstName}, order ${orderNumber} has been cancelled. If payment had already been taken, the amount will be refunded to your original payment method within a few business days.`
  const resendTemplate = {
    name: 'order-cancelled',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ITEMS_HTML: itemsTable(order.items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function refundConfirmationEmail(
  order: any,
  refundAmount: number,
  items?: any[],
) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `Refund processed for order ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('refunded'),
    'Your refund has been processed',
    `
      ${introText(`Hi ${firstName}, a refund has been processed for order ${strong(orderNumber)}.`)}
      ${sectionHeading('Refunded items')}
      ${itemsTable(items ?? [])}
      ${totalBlock('Refund amount', refundAmount)}
      ${sectionHeading('When will I see it?')}
      ${stepList([
        {
          title: 'Refund issued',
          body: 'We have sent your refund back to your original payment method.',
        },
        {
          title: 'Your bank processes it',
          body: 'Please allow a few business days for it to appear on your statement.',
        },
      ])}
      ${bodyText('Questions about your refund? Just reply to this email and we will help.')}
    `,
  )
  const text = `Hi ${firstName}, a refund of ${fmt(refundAmount)} has been processed for order ${orderNumber}. Please allow a few business days for it to appear on your original payment method.`
  const resendTemplate = {
    name: 'refund-confirmation',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      REFUND_AMOUNT: fmt(refundAmount),
      ITEMS_HTML: itemsTable(items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer the moment their account is created (register flow).
export function welcomeEmail(customer: {
  first_name?: string
  last_name?: string
  email: string
}) {
  const firstName = (customer.first_name || '').trim() || 'there'
  const subject = `Welcome to ${SITE_NAME}, ${firstName}`
  const html = renderShell(
    statusBadge('welcome'),
    `Welcome to ${SITE_NAME}`,
    `
      ${introText(`Hi ${firstName}, your ${SITE_NAME} account has been created with ${strong(customer.email)}. Here is what you can do with it:`)}
      ${sectionHeading('Your account')}
      ${checkList([
        {
          title: 'Track your orders in real time',
          body: 'Follow every order from the moment it is confirmed until it arrives.',
        },
        {
          title: 'Check out faster',
          body: 'Your details are saved, so future orders take seconds.',
        },
        {
          title: 'See your full order history',
          body: 'Everything you have bought, in one place.',
        },
      ])}
      ${ctaButton('Start shopping', `${SITE_URL}/shop`)}
    `,
  )
  const text = `Hi ${firstName}, welcome to ${SITE_NAME}. Your account (${customer.email}) has been created. Visit ${SITE_URL}/shop to start shopping.`
  const resendTemplate = {
    name: 'welcome',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      CUSTOMER_EMAIL: customer.email,
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer confirming their contact-form message was received.
export function contactAutoReplyEmail(opts: { name: string; message: string }) {
  const subject = `We've received your message — ${SITE_NAME}`
  const preview =
    opts.message.length > 200 ? opts.message.slice(0, 200) + '…' : opts.message
  const html = renderShell(
    statusBadge('message_received'),
    'We have received your message',
    `
      ${introText(`Hi ${opts.name}, thank you for getting in touch with ${SITE_NAME}. Here is what happens next:`)}
      ${sectionHeading('What happens next')}
      ${stepList([
        {
          title: 'We read your message',
          body: 'A member of our team will review your enquiry.',
        },
        {
          title: 'You hear back from us',
          body: `We will reply to this email address shortly. For anything urgent you can also call us on ${CONTACT_PHONE}.`,
        },
      ])}
      ${noteBox('Your message', `"${preview}"`)}
    `,
  )
  const text = `Hi ${opts.name}, thank you for contacting us. We have received your message and a member of the ${SITE_NAME} team will respond shortly.`
  const resendTemplate = {
    name: 'contact-auto-reply',
    variables: { CUSTOMER_NAME: opts.name, MESSAGE_PREVIEW: preview },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the store owner/admin inbox when a contact-form enquiry comes in.
export function contactAdminEmail(opts: {
  name: string
  email: string
  subject?: string
  message: string
}) {
  const subject = `New enquiry — ${opts.subject || 'General'} — from ${opts.name}`
  const html = renderShell(
    statusBadge('admin'),
    'New contact form enquiry',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${MUTED};width:90px;">From</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT};font-weight:600;">${opts.name} &lt;${opts.email}&gt;</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${MUTED};">Subject</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT};">${opts.subject || '(none)'}</td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};white-space:pre-wrap;">${String(opts.message).replace(/\n/g, '<br/>')}</p>
      </div>
    `,
  )
  const text = `New enquiry from ${opts.name} (${opts.email})\nSubject: ${opts.subject || '(none)'}\n\n${opts.message}`
  const resendTemplate = {
    name: 'contact-admin',
    variables: {
      CUSTOMER_NAME: opts.name,
      CUSTOMER_EMAIL: opts.email,
      ENQUIRY_SUBJECT: opts.subject || '(none)',
      ENQUIRY_MESSAGE: String(opts.message).replace(/\n/g, '<br/>'),
    },
  }
  return { subject, html, text, resendTemplate }
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:${MUTED};width:110px;vertical-align:top;">${label}</td>
      <td style="padding:4px 0;font-size:14px;color:${TEXT};font-weight:600;">${value}</td>
    </tr>
  `
}

// Shared CUSTOMER_FIRST_NAME/CUSTOMER_LAST_NAME/CUSTOMER_EMAIL variables for
// the admin-* order-event templates below — mirrors the same "Guest"
// fallback the local `customerName` used to compute as one string, just
// split into the two separate name fields the Resend templates use.
function adminCustomerVars(order: any) {
  return {
    CUSTOMER_FIRST_NAME:
      order.customer?.first_name || (order.customer ? '' : 'Guest'),
    CUSTOMER_LAST_NAME: order.customer?.last_name || '',
    CUSTOMER_EMAIL: order.email ?? 'no email',
  }
}

// Sent to the store owner/admin inbox when an order ships.
export function adminShippingEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked as shipped`
  const html = renderShell(
    statusBadge('admin'),
    `Order ${orderNumber} shipped`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        A shipping confirmation email has been sent to the customer.
      </p>
    `,
  )
  const text = `Order ${orderNumber} marked as shipped. Customer: ${customerName} (${order.email ?? 'no email'}). Shipping confirmation email sent.`
  const resendTemplate = {
    name: 'admin-shipping',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminOutForDeliveryEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked out for delivery`
  const html = renderShell(
    statusBadge('admin'),
    `Order ${orderNumber} out for delivery`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        An out-for-delivery email has been sent to the customer.
      </p>
    `,
  )
  const text = `Order ${orderNumber} marked out for delivery. Customer: ${customerName} (${order.email ?? 'no email'}). Out-for-delivery email sent.`
  const resendTemplate = {
    name: 'admin-out-for-delivery',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminDeliveryEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked as delivered`
  const html = renderShell(
    statusBadge('admin'),
    `Order ${orderNumber} delivered`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        A delivery confirmation email has been sent to the customer.
      </p>
    `,
  )
  const text = `Order ${orderNumber} marked as delivered. Customer: ${customerName} (${order.email ?? 'no email'}). Delivery confirmation email sent.`
  const resendTemplate = {
    name: 'admin-delivery',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminCancelledEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} cancelled`
  const html = renderShell(
    statusBadge('admin'),
    `Order ${orderNumber} cancelled`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        A cancellation email has been sent to the customer.
      </p>
    `,
  )
  const text = `Order ${orderNumber} cancelled. Customer: ${customerName} (${order.email ?? 'no email'}). Cancellation email sent.`
  const resendTemplate = {
    name: 'admin-cancelled',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminRefundEmail(order: any, refundAmount: number) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Refund processed for order ${orderNumber}`
  const html = renderShell(
    statusBadge('admin'),
    `Refund processed — ${orderNumber}`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
        ${infoRow('Amount', fmt(refundAmount))}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        A refund confirmation email has been sent to the customer.
      </p>
    `,
  )
  const text = `Refund of ${fmt(refundAmount)} processed for order ${orderNumber}. Customer: ${customerName} (${order.email ?? 'no email'}). Refund confirmation email sent.`
  const resendTemplate = {
    name: 'admin-refund',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      REFUND_AMOUNT: fmt(refundAmount),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminWelcomeEmail(customer: {
  first_name?: string
  last_name?: string
  email: string
}) {
  const name =
    `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
    'New customer'
  const subject = `New customer account — ${customer.email}`
  const html = renderShell(
    statusBadge('admin'),
    'New customer account created',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Name', name)}
        ${infoRow('Email', customer.email)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        A welcome email has been sent to the customer.
      </p>
    `,
  )
  const text = `New customer account created — ${name} (${customer.email}). Welcome email sent.`
  const resendTemplate = {
    name: 'admin-welcome',
    variables: {
      CUSTOMER_FIRST_NAME: customer.first_name || '',
      CUSTOMER_LAST_NAME: customer.last_name || '',
      CUSTOMER_EMAIL: customer.email,
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminPaymentFailedEmail(opts: {
  paymentIntentId: string
  amount: number
  currency: string
  customerEmail?: string
  reason?: string
}) {
  const subject = `Payment failed — ${fmt(opts.amount)}${opts.customerEmail ? ` (${opts.customerEmail})` : ''}`
  const html = renderShell(
    statusBadge('payment_failed'),
    'A payment attempt failed',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Amount', `${fmt(opts.amount)} ${opts.currency.toUpperCase()}`)}
        ${opts.customerEmail ? infoRow('Customer', opts.customerEmail) : ''}
        ${infoRow('Reason', opts.reason || 'Not specified by Stripe')}
        ${infoRow('Payment Intent', opts.paymentIntentId)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        No order was created for this attempt. The customer may retry checkout — no action is usually needed unless this happens repeatedly for the same customer or card.
      </p>
    `,
  )
  const text = `Payment failed — ${fmt(opts.amount)} ${opts.currency.toUpperCase()}${opts.customerEmail ? ` (${opts.customerEmail})` : ''}. Reason: ${opts.reason || 'not specified'}. Payment Intent: ${opts.paymentIntentId}. No order was created.`
  const resendTemplate = {
    name: 'admin-payment-failed',
    variables: {
      PAYMENT_AMOUNT: fmt(opts.amount),
      CUSTOMER_EMAIL: opts.customerEmail || '',
      FAILURE_REASON: opts.reason || 'Not specified by Stripe',
      PAYMENT_INTENT_ID: opts.paymentIntentId,
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminDisputeEmail(opts: {
  chargeId: string
  paymentIntentId?: string
  amount: number
  currency: string
  reason: string
  evidenceDueBy?: Date
}) {
  const subject = `⚠ Dispute opened — ${fmt(opts.amount)} — respond by ${opts.evidenceDueBy ? opts.evidenceDueBy.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'the deadline in Stripe'}`
  const html = renderShell(
    statusBadge('dispute'),
    'A customer has disputed a charge',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Amount', `${fmt(opts.amount)} ${opts.currency.toUpperCase()}`)}
        ${infoRow('Reason', opts.reason)}
        ${infoRow('Charge', opts.chargeId)}
        ${opts.paymentIntentId ? infoRow('Payment Intent', opts.paymentIntentId) : ''}
        ${infoRow('Respond by', opts.evidenceDueBy ? opts.evidenceDueBy.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'See Stripe dashboard')}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        Submit evidence (proof of delivery, communication, etc.) in the Stripe Dashboard under Payments → Disputes before the deadline above, or the dispute is automatically lost.
      </p>
      ${ctaButton('Open in Stripe Dashboard', 'https://dashboard.stripe.com/disputes')}
    `,
  )
  const text = `Dispute opened for ${fmt(opts.amount)} ${opts.currency.toUpperCase()}. Reason: ${opts.reason}. Charge: ${opts.chargeId}. Respond by: ${opts.evidenceDueBy ? opts.evidenceDueBy.toISOString() : 'see Stripe dashboard'}.`
  const resendTemplate = {
    name: 'admin-dispute',
    variables: {
      DISPUTE_AMOUNT: fmt(opts.amount),
      DISPUTE_REASON: opts.reason,
      CHARGE_ID: opts.chargeId,
      PAYMENT_INTENT_ID: opts.paymentIntentId || '',
      RESPOND_BY_DATE: opts.evidenceDueBy
        ? opts.evidenceDueBy.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'See Stripe dashboard',
    },
  }
  return { subject, html, text, resendTemplate }
}

export function adminNewOrderEmail(
  order: any,
  channel: 'website' | 'pos' = 'website',
) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') ||
    order.email ||
    'Guest'
  const subject = `New order ${orderNumber} — ${fmt(order.total)}`
  const html = renderShell(
    statusBadge('admin'),
    `New order ${orderNumber}`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Placed ${channel === 'pos' ? 'in-store (POS)' : 'on the website'} by <strong style="color:${TEXT};">${customerName}</strong>${order.email ? ` (${order.email})` : ''}.
      </p>
      ${itemsTable(order.items ?? [])}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Order total', order.total, true)}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED};">
        View it in the dashboard Orders page or on the POS Orders tab.
      </p>
    `,
  )
  const text = `New order ${orderNumber} — ${customerName} — Total ${fmt(order.total)}`
  const resendTemplate = {
    name: channel === 'pos' ? 'admin-new-order-pos' : 'admin-new-order-website',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ORDER_TOTAL: fmt(order.total),
      ITEMS_HTML: itemsTable(order.items ?? []),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

export function stockNotifyCustomerEmail(productName: string) {
  const subject = `We'll email you when "${productName}" is back in stock`
  const html = renderShell(
    statusBadge('stock_alert'),
    `You're on the list`,
    `
      ${introText(`Thanks for your interest. We will email you at this address as soon as ${strong(productName)} is back in stock.`)}
      ${sectionHeading('What happens next')}
      ${stepList([
        {
          title: 'We keep an eye on the stock',
          body: 'There is nothing else you need to do.',
        },
        {
          title: 'You get an email the moment it is back',
          body: 'Stock can sell quickly, so order soon after you hear from us.',
        },
      ])}
      ${ctaButton('Keep browsing', `${SITE_URL}/shop`)}
    `,
  )
  const text = `We will email you as soon as "${productName}" is back in stock.`
  const resendTemplate = {
    name: 'stock-notify-customer',
    variables: { PRODUCT_NAME: productName },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the store owner/admin inbox when a customer requests a back-in-stock alert.
export function stockNotifyAdminEmail(opts: {
  email: string
  productName: string
  productId: string
}) {
  const subject = `Back-in-stock request — ${opts.productName}`
  const html = renderShell(
    statusBadge('admin'),
    'Back-in-stock request',
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Product', `${opts.productName} (${opts.productId})`)}
        ${infoRow('Customer', opts.email)}
      </table>
    `,
  )
  const text = `${opts.email} wants to be notified when ${opts.productName} (${opts.productId}) is back in stock.`
  const resendTemplate = {
    name: 'stock-notify-admin',
    variables: {
      PRODUCT_NAME: opts.productName,
      PRODUCT_ID: opts.productId,
      CUSTOMER_EMAIL: opts.email,
    },
  }
  return { subject, html, text, resendTemplate }
}
// Sent to a customer immediately after they subscribe to the newsletter.
export function newsletterWelcomeEmail(email: string) {
  const subject = `Welcome to ${SITE_NAME}`
  const html = renderShell(
    statusBadge('subscribed'),
    `You're subscribed`,
    `
      ${introText(`Thank you for signing up with ${strong(email)}. Here is what to expect in your inbox:`)}
      ${sectionHeading('What you will get')}
      ${checkList([
        {
          title: 'Offers and promotions',
          body: 'Deals on rackets, strings and gear.',
        },
        {
          title: 'New arrivals',
          body: 'First look at what has just landed in store.',
        },
        {
          title: 'Restock alerts',
          body: 'A heads-up when popular items are back.',
        },
      ])}
      ${ctaButton('Start shopping', `${SITE_URL}/shop`)}
    `,
  )
  const text = `Welcome to ${SITE_NAME}. Thank you for subscribing with ${email}. Keep an eye on your inbox for offers and new arrivals.`
  const resendTemplate = {
    name: 'newsletter-welcome',
    variables: { CUSTOMER_EMAIL: email },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to a staff member when they're added to the POS system.
export function staffInviteEmail(opts: {
  firstName: string
  role?: string
  shift?: string
}) {
  const roleLabel = opts.role === 'admin' ? 'an Admin' : 'Staff'
  const subject = `You've been added to ${SITE_NAME} POS`
  const html = renderShell(
    statusBadge('staff'),
    `Welcome to the team, ${opts.firstName}`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        You've been added as <strong style="color:${TEXT};">${roleLabel}</strong> on the ${SITE_NAME} POS system${opts.shift ? ` for the <strong style="color:${TEXT};">${opts.shift}</strong> shift` : ''}.
      </p>
      <div style="margin-top:20px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">To log in</p>
        <ol style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.9;color:${TEXT};">
          <li>Open the POS terminal and select your name from the list</li>
          <li>Ask your manager for your 6-digit PIN</li>
        </ol>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:${MUTED};">
        If you weren't expecting this, please contact your manager.
      </p>
    `,
  )
  const text = `Welcome to ${SITE_NAME}. You've been added as ${roleLabel}${opts.shift ? ` for the ${opts.shift} shift` : ''}. Ask your manager for your PIN to log in at the POS terminal.`
  const resendTemplate = {
    name: 'staff-invite',
    variables: { STAFF_FIRST_NAME: opts.firstName, SHIFT: opts.shift || '' },
  }
  return { subject, html, text, resendTemplate }
}
// Sent to the customer from the POS when a staff member emails them their
// invoice (replaces the old plain in-store receipt). The invoice PDF itself
// (generated by lib/invoice-service.ts) is attached to the email.
export function invoiceEmail(opts: {
  invoiceNumber: string
  orderNumber: string
  pdfUrl: string
  trackingUrl?: string
}) {
  const subject = `Your invoice ${opts.invoiceNumber} — ${SITE_NAME}`
  const trackingBlock = opts.trackingUrl
    ? `
      ${bodyText('You can check the status of your order at any time.')}
      ${ctaButton('Track your order', opts.trackingUrl)}
    `
    : ''
  const html = renderShell(
    statusBadge('invoice'),
    'Your invoice is ready',
    `
      ${introText(`Thank you for shopping with us. Your invoice for order ${strong(opts.orderNumber)} is attached to this email as a PDF.`)}
      ${infoBox(
        'Invoice details',
        `<p style="margin:0;font-size:14px;line-height:1.7;color:${TEXT};">Invoice number: <strong>${opts.invoiceNumber}</strong><br />Order: <strong>${opts.orderNumber}</strong></p>`,
      )}
      ${ctaButton('Download invoice', opts.pdfUrl)}
      ${trackingBlock}
    `,
  )
  const trackingText = opts.trackingUrl
    ? ` Track your order here: ${opts.trackingUrl}`
    : ''
  const text = `Please find attached invoice ${opts.invoiceNumber} for order ${opts.orderNumber}. You can also download it here: ${opts.pdfUrl}.${trackingText}`
  const resendTemplate = {
    name: 'invoice',
    variables: {
      INVOICE_NUMBER: opts.invoiceNumber,
      ORDER_DISPLAY_ID: opts.orderNumber,
      PDF_URL: opts.pdfUrl,
      TRACKING_URL: opts.trackingUrl || '',
    },
  }
  return { subject, html, text, resendTemplate }
}

// ─── Pickup ──────────────────────────────────────────────────────────────

// Sent to the customer the moment staff mark a `fulfillment_type: 'pickup'`
// order as fulfilled in the dashboard — i.e. it's ready to collect in
// store. (Courier orders get shippingConfirmationEmail instead at the same
// point in the flow.)
export function readyForPickupEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const greetingName = firstNameOf(order)
  const subject = `Order ${orderNumber} is ready for collection — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('ready_for_pickup'),
    'Your order is ready for collection',
    `
      ${introText(`Hi ${greetingName}, good news — order ${strong(orderNumber)} is packed and waiting for you in store.`)}
      ${factBox('Collect from', `${STORE_DISPLAY_NAME}, ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}`)}
      ${sectionHeading('When you collect')}
      ${stepList([
        {
          title: 'Bring ID or your order confirmation',
          body: 'This helps us hand your order to the right person.',
        },
        {
          title: 'Show it to our team',
          body: 'We will bring out your order and you are done.',
        },
      ])}
      ${sectionHeading('Your order')}
      ${itemsTable(order.items ?? [])}
    `,
  )
  const text = `Hi ${greetingName}, order ${orderNumber} is ready for collection at ${STORE_DISPLAY_NAME}, ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}. Bring ID or your order confirmation.`
  const resendTemplate = {
    name: 'ready-for-pickup',
    variables: {
      CUSTOMER_FIRST_NAME: greetingName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ITEMS_HTML: itemsTable(order.items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

// ─── Returns ─────────────────────────────────────────────────────────────

export function returnItemsTable(
  items: { title?: string; quantity: number }[],
) {
  const rows = (items ?? [])
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;font-size:14px;color:${TEXT};border-bottom:1px solid #F3F4F6;">${i.title ?? 'Item'}</td>
          <td style="padding:10px 0;font-size:14px;color:${MUTED};border-bottom:1px solid #F3F4F6;text-align:right;">×${i.quantity}</td>
        </tr>`,
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
      <tbody>${rows}</tbody>
    </table>
  `
}

// Sent to the customer as soon as they submit a return request from their
// order-tracking page — confirms it was received, before staff act on it.
export function returnRequestedEmail(
  order: any,
  returnRecord: {
    items?: { title?: string; quantity: number }[]
    reason?: string
  },
) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `We've received your return request for ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('return_requested'),
    'Your return request has been received',
    `
      ${introText(`Hi ${firstName}, we have received your return request for order ${strong(orderNumber)}${returnRecord.reason ? ` (reason: ${returnRecord.reason})` : ''}. Here is what happens next:`)}
      ${sectionHeading('What happens next')}
      ${stepList([
        {
          title: 'Our team reviews your request',
          body: 'We check the items and the reason you gave.',
        },
        {
          title: 'You hear from us by email',
          body: 'We will let you know once it is approved, or if we need more information.',
        },
      ])}
      ${sectionHeading('Items in this return')}
      ${returnItemsTable(returnRecord.items ?? [])}
      ${bodyText('Need to add something? Just reply to this email and we will help.')}
    `,
  )
  const text = `Hi ${firstName}, we've received your return request for order ${orderNumber}. We'll email you once it has been reviewed.`
  const resendTemplate = {
    name: 'return-requested',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      RETURN_REASON: returnRecord.reason || 'Not specified',
      RETURN_ITEMS_HTML: returnItemsTable(returnRecord.items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the store owner/admin when a customer submits a new return
// request, so it doesn't sit unnoticed in the dashboard.
export function adminReturnRequestEmail(
  order: any,
  returnRecord: {
    items?: { title?: string; quantity: number }[]
    reason?: string
    note?: string
  },
) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `New return request for order ${orderNumber}`
  const html = renderShell(
    statusBadge('admin'),
    `New return request — ${orderNumber}`,
    `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${infoRow('Customer', `${customerName} (${order.email ?? 'no email'})`)}
        ${returnRecord.reason ? infoRow('Reason', returnRecord.reason) : ''}
        ${returnRecord.note ? infoRow('Note', returnRecord.note) : ''}
      </table>
      ${returnItemsTable(returnRecord.items ?? [])}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        Review and approve or decline it from the order's Returns tab in the dashboard.
      </p>
    `,
  )
  const text = `New return request for order ${orderNumber} from ${customerName} (${order.email ?? 'no email'}).${returnRecord.reason ? ` Reason: ${returnRecord.reason}.` : ''} Review it in the dashboard.`
  const resendTemplate = {
    name: 'admin-return-requested',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      RETURN_REASON: returnRecord.reason || 'Not specified',
      RETURN_NOTE: returnRecord.note || '',
      RETURN_ITEMS_HTML: returnItemsTable(returnRecord.items ?? []),
      ...adminCustomerVars(order),
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer when staff decline a return request (approving one
// already triggers refundConfirmationEmail, since approval = immediate
// refund in this flow).
export function returnDeclinedEmail(
  order: any,
  returnRecord: { note?: string },
) {
  const orderNumber = orderNumberOf(order)
  const firstName = firstNameOf(order)
  const subject = `Update on your return request for ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('return_declined'),
    "We're unable to process this return",
    `
      ${introText(`Hi ${firstName}, thank you for your patience. After reviewing your return request for order ${strong(orderNumber)}, we are not able to process it.`)}
      ${returnRecord.note ? noteBox('Our reason', returnRecord.note) : ''}
      ${noteBox('Think this is a mistake?', 'If you would like to discuss it further, just reply to this email and our team will take another look.')}
    `,
  )
  const text = `Hi ${firstName}, your return request for order ${orderNumber} could not be processed.${returnRecord.note ? ` ${returnRecord.note}` : ''} Reply to this email with any questions.`
  const resendTemplate = {
    name: 'return-declined',
    variables: {
      CUSTOMER_FIRST_NAME: firstName,
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      DECLINE_NOTE: returnRecord.note || 'No further details were provided',
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent when staff process a return with "Email return label to customer".
// The label itself travels as a PDF attachment. (No Resend template is wired
// to this one on purpose: the dashboard template expects a hosted download
// link, which Parcel2Go doesn't provide — the PDF is attached instead.)
export function returnLabelEmail(
  order: any,
  opts: { carrierName?: string; trackingNumber?: string },
) {
  const orderNumber = orderNumberOf(order)
  const carrier = opts.carrierName || 'the courier'
  const firstName = order?.shipping_address?.first_name
  const subject = `Your return label — order ${orderNumber} | ${SITE_NAME}`
  const html = renderShell(
    statusBadge('return_label'),
    'Your prepaid return label is ready',
    `
      <p style="margin:0;font-size:14.5px;line-height:1.65;color:${MUTED};">
        ${firstName ? `Hi ${firstName}, y` : 'Y'}our return for order <strong style="color:${TEXT};">${orderNumber}</strong> has been approved. The prepaid label is attached to this email as a PDF.
      </p>
      ${sectionHeading('How to return your parcel')}
      ${stepList([
        {
          title: 'Pack your items',
          body: 'Include everything you are returning, in its original packaging where possible.',
        },
        {
          title: 'Print and attach the label',
          body: 'Print the attached PDF and stick it flat on the outside of the parcel. Remove or cover any old labels.',
        },
        {
          title: `Drop it off at a ${carrier} drop-off point`,
          body: 'Keep your proof of postage until the return reaches us.',
        },
      ])}
      ${
        opts.trackingNumber
          ? infoBox(
              'Parcel tracking',
              `<p style="margin:0;font-size:14px;color:${TEXT};">Tracking number: <strong>${opts.trackingNumber}</strong></p>`,
            )
          : ''
      }
      <p style="margin:20px 0 0;font-size:13.5px;line-height:1.6;color:${MUTED};">
        Any trouble printing the label? Just reply to this email and we will help.
      </p>
    `,
  )
  const text = `${firstName ? `Hi ${firstName}, your` : 'Your'} return for order ${orderNumber} is approved. Your prepaid return label is attached as a PDF. 1) Pack your items. 2) Print and attach the label. 3) Drop the parcel off at a ${carrier} drop-off point and keep your proof of postage.${opts.trackingNumber ? ` Tracking number: ${opts.trackingNumber}.` : ''} Reply to this email if you need help.`
  return { subject, html, text }
}

// Sent automatically when a mail-in stringing order is placed: the prepaid
// label the customer prints to post their rackets to us.
export function mailInLabelEmail(
  order: any,
  opts: {
    carrierName?: string
    trackingNumber?: string
    /** Set when your box kit has just been posted to the customer. */
    boxShipped?: boolean
    boxTrackingNumber?: string
  },
) {
  const orderNumber = orderNumberOf(order)
  const carrier = opts.carrierName || 'the courier'
  const firstName = order?.shipping_address?.first_name
  const subject = `Your prepaid shipping label — order ${orderNumber} | ${SITE_NAME}`

  const steps = opts.boxShipped
    ? [
        {
          title: 'Wait for your racket box',
          body: `It is on its way to you${opts.boxTrackingNumber ? ` (tracking number <strong style="color:${TEXT};">${opts.boxTrackingNumber}</strong>)` : ''}. Keep this email handy — your label is attached.`,
        },
        {
          title: 'Pack your rackets',
          body: 'Place your rackets in the box and seal it securely.',
        },
        {
          title: 'Print and attach the label',
          body: 'Print the attached PDF and stick it flat on the outside of the box. Remove or cover any old labels.',
        },
        {
          title: `Drop it off at a ${carrier} drop-off point`,
          body: 'Keep your proof of postage until we have received your rackets.',
        },
      ]
    : [
        {
          title: 'Pack your rackets',
          body: 'Place your rackets in your box and seal it securely.',
        },
        {
          title: 'Print and attach the label',
          body: 'Print the attached PDF and stick it flat on the outside of the parcel. Remove or cover any old labels.',
        },
        {
          title: `Drop it off at a ${carrier} drop-off point`,
          body: 'Keep your proof of postage until we have received your rackets.',
        },
      ]

  const html = renderShell(
    statusBadge('mail_in_label'),
    'Your prepaid shipping label is ready',
    `
      <p style="margin:0;font-size:14.5px;line-height:1.65;color:${MUTED};">
        ${firstName ? `Hi ${firstName}, t` : 'T'}hanks for booking mail-in stringing with us. Your prepaid label for order <strong style="color:${TEXT};">${orderNumber}</strong> is attached to this email as a PDF. Here is what to do next:
      </p>
      ${sectionHeading('How to send your rackets')}
      ${stepList(steps)}
      ${
        opts.trackingNumber
          ? infoBox(
              'Parcel tracking',
              `<p style="margin:0;font-size:14px;color:${TEXT};">Tracking number: <strong>${opts.trackingNumber}</strong></p>`,
            )
          : ''
      }
      ${infoBox(
        'What happens next',
        `<p style="margin:0;font-size:13.5px;line-height:1.6;color:${MUTED};">Once your rackets arrive we will restring them, then post them back to you and email your tracking details. Trouble printing the label? Just reply to this email and we will help.</p>`,
      )}
    `,
  )
  const text = `${firstName ? `Hi ${firstName}, ` : ''}${opts.boxShipped ? `your racket box is on its way${opts.boxTrackingNumber ? ` (tracking number ${opts.boxTrackingNumber})` : ''}. ` : ''}Your prepaid mail-in label for order ${orderNumber} is attached as a PDF. ${opts.boxShipped ? '1) Wait for your box. 2) Pack your rackets. 3) Print and attach the label. 4)' : '1) Pack your rackets. 2) Print and attach the label. 3)'} Drop the parcel off at a ${carrier} drop-off point and keep your proof of postage.${opts.trackingNumber ? ` Tracking number: ${opts.trackingNumber}.` : ''} Once we receive your rackets we will restring and post them back. Reply to this email if you need help.`
  return { subject, html, text }
}

// ---------------------------------------------------------------------------
// Gift cards (sold on the website - emailed, never shipped)
// ---------------------------------------------------------------------------

function giftCodeBlock(code: string) {
  return infoBox(
    'Gift card code',
    `<p style="margin:0;font-size:22px;font-weight:800;letter-spacing:1.5px;color:${TEXT};">${code}</p>`,
  )
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Sent to the BUYER right after payment: card number + value + how to use it.
export function giftCardPurchaseEmail(opts: {
  code: string
  amount: number
  orderNumber: string
  recipientEmail?: string
  sendDate?: string
}) {
  const { code, amount, orderNumber, recipientEmail, sendDate } = opts
  const subject = `Your gift card is ready — ${code}`
  const forwardNote = recipientEmail
    ? noteBox(
        'Sent to the recipient',
        `We are also emailing this card to ${strong(escapeHtml(recipientEmail))}${sendDate ? ` on ${escapeHtml(sendDate)}` : ' now'}.`,
      )
    : ''
  const html = renderShell(
    pillBadge('GIFT CARD PURCHASED', '#ECFDF5', GREEN),
    'Your gift card is ready',
    `
      ${introText(`Thank you for your gift card purchase. Your ${SITE_NAME} gift card for ${strong(fmt(amount))} is ready to use (order ${strong(orderNumber)}).`)}
      ${giftCodeBlock(code)}
      ${forwardNote}
      ${sectionHeading('How to redeem it')}
      ${stepList([
        {
          title: 'Shop online or in store',
          body: 'Pick your items as usual.',
        },
        {
          title: 'Use your code at checkout',
          body: 'Enter the code online, or show it to our team in store. It does not expire.',
        },
      ])}
      ${ctaButton('Start shopping', SITE_URL)}
    `,
  )
  const text = `Your ${SITE_NAME} gift card (${fmt(amount)}) is ready. Gift card code: ${code}. Enter it at checkout or show it in store to redeem. It does not expire. Order ${orderNumber}.`
  return {
    subject,
    html,
    text,
    resendTemplate: {
      name: 'gift-card-confirmation',
      variables: {
        GIFT_CARD_CODE: code,
        GIFT_CARD_AMOUNT: fmt(amount),
        GIFT_CARD_EXPIRY_NOTE: '',
        SHOP_URL: SITE_URL,
      },
    },
  }
}

// Sent to the RECIPIENT when the buyer chose "send as a gift".
export function giftCardRecipientEmail(opts: {
  code: string
  amount: number
  senderName: string
  message?: string
}) {
  const { code, amount, senderName, message } = opts
  const note = (message ?? '').trim() || 'Enjoy your gift!'
  const subject = `${senderName} sent you a ${SITE_NAME} gift card`
  const html = renderShell(
    pillBadge("YOU'VE BEEN SENT A GIFT", '#ECFDF5', GREEN),
    "You've received a gift card",
    `
      ${introText(`${strong(escapeHtml(senderName))} has sent you a ${SITE_NAME} gift card worth ${strong(fmt(amount))}.`)}
      ${infoBox(`Message from ${escapeHtml(senderName)}`, `<p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};font-style:italic;">"${escapeHtml(note)}"</p>`)}
      ${giftCodeBlock(code)}
      ${sectionHeading('How to redeem it')}
      ${stepList([
        {
          title: 'Shop online or in store',
          body: 'Pick anything you like.',
        },
        {
          title: 'Use your code at checkout',
          body: 'Enter the code online, or show it to our team in store.',
        },
      ])}
      ${ctaButton('Redeem now', SITE_URL)}
    `,
  )
  const text = `${senderName} sent you a ${SITE_NAME} gift card worth ${fmt(amount)}. "${note}" Gift card code: ${code}. Redeem it at ${SITE_URL}.`
  return {
    subject,
    html,
    text,
    resendTemplate: {
      name: 'gift-card-notification',
      variables: {
        SENDER_NAME: senderName,
        GIFT_CARD_AMOUNT: fmt(amount),
        GIFT_MESSAGE: note,
        GIFT_CARD_CODE: code,
        SHOP_URL: SITE_URL,
      },
    },
  }
}

// Order receipt for an order that contains ONLY gift cards - same as the
// normal confirmation but without the "being prepared for dispatch /
// tracking" wording, since nothing is shipped.
export function giftCardOrderReceiptEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const greetingName = firstNameOf(order)
  const subject = `Order confirmed ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('confirmed'),
    'Your order is confirmed',
    `
      ${introText(`Hi ${greetingName}, thank you for your order. We have received order ${strong(orderNumber)}. Nothing is shipped for a gift card, so there is no tracking to wait for.`)}
      ${sectionHeading('What happens next')}
      ${stepList([
        {
          title: 'Check your inbox',
          body: 'Your gift card number and details are in a separate email, sent right after payment.',
        },
        {
          title: 'Use it any time',
          body: 'Enter the code at checkout online, or show it to our team in store.',
        },
      ])}
      ${sectionHeading('Your order')}
      ${itemsTable(order.items ?? [])}
      ${totalBlock('Order total', order.total)}
    `,
  )
  const text = `Hi ${greetingName}, order confirmed ${orderNumber} — Total ${fmt(order.total)}. Your gift card number and details are in a separate email.`
  return {
    subject,
    html,
    text,
    // No dedicated Resend template for this variant yet -> raw html is used.
    resendTemplate: undefined as
      { name: string; variables: Record<string, string> } | undefined,
    attachments: undefined as
      ReturnType<typeof qrInlineAttachment>[] | undefined,
  }
}
