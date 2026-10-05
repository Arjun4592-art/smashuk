export type AppliesTo = 'online' | 'store' | 'both'

export const SALES_CHANNEL_RULE_ATTRIBUTE = 'sales_channel_id'

export interface ChannelIds {
  online?: string
  store?: string
}

let cached: { ids: ChannelIds; at: number } | null = null
const CACHE_MS = 10 * 60 * 1000

/** `fetcher` is any function that GETs a Medusa admin path (service token or user auth). */
export async function getChannelIds(
  fetcher: (path: string) => Promise<Response>,
): Promise<ChannelIds> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.ids
  try {
    const res = await fetcher('/admin/sales-channels?limit=100&fields=id,name')
    if (!res.ok) return cached?.ids ?? {}
    const data = await res.json()
    const ids: ChannelIds = {}
    for (const c of data.sales_channels ?? []) {
      const name = String(c?.name ?? '')
        .toLowerCase()
        .trim()
      if (name === 'website') ids.online = c.id
      if (name === 'store') ids.store = c.id
    }
    cached = { ids, at: Date.now() }
    return ids
  } catch {
    return cached?.ids ?? {}
  }
}

/** The rule to add for a given choice, or null for "both" / unknown channel. */
export function channelRule(appliesTo: unknown, ids: ChannelIds) {
  const id =
    appliesTo === 'online'
      ? ids.online
      : appliesTo === 'store'
        ? ids.store
        : undefined
  if (!id) return null
  return {
    attribute: SALES_CHANNEL_RULE_ATTRIBUTE,
    operator: 'in',
    values: [id],
  }
}

/** Reads a promotion's rules (as returned by Medusa) back into a choice. */
export function appliesToFromRules(
  rules: any[] | undefined,
  ids: ChannelIds,
): AppliesTo {
  const rule = (rules ?? []).find(
    (r) => r?.attribute === SALES_CHANNEL_RULE_ATTRIBUTE,
  )
  if (!rule) return 'both'
  const values = (rule.values ?? []).map((v: any) =>
    typeof v === 'string' ? v : v?.value,
  )
  if (
    ids.online &&
    values.includes(ids.online) &&
    !(ids.store && values.includes(ids.store))
  )
    return 'online'
  if (
    ids.store &&
    values.includes(ids.store) &&
    !(ids.online && values.includes(ids.online))
  )
    return 'store'
  return 'both'
}
