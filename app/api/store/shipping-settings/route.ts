import { NextResponse } from 'next/server';
import { getPublicFreeShippingThreshold } from '@/lib/shipping-settings';
export async function GET() {
  const freeShippingThreshold = await getPublicFreeShippingThreshold();
  return NextResponse.json({
    freeShippingThreshold
  });
}
