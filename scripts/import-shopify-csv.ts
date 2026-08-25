import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import Papa from 'papaparse';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const CSV_PATH = process.argv[2] ?? path.resolve(process.cwd(), 'scripts/shopify-export.csv');
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.');
  process.exit(1);
}
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV not found at ${CSV_PATH}`);
  console.error('   Export it from Shopify Admin → Products → Export → "All products" → CSV,');
  console.error('   save it as scripts/shopify-export.csv, then re-run this script.');
  process.exit(1);
}
async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error('Auth failed: ' + (data.message ?? res.status));
  return data.token as string;
}
function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
async function medusaGet(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: headers(token)
  });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}
async function medusaPost(token: string, path: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}
async function medusaDelete(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'DELETE',
    headers: headers(token)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DELETE ${path} failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}
interface ShopifyRow {
  Handle: string;
  Title: string;
  'Body (HTML)': string;
  Vendor: string;
  'Product Category': string;
  Type: string;
  Tags: string;
  Published: string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Option2 Name': string;
  'Option2 Value': string;
  'Option3 Name': string;
  'Option3 Value': string;
  'Variant SKU': string;
  'Variant Price': string;
  'Variant Compare At Price': string;
  'Variant Inventory Qty': string;
  'Image Src': string;
  'Image Position': string;
  'SEO Title': string;
  'SEO Description': string;
  Status: string;
  'Badminton Racket Balance (product.metafields.custom.badminton_racket_balance)': string;
  'Badminton Racket Stiffness (product.metafields.custom.badminton_racket_stiffness)': string;
  'Badminton Racket Weight (product.metafields.custom.badminton_racket_weight)': string;
  'Badminton Sub Collections (product.metafields.custom.badminton_sub_collections)': string;
  'Padel Racket Balance (product.metafields.custom.padel_racket_balance)': string;
  'Padel Racket Material (product.metafields.custom.padel_racket_material)': string;
  'Padel Racket Weight (product.metafields.custom.padel_racket_weight)': string;
  'Player Level (product.metafields.custom.player_level)': string;
  'Racket Bag Size (product.metafields.custom.racket_bag_size)': string;
  'Padel Racket Shape (product.metafields.custom.racket_shape)': string;
  'Shuttlecock Level (product.metafields.custom.shuttlecock_level)': string;
  'Shuttlecock Material (product.metafields.custom.shuttlecock_material)': string;
  'Tennis Racket Frame Size (product.metafields.custom.tennis_racket_frame_size)': string;
  'Tennis Racket Sub Collection (product.metafields.custom.tennis_racket_sub_collection)': string;
  'Tennis Racket Weight (product.metafields.custom.tennis_racket_weight)': string;
  'Gender (product.metafields.my_fields.gender)': string;
  'Grip (product.metafields.my_fields.grip)': string;
  'Color (product.metafields.shopify.color-pattern)': string;
  'Racket balance (product.metafields.shopify.racket-balance)': string;
  'Racket material (product.metafields.shopify.racket-material)': string;
}
function cleanMojibake(text: string): string {
  if (!text) return text;
  return text.replace(/\?\uFFFD\?/g, '–').replace(/\uFFFD/g, "'").replace(/\?{2,}/g, '');
}
function stripHtml(html: string): string {
  return cleanMojibake(html).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}
function extractSpecifications(bodyHtml: string): {
  description: string;
  specifications: Record<string, string>;
} {
  if (!bodyHtml) return {
    description: bodyHtml,
    specifications: {}
  };
  const cleaned = cleanMojibake(bodyHtml);
  const specifications: Record<string, string> = {};
  const markerMatch = cleaned.match(/<h[1-6][^>]*>(?:(?!<\/h[1-6]>).)*specifications?(?:(?!<\/h[1-6]>).)*<\/h[1-6]>|<strong>\s*(?:technical\s+)?specifications?\s*:?\s*<\/strong>/i);
  if (markerMatch && markerMatch.index !== undefined) {
    const afterMarker = cleaned.slice(markerMatch.index + markerMatch[0].length);
    const nextList = afterMarker.match(/<ul[\s\S]*?<\/ul>/i);
    const nextTable = afterMarker.match(/<table[\s\S]*?<\/table>/i);
    const candidates = [nextList, nextTable].filter((m): m is RegExpMatchArray => !!m && m.index !== undefined && m.index < 1500).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const block = candidates[0];
    if (block) {
      const isTable = block[0].startsWith('<table');
      if (isTable) {
        const rowMatches = [...block[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)];
        for (const rowMatch of rowMatches) {
          const cells = [...rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => stripHtml(c[1]));
          if (cells.length === 2) {
            const [label, value] = cells;
            if (/^(feature|specification|attribute|property|name)s?$/i.test(label) && /^(specification|value|details?)s?$/i.test(value)) {
              continue;
            }
            if (label && value) specifications[label] = value;
          }
        }
      } else {
        const liMatches = [...block[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
        for (const liMatch of liMatches) {
          const ownText = liMatch[1].split(/<ul[\s\S]*?<\/ul>/i)[0];
          const text = stripHtml(ownText);
          const colonIdx = text.indexOf(':');
          if (colonIdx > 0 && colonIdx < 60) {
            const label = text.slice(0, colonIdx).trim();
            const value = text.slice(colonIdx + 1).trim();
            if (label && value) specifications[label] = value;
          }
        }
      }
      if (Object.keys(specifications).length > 0) {
        const fullSection = markerMatch[0] + afterMarker.slice(0, (block.index ?? 0) + block[0].length);
        const description = cleaned.replace(fullSection, '').trim();
        return {
          description,
          specifications
        };
      }
    }
  }
  const allTables = [...cleaned.matchAll(/<table[\s\S]*?<\/table>/gi)];
  for (const t of allTables) {
    const headerCells = [...t[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(c => stripHtml(c[1]));
    const looksLikeSpecTable = headerCells.some(h => /^feature$/i.test(h)) && headerCells.some(h => /^specifications?$/i.test(h));
    if (!looksLikeSpecTable) continue;
    const rowMatches = [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)];
    for (const rowMatch of rowMatches) {
      const cells = [...rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => stripHtml(c[1]));
      if (cells.length === 2) {
        const [label, value] = cells;
        if (/^feature$/i.test(label) && /^specifications?$/i.test(value)) continue;
        if (label && value) specifications[label] = value;
      }
    }
    if (Object.keys(specifications).length > 0) {
      const description = cleaned.replace(t[0], '').trim();
      return {
        description,
        specifications
      };
    }
  }
  return {
    description: cleaned,
    specifications
  };
}
function mergeMetafieldSpecs(row: ShopifyRow, specifications: Record<string, string>): Record<string, string> {
  const map: [string, string][] = [['Badminton Racket Balance (product.metafields.custom.badminton_racket_balance)', 'Balance'], ['Badminton Racket Stiffness (product.metafields.custom.badminton_racket_stiffness)', 'Stiffness'], ['Badminton Racket Weight (product.metafields.custom.badminton_racket_weight)', 'Weight'], ['Padel Racket Balance (product.metafields.custom.padel_racket_balance)', 'Balance'], ['Padel Racket Material (product.metafields.custom.padel_racket_material)', 'Material'], ['Padel Racket Weight (product.metafields.custom.padel_racket_weight)', 'Weight'], ['Padel Racket Shape (product.metafields.custom.racket_shape)', 'Shape'], ['Racket Bag Size (product.metafields.custom.racket_bag_size)', 'Bag Size'], ['Shuttlecock Level (product.metafields.custom.shuttlecock_level)', 'Level'], ['Shuttlecock Material (product.metafields.custom.shuttlecock_material)', 'Material'], ['Tennis Racket Frame Size (product.metafields.custom.tennis_racket_frame_size)', 'Frame Size'], ['Tennis Racket Weight (product.metafields.custom.tennis_racket_weight)', 'Weight'], ['Grip (product.metafields.my_fields.grip)', 'Grip'], ['Color (product.metafields.shopify.color-pattern)', 'Colour'], ['Racket balance (product.metafields.shopify.racket-balance)', 'Balance'], ['Racket material (product.metafields.shopify.racket-material)', 'Material']];
  const merged = {
    ...specifications
  };
  for (const [col, label] of map) {
    const v = (row[col as keyof ShopifyRow] || '').trim();
    if (v) merged[label] = cleanMojibake(v);
  }
  const playerLevel = row['Player Level (product.metafields.custom.player_level)']?.trim();
  if (playerLevel) merged['Player Level'] = cleanMojibake(playerLevel);
  return merged;
}
function parseMoney(v: string): number | undefined {
  if (!v) return undefined;
  const n = Math.round(parseFloat(v) * 100) / 100;
  return Number.isFinite(n) ? n : undefined;
}
const resolvedOptionIdByTitle = new Map<string, string>();
let optionsReusedCount = 0;
let optionsCreatedCount = 0;
let strayDuplicatesCleanedCount = 0;
async function findGlobalOption(token: string, title: string, preferredId?: string): Promise<{
  id: string;
  values: {
    id: string;
    value: string;
  }[];
} | null> {
  const data = await medusaGet(token, `/admin/product-options?limit=200&fields=id,title,values.id,values.value`);
  const matches = (data.product_options ?? []).filter((o: any) => o.title.toLowerCase() === title.toLowerCase());
  const found = preferredId && matches.find((o: any) => o.id === preferredId) || matches[0];
  return found ? {
    id: found.id,
    values: found.values ?? []
  } : null;
}
async function upsertOptionValues(token: string, title: string, values: string[]): Promise<{
  optionId: string;
  valueIds: string[];
  canonicalValues: string[];
}> {
  const preferredId = resolvedOptionIdByTitle.get(title.toLowerCase());
  const existing = await findGlobalOption(token, title, preferredId);
  if (!existing) {
    const created = await medusaPost(token, '/admin/product-options', {
      title,
      values
    });
    const opt = created.product_option;
    optionsCreatedCount++;
    resolvedOptionIdByTitle.set(title.toLowerCase(), opt.id);
    return {
      optionId: opt.id,
      valueIds: opt.values.map((v: any) => v.id),
      canonicalValues: opt.values.map((v: any) => v.value)
    };
  }
  optionsReusedCount++;
  resolvedOptionIdByTitle.set(title.toLowerCase(), existing.id);
  const byValue = new Map<string, {
    id: string;
    value: string;
  }>(existing.values.map(v => [v.value.toLowerCase(), v]));
  const missing = values.filter(v => !byValue.has(v.toLowerCase()));
  if (missing.length > 0) {
    const updated = await medusaPost(token, `/admin/product-options/${existing.id}`, {
      title,
      values: [...existing.values.map(v => v.value), ...missing]
    });
    for (const v of updated.product_option.values as {
      id: string;
      value: string;
    }[]) {
      byValue.set(v.value.toLowerCase(), v);
    }
  }
  const resolved = values.map(v => byValue.get(v.toLowerCase()));
  const requestedValueIds = resolved.filter((v): v is {
    id: string;
    value: string;
  } => !!v).map(v => v.id);
  return {
    optionId: existing.id,
    valueIds: requestedValueIds,
    canonicalValues: resolved.filter((v): v is {
      id: string;
      value: string;
    } => !!v).map(v => v.value)
  };
}
async function linkOptionsToProduct(token: string, productId: string, add: {
  id: string;
  value_ids: string[];
}[], removeOptionIds: string[]) {
  if (add.length === 0 && removeOptionIds.length === 0) return;
  return medusaPost(token, `/admin/products/${productId}/options/batch`, {
    add,
    remove: removeOptionIds,
    update: []
  });
}
async function cleanupStrayDuplicateOptions(token: string, productId: string, resolvedOptions: Map<string, {
  optionId: string;
  valueIds: string[];
}>) {
  try {
    const {
      product: fresh
    } = await medusaGet(token, `/admin/products/${productId}?fields=id,*options,*options.values,*variants,*variants.options`);
    const freshOptions: any[] = fresh?.options ?? [];
    const freshVariants: any[] = fresh?.variants ?? [];
    for (const [title, entry] of resolvedOptions) {
      const linked = freshOptions.find(o => o.title.toLowerCase() === title.toLowerCase());
      if (!linked || linked.id === entry.optionId) continue;
      console.warn(`  ⚠️  "${title}" created a duplicate option (${linked.id}) instead of reusing the global one (${entry.optionId}) — remapping`);
      const affectedVariants = freshVariants.filter(v => (v.options ?? []).some((vo: any) => vo.option_id === linked.id));
      const variantUpdates = affectedVariants.map(v => {
        const vo = v.options.find((o: any) => o.option_id === linked.id);
        return {
          id: v.id,
          options: {
            [title]: vo.value
          }
        };
      });
      if (variantUpdates.length > 0) {
        await medusaPost(token, `/admin/products/${productId}`, {
          variants: variantUpdates
        });
      }
      await linkOptionsToProduct(token, productId, [{
        id: entry.optionId,
        value_ids: entry.valueIds
      }], [linked.id]);
      try {
        await medusaDelete(token, `/admin/product-options/${linked.id}`);
      } catch (delErr) {
        console.warn('  Could not delete stray duplicate option:', delErr);
      }
      strayDuplicatesCleanedCount++;
    }
  } catch (safetyErr) {
    console.warn(`  Global-option safety check failed for product ${productId} (non-fatal):`, safetyErr);
  }
}
async function main() {
  const token = await getToken();
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const {
    data: rows
  } = Papa.parse<ShopifyRow>(csvText, {
    header: true,
    skipEmptyLines: true
  });
  const grouped = new Map<string, ShopifyRow[]>();
  for (const row of rows) {
    if (!row.Handle) continue;
    if (!grouped.has(row.Handle)) grouped.set(row.Handle, []);
    grouped.get(row.Handle)!.push(row);
  }
  const usedHandles = new Set<string>();
  function slugifyHandle(raw: string): string {
    const base = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200).replace(/^-+|-+$/g, '') || 'product';
    if (!usedHandles.has(base)) {
      usedHandles.add(base);
      return base;
    }
    let i = 2;
    let candidate: string;
    do {
      const suffix = `-${i}`;
      candidate = base.slice(0, 200 - suffix.length).replace(/-+$/g, '') + suffix;
      i++;
    } while (usedHandles.has(candidate));
    usedHandles.add(candidate);
    return candidate;
  }
  const {
    product_categories: categories
  } = await medusaGet(token, '/admin/product-categories?limit=200');
  const categoryByName = new Map<string, string>((categories ?? []).map((c: any) => [c.name.toLowerCase().trim(), c.id]));
  const SPORT_PATTERNS: [RegExp, string][] = [[/badminton/i, 'badminton'], [/\btennis\b/i, 'tennis'], [/padel/i, 'padel'], [/squash/i, 'squash']];
  const CATEGORY_PATTERNS: [RegExp, string][] = [[/\bbag\b/i, 'Bags'], [/shoe/i, 'Shoes'], [/grip/i, 'Grips'], [/shuttlecock/i, 'Shuttlecocks'], [/string/i, 'Strings'], [/\bball/i, 'Balls'], [/dampener|\bdamp\b/i, 'Accessories'], [/headband/i, 'Accessories'], [/accessor(y|ies)/i, 'Accessories'], [/apparel|dress|t-?shirt|\bkit\b|\bcap\b/i, 'Clothing'], [/racquet|racket/i, 'Rackets'], [/clothing/i, 'Clothing']];
  const RESTRINGABLE_SPORTS = new Set(['badminton', 'tennis', 'squash']);
  function resolveSport(typeAndTags: string[]): string {
    for (const t of typeAndTags) {
      for (const [pattern, slug] of SPORT_PATTERNS) {
        if (pattern.test(t)) return slug;
      }
    }
    return '';
  }
  function resolveCategoryName(typeAndTags: string[]): string | null {
    for (const t of typeAndTags) {
      for (const [pattern, name] of CATEGORY_PATTERNS) {
        if (pattern.test(t)) return name;
      }
    }
    return null;
  }
  const categoryCreatePromises = new Map<string, Promise<string | undefined>>();
  const createdCategoryNames: string[] = [];
  let categoriesCreated = 0;
  async function getOrCreateCategoryId(name: string): Promise<string | undefined> {
    const key = name.toLowerCase().trim();
    const existing = categoryByName.get(key);
    if (existing) return existing;
    if (!categoryCreatePromises.has(key)) {
      categoryCreatePromises.set(key, (async () => {
        try {
          const {
            product_category
          } = await medusaPost(token, '/admin/product-categories', {
            name,
            is_active: true
          });
          categoryByName.set(key, product_category.id);
          categoriesCreated++;
          createdCategoryNames.push(name);
          return product_category.id as string;
        } catch (err: any) {
          console.warn(`  ⚠️  Could not create category "${name}": ${err.message}`);
          return undefined;
        }
      })());
    }
    return categoryCreatePromises.get(key);
  }
  async function resolveTaxonomy(typeAndTagsRaw: string[], title: string, productCategoryBreadcrumb: string): Promise<{
    categoryId: string | undefined;
    sport: string;
  }> {
    const typeAndTags = typeAndTagsRaw.filter(Boolean);
    const breadcrumbSegments = productCategoryBreadcrumb.split('>').map(s => s.trim().toLowerCase()).filter(Boolean);
    const sources = typeAndTags.length ? typeAndTags : breadcrumbSegments.length ? breadcrumbSegments : [title.toLowerCase()];
    const exactMatchId = typeAndTags.map(t => categoryByName.get(t.toLowerCase().trim())).find(id => !!id);
    const canonicalName = resolveCategoryName(sources) || resolveCategoryName(breadcrumbSegments) || resolveCategoryName([title.toLowerCase()]);
    const meaningfulBreadcrumb = breadcrumbSegments.filter(s => s !== 'uncategorized');
    const allSourcesForSport = [...sources, ...meaningfulBreadcrumb, title.toLowerCase()];
    const sport = resolveSport(allSourcesForSport) || (canonicalName === 'Clothing' ? 'clothing' : '');
    if (exactMatchId) return {
      categoryId: exactMatchId,
      sport
    };
    if (canonicalName) {
      const categoryId = await getOrCreateCategoryId(canonicalName);
      return {
        categoryId,
        sport
      };
    }
    return {
      categoryId: undefined,
      sport
    };
  }
  const allTagNames = new Set<string>();
  for (const row of rows) {
    if (!row.Tags) continue;
    row.Tags.split(',').forEach(t => {
      const v = t.trim();
      if (v) allTagNames.add(v);
    });
  }
  const tagIdByName = new Map<string, string>();
  {
    let offset = 0;
    const limit = 200;
    while (true) {
      const {
        product_tags
      } = await medusaGet(token, `/admin/product-tags?limit=${limit}&offset=${offset}`);
      if (!product_tags || product_tags.length === 0) break;
      for (const t of product_tags) tagIdByName.set(t.value.toLowerCase(), t.id);
      if (product_tags.length < limit) break;
      offset += limit;
    }
  }
  let tagsCreated = 0;
  for (const name of allTagNames) {
    if (tagIdByName.has(name.toLowerCase())) continue;
    try {
      const {
        product_tag
      } = await medusaPost(token, '/admin/product-tags', {
        value: name
      });
      tagIdByName.set(name.toLowerCase(), product_tag.id);
      tagsCreated++;
    } catch (err: any) {
      console.warn(`  ⚠️  Could not create tag "${name}": ${err.message}`);
    }
  }
  const {
    sales_channels
  } = await medusaGet(token, '/admin/sales-channels?limit=100');
  const channelsByName = new Map<string, string>((sales_channels ?? []).map((c: any) => [c.name.toLowerCase().trim(), c.id]));
  const websiteChannelId = channelsByName.get('website');
  const storeChannelId = channelsByName.get('store');
  const defaultChannelId = channelsByName.get('default sales channel') ?? sales_channels?.[0]?.id;
  function resolveChannels(tags: string[], hasImages: boolean, published: string): {
    id: string;
  }[] {
    const lower = tags.map(t => t.toLowerCase());
    const storeOnlyTag = lower.includes('store-only') || lower.includes('in-store-only');
    const websiteOnlyTag = lower.includes('website-only') || lower.includes('online-only');
    const ids = new Set<string>();
    if (storeOnlyTag && !websiteOnlyTag) {
      if (storeChannelId) ids.add(storeChannelId);
    } else if (websiteOnlyTag && !storeOnlyTag) {
      if (websiteChannelId) ids.add(websiteChannelId);
    } else if (!hasImages) {
      if (storeChannelId) ids.add(storeChannelId);
    } else if (published.trim().toUpperCase() !== 'TRUE') {
      if (storeChannelId) ids.add(storeChannelId);
    } else {
      if (websiteChannelId) ids.add(websiteChannelId);
      if (storeChannelId) ids.add(storeChannelId);
    }
    if (ids.size === 0 && defaultChannelId) ids.add(defaultChannelId);
    return [...ids].map(id => ({
      id
    }));
  }
  const {
    shipping_profiles: shippingProfiles
  } = await medusaGet(token, '/admin/shipping-profiles?limit=50');
  const shippingProfileId = (shippingProfiles ?? []).find((p: any) => p.type === 'default')?.id ?? (shippingProfiles ?? []).find((p: any) => /default/i.test(p.name ?? ''))?.id;
  const {
    stock_locations: stockLocations
  } = await medusaGet(token, '/admin/stock-locations?limit=1');
  const locationId = stockLocations?.[0]?.id;
  if (!locationId) {
    console.warn('⚠️  No stock location found — imported variants will have no inventory levels ' + 'at all (shows as "available at 0 locations" everywhere). Create one in Medusa ' + 'Admin → Settings → Stock Locations, then re-run.');
  }
  async function wireUpInventory(productId: string, variantStocks: Map<string, number>) {
    if (!locationId) return;
    try {
      const {
        product
      } = await medusaGet(token, `/admin/products/${productId}?fields=*variants,*variants.inventory_items`);
      for (const variant of product?.variants ?? []) {
        let inventoryItemId: string | undefined = variant.inventory_items?.[0]?.inventory_item_id ?? variant.inventory_items?.[0]?.inventory?.id ?? undefined;
        if (!inventoryItemId) {
          const createItemData = await medusaPost(token, '/admin/inventory-items', {
            sku: variant.sku || undefined
          });
          inventoryItemId = createItemData.inventory_item?.id ?? createItemData.id;
          if (!inventoryItemId) continue;
          await medusaPost(token, `/admin/products/${productId}/variants/${variant.id}/inventory-items`, {
            inventory_item_id: inventoryItemId,
            required_quantity: 1
          });
        }
        const qty = variantStocks.get(variant.id) ?? 0;
        await fetch(`${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({
            location_id: locationId,
            stocked_quantity: qty
          })
        });
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Inventory wiring failed for product ${productId}: ${err.message}`);
    }
  }
  const usedSkus = new Set<string>();
  {
    let offset = 0;
    const limit = 200;
    while (true) {
      const {
        products: existingProducts
      } = await medusaGet(token, `/admin/products?fields=id,variants.sku&limit=${limit}&offset=${offset}`);
      if (!existingProducts || existingProducts.length === 0) break;
      for (const p of existingProducts) {
        for (const v of p.variants ?? []) {
          if (v.sku) usedSkus.add(v.sku);
        }
      }
      if (existingProducts.length < limit) break;
      offset += limit;
    }
  }
  const skuRenames: {
    original: string;
    renamed: string;
  }[] = [];
  function dedupeSku(sku: string | undefined): string | undefined {
    if (!sku) return sku;
    if (!usedSkus.has(sku)) {
      usedSkus.add(sku);
      return sku;
    }
    let i = 2;
    let candidate = `${sku}-${i}`;
    while (usedSkus.has(candidate)) {
      i++;
      candidate = `${sku}-${i}`;
    }
    usedSkus.add(candidate);
    skuRenames.push({
      original: sku,
      renamed: candidate
    });
    return candidate;
  }
  let created = 0;
  let failed = 0;
  let stringingCount = 0;
  let specsCount = 0;
  let storeOnlyCount = 0;
  let bothChannelCount = 0;
  let compareAtCount = 0;
  let seoCount = 0;
  const uncategorized: string[] = [];
  const noPriceProducts: string[] = [];
  for (const [handle, productRows] of grouped) {
    const first = productRows.find(r => r.Title) ?? productRows[0];
    if (!first?.Title) continue;
    const images = productRows.filter(r => r['Image Src']).sort((a, b) => Number(a['Image Position'] || 0) - Number(b['Image Position'] || 0)).map(r => ({
      url: r['Image Src']
    })).filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);
    const optionNames = ['Option1 Name', 'Option2 Name', 'Option3 Name'].map(k => first[k as keyof ShopifyRow]).filter((v): v is string => !!v && v !== 'Title');
    const variants = productRows.filter(r => r['Variant SKU'] || r['Variant Price']).map(r => {
      const optionValues = ['Option1 Value', 'Option2 Value', 'Option3 Value'].map(k => r[k as keyof ShopifyRow]).filter(Boolean);
      const price = parseMoney(r['Variant Price']);
      const compareAt = parseMoney(r['Variant Compare At Price']);
      return {
        title: optionValues.join(' / ') || 'Default',
        sku: dedupeSku(r['Variant SKU'] || undefined),
        options: optionNames.length ? Object.fromEntries(optionNames.map((n, i) => [n, optionValues[i] ?? 'Standard'])) : undefined,
        prices: price !== undefined ? [{
          currency_code: 'gbp',
          amount: price
        }] : [],
        _stock: Number(r['Variant Inventory Qty'] || 0),
        _compareAt: compareAt
      };
    });
    if (variants.length === 0) {
      variants.push({
        title: 'Default',
        sku: undefined,
        options: undefined,
        prices: [],
        _stock: 0,
        _compareAt: undefined
      } as any);
    }
    const effectiveOptionNames = optionNames.length ? optionNames : ['Type'];
    const resolvedOptions = new Map<string, {
      optionId: string;
      valueIds: string[];
      canonicalValues: string[];
    }>();
    for (const name of effectiveOptionNames) {
      const valuesUsed = [...new Set(variants.map((v: any) => v.options?.[name]).filter((v: any): v is string => !!v))];
      const {
        optionId,
        valueIds,
        canonicalValues
      } = await upsertOptionValues(token, name, valuesUsed.length ? valuesUsed : ['Standard']);
      resolvedOptions.set(name, {
        optionId,
        valueIds,
        canonicalValues
      });
    }
    const canonicalOptionValue = (name: string, typed: string): string => {
      const entry = resolvedOptions.get(name);
      if (!entry) return typed;
      const idx = entry.canonicalValues.findIndex(v => v.toLowerCase() === typed.toLowerCase());
      return idx >= 0 ? entry.canonicalValues[idx] : typed;
    };
    for (const v of variants as any[]) {
      if (!v.options) {
        v.options = {
          [effectiveOptionNames[0]]: canonicalOptionValue(effectiveOptionNames[0], 'Standard')
        };
        continue;
      }
      v.options = Object.fromEntries(Object.entries(v.options).map(([name, val]) => [name, canonicalOptionValue(name, val as string)]));
    }
    const typeAndTags = [first.Type, ...(first.Tags ? first.Tags.split(',') : [])].map(t => t.trim().toLowerCase()).filter(Boolean);
    const {
      categoryId: matchedCategoryId,
      sport
    } = await resolveTaxonomy(typeAndTags, first.Title, first['Product Category'] || '');
    if (!matchedCategoryId) uncategorized.push(first.Title);
    if (!variants.some((v: any) => v.prices?.length)) noPriceProducts.push(first.Title);
    const categoryNameForProduct = matchedCategoryId ? [...categoryByName.entries()].find(([, id]) => id === matchedCategoryId)?.[0] : undefined;
    const stringingAvailable = categoryNameForProduct === 'rackets' && RESTRINGABLE_SPORTS.has(sport);
    const {
      description: cleanedDescription,
      specifications: parsedSpecs
    } = extractSpecifications(first['Body (HTML)'] || '');
    const specifications = mergeMetafieldSpecs(first, parsedSpecs);
    const hasImages = images.length > 0;
    const gender = first['Gender (product.metafields.my_fields.gender)']?.trim();
    const playerLevel = first['Player Level (product.metafields.custom.player_level)']?.trim();
    const firstVariantForCompare = variants[0] as any;
    const compareAtCandidate = firstVariantForCompare?._compareAt;
    const sellingPrice = firstVariantForCompare?.prices?.[0]?.amount;
    const compareAtPrice = compareAtCandidate !== undefined && sellingPrice !== undefined && compareAtCandidate > sellingPrice ? compareAtCandidate : undefined;
    const seoTitle = first['SEO Title']?.trim();
    const seoDescription = first['SEO Description']?.trim();
    const payload = {
      title: first.Title,
      handle: slugifyHandle(handle),
      description: cleanedDescription || undefined,
      status: 'published',
      thumbnail: images[0]?.url,
      images: images.length > 0 ? images : undefined,
      categories: matchedCategoryId ? [{
        id: matchedCategoryId
      }] : undefined,
      tags: first.Tags ? first.Tags.split(',').map(t => t.trim()).filter(Boolean).map(t => tagIdByName.get(t.toLowerCase())).filter((id): id is string => !!id).map(id => ({
        id
      })) : undefined,
      sales_channels: resolveChannels(typeAndTags, hasImages, first.Published),
      ...(shippingProfileId ? {
        shipping_profile_id: shippingProfileId
      } : {}),
      options: [...resolvedOptions.entries()].map(([title, entry]) => ({
        id: entry.optionId,
        title,
        values: entry.canonicalValues
      })),
      variants: variants.map(({
        _stock,
        _compareAt,
        ...v
      }: any) => v),
      metadata: {
        brand: first.Vendor || undefined,
        sport: sport || undefined,
        stringing_available: stringingAvailable || undefined,
        gender: gender || undefined,
        player_level: playerLevel || undefined,
        compare_at_price: compareAtPrice,
        metaTitle: seoTitle || undefined,
        metaDescription: seoDescription || undefined,
        ...(Object.keys(specifications).length ? {
          specs: Object.entries(specifications).map(([label, value]) => ({
            label,
            value
          }))
        } : {})
      }
    };
    if (stringingAvailable) stringingCount++;
    if (Object.keys(specifications).length) specsCount++;
    if (payload.sales_channels.length === 1) storeOnlyCount++;
    if (payload.sales_channels.length >= 2) bothChannelCount++;
    if (compareAtPrice !== undefined) compareAtCount++;
    if (seoTitle || seoDescription) seoCount++;
    try {
      const {
        product
      } = await medusaPost(token, '/admin/products', payload);
      created++;
      if (created % 10 === 0) void 0;
      if (product?.id) {
        const variantStocks = new Map<string, number>();
        const createdVariants: any[] = product.variants ?? [];
        createdVariants.forEach((cv: any, i: number) => {
          const src = variants[i] as any;
          if (src) variantStocks.set(cv.id, Number(src._stock || 0));
        });
        await wireUpInventory(product.id, variantStocks);
        await cleanupStrayDuplicateOptions(token, product.id, resolvedOptions);
      }
    } catch (err: any) {
      failed++;
      console.warn(`  ⚠️  Failed: "${first.Title}" — ${err.message}`);
    }
  }
  if (categoriesCreated > 0) {
    for (const name of createdCategoryNames) {}
  }
  if (skuRenames.length > 0) {
    skuRenames.slice(0, 30).forEach(r => void 0);
    if (skuRenames.length > 30) void 0;
  }
  if (uncategorized.length > 0) {
    uncategorized.slice(0, 20).forEach(t => void 0);
    if (uncategorized.length > 20) void 0;
  }
  if (noPriceProducts.length > 0) {
    noPriceProducts.forEach(t => void 0);
  }
}
main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
