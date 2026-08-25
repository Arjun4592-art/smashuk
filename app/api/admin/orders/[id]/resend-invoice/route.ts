import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { MEDUSA_URL } from '@/lib/api/medusa-service-token';
import { generateInvoiceForOrder } from '@/lib/invoice-service';
export async function POST(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const {
    id
  } = await params;
  try {
    const url = new URL(`/admin/orders/${id}`, MEDUSA_URL);
    url.searchParams.set('fields', 'id,currency_code,metadata,*items,*shipping_methods,customer.first_name,customer.last_name,' + 'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' + 'shipping_address.postal_code,shipping_address.country_code');
    const orderRes = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader
      }
    });
    const orderData = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok || !orderData?.order) {
      return NextResponse.json({
        error: orderData?.message ?? `Failed to load order (${orderRes.status})`
      }, {
        status: orderRes.status
      });
    }
    const channel: 'website' | 'pos' = orderData.order.metadata?.source === 'pos' ? 'pos' : 'website';
    const {
      invoiceNumber,
      url: pdfUrl
    } = await generateInvoiceForOrder({
      ...orderData.order,
      channel
    }, {
      regenerate: true
    });
    return NextResponse.json({
      invoiceNumber,
      url: pdfUrl
    });
  } catch (err: any) {
    console.error(`[resend-invoice] failed for order ${id}:`, err);
    return NextResponse.json({
      error: err.message ?? 'Failed to regenerate invoice'
    }, {
      status: 500
    });
  }
}
