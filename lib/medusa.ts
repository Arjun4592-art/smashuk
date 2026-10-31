import Medusa from '@medusajs/js-sdk'
const getBackendUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set! Set it in your production environment.',
      )
    }
    return 'http://localhost:9000'
  }
  return url
}
export const medusaStore = new Medusa({
  baseUrl: getBackendUrl(),
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '',
  debug: process.env.NODE_ENV === 'development',
  // Server-only secret (no NEXT_PUBLIC_ prefix, so it is undefined in the
  // browser). Lets this server call Medusa's customer register/login endpoints
  // that the backend otherwise blocks from the open internet.
  globalHeaders: process.env.STOREFRONT_SHARED_SECRET
    ? {
        'x-storefront-secret': process.env.STOREFRONT_SHARED_SECRET,
      }
    : undefined,
  auth: {
    type: 'jwt',
  },
})
export { getBackendUrl }
