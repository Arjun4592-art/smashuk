export type SellingChannel = 'both' | 'website' | 'store';
export function inferSellingChannel(salesChannels: {
  name?: string;
}[] | undefined): SellingChannel {
  const names = new Set((salesChannels ?? []).map(c => c.name?.toLowerCase()).filter(Boolean));
  const hasWebsite = names.has('website');
  const hasStore = names.has('store');
  if (hasWebsite && hasStore) return 'both';
  if (hasStore) return 'store';
  if (hasWebsite) return 'website';
  return 'both';
}
