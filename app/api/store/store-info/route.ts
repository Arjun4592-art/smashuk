import { NextResponse } from 'next/server';
import { getPublicStoreContact } from '@/lib/store-contact';
export async function GET() {
  const contact = await getPublicStoreContact();
  return NextResponse.json(contact);
}
