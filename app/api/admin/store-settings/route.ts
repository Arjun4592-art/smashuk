import { NextResponse } from 'next/server';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
const CURRENCY_SYMBOLS: Record<string, string> = {
  gbp: '£',
  usd: '$',
  eur: '€',
  inr: '₹'
};
export async function GET() {
  try {
    const regionRes = await medusaServiceFetch('/admin/regions?limit=1&fields=id,currency_code,*countries');
    if (!regionRes.ok) throw new Error(`Medusa regions error: ${regionRes.status}`);
    const {
      regions
    } = await regionRes.json();
    const region = regions?.[0];
    const currencyCode: string = (region?.currency_code ?? 'gbp').toLowerCase();
    const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode.toUpperCase();
    const countryCode: string | undefined = region?.countries?.[0]?.iso_2;
    let taxRate = 0.2;
    let taxRateSource: 'medusa' | 'fallback' = 'fallback';
    if (countryCode) {
      const taxRes = await medusaServiceFetch(`/admin/tax-regions?country_code=${countryCode}&fields=id,*tax_rates`);
      if (taxRes.ok) {
        const {
          tax_regions: taxRegions
        } = await taxRes.json();
        const defaultRate = taxRegions?.[0]?.tax_rates?.find((r: any) => r.is_default);
        const anyRate = taxRegions?.[0]?.tax_rates?.[0];
        const rate = defaultRate ?? anyRate;
        if (typeof rate?.rate === 'number') {
          taxRate = rate.rate / 100;
          taxRateSource = 'medusa';
        }
      }
    }
    return NextResponse.json({
      currencyCode: currencyCode.toUpperCase(),
      currencySymbol,
      taxRate,
      taxRateSource
    });
  } catch (err: any) {
    console.error('[store-settings] error, using fallback:', err.message);
    return NextResponse.json({
      currencyCode: 'GBP',
      currencySymbol: '£',
      taxRate: 0.2,
      taxRateSource: 'fallback'
    });
  }
}
