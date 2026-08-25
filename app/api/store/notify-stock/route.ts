import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { safeJson } from '@/lib/api/safe-json';
interface StockRequest {
  email: string;
  productId: string;
  productName: string;
  createdAt: string;
}
async function getStoreIdAndRequests(): Promise<{
  storeId: string;
  requests: StockRequest[];
} | null> {
  const res = await medusaServiceFetch('/admin/stores?limit=1&fields=id,metadata');
  if (!res.ok) return null;
  const {
    stores
  } = await safeJson(res, 'app/api/store/notify-stock/route.ts');
  const store = stores?.[0];
  if (!store) return null;
  return {
    storeId: store.id,
    requests: store.metadata?.stockNotifyRequests ?? []
  };
}
export async function POST(req: NextRequest) {
  try {
    const {
      email,
      productId,
      productName
    } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        error: 'Enter a valid email address'
      }, {
        status: 400
      });
    }
    if (!productId || !productName) {
      return NextResponse.json({
        error: 'Missing product details'
      }, {
        status: 400
      });
    }
    const normalized = email.trim().toLowerCase();
    const result = await getStoreIdAndRequests();
    if (!result) {
      return NextResponse.json({
        error: 'Something went wrong'
      }, {
        status: 500
      });
    }
    const alreadyRequested = result.requests.some(r => r.email === normalized && r.productId === productId);
    if (alreadyRequested) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true
      });
    }
    const updated: StockRequest[] = [...result.requests, {
      email: normalized,
      productId,
      productName,
      createdAt: new Date().toISOString()
    }];
    const saveRes = await medusaServiceFetch(`/admin/stores/${result.storeId}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          stockNotifyRequests: updated
        }
      })
    });
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      console.error('[NotifyStock] failed to save request:', err);
      return NextResponse.json({
        error: 'Something went wrong'
      }, {
        status: 500
      });
    }
    sendMail({
      to: normalized,
      subject: `We'll email you when "${productName}" is back in stock`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#E8553A;">You're on the list!</h2>
          <p>We'll email you at this address as soon as <strong>${productName}</strong> is back in stock.</p>
          <p style="color:#888; font-size:12px;">— ${SITE_NAME}</p>
        </div>
      `,
      text: `We'll email you at ${normalized} as soon as "${productName}" is back in stock.`
    }).catch(() => {});
    sendMail({
      to: CONTACT_EMAIL,
      subject: `[${SITE_NAME}] Stock notify request — ${productName}`,
      html: `<p>${normalized} wants to be notified when <strong>${productName}</strong> (${productId}) is back in stock.</p>`,
      text: `${normalized} wants to be notified when ${productName} (${productId}) is back in stock.`
    }).catch(() => {});
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error('[NotifyStock] error:', err.message);
    return NextResponse.json({
      error: 'Something went wrong'
    }, {
      status: 500
    });
  }
}
