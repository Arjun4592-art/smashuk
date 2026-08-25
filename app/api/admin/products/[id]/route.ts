import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { resolveSalesChannels } from '@/lib/api/selling-channels';
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
export async function GET(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  try {
    const {
      id
    } = await params;
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}?fields=+metadata,*variants,+variants.metadata,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels,*variants.options,*variants.options.option,*variants.images,*categories,*images,*options,*options.values,*sales_channels,*tags`, {
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[GET product]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function PATCH(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  try {
    const {
      id
    } = await params;
    const body = await req.json();
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const stockQty: number = body._stock ?? 0;
    const variantStocks: Record<string, number> = body._variantStocks ?? {};
    delete body._stock;
    delete body._variantStocks;
    if (body.selling_channel) {
      const channels = await resolveSalesChannels(body.selling_channel, authorization, MEDUSA_URL);
      if (channels) body.sales_channels = channels;
    }
    delete body.selling_channel;
    if (Array.isArray(body.variants)) {
      body.variants = body.variants.map((v: any) => {
        if (!v || !Array.isArray(v.images)) return v;
        const urls = v.images.map((img: any) => img.url).filter(Boolean);
        const {
          images,
          ...rest
        } = v;
        return {
          ...rest,
          metadata: {
            ...(rest.metadata || {}),
            variant_images: urls
          }
        };
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify(body)
    });
    const data = await safeJson(res);
    async function ensureInventoryItemId(variant: any): Promise<string | undefined> {
      const existing: string | undefined = variant.inventory_items?.[0]?.inventory_item_id ?? variant.inventory_items?.[0]?.inventory?.id ?? undefined;
      if (existing) return existing;
      try {
        const createRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization
          },
          body: JSON.stringify({
            variant_id: variant.id,
            sku: variant.sku || undefined
          })
        });
        const createData = await safeJson(createRes);
        if (createRes.ok) {
          const newId = createData.inventory_item?.id ?? createData.id;
          return newId;
        }
        console.warn('[PATCH product] Inventory item create failed for variant', variant.id, '- refetching in case it already exists (subscriber race):', createData.message);
        const refetchRes = await fetch(`${MEDUSA_URL}/admin/products/${id}?fields=*variants.inventory_items`, {
          headers: {
            Authorization: authorization
          }
        });
        const refetchData = await safeJson(refetchRes);
        const freshVariant = (refetchData.product?.variants ?? []).find((v: any) => v.id === variant.id);
        const foundId: string | undefined = freshVariant?.inventory_items?.[0]?.inventory_item_id ?? freshVariant?.inventory_items?.[0]?.inventory?.id ?? undefined;
        if (foundId) {
          return foundId;
        }
        console.warn('[PATCH product] Inventory item still not found for variant', variant.id, '— giving up.');
        return undefined;
      } catch (createErr: any) {
        console.warn('[PATCH product] Inventory item create threw for variant', variant.id, ':', createErr.message);
        return undefined;
      }
    }
    if (res.ok && data.product?.id) {
      try {
        const refetchRes = await fetch(`${MEDUSA_URL}/admin/products/${id}?fields=*variants,*variants.inventory_items`, {
          headers: {
            Authorization: authorization
          }
        });
        const refetchData = await safeJson(refetchRes);
        const updatedVariants: any[] = refetchData.product?.variants ?? [];
        for (const variant of updatedVariants) {
          const invItemId = await ensureInventoryItemId(variant);
          if (!invItemId) continue;
          const patchBody: Record<string, string> = {};
          if (variant.sku) patchBody.sku = variant.sku;
          if (variant.title) patchBody.title = variant.title;
          if (Object.keys(patchBody).length === 0) continue;
          const patchRes = await fetch(`${MEDUSA_URL}/admin/inventory-items/${invItemId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authorization
            },
            body: JSON.stringify(patchBody)
          });
          if (!patchRes.ok) {
            const patchData = await safeJson(patchRes);
            console.warn('[PATCH product] Inventory SKU sync failed:', patchData.message);
          }
        }
      } catch (syncErr: any) {
        console.warn('[PATCH product] Inventory SKU sync error (non-fatal):', syncErr.message);
      }
    }
    if (res.ok && data.product?.id) {
      try {
        const locRes = await fetch(`${MEDUSA_URL}/admin/stock-locations?limit=1`, {
          headers: {
            Authorization: authorization
          }
        });
        const locData = await safeJson(locRes);
        const locationId = locData.stock_locations?.[0]?.id;
        if (locationId) {
          const invProductRes = await fetch(`${MEDUSA_URL}/admin/products/${id}?fields=*variants,*variants.inventory_items`, {
            headers: {
              Authorization: authorization
            }
          });
          const invProductData = await safeJson(invProductRes);
          const invVariants: any[] = invProductData.product?.variants ?? [];
          for (const variant of invVariants) {
            const invItemId = await ensureInventoryItemId(variant);
            if (!invItemId) continue;
            const variantTitle = variant.title ?? '';
            const stockByTitle = variantStocks[variantTitle];
            const stockBySku = variant.sku ? variantStocks[variant.sku] : undefined;
            const stockById = variant.id ? variantStocks[variant.id] : undefined;
            const stockByTrimmedTitle = variantStocks[variantTitle.trim()];
            const explicitStock = stockByTitle !== undefined ? stockByTitle : stockById !== undefined ? stockById : stockBySku !== undefined ? stockBySku : stockByTrimmedTitle !== undefined ? stockByTrimmedTitle : undefined;
            const hasExplicitQty = explicitStock !== undefined || stockQty > 0;
            const qty = explicitStock !== undefined ? explicitStock : stockQty;
            const levelsRes = await fetch(`${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels?location_id[]=${locationId}`, {
              headers: {
                Authorization: authorization
              }
            });
            const levelsData = await safeJson(levelsRes);
            const existingLevel = (levelsData.inventory_levels ?? []).find((l: any) => l.location_id === locationId);
            if (existingLevel) {
              if (!hasExplicitQty) continue;
              const upRes = await fetch(`${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels/${locationId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization
                },
                body: JSON.stringify({
                  stocked_quantity: qty
                })
              });
              if (!upRes.ok) {
                const upData = await safeJson(upRes);
                console.warn('[PATCH product] Inventory level update failed:', upData.message);
              } else {}
            } else {
              const safeQty = hasExplicitQty && qty > 0 ? qty : 0;
              const createRes = await fetch(`${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization
                },
                body: JSON.stringify({
                  location_id: locationId,
                  stocked_quantity: safeQty
                })
              });
              if (!createRes.ok) {
                const createData = await safeJson(createRes);
                console.warn('[PATCH product] Inventory level create failed:', createData.message);
              } else {}
            }
          }
        } else {
          console.warn('[PATCH product] No stock location found — inventory not set.');
        }
      } catch (invErr: any) {
        console.warn('[PATCH product] Inventory set error (non-fatal):', invErr.message);
      }
    }
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[PATCH product]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function DELETE(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  try {
    const {
      id
    } = await params;
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[DELETE product]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
