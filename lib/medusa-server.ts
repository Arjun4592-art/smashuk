import 'server-only';
import Medusa from '@medusajs/js-sdk';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES, type Surface } from '@/lib/api/auth-cookie';
import { getBackendUrl } from './medusa';
export const medusaAdmin = new Medusa({
  baseUrl: getBackendUrl(),
  apiKey: process.env.MEDUSA_ADMIN_API_KEY ?? '',
  debug: process.env.NODE_ENV === 'development'
});
export async function getServerAdminClient(surface: Surface = 'dashboard') {
  const cookieStore = await cookies();
  const {
    tokenCookie
  } = SURFACE_COOKIES[surface];
  const token = cookieStore.get(tokenCookie)?.value;
  if (!token) {
    throw new Error('UNAUTHENTICATED');
  }
  return new Medusa({
    baseUrl: getBackendUrl(),
    debug: process.env.NODE_ENV === 'development',
    globalHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
