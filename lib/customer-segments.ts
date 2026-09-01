export type SegmentCustomer = {
  id: string
  name: string
  email: string
  totalOrders: number
  totalSpent: number
  status: string
  joinedAt: string
  lastOrder: string
}

export function daysSince(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return Infinity
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
}

export type SegmentDefinition = {
  id: string
  label: string
  description: string
  color: 'amber' | 'emerald' | 'orange' | 'blue' | 'violet' | 'gray' | 'red'
  filter: (c: SegmentCustomer) => boolean
}

// Single source of truth for the customer segments shown on the
// Customers > Segments tab and offered as quick targets when creating a
// discount. Keep these two in sync by importing from here rather than
// redefining the list in each page.
export const CUSTOMER_SEGMENTS: SegmentDefinition[] = [
  {
    id: 'vip',
    label: 'VIP Customers',
    description: 'Spent over £300 lifetime',
    color: 'amber',
    filter: (c) => c.totalSpent > 300,
  },
  {
    id: 'active',
    label: 'Active',
    description: 'Current status is active',
    color: 'emerald',
    filter: (c) => c.status === 'active',
  },
  {
    id: 'at-risk',
    label: 'At Risk',
    description: 'No order in the last 60 days',
    color: 'orange',
    filter: (c) =>
      c.status !== 'blocked' &&
      daysSince(c.joinedAt) > 60 &&
      c.totalOrders > 0 &&
      daysSince(c.lastOrder) > 60,
  },
  {
    id: 'new',
    label: 'New',
    description: 'Joined in the last 30 days',
    color: 'blue',
    filter: (c) => daysSince(c.joinedAt) <= 30,
  },
  {
    id: 'repeat',
    label: 'Repeat Buyers',
    description: '2 or more orders placed',
    color: 'violet',
    filter: (c) => c.totalOrders >= 2,
  },
  {
    id: 'no-orders',
    label: 'No Orders Yet',
    description: "Haven't placed an order",
    color: 'gray',
    filter: (c) => c.totalOrders === 0,
  },
  {
    id: 'blocked',
    label: 'Blocked',
    description: 'Blocked from ordering',
    color: 'red',
    filter: (c) => c.status === 'blocked',
  },
]

export const SEGMENT_STYLES: Record<
  SegmentDefinition['color'],
  { bg: string; text: string }
> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  emerald: { bg: 'bg-[#008060]/8', text: 'text-[#008060]' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  blue: { bg: 'bg-[#2C6ECB]/8', text: 'text-[#2C6ECB]' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  gray: { bg: 'bg-[#F6F6F7]', text: 'text-[#6D7175]' },
  red: { bg: 'bg-[#D82C0D]/8', text: 'text-[#D82C0D]' },
}
