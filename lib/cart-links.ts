import type { CartItem } from '@/store/cartStore'

/**
 * A racket can have add-on lines (string service, grip) that are added to the
 * cart together with it. These helpers link an add-on line back to its racket.
 *
 * A string service that belongs to a racket is shown merged into the racket's
 * row (never as its own row) and can only be removed / re-quantified through
 * the racket. A string product bought on its own has no `linked_product`, so it
 * is treated as a normal single product.
 */

export function isStringAddon(item: CartItem): boolean {
  const m = item.metadata
  return !!(m?.linked_product && m?.string_choice && !m?.grip_choice)
}

export function findParentItem(
  item: CartItem,
  items: CartItem[],
): CartItem | undefined {
  const m = item.metadata
  if (!m?.linked_product) return undefined
  return items.find((i) => {
    if (i === item || i.metadata?.linked_product) return false
    if (m.linked_product_id) {
      return (
        i.product.id === m.linked_product_id &&
        (m.linked_variant_id ? i.variant?.id === m.linked_variant_id : true)
      )
    }
    // Older carts (saved before the ids were stored) fall back to the name.
    return i.product.name === m.linked_product
  })
}

export function getLinkedItems(
  parent: CartItem,
  items: CartItem[],
): CartItem[] {
  return items.filter((i) => i !== parent && findParentItem(i, items) === parent)
}

export function getStringAddon(
  parent: CartItem,
  items: CartItem[],
): CartItem | undefined {
  return getLinkedItems(parent, items).find(isStringAddon)
}

/** True for a string-service line that is merged into a racket row. */
export function isMergedStringAddon(
  item: CartItem,
  items: CartItem[],
): boolean {
  return isStringAddon(item) && !!findParentItem(item, items)
}

export function lineTotal(item: CartItem): number {
  return (item.product.price - (item.discount ?? 0)) * item.quantity
}

/** Rows to render: merged string lines are hidden and attached to their racket. */
export function displayRows(
  items: CartItem[],
): { item: CartItem; stringAddon?: CartItem }[] {
  return items
    .filter((i) => !isMergedStringAddon(i, items))
    .map((item) => ({ item, stringAddon: getStringAddon(item, items) }))
}