import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300)
    };
  }
}
export async function GET(req: NextRequest) {
  try {
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const {
      searchParams
    } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(`${MEDUSA_URL}/admin/product-tags${qs ? `?${qs}` : ''}`, {
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[GET product-tags]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/product-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify(body)
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[POST product-tags]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
