import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300)
    };
  }
}
export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const fields = 'id,name,price_type,service_zone_id,shipping_profile_id,provider_id,' + '*service_zone,*service_zone.fulfillment_set,*shipping_profile,*type,*prices,*rules';
    const [res, provRes] = await Promise.all([fetch(`${MEDUSA_URL}/admin/shipping-options?limit=200&fields=${encodeURIComponent(fields)}`, {
      headers: {
        Authorization: authorization
      }
    }), fetch(`${MEDUSA_URL}/admin/fulfillment-providers`, {
      headers: {
        Authorization: authorization
      }
    }).catch(() => null)]);
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to load shipping options'
      }, {
        status: res.status
      });
    }
    const provData = provRes ? await safeJson(provRes) : {};
    const providers: {
      id: string;
    }[] = provData.fulfillment_providers ?? [];
    const royalMailProviderId = providers.find(p => /royal[-_ ]?mail/i.test(p.id))?.id ?? null;
    function providerLabel(providerId: string | null | undefined): string {
      if (!providerId) return 'Unknown';
      if (/royal[-_ ]?mail/i.test(providerId)) return 'Royal Mail Click & Drop';
      if (/manual/i.test(providerId)) return 'Manual (no live courier)';
      return providerId;
    }
    const options: any[] = data.shipping_options ?? [];
    const zonesById = new Map<string, any>();
    for (const opt of options) {
      const zone = opt.service_zone;
      if (!zone) continue;
      if (!zonesById.has(zone.id)) {
        zonesById.set(zone.id, {
          id: zone.id,
          name: zone.name,
          fulfillment_set_name: zone.fulfillment_set?.name ?? null,
          fulfillment_set_type: zone.fulfillment_set?.type ?? null,
          geo_zones: zone.geo_zones ?? [],
          options: [] as any[]
        });
      }
      const gbpPrice = (opt.prices ?? []).find((p: any) => p.currency_code === 'gbp');
      const isPickup = (opt.rules ?? []).some((r: any) => r.attribute === 'enabled_in_store' && r.value === 'true');
      zonesById.get(zone.id).options.push({
        id: opt.id,
        name: opt.name,
        price_type: opt.price_type,
        amount: opt.price_type === 'calculated' ? null : gbpPrice?.amount ?? 0,
        hasPrice: !!gbpPrice,
        shipping_profile_id: opt.shipping_profile_id,
        shipping_profile_name: opt.shipping_profile?.name ?? null,
        provider_id: opt.provider_id,
        provider_label: providerLabel(opt.provider_id),
        provider_mismatch: !isPickup && !!royalMailProviderId && opt.provider_id !== royalMailProviderId,
        is_pickup: isPickup
      });
    }
    return NextResponse.json({
      zones: Array.from(zonesById.values()),
      royal_mail_provider_id: royalMailProviderId
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const {
      name,
      amount,
      service_zone_id,
      shipping_profile_id,
      provider_id,
      is_pickup
    } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({
        error: 'A rate name is required'
      }, {
        status: 400
      });
    }
    if (!service_zone_id) {
      return NextResponse.json({
        error: 'A shipping zone is required'
      }, {
        status: 400
      });
    }
    if (!shipping_profile_id) {
      return NextResponse.json({
        error: 'A shipping profile is required'
      }, {
        status: 400
      });
    }
    const priceAmount = Number(amount);
    if (Number.isNaN(priceAmount) || priceAmount < 0) {
      return NextResponse.json({
        error: 'Price must be a number ≥ 0'
      }, {
        status: 400
      });
    }
    let resolvedProviderId = provider_id;
    if (!resolvedProviderId) {
      const provRes = await fetch(`${MEDUSA_URL}/admin/fulfillment-providers`, {
        headers: {
          Authorization: authorization
        }
      });
      const provData = await safeJson(provRes);
      const providers: {
        id: string;
      }[] = provData.fulfillment_providers ?? [];
      if (is_pickup) {
        resolvedProviderId = providers.find(p => /manual/i.test(p.id))?.id ?? 'manual_manual';
      } else {
        const royalMail = providers.find(p => /royal[-_ ]?mail/i.test(p.id));
        if (!royalMail) {
          return NextResponse.json({
            error: 'No Royal Mail fulfillment provider is registered on the backend yet, so a ' + "live courier rate can't be created automatically. Available providers: " + (providers.map(p => p.id).join(', ') || 'none') + '. Pass provider_id explicitly if you meant to use a different one.'
          }, {
            status: 422
          });
        }
        resolvedProviderId = royalMail.id;
      }
    }
    const res = await fetch(`${MEDUSA_URL}/admin/shipping-options`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        service_zone_id,
        shipping_profile_id,
        provider_id: resolvedProviderId,
        price_type: 'flat',
        type: {
          label: name.trim(),
          description: is_pickup ? `${name.trim()} — collect in-store` : `${name.trim()} shipping`,
          code: is_pickup ? 'store_pickup' : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)
        },
        rules: is_pickup ? [{
          operator: 'eq',
          attribute: 'enabled_in_store',
          value: 'true'
        }] : [],
        prices: [{
          currency_code: 'gbp',
          amount: priceAmount,
          rules: []
        }]
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to create shipping option'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      shipping_option: data.shipping_option
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
