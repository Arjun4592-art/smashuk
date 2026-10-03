export const UK_ONLY_MESSAGE =
  "We currently deliver within the UK only. If you're ordering from outside the UK, please contact us and we'll see what we can arrange."

const UK_POSTCODE_RE = /^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/
const NON_UK_PREFIX_RE = /^(JE|GY|IM)\d/

export function isUkDeliveryPostcode(postcode?: string | null): boolean {
  const pc = (postcode ?? '').replace(/\s+/g, '').toUpperCase()
  if (!pc) return false
  if (NON_UK_PREFIX_RE.test(pc)) return false
  return UK_POSTCODE_RE.test(pc)
}
