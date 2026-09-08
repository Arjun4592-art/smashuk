import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { sendMail } from '@/lib/email'
import {
  SITE_NAME,
  CURRENCY_SYMBOL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
} from '@/lib/constants'
const NAVY = '#0A1F44'
const CORAL = '#E8553A'
const TEXT = '#0A1F44'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}
interface ReceiptItem {
  id: string
  name: string
  price: number
  quantity: number
}
interface ReceiptPayload {
  orderId: string
  email: string
  items: ReceiptItem[]
  subtotal: number
  discountAmount: number
  tax: number
  total: number
  payMethod: string
  splitPayments?:
    | {
        method: string
        amount: number
      }[]
    | null
  cashier: string
}
const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}
const fmt = (n: number) =>
  CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-GB')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function buildReceiptHtml(p: ReceiptPayload): string {
  const rows = p.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;font-size:14px;color:${TEXT};border-bottom:1px solid #F3F4F6;">${escapeHtml(item.name)} <span style="color:${MUTED};font-size:12px;">×${item.quantity}</span></td>
          <td style="padding:12px 0;font-size:14px;color:${TEXT};font-weight:600;border-bottom:1px solid #F3F4F6;text-align:right;white-space:nowrap;">${fmt(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('')
  const discountRow =
    p.discountAmount > 0
      ? `<tr><td style="padding:5px 0;font-size:13px;color:#10B981;">Discount</td><td style="padding:5px 0;font-size:13px;color:#10B981;text-align:right;">-${fmt(p.discountAmount)}</td></tr>`
      : ''
  const paymentLine =
    p.payMethod === 'split' && p.splitPayments?.length
      ? p.splitPayments
          .map((s) => `${PAY_LABELS[s.method] || s.method}: ${fmt(s.amount)}`)
          .join(' · ')
      : PAY_LABELS[p.payMethod] || p.payMethod
  return `
  <div style="background:#F2F4F7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="background:${NAVY};padding:26px 32px;border-radius:12px 12px 0 0;text-align:center;">
          <span style="font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:0.5px;">${escapeHtml(SITE_NAME.toUpperCase())}</span>
        </td>
      </tr>
      <tr>
        <td style="background:#FFFFFF;padding:32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          <span style="display:inline-block;background:#ECFDF5;color:#10B981;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:6px 12px;border-radius:999px;">RECEIPT</span>
          <h1 style="margin:16px 0 2px;font-size:20px;color:${TEXT};">In-store purchase</h1>
          <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">Order ${escapeHtml(p.orderId)} · Served by ${escapeHtml(p.cashier)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:20px;">
            <thead>
              <tr>
                <td style="padding:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};">Item</td>
                <td style="padding:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${BORDER};text-align:right;">Price</td>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            <tr><td style="padding:4px 0;font-size:13px;color:${MUTED};">Subtotal</td><td style="padding:4px 0;font-size:13px;color:${MUTED};text-align:right;">${fmt(p.subtotal)}</td></tr>
            ${discountRow}
            <tr><td style="padding:4px 0;font-size:13px;color:${MUTED};">VAT (20%)</td><td style="padding:4px 0;font-size:13px;color:${MUTED};text-align:right;">${fmt(p.tax)}</td></tr>
            <tr>
              <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:${TEXT};border-top:2px solid ${BORDER};">Total</td>
              <td style="padding:10px 0 0;font-size:20px;font-weight:700;color:${CORAL};text-align:right;border-top:2px solid ${BORDER};">${fmt(p.total)}</td>
            </tr>
          </table>
          <p style="text-align:center;margin:20px 0 0;font-size:13px;color:${MUTED};">Paid via ${escapeHtml(paymentLine)}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#F9FAFB;padding:24px 32px;border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">
            Thanks for shopping with us! Questions?
            <a href="mailto:${CONTACT_EMAIL}" style="color:${CORAL};text-decoration:none;font-weight:600;">Email us</a>
            or call ${CONTACT_PHONE}
          </p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            ${STORE_DISPLAY_NAME} · ${STORE_ADDRESS_LINE1}, ${STORE_ADDRESS_LINE2}
          </p>
        </td>
      </tr>
    </table>
  </div>`
}
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  let body: Partial<ReceiptPayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request body',
      },
      {
        status: 400,
      },
    )
  }
  const { orderId, email, items, cashier } = body
  if (!orderId || !email || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      {
        error: 'orderId, email and items are required',
      },
      {
        status: 400,
      },
    )
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      {
        error: 'Invalid email address',
      },
      {
        status: 400,
      },
    )
  }
  const payload: ReceiptPayload = {
    orderId,
    email,
    items,
    subtotal: body.subtotal ?? 0,
    discountAmount: body.discountAmount ?? 0,
    tax: body.tax ?? 0,
    total: body.total ?? 0,
    payMethod: body.payMethod ?? 'cash',
    splitPayments: body.splitPayments ?? null,
    cashier: cashier ?? 'Staff',
  }
  try {
    const result = await sendMail({
      to: email,
      subject: `Your receipt from ${SITE_NAME} — ${orderId}`,
      html: buildReceiptHtml(payload),
      text: `${SITE_NAME} — Order ${orderId}\n\n${items.map((i) => `${i.name} x${i.quantity} — ${fmt(i.price * i.quantity)}`).join('\n')}\n\nTotal: ${fmt(payload.total)}\nPaid via: ${PAY_LABELS[payload.payMethod] || payload.payMethod}\n\nThank you for shopping with ${SITE_NAME}!`,
    })
    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            result.error === 'Resend not configured'
              ? 'Email is not set up yet — add RESEND_API_KEY/EMAIL_FROM to .env.local (see SETUP.md).'
              : (result.error ?? 'Failed to send email'),
        },
        {
          status: 502,
        },
      )
    }
    return NextResponse.json({
      sent: true,
    })
  } catch (err: any) {
    console.error('[POS] receipt email error:', err)
    return NextResponse.json(
      {
        error: err.message ?? 'Failed to send receipt email',
      },
      {
        status: 500,
      },
    )
  }
}
