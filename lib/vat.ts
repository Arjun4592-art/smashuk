export type VatDestination = {
  countryCode: 'gb' | 'je' | 'gg'
  vatExempt: boolean
}

export const CHANNEL_ISLANDS_SHIPPING_COST = 9.99

export const CHANNEL_ISLANDS_OPTION_RE = /channel|jersey|guernsey/i

export function isChannelIslandsCountry(code?: string | null) {
  const c = (code ?? '').toLowerCase()
  return c === 'je' || c === 'gg'
}

export function getVatDestination(
  postcode: string | null | undefined,
): VatDestination {
  const pc = (postcode ?? '').replace(/\s+/g, '').toUpperCase()
  if (/^JE\d/.test(pc)) return { countryCode: 'je', vatExempt: true }
  if (/^GY\d/.test(pc)) return { countryCode: 'gg', vatExempt: true }
  return { countryCode: 'gb', vatExempt: false }
}
