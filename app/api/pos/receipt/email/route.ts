import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { sendMail } from '@/lib/email'
import { invoiceEmail } from '@/lib/email-templates'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { generateInvoiceForOrder } from '@/lib/invoice-service'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  let body: { orderId?: string; email?: string }
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
  const { orderId, email } = body
  if (!orderId || !email) {
    return NextResponse.json(
      {
        error: 'orderId and email are required',
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
  try {
    const orderRes = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,display_id,created_at,currency_code,metadata,*items,*shipping_methods,*payment_collections.payments,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
    )
    if (!orderRes.ok) {
      return NextResponse.json(
        {
          error: 'Could not find that order',
        },
        {
          status: 404,
        },
      )
    }
    const { order } = await orderRes.json()
    const { invoiceNumber, url } = await generateInvoiceForOrder({
      ...order,
      channel: 'pos',
    })
    const orderNumber = order.display_id ? `#${order.display_id}` : order.id
    const built = invoiceEmail({
      invoiceNumber,
      orderNumber,
      pdfUrl: url,
    })
    const result = await sendMail({
      to: email,
      subject: built.subject,
      html: built.html,
      text: built.text,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          path: url,
        },
      ],
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
    console.error('[POS] invoice email error:', err)
    return NextResponse.json(
      {
        error: err.message ?? 'Failed to send invoice email',
      },
      {
        status: 500,
      },
    )
  }
}
