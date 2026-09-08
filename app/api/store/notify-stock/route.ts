import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'
import { CONTACT_EMAIL } from '@/lib/constants'
import {
  stockNotifyCustomerEmail,
  stockNotifyAdminEmail,
} from '@/lib/email-templates'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { safeJson } from '@/lib/api/safe-json'
interface StockRequest {
  email: string
  productId: string
  productName: string
  createdAt: string
}
async function getStoreIdAndRequests(): Promise<{
  storeId: string
  requests: StockRequest[]
} | null> {
  const res = await medusaServiceFetch(
    '/admin/stores?limit=1&fields=id,metadata',
  )
  if (!res.ok) return null
  const { stores } = await safeJson(res, 'app/api/store/notify-stock/route.ts')
  const store = stores?.[0]
  if (!store) return null
  return {
    storeId: store.id,
    requests: store.metadata?.stockNotifyRequests ?? [],
  }
}
export async function POST(req: NextRequest) {
  try {
    const { email, productId, productName } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          error: 'Enter a valid email address',
        },
        {
          status: 400,
        },
      )
    }
    if (!productId || !productName) {
      return NextResponse.json(
        {
          error: 'Missing product details',
        },
        {
          status: 400,
        },
      )
    }
    const normalized = email.trim().toLowerCase()
    const result = await getStoreIdAndRequests()
    if (!result) {
      return NextResponse.json(
        {
          error: 'Something went wrong',
        },
        {
          status: 500,
        },
      )
    }
    const alreadyRequested = result.requests.some(
      (r) => r.email === normalized && r.productId === productId,
    )
    if (alreadyRequested) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
      })
    }
    const updated: StockRequest[] = [
      ...result.requests,
      {
        email: normalized,
        productId,
        productName,
        createdAt: new Date().toISOString(),
      },
    ]
    const saveRes = await medusaServiceFetch(
      `/admin/stores/${result.storeId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          metadata: {
            stockNotifyRequests: updated,
          },
        }),
      },
    )
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}))
      console.error('[NotifyStock] failed to save request:', err)
      return NextResponse.json(
        {
          error: 'Something went wrong',
        },
        {
          status: 500,
        },
      )
    }
    const customerEmail = stockNotifyCustomerEmail(productName)
    sendMail({
      to: normalized,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
    }).catch(() => {})
    const adminEmail = stockNotifyAdminEmail({
      email: normalized,
      productName,
      productId,
    })
    sendMail({
      to: CONTACT_EMAIL,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
    }).catch(() => {})
    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    console.error('[NotifyStock] error:', err.message)
    return NextResponse.json(
      {
        error: 'Something went wrong',
      },
      {
        status: 500,
      },
    )
  }
}
