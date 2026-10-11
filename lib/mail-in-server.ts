import { getProduct, normalizeProduct } from '@/lib/api/store'
import { MAIL_IN_EXTRAS, MAIL_IN_HANDLES, variantAmount } from '@/lib/mail-in'
import type {
  ExtraConfig,
  ServiceProduct,
} from '@/app/(website)/local-store/stringing/mail-in/book/MailInBookingClient'

async function loadService(handle: string): Promise<ServiceProduct | null> {
  try {
    const raw = await getProduct(handle)
    if (!raw) return null
    const variants = (raw.variants ?? []).map((v: any) => ({
      id: String(v.id),
      title: String(v.title ?? ''),
      price: variantAmount(v),
    }))
    if (variants.length === 0) return null
    return { product: normalizeProduct(raw), variants }
  } catch (err) {
    console.error(`[mail-in] could not load product "${handle}"`, err)
    return null
  }
}

/** Everything the booking form needs from Medusa. Server-side only. */
export async function loadMailInBookingData(): Promise<{
  delivery: ServiceProduct | null
  boxKit: ServiceProduct | null
  priority: ServiceProduct | null
  extras: ExtraConfig[]
  missingProducts: string[]
}> {
  const [delivery, boxKit, priority, ...extraProducts] = await Promise.all([
    loadService(MAIL_IN_HANDLES.delivery),
    loadService(MAIL_IN_HANDLES.boxKit),
    loadService(MAIL_IN_HANDLES.priority),
    ...MAIL_IN_EXTRAS.map((e) => loadService(e.handle)),
  ])

  const extras: ExtraConfig[] = MAIL_IN_EXTRAS.flatMap((e, i) => {
    const service = extraProducts[i]
    return service
      ? [{ key: e.key, label: e.label, hint: e.hint, service }]
      : []
  })

  // Delivery and the box kit are needed to take a booking. Priority and the
  // extras are optional, so their absence only hides those options.
  const missingProducts = [
    !delivery && MAIL_IN_HANDLES.delivery,
    !boxKit && MAIL_IN_HANDLES.boxKit,
  ].filter(Boolean) as string[]

  return { delivery, boxKit, priority, extras, missingProducts }
}