import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

export interface MedusaPromotionRule {
  attribute?: string
  operator?: string
  values?: unknown[]
}

function normalizeRuleValues(values: unknown[] | undefined): string[] {
  return (values ?? []).map((v: any) =>
    v && typeof v === 'object' ? String(v.value) : String(v),
  )
}

export function isFirstOrderRule(rule: MedusaPromotionRule): boolean {
  if (rule.attribute !== 'customer_order_count') return false
  if (rule.operator !== 'eq') return false
  return normalizeRuleValues(rule.values).includes('0')
}

export function promotionRequiresFirstOrder(
  rules: MedusaPromotionRule[] | undefined,
): boolean {
  return (rules ?? []).some(isFirstOrderRule)
}

export async function customerHasPriorOrders(
  customerId: string,
): Promise<boolean> {
  try {
    const res = await medusaServiceFetch(
      `/admin/orders?customer_id=${encodeURIComponent(customerId)}&limit=1&fields=id`,
    )
    if (!res.ok) {
      console.error(
        '[first-order-check] Failed to load customer orders, failing closed:',
        res.status,
      )
      return true
    }
    const data = await res.json().catch(() => ({}))
    const count =
      typeof data.count === 'number' ? data.count : (data.orders?.length ?? 0)
    return count > 0
  } catch (err) {
    console.error('[first-order-check] Error checking order history:', err)
    return true
  }
}
