import {
  SITE_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
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
    | 'return_declined',
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
  }[kind]
  return pillBadge(map.label, map.bg, map.fg)
}

function pillBadge(label: string, bg: string, fg: string) {
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
//
// This produces the local fallback `html` used when the matching Resend
// Template for a given email type hasn't been synced yet (see
// scripts/sync-resend-templates.ts) — once it has, lib/email.ts sends via
// that dedicated Resend Template instead (each email type has its own, see
// scripts/resend-templates.generated.json), and this html is unused for
// that send but still returned so nothing else has to change shape.
function renderShell(badge: string, title: string, bodyHtml: string): string {
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
  const isPickup = order.metadata?.fulfillment_type === 'pickup'
  const greetingName = (order.customer?.first_name || '').trim() || 'there'
  const trackingUrl = `${SITE_URL}/track/${order.id}?t=${signOrderTrackToken(order.id)}`
  const qrCid = 'order-qr'

  const subject = isPickup
    ? `Order confirmed ${orderNumber} — ready for collection soon — ${SITE_NAME}`
    : `Order confirmed ${orderNumber} — ${SITE_NAME}`

  const introHtml = isPickup
    ? `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Thank you for your order. We have received order <strong style="color:${TEXT};">${orderNumber}</strong> and it is now being prepared for collection in store. We will let you know as soon as it is ready to pick up.
      </p>
    `
    : `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Thank you for your order. We have received order <strong style="color:${TEXT};">${orderNumber}</strong> and it is being prepared for dispatch. You will receive a further email with tracking details once it has shipped.
      </p>
    `

  const qrCaption = isPickup
    ? 'Scan this code at any time to view your order status and confirm when it is ready for collection.'
    : 'Scan this code at any time to view your order status and tracking details once your order has shipped.'

  const html = renderShell(
    statusBadge('confirmed'),
    `Thank you for your order, ${greetingName}`,
    `
      ${introHtml}
      ${itemsTable(order.items ?? [])}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Order total', order.total, true)}
      </div>
      ${qrBlock(qrCid, qrCaption)}
      ${ctaButton('View your order', trackingUrl)}
    `,
  )
  const text = isPickup
    ? `Order confirmed ${orderNumber} — Total ${fmt(order.total)}. It is being prepared for collection in store; we will notify you once it is ready. Track it any time at ${trackingUrl}`
    : `Order confirmed ${orderNumber} — Total ${fmt(order.total)}. We will email you again once it has shipped. Track it any time at ${trackingUrl}`

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
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> has left our warehouse and is on its way to you via Royal Mail.
      </p>
      ${
        trackingNumber
          ? `
        <div style="margin-top:16px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Royal Mail tracking number</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:${TEXT};">${trackingNumber}</p>
        </div>`
          : ''
      }
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
      ${ctaButton('Track your order', royalMailTrackUrl ?? `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order ${orderNumber} has shipped.${trackingNumber ? ` Royal Mail tracking number: ${trackingNumber}.` : ''}${addressLine ? ` Shipping to: ${addressLine}` : ''}`
  const resendTemplate = {
    name: 'shipping-confirmation',
    variables: {
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
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> is out for delivery and is expected to arrive today.
      </p>
      ${
        addressLine
          ? `
        <div style="margin-top:20px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Delivering to</p>
          <p style="margin:0;font-size:14px;color:${TEXT};">${addressLine}</p>
        </div>`
          : ''
      }
      ${ctaButton('Track your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order ${orderNumber} is out for delivery and should arrive today.${addressLine ? ` Delivering to: ${addressLine}` : ''}`
  const resendTemplate = {
    name: 'out-for-delivery',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ADDRESS_LINE: addressLine,
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer once the order is marked delivered.
export function deliveryConfirmationEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Your order ${orderNumber} has been delivered — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('delivered'),
    'Your order has been delivered',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> has been delivered. If anything is missing or not as expected, please reply to this email and we will assist.
      </p>
      ${itemsTable(order.items ?? [])}
      ${ctaButton('View your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order ${orderNumber} has been delivered. If anything is missing or not as expected, please reply to this email and we will assist.`
  const resendTemplate = {
    name: 'delivery-confirmation',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      ITEMS_HTML: itemsTable(order.items ?? []),
    },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer when their order is cancelled.
export function orderCancelledEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Order ${orderNumber} has been cancelled — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('cancelled'),
    'Your order has been cancelled',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> has been cancelled. If payment had already been taken, the amount will be refunded to your original payment method within a few business days.
      </p>
      ${itemsTable(order.items ?? [])}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        If you did not request this cancellation, or have any questions, please reply to this email.
      </p>
    `,
  )
  const text = `Order ${orderNumber} has been cancelled. If payment had already been taken, the amount will be refunded to your original payment method within a few business days.`
  const resendTemplate = {
    name: 'order-cancelled',
    variables: {
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
  const subject = `Refund processed for order ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('refunded'),
    'Your refund has been processed',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        A refund has been processed for order <strong style="color:${TEXT};">${orderNumber}</strong>. Please allow a few business days for it to appear on your original payment method.
      </p>
      ${itemsTable(items ?? [])}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Refund amount', refundAmount, true)}
      </div>
    `,
  )
  const text = `Refund of ${fmt(refundAmount)} processed for order ${orderNumber}. Please allow a few business days for it to appear on your original payment method.`
  const resendTemplate = {
    name: 'refund-confirmation',
    variables: {
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
    `Welcome, ${firstName}`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Your ${SITE_NAME} account has been created with <strong style="color:${TEXT};">${customer.email}</strong>. You can now check out faster, track your orders and view your full order history from your account.
      </p>
      <ul style="margin:20px 0 0;padding:0 0 0 18px;font-size:14px;line-height:1.9;color:${TEXT};">
        <li>Track your orders in real time</li>
        <li>Faster checkout on future orders</li>
        <li>Access your full order history in one place</li>
      </ul>
      ${ctaButton('Start shopping', `${SITE_URL}/shop`)}
    `,
  )
  const text = `Welcome to ${SITE_NAME}, ${firstName}. Your account (${customer.email}) has been created. Visit ${SITE_URL}/shop to start shopping.`
  const resendTemplate = {
    name: 'welcome',
    variables: { CUSTOMER_FIRST_NAME: firstName, CUSTOMER_EMAIL: customer.email },
  }
  return { subject, html, text, resendTemplate }
}

// Sent to the customer confirming their contact-form message was received.
export function contactAutoReplyEmail(opts: { name: string; message: string }) {
  const subject = `We've received your message — ${SITE_NAME}`
  const preview =
    opts.message.length > 200 ? opts.message.slice(0, 200) + '…' : opts.message
  const html = renderShell(
    statusBadge('admin'),
    `Thank you for contacting us, ${opts.name}`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We have received your message and a member of the ${SITE_NAME} team will respond shortly.
      </p>
      <div style="margin-top:20px;padding:16px 18px;background:#F9FAFB;border:1px solid ${BORDER};border-radius:8px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Your message</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};">"${preview}"</p>
      </div>
    `,
  )
  const text = `Thank you for contacting us, ${opts.name}. We have received your message and a member of the ${SITE_NAME} team will respond shortly.`
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
    CUSTOMER_FIRST_NAME: order.customer?.first_name || (order.customer ? '' : 'Guest'),
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
    statusBadge('welcome'),
    `You're on the list`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We will email you at this address as soon as <strong style="color:${TEXT};">${productName}</strong> is back in stock.
      </p>
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
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Thank you for signing up with <strong style="color:${TEXT};">${email}</strong>. Keep an eye on your inbox for offers, new arrivals and restock alerts.
      </p>
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
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        You can check the status of your order any time.
      </p>
      ${ctaButton('Track your order', opts.trackingUrl)}
    `
    : ''
  const html = renderShell(
    statusBadge('invoice'),
    'Thank you for shopping with us',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Please find attached invoice <strong style="color:${TEXT};">${opts.invoiceNumber}</strong> for order <strong style="color:${TEXT};">${opts.orderNumber}</strong>.
      </p>
      ${ctaButton('Download invoice', opts.pdfUrl)}
      ${trackingBlock}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${TEXT};">
        Thank you for shopping with us.
      </p>
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
  const greetingName = (order.customer?.first_name || '').trim() || 'there'
  const subject = `Order ${orderNumber} is ready for collection — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('ready_for_pickup'),
    `Good news, ${greetingName} — your order is ready`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> is packed and waiting for you at ${STORE_DISPLAY_NAME}, ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}. Bring a form of ID or your order confirmation when you collect it.
      </p>
      ${itemsTable(order.items ?? [])}
    `,
  )
  const text = `Order ${orderNumber} is ready for collection at ${STORE_DISPLAY_NAME}, ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}. Bring ID or your order confirmation.`
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

export function returnItemsTable(items: { title?: string; quantity: number }[]) {
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
  returnRecord: { items?: { title?: string; quantity: number }[]; reason?: string },
) {
  const orderNumber = orderNumberOf(order)
  const subject = `We've received your return request for ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('return_requested'),
    'Your return request has been received',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We've received your return request for order <strong style="color:${TEXT};">${orderNumber}</strong>${returnRecord.reason ? ` (reason: ${returnRecord.reason})` : ''}. Our team will review it and get back to you shortly — you'll receive another email once it's approved or if we need more information.
      </p>
      ${returnItemsTable(returnRecord.items ?? [])}
    `,
  )
  const text = `We've received your return request for order ${orderNumber}. We'll email you once it has been reviewed.`
  const resendTemplate = {
    name: 'return-requested',
    variables: {
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
  returnRecord: { items?: { title?: string; quantity: number }[]; reason?: string; note?: string },
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
  const subject = `Update on your return request for ${orderNumber} — ${SITE_NAME}`
  const html = renderShell(
    statusBadge('return_declined'),
    "We're unable to process this return",
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        After reviewing your return request for order <strong style="color:${TEXT};">${orderNumber}</strong>, we're not able to process it${returnRecord.note ? `: ${returnRecord.note}` : '.'} If you think this is a mistake or would like to discuss it further, just reply to this email.
      </p>
    `,
  )
  const text = `Your return request for order ${orderNumber} could not be processed.${returnRecord.note ? ` ${returnRecord.note}` : ''} Reply to this email with any questions.`
  const resendTemplate = {
    name: 'return-declined',
    variables: {
      ORDER_DISPLAY_ID: String(order.display_id ?? order.id),
      DECLINE_NOTE: returnRecord.note || 'No further details were provided',
    },
  }
  return { subject, html, text, resendTemplate }
}
