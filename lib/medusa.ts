import Medusa from '@medusajs/js-sdk';
const getBackendUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set! Set it in your production environment.');
    }
    return 'http://localhost:9000';
  }
  return url;
};
export const medusaStore = new Medusa({
  baseUrl: getBackendUrl(),
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '',
  debug: process.env.NODE_ENV === 'development',
  auth: {
    type: 'jwt'
  }
});
export { getBackendUrl };
