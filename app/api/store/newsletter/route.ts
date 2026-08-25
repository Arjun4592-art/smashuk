import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';
import { SITE_NAME } from '@/lib/constants';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { safeJson } from '@/lib/api/safe-json';
async function getStoreIdAndSubscribers(): Promise<{
  storeId: string;
  subscribers: string[];
} | null> {
  const res = await medusaServiceFetch('/admin/stores?limit=1&fields=id,metadata');
  if (!res.ok) return null;
  const {
    stores
  } = await safeJson(res, 'app/api/store/newsletter/route.ts');
  const store = stores?.[0];
  if (!store) return null;
  return {
    storeId: store.id,
    subscribers: store.metadata?.newsletterSubscribers ?? []
  };
}
export async function POST(req: NextRequest) {
  try {
    const {
      email
    } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        error: 'Enter a valid email address'
      }, {
        status: 400
      });
    }
    const normalized = email.trim().toLowerCase();
    const result = await getStoreIdAndSubscribers();
    if (!result) {
      return NextResponse.json({
        error: 'Something went wrong'
      }, {
        status: 500
      });
    }
    if (result.subscribers.includes(normalized)) {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true
      });
    }
    const updated = [...result.subscribers, normalized];
    const saveRes = await medusaServiceFetch(`/admin/stores/${result.storeId}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          newsletterSubscribers: updated
        }
      })
    });
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      console.error('[Newsletter] failed to save subscriber:', err);
      return NextResponse.json({
        error: 'Something went wrong'
      }, {
        status: 500
      });
    }
    sendMail({
      to: normalized,
      subject: `Welcome to ${SITE_NAME}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#E8553A;">Welcome to ${SITE_NAME}!</h2>
          <p>Thanks for subscribing — keep an eye on your inbox for exclusive offers and new arrivals.</p>
        </div>
      `,
      text: `Welcome to ${SITE_NAME}! Keep an eye on your inbox for exclusive offers and new arrivals.`
    }).catch(() => {});
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error('[Newsletter] subscribe error:', err.message);
    return NextResponse.json({
      error: 'Something went wrong'
    }, {
      status: 500
    });
  }
}
