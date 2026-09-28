export type VatDestination = {
  countryCode: 'gb' | 'je' | 'gg'
  vatExempt: boolean
}

export function getVatDestination(
  postcode: string | null | undefined,
): VatDestination {
  const pc = (postcode ?? '').replace(/\s+/g, '').toUpperCase()
  if (/^JE\d/.test(pc)) return { countryCode: 'je', vatExempt: true }
  if (/^GY\d/.test(pc)) return { countryCode: 'gg', vatExempt: true }
  return { countryCode: 'gb', vatExempt: false }
}
