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

// Small coloured pill shown above the heading — 'confirmed' | 'shipped' | 'refunded' | 'welcome' | 'admin'
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
    | 'invoice',
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
export function shell(badge: string, title: string, bodyHtml: string) {
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
    `Thank you for your order, ${(order.customer?.first_name || '').trim() || 'there'}`,
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        We have received order <strong style="color:${TEXT};">${orderNumber}</strong> and it is being prepared. You will receive a further email once it has shipped.
      </p>
      ${itemsTable(order.items ?? [])}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Order total', order.total, true)}
      </div>
      ${ctaButton('View your order', `${SITE_URL}/orders`)}
    `,
  )
  const text = `Order confirmed ${orderNumber} — Total ${fmt(order.total)}. We will email you again once it has shipped.`
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
    'Your order has shipped',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Order <strong style="color:${TEXT};">${orderNumber}</strong> has left our warehouse and is on its way to you.
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
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the customer once the order is marked delivered.
export function deliveryConfirmationEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Your order ${orderNumber} has been delivered — ${SITE_NAME}`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the customer when their order is cancelled.
export function orderCancelledEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const subject = `Order ${orderNumber} has been cancelled — ${SITE_NAME}`
  const html = shell(
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
        A refund has been processed for order <strong style="color:${TEXT};">${orderNumber}</strong>. Please allow a few business days for it to appear on your original payment method.
      </p>
      ${items && items.length ? itemsTable(items) : ''}
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid ${BORDER};">
        ${totalRow('Refund amount', refundAmount, true)}
      </div>
    `,
  )
  const text = `Refund of ${fmt(refundAmount)} processed for order ${orderNumber}. Please allow a few business days for it to appear on your original payment method.`
  return { subject, html, text }
}

// Sent to the customer the moment their account is created (register flow).
export function welcomeEmail(customer: {
  first_name?: string
  last_name?: string
  email: string
}) {
  const firstName = (customer.first_name || '').trim() || 'there'
  const subject = `Welcome to ${SITE_NAME}, ${firstName}`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the customer confirming their contact-form message was received.
export function contactAutoReplyEmail(opts: { name: string; message: string }) {
  const subject = `We've received your message — ${SITE_NAME}`
  const preview =
    opts.message.length > 200 ? opts.message.slice(0, 200) + '…' : opts.message
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when a contact-form enquiry comes in.
export function contactAdminEmail(opts: {
  name: string
  email: string
  subject?: string
  message: string
}) {
  const subject = `New enquiry — ${opts.subject || 'General'} — from ${opts.name}`
  const html = shell(
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
  return { subject, html, text }
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:${MUTED};width:110px;vertical-align:top;">${label}</td>
      <td style="padding:4px 0;font-size:14px;color:${TEXT};font-weight:600;">${value}</td>
    </tr>
  `
}

// Sent to the store owner/admin inbox when an order ships.
export function adminShippingEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked as shipped`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when a customer is notified the order is out for delivery.
export function adminOutForDeliveryEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked out for delivery`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when an order is marked delivered.
export function adminDeliveryEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} marked as delivered`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when an order is cancelled.
export function adminCancelledEmail(order: any) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Order ${orderNumber} cancelled`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when a refund is processed.
export function adminRefundEmail(order: any, refundAmount: number) {
  const orderNumber = orderNumberOf(order)
  const customerName =
    (order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '') || 'Guest'
  const subject = `Refund processed for order ${orderNumber}`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when a new customer account is created.
export function adminWelcomeEmail(customer: {
  first_name?: string
  last_name?: string
  email: string
}) {
  const name =
    `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
    'New customer'
  const subject = `New customer account — ${customer.email}`
  const html = shell(
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
  return { subject, html, text }
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
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the customer who asked to be notified when a product is back in stock.
export function stockNotifyCustomerEmail(productName: string) {
  const subject = `We'll email you when "${productName}" is back in stock`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to the store owner/admin inbox when a customer requests a back-in-stock alert.
export function stockNotifyAdminEmail(opts: {
  email: string
  productName: string
  productId: string
}) {
  const subject = `Back-in-stock request — ${opts.productName}`
  const html = shell(
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
  return { subject, html, text }
}
// Sent to a customer immediately after they subscribe to the newsletter.
export function newsletterWelcomeEmail(email: string) {
  const subject = `Welcome to ${SITE_NAME}`
  const html = shell(
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
  return { subject, html, text }
}

// Sent to a staff member when they're added to the POS system.
export function staffInviteEmail(opts: {
  firstName: string
  role?: string
  shift?: string
}) {
  const roleLabel = opts.role === 'admin' ? 'an Admin' : 'Staff'
  const subject = `You've been added to ${SITE_NAME} POS`
  const html = shell(
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
  return { subject, html, text }
}
// Sent to the customer from the POS when a staff member emails them their
// invoice (replaces the old plain in-store receipt). The invoice PDF itself
// (generated by lib/invoice-service.ts) is attached to the email.
export function invoiceEmail(opts: {
  invoiceNumber: string
  orderNumber: string
  pdfUrl: string
}) {
  const subject = `Your invoice ${opts.invoiceNumber} — ${SITE_NAME}`
  const html = shell(
    statusBadge('invoice'),
    'Thank you for shopping with us',
    `
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Please find attached invoice <strong style="color:${TEXT};">${opts.invoiceNumber}</strong> for order <strong style="color:${TEXT};">${opts.orderNumber}</strong>.
      </p>
      ${ctaButton('Download invoice', opts.pdfUrl)}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${TEXT};">
        Thank you for shopping with us.
      </p>
    `,
  )
  const text = `Please find attached invoice ${opts.invoiceNumber} for order ${opts.orderNumber}. You can also download it here: ${opts.pdfUrl}`
  return { subject, html, text }
}
