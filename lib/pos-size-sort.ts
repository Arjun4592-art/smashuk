const CLOTHING_SIZE_ORDER = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '2XL',
  'XXXL',
  '3XL',
  '4XL',
]

/**
 * Orders size-like strings (shoe sizes, grip sizes, clothing sizes, etc.)
 * into a sensible ascending order instead of relying on whatever order
 * they happened to come back in from Medusa.
 *
 * Mirrors the variant-option sort used on the storefront product page so
 * "UK 6, UK 7, UK 8..." sorts numerically instead of alphabetically
 * (which would put "UK 10" before "UK 6").
 */
export function sortSizeValues(values: string[]): string[] {
  if (values.length <= 1) return values

  // Racket/badminton grip sizes: G0, G1, G2 ... G5
  const gripPattern = /^G\d+$/i
  if (values.every((v) => gripPattern.test(v.trim()))) {
    return [...values].sort(
      (a, b) =>
        parseInt(a.trim().slice(1), 10) - parseInt(b.trim().slice(1), 10),
    )
  }

  // Pure numeric sizes (shoe sizes etc.), including half sizes like "9.5"
  const numericPattern = /^\d+(\.\d+)?$/
  if (values.every((v) => numericPattern.test(v.trim()))) {
    return [...values].sort(
      (a, b) => parseFloat(a.trim()) - parseFloat(b.trim()),
    )
  }

  // Prefixed numeric sizes, e.g. "UK 8", "US 9.5"
  const prefixedNumericPattern = /^[A-Za-z]*\s*\d+(\.\d+)?$/
  if (values.every((v) => prefixedNumericPattern.test(v.trim()))) {
    return [...values].sort((a, b) => {
      const na = parseFloat(a.trim().replace(/[^\d.]/g, ''))
      const nb = parseFloat(b.trim().replace(/[^\d.]/g, ''))
      return na - nb
    })
  }

  // Standard clothing sizes
  if (
    values.every((v) => CLOTHING_SIZE_ORDER.includes(v.trim().toUpperCase()))
  ) {
    return [...values].sort(
      (a, b) =>
        CLOTHING_SIZE_ORDER.indexOf(a.trim().toUpperCase()) -
        CLOTHING_SIZE_ORDER.indexOf(b.trim().toUpperCase()),
    )
  }

  return [...values].sort((a, b) => a.localeCompare(b))
}
