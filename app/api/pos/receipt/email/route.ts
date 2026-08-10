// app/api/pos/receipt/email/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the old `onEmail={() => alert('Email receipt coming soon!')}`
// stub on the POS receipt screen (app/pos/terminal/billing/page.tsx).
//
// Sends the same receipt already shown on-screen / sent to Print, using the
// project's existing SMTP sender (lib/email.ts — same one used for staff
// invites, contact-form replies, etc.). Requires SMTP_HOST/SMTP_USER/
// SMTP_PASS/SMTP_FROM to be set in .env.local — if they're missing,
// sendMail() itself returns { sent: false } instead of throwing, which we
// surface here as a clear error rather than a silent no-op.
//
// Auth: same rule as every other /api/pos/* route — only a logged-in POS
// staff member or dashboard admin may trigger a send.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { sendMail } from '@/lib/email'
import { SITE_NAME, CURRENCY_SYMBOL } from '@/lib/constants'

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
  splitPayments?: { method: string; amount: number }[] | null
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
          <td style="padding:6px 0;color:#202223;">${escapeHtml(item.name)} <span style="color:#8C9196;">×${item.quantity}</span></td>
          <td style="padding:6px 0;text-align:right;color:#202223;">${fmt(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('')

  const discountRow =
    p.discountAmount > 0
      ? `<tr><td style="padding:4px 0;color:#008060;">Discount</td><td style="padding:4px 0;text-align:right;color:#008060;">-${fmt(p.discountAmount)}</td></tr>`
      : ''

  const paymentLine =
    p.payMethod === 'split' && p.splitPayments?.length
      ? p.splitPayments
          .map((s) => `${PAY_LABELS[s.method] || s.method}: ${fmt(s.amount)}`)
          .join(' · ')
      : PAY_LABELS[p.payMethod] || p.payMethod

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;">
    <div style="text-align:center;padding:20px 0;border-bottom:1px dashed #E1E3E5;">
      <h2 style="margin:0;color:#202223;">${escapeHtml(SITE_NAME)}</h2>
      <p style="margin:4px 0 0;color:#8C9196;font-size:13px;">Order ${escapeHtml(p.orderId)} · Staff: ${escapeHtml(p.cashier)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
      ${rows}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;border-top:1px dashed #E1E3E5;padding-top:8px;">
      <tr><td style="padding:4px 0;color:#6D7175;">Subtotal</td><td style="padding:4px 0;text-align:right;color:#6D7175;">${fmt(p.subtotal)}</td></tr>
      ${discountRow}
      <tr><td style="padding:4px 0;color:#6D7175;">VAT (20%)</td><td style="padding:4px 0;text-align:right;color:#6D7175;">${fmt(p.tax)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:700;color:#202223;border-top:1px solid #E1E3E5;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#202223;border-top:1px solid #E1E3E5;">${fmt(p.total)}</td></tr>
    </table>
    <p style="text-align:center;color:#8C9196;font-size:13px;margin-top:12px;">${escapeHtml(paymentLine)}</p>
    <p style="text-align:center;color:#8C9196;font-size:12px;margin-top:20px;">Thank you for shopping with ${escapeHtml(SITE_NAME)}!</p>
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<ReceiptPayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { orderId, email, items, cashier } = body
  if (!orderId || !email || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'orderId, email and items are required' },
      { status: 400 },
    )
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email address' },
      { status: 400 },
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
      text: `${SITE_NAME} — Order ${orderId}\n\n${items
        .map((i) => `${i.name} x${i.quantity} — ${fmt(i.price * i.quantity)}`)
        .join(
          '\n',
        )}\n\nTotal: ${fmt(payload.total)}\nPaid via: ${PAY_LABELS[payload.payMethod] || payload.payMethod}\n\nThank you for shopping with ${SITE_NAME}!`,
    })

    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            result.error === 'SMTP not configured'
              ? 'Email is not set up yet — add SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM to .env.local (see SETUP.md).'
              : (result.error ?? 'Failed to send email'),
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ sent: true })
  } catch (err: any) {
    console.error('[POS] receipt email error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to send receipt email' },
      { status: 500 },
    )
  }
}
