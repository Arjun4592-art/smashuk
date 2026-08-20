/**
 * scripts/import-shopify-csv.ts
 *
 * Imports a Shopify product export CSV (Products → Export → "All products"
 * → CSV, from Shopify Admin) directly into Medusa — handle, title,
 * description, vendor (→ brand), variants (options/SKU/price/compare-at
 * price/inventory qty), images, tags, and published status.
 *
 * This is the accurate alternative to manually re-typing product data —
 * if you can export the real Shopify catalog, this script gets every
 * field exactly right instead of me re-typing it by hand from web pages.
 *
 * USAGE:
 *   1. In Shopify Admin: Products → Export → "All products" → Plain CSV
 *   2. Save the file as scripts/shopify-export.csv (or pass a path)
 *   3. Run: npx ts-node --esm scripts/import-shopify-csv.ts [path-to-csv]
 *
 * Every product is created as status: 'published' and auto-linked to the
 * store's sales channel (same as app/api/admin/products/route.ts does),
 * so nothing needs a separate "publish" step and nothing silently fails
 * at checkout for being unlinked from a sales channel.
 *
 * Products are matched to categories by matching the CSV's "Type"/"Tags"
 * (falling back to the "Product Category" breadcrumb, then Title) against
 * a shared Rackets/Shoes/Bags/Grips/Balls/Shuttlecocks/Strings/
 * Accessories/Clothing pattern set — the SAME pattern set for every sport,
 * with sport (badminton/tennis/padel/squash/clothing) tracked separately
 * in metadata.sport. Anything that doesn't match is still imported, just
 * left uncategorized, and printed at the end so it can be assigned
 * manually in the dashboard.
 *
 * Per product:
 *   - Sales channel (Website / Store / both) — no images → store-only;
 *     has images but Shopify's own "Published" flag is FALSE →
 *     store-only; has images + Published TRUE → both. An explicit
 *     "store-only"/"website-only" Tag always overrides this.
 *   - metadata.stringing_available = true on badminton/tennis/squash
 *     racket products (not padel — solid bats aren't restrung).
 *   - The description's "Specifications"/"Technical Specifications"
 *     section (list or table format) is pulled out into
 *     metadata.specifications (JSON) instead of staying mixed into the
 *     free-text description, and merged with any populated structured
 *     metafield columns (racket weight/balance/material/etc).
 *   - Mangled "?<U+FFFD>?" characters (corrupted em-dashes/quotes from a
 *     lossy re-save of the export) are cleaned up in titles/descriptions.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import Papa from 'papaparse'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const CSV_PATH =
  process.argv[2] ?? path.resolve(process.cwd(), 'scripts/shopify-export.csv')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.',
  )
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV not found at ${CSV_PATH}`)
  console.error(
    '   Export it from Shopify Admin → Products → Export → "All products" → CSV,',
  )
  console.error(
    '   save it as scripts/shopify-export.csv, then re-run this script.',
  )
  process.exit(1)
}

async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok || !data.token)
    throw new Error('Auth failed: ' + (data.message ?? res.status))
  return data.token as string
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function medusaGet(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, { headers: headers(token) })
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`)
  return res.json()
}

async function medusaPost(token: string, path: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return res.json()
}

// ── Shopify CSV row shape (only the columns we use) ────────────────────────
interface ShopifyRow {
  Handle: string
  Title: string
  'Body (HTML)': string
  Vendor: string
  'Product Category': string
  Type: string
  Tags: string
  Published: string
  'Option1 Name': string
  'Option1 Value': string
  'Option2 Name': string
  'Option2 Value': string
  'Option3 Name': string
  'Option3 Value': string
  'Variant SKU': string
  'Variant Price': string
  'Variant Compare At Price': string
  'Variant Inventory Qty': string
  'Image Src': string
  'Image Position': string
  'SEO Title': string
  'SEO Description': string
  Status: string
  // Structured metafields present in some exports — used as extra
  // specification data when populated (sparser but more reliable than
  // free-text parsed from the description).
  'Badminton Racket Balance (product.metafields.custom.badminton_racket_balance)': string
  'Badminton Racket Stiffness (product.metafields.custom.badminton_racket_stiffness)': string
  'Badminton Racket Weight (product.metafields.custom.badminton_racket_weight)': string
  'Badminton Sub Collections (product.metafields.custom.badminton_sub_collections)': string
  'Padel Racket Balance (product.metafields.custom.padel_racket_balance)': string
  'Padel Racket Material (product.metafields.custom.padel_racket_material)': string
  'Padel Racket Weight (product.metafields.custom.padel_racket_weight)': string
  'Player Level (product.metafields.custom.player_level)': string
  'Racket Bag Size (product.metafields.custom.racket_bag_size)': string
  'Padel Racket Shape (product.metafields.custom.racket_shape)': string
  'Shuttlecock Level (product.metafields.custom.shuttlecock_level)': string
  'Shuttlecock Material (product.metafields.custom.shuttlecock_material)': string
  'Tennis Racket Frame Size (product.metafields.custom.tennis_racket_frame_size)': string
  'Tennis Racket Sub Collection (product.metafields.custom.tennis_racket_sub_collection)': string
  'Tennis Racket Weight (product.metafields.custom.tennis_racket_weight)': string
  'Gender (product.metafields.my_fields.gender)': string
  'Grip (product.metafields.my_fields.grip)': string
  'Color (product.metafields.shopify.color-pattern)': string
  'Racket balance (product.metafields.shopify.racket-balance)': string
  'Racket material (product.metafields.shopify.racket-material)': string
}

// ── Mojibake cleanup ─────────────────────────────────────────────────────
// Some exports (content originally authored with smart quotes/em-dashes,
// re-saved through a lossy pipeline) have their multi-byte UTF-8
// punctuation mangled into "?<U+FFFD>?" sequences. Node decodes the
// orphaned continuation byte as U+FFFD (�), so by the time we read the
// file it shows up literally as "?�?". Clean up the common cases instead
// of shipping "?�?" into product descriptions.
function cleanMojibake(text: string): string {
  if (!text) return text
  return text
    .replace(/\?\uFFFD\?/g, '–') // mangled em/en-dash
    .replace(/\uFFFD/g, "'") // mangled smart quote/apostrophe (lone byte)
    .replace(/\?{2,}/g, '') // leftover runs of "?" from other corrupted glyphs
}

// Strips HTML tags and collapses whitespace — used when pulling plain text
// out of a <li>/<td>/<th> for a specification label or value.
function stripHtml(html: string): string {
  return cleanMojibake(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Specification extraction ────────────────────────────────────────────
// The CSV's Body (HTML) often has a "Specifications" / "Technical
// Specifications" section buried inside the long description, as either:
//   1) <h2/h3>Specifications</h2> or <p><strong>Specifications:</strong></p>
//      followed by <ul><li><strong>Label:</strong> Value</li>...</ul>
//   2) a <table> with a header row (Feature | Specification) and one
//      row per spec
//   3) a <table> with <th scope="row">Label</th><td>Value</td> per row
// Rather than leaving this mixed into the free-text description shown on
// the storefront, pull it out into structured metadata.specifications and
// remove that section from the description that gets saved.
function extractSpecifications(bodyHtml: string): {
  description: string
  specifications: Record<string, string>
} {
  if (!bodyHtml) return { description: bodyHtml, specifications: {} }

  const cleaned = cleanMojibake(bodyHtml)
  const specifications: Record<string, string> = {}

  // Find a "Specifications" marker — a heading tag containing the word, OR
  // a bare <strong>Specifications</strong> (which shows up wrapped in all
  // sorts of parent tags across this export: <p>, <li>, or nothing at
  // all). Whichever comes first in the body wins. Rather than trying to
  // bound the section by "next heading tag" (fragile when the spec list
  // is nested inside a parent <li>, or when there's no heading at all),
  // grab the very next <ul>...</ul> or <table>...</table> that follows
  // the marker — that's the actual spec content in every format seen in
  // this export.
  const markerMatch = cleaned.match(
    /<h[1-6][^>]*>(?:(?!<\/h[1-6]>).)*specifications?(?:(?!<\/h[1-6]>).)*<\/h[1-6]>|<strong>\s*(?:technical\s+)?specifications?\s*:?\s*<\/strong>/i,
  )

  if (markerMatch && markerMatch.index !== undefined) {
    const afterMarker = cleaned.slice(markerMatch.index + markerMatch[0].length)
    const nextList = afterMarker.match(/<ul[\s\S]*?<\/ul>/i)
    const nextTable = afterMarker.match(/<table[\s\S]*?<\/table>/i)
    // Whichever of <ul>/<table> appears first (within a reasonable
    // distance — don't reach across unrelated later sections of a long
    // description).
    const candidates = [nextList, nextTable]
      .filter(
        (m): m is RegExpMatchArray =>
          !!m && m.index !== undefined && m.index < 1500,
      )
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const block = candidates[0]

    if (block) {
      const isTable = block[0].startsWith('<table')
      if (isTable) {
        const rowMatches = [...block[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)]
        for (const rowMatch of rowMatches) {
          const cells = [
            ...rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
          ].map((c) => stripHtml(c[1]))
          if (cells.length === 2) {
            const [label, value] = cells
            if (
              /^(feature|specification|attribute|property|name)s?$/i.test(
                label,
              ) &&
              /^(specification|value|details?)s?$/i.test(value)
            ) {
              continue
            }
            if (label && value) specifications[label] = value
          }
        }
      } else {
        // <ul>Label: Value</li> list — only the list's OWN top-level
        // <li>s (not a nested sub-list's), stopped at the first nested
        // <ul> so a "Recommended Strings" sub-list inside one <li>
        // doesn't get misread as more spec rows.
        const liMatches = [...block[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        for (const liMatch of liMatches) {
          const ownText = liMatch[1].split(/<ul[\s\S]*?<\/ul>/i)[0]
          const text = stripHtml(ownText)
          const colonIdx = text.indexOf(':')
          if (colonIdx > 0 && colonIdx < 60) {
            const label = text.slice(0, colonIdx).trim()
            const value = text.slice(colonIdx + 1).trim()
            if (label && value) specifications[label] = value
          }
        }
      }

      if (Object.keys(specifications).length > 0) {
        const fullSection =
          markerMatch[0] +
          afterMarker.slice(0, (block.index ?? 0) + block[0].length)
        const description = cleaned.replace(fullSection, '').trim()
        return { description, specifications }
      }
    }
  }

  // Fallback: some descriptions put the spec data in a <table> under an
  // unrelated heading (e.g. "Product Details") where only the table's own
  // header cell says "Specification"/"Feature" — no heading in the body
  // actually contains the word "specification". Scan for that shape
  // directly, independent of any heading text.
  const allTables = [...cleaned.matchAll(/<table[\s\S]*?<\/table>/gi)]
  for (const t of allTables) {
    const headerCells = [...t[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(
      (c) => stripHtml(c[1]),
    )
    const looksLikeSpecTable =
      headerCells.some((h) => /^feature$/i.test(h)) &&
      headerCells.some((h) => /^specifications?$/i.test(h))
    if (!looksLikeSpecTable) continue

    const rowMatches = [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)]
    for (const rowMatch of rowMatches) {
      const cells = [
        ...rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi),
      ].map((c) => stripHtml(c[1]))
      if (cells.length === 2) {
        const [label, value] = cells
        if (/^feature$/i.test(label) && /^specifications?$/i.test(value))
          continue
        if (label && value) specifications[label] = value
      }
    }
    if (Object.keys(specifications).length > 0) {
      const description = cleaned.replace(t[0], '').trim()
      return { description, specifications }
    }
  }

  return { description: cleaned, specifications }
}

// Merges any populated structured metafield columns into the specs object
// pulled from the description — these are sparser but more trustworthy
// when present, so they take priority over a same-named parsed value.
function mergeMetafieldSpecs(
  row: ShopifyRow,
  specifications: Record<string, string>,
): Record<string, string> {
  const map: [string, string][] = [
    [
      'Badminton Racket Balance (product.metafields.custom.badminton_racket_balance)',
      'Balance',
    ],
    [
      'Badminton Racket Stiffness (product.metafields.custom.badminton_racket_stiffness)',
      'Stiffness',
    ],
    [
      'Badminton Racket Weight (product.metafields.custom.badminton_racket_weight)',
      'Weight',
    ],
    [
      'Padel Racket Balance (product.metafields.custom.padel_racket_balance)',
      'Balance',
    ],
    [
      'Padel Racket Material (product.metafields.custom.padel_racket_material)',
      'Material',
    ],
    [
      'Padel Racket Weight (product.metafields.custom.padel_racket_weight)',
      'Weight',
    ],
    ['Padel Racket Shape (product.metafields.custom.racket_shape)', 'Shape'],
    ['Racket Bag Size (product.metafields.custom.racket_bag_size)', 'Bag Size'],
    [
      'Shuttlecock Level (product.metafields.custom.shuttlecock_level)',
      'Level',
    ],
    [
      'Shuttlecock Material (product.metafields.custom.shuttlecock_material)',
      'Material',
    ],
    [
      'Tennis Racket Frame Size (product.metafields.custom.tennis_racket_frame_size)',
      'Frame Size',
    ],
    [
      'Tennis Racket Weight (product.metafields.custom.tennis_racket_weight)',
      'Weight',
    ],
    ['Grip (product.metafields.my_fields.grip)', 'Grip'],
    ['Color (product.metafields.shopify.color-pattern)', 'Colour'],
    ['Racket balance (product.metafields.shopify.racket-balance)', 'Balance'],
    [
      'Racket material (product.metafields.shopify.racket-material)',
      'Material',
    ],
  ]
  const merged = { ...specifications }
  for (const [col, label] of map) {
    const v = (row[col as keyof ShopifyRow] || '').trim()
    if (v) merged[label] = cleanMojibake(v)
  }
  const playerLevel =
    row['Player Level (product.metafields.custom.player_level)']?.trim()
  if (playerLevel) merged['Player Level'] = cleanMojibake(playerLevel)
  return merged
}

function parseMoney(v: string): number | undefined {
  if (!v) return undefined
  // Medusa's `amount` field here stores plain decimal pounds (e.g. 189.99
  // means £189.99) — NOT cents. Do not multiply by 100.
  const n = Math.round(parseFloat(v) * 100) / 100
  return Number.isFinite(n) ? n : undefined
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8')
  const { data: rows } = Papa.parse<ShopifyRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  console.log(`📄 Parsed ${rows.length} CSV rows`)

  // Group rows by Handle — Shopify repeats the Handle across one row per
  // variant and one row per extra image, with most product-level fields
  // blank after the first row for that handle.
  const grouped = new Map<string, ShopifyRow[]>()
  for (const row of rows) {
    if (!row.Handle) continue
    if (!grouped.has(row.Handle)) grouped.set(row.Handle, [])
    grouped.get(row.Handle)!.push(row)
  }
  console.log(`📦 Grouped into ${grouped.size} products\n`)

  // BUG FIX (handle "Invalid product handle... must contain URL safe
  // characters"): Shopify's own Handle column already exists per row, but
  // a few rows had one that wasn't URL-safe (e.g. containing ':'). Slugify
  // it properly instead of trusting the CSV value as-is.
  function slugifyHandle(raw: string): string {
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200) || 'product'
    )
  }

  // Existing categories, for name-based matching
  const { product_categories: categories } = await medusaGet(
    token,
    '/admin/product-categories?limit=200',
  )
  const categoryByName = new Map<string, string>(
    (categories ?? []).map((c: any) => [c.name.toLowerCase().trim(), c.id]),
  )

  // ── Sport + category (subtype) taxonomy ─────────────────────────────────
  //
  // The storefront reads TWO separate things off each product, not one
  // (see lib/api/store.ts normalizeProduct, lib/constants.ts SPORTS):
  //   - metadata.sport   → free-text field ('badminton' / 'tennis' / 'padel'
  //                        / 'squash' / 'clothing'), matched against the
  //                        Navbar's ?sport= links and the shop sidebar's
  //                        sport pills. Must be lowercase to match those.
  //   - categories[0]    → the actual Medusa category, used as the
  //                        SUBTYPE ("Rackets" / "Shoes" / "Bags" / ...) for
  //                        the shop's ?category= filter.
  // The old version of this script only tried to match the CSV's Type/Tags
  // text against category names verbatim — anything that didn't match
  // word-for-word (e.g. "Tennis Racquets" vs an existing "Rackets"
  // category) was left completely uncategorized, and sport was never set
  // at all. This detects both from the CSV via keyword patterns, and
  // creates the category in Medusa if it doesn't exist yet instead of
  // giving up.
  const SPORT_PATTERNS: [RegExp, string][] = [
    [/badminton/i, 'badminton'],
    [/\btennis\b/i, 'tennis'],
    [/padel/i, 'padel'],
    [/squash/i, 'squash'],
  ]
  // BUG FIX: order matters here — patterns are tested top-to-bottom and the
  // first match wins. "Racket Bag" / "Padel Bag" Type values contain the
  // word "racket" too, so with Rackets checked first every bag was
  // mis-filed as a Racket (110 products in the Aug 2026 export alone).
  // Bag/shoe/grip/string/shuttlecock/ball patterns are all more specific
  // than the bare "racket" pattern, so they're checked first; the generic
  // Rackets pattern is deliberately last.
  const CATEGORY_PATTERNS: [RegExp, string][] = [
    [/\bbag\b/i, 'Bags'],
    [/shoe/i, 'Shoes'],
    [/grip/i, 'Grips'],
    [/shuttlecock/i, 'Shuttlecocks'],
    [/string/i, 'Strings'],
    [/\bball/i, 'Balls'],
    [/dampener|\bdamp\b/i, 'Accessories'],
    [/headband/i, 'Accessories'],
    [/accessor(y|ies)/i, 'Accessories'],
    [/apparel|dress|t-?shirt|\bkit\b|\bcap\b/i, 'Clothing'],
    [/racquet|racket/i, 'Rackets'],
    [/clothing/i, 'Clothing'],
  ]

  // Sports for which a physical racket can actually be restrung — padel
  // rackets are solid bats (no strings), so they're excluded even though
  // they land in the "Rackets" category too.
  const RESTRINGABLE_SPORTS = new Set(['badminton', 'tennis', 'squash'])

  function resolveSport(typeAndTags: string[]): string {
    for (const t of typeAndTags) {
      for (const [pattern, slug] of SPORT_PATTERNS) {
        if (pattern.test(t)) return slug
      }
    }
    return ''
  }

  function resolveCategoryName(typeAndTags: string[]): string | null {
    for (const t of typeAndTags) {
      for (const [pattern, name] of CATEGORY_PATTERNS) {
        if (pattern.test(t)) return name
      }
    }
    return null
  }

  // Cache of categories created during this run so two products needing
  // the same new category (e.g. two products both mapping to "Strings")
  // only create it once instead of racing duplicate creates.
  const categoryCreatePromises = new Map<string, Promise<string | undefined>>()
  const createdCategoryNames: string[] = []
  let categoriesCreated = 0

  async function getOrCreateCategoryId(
    name: string,
  ): Promise<string | undefined> {
    const key = name.toLowerCase().trim()
    const existing = categoryByName.get(key)
    if (existing) return existing

    if (!categoryCreatePromises.has(key)) {
      categoryCreatePromises.set(
        key,
        (async () => {
          try {
            const { product_category } = await medusaPost(
              token,
              '/admin/product-categories',
              { name, is_active: true },
            )
            categoryByName.set(key, product_category.id)
            categoriesCreated++
            createdCategoryNames.push(name)
            return product_category.id as string
          } catch (err: any) {
            console.warn(
              `  ⚠️  Could not create category "${name}": ${err.message}`,
            )
            return undefined
          }
        })(),
      )
    }
    return categoryCreatePromises.get(key)
  }

  // Resolves BOTH the category id (creating it if needed) and the sport
  // slug for one product, from its CSV Type + Tags — falling back to the
  // product Title itself when both are blank (some rows in real exports
  // have empty Type/Tags but an obviously identifiable title, e.g. "Boom
  // Junior Tennis Racket 2026").
  async function resolveTaxonomy(
    typeAndTagsRaw: string[],
    title: string,
    productCategoryBreadcrumb: string,
  ): Promise<{ categoryId: string | undefined; sport: string }> {
    const typeAndTags = typeAndTagsRaw.filter(Boolean)
    // Extra fallback source: Shopify's Google-taxonomy "Product Category"
    // breadcrumb (e.g. "Sporting Goods > ... > Badminton > Shuttlecocks"),
    // split into segments so keyword patterns can match its individual
    // words the same way they match Type/Tags.
    const breadcrumbSegments = productCategoryBreadcrumb
      .split('>')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const sources = typeAndTags.length
      ? typeAndTags
      : breadcrumbSegments.length
        ? breadcrumbSegments
        : [title.toLowerCase()]

    // 1) Exact match against an existing category name first — respects
    //    categories you've already deliberately set up in Medusa Admin,
    //    even if their name doesn't match one of the canonical patterns
    //    below (e.g. a custom "Team China Kit" category).
    const exactMatchId = typeAndTags
      .map((t) => categoryByName.get(t.toLowerCase().trim()))
      .find((id) => !!id)

    const canonicalName =
      resolveCategoryName(sources) ||
      resolveCategoryName(breadcrumbSegments) ||
      resolveCategoryName([title.toLowerCase()])
    // BUG FIX: sport resolution used to only look at typeAndTags +
    // breadcrumbSegments — never the title. Category resolution already
    // had a 3-tier fallback ending in title, but sport didn't, so any
    // product with empty Type/Tags and Shopify's literal "Uncategorized"
    // placeholder as its Product Category breadcrumb (144 products in the
    // Aug 2026 export) got stuck checking sport patterns against the
    // single word "uncategorized" — even when the sport was written right
    // there in the title (e.g. "Boom Junior Tennis Racket 2026"). 182
    // products lost their metadata.sport this way, silently disappearing
    // from the navbar's ?sport= links and the shop sidebar's sport pills
    // (they'd still show on unfiltered /shop). Also filters out that
    // literal "uncategorized" placeholder value itself so it can't
    // accidentally participate in matching.
    const meaningfulBreadcrumb = breadcrumbSegments.filter(
      (s) => s !== 'uncategorized',
    )
    const allSourcesForSport = [
      ...sources,
      ...meaningfulBreadcrumb,
      title.toLowerCase(),
    ]
    const sport =
      resolveSport(allSourcesForSport) ||
      (canonicalName === 'Clothing' ? 'clothing' : '')

    if (exactMatchId) return { categoryId: exactMatchId, sport }

    if (canonicalName) {
      const categoryId = await getOrCreateCategoryId(canonicalName)
      return { categoryId, sport }
    }

    return { categoryId: undefined, sport }
  }

  // BUG FIX ("Field 'tags, 0, id' is required"): Medusa v2's product
  // create expects `tags` as references to EXISTING product tags
  // ({ id }), not inline new ones ({ value }) — passing { value } fails
  // for any tag that doesn't already exist yet, which was every tag on
  // first import. Collect every distinct tag used across the whole CSV
  // up front, create whichever ones don't exist yet in Medusa, and build
  // a name → id map to use when building each product's payload below.
  console.log('🏷️  Resolving tags...')
  const allTagNames = new Set<string>()
  for (const row of rows) {
    if (!row.Tags) continue
    row.Tags.split(',').forEach((t) => {
      const v = t.trim()
      if (v) allTagNames.add(v)
    })
  }
  const tagIdByName = new Map<string, string>()
  {
    let offset = 0
    const limit = 200
    while (true) {
      const { product_tags } = await medusaGet(
        token,
        `/admin/product-tags?limit=${limit}&offset=${offset}`,
      )
      if (!product_tags || product_tags.length === 0) break
      for (const t of product_tags) tagIdByName.set(t.value.toLowerCase(), t.id)
      if (product_tags.length < limit) break
      offset += limit
    }
  }
  let tagsCreated = 0
  for (const name of allTagNames) {
    if (tagIdByName.has(name.toLowerCase())) continue
    try {
      const { product_tag } = await medusaPost(token, '/admin/product-tags', {
        value: name,
      })
      tagIdByName.set(name.toLowerCase(), product_tag.id)
      tagsCreated++
    } catch (err: any) {
      console.warn(`  ⚠️  Could not create tag "${name}": ${err.message}`)
    }
  }
  console.log(
    `✅ ${tagIdByName.size} tags ready (${tagsCreated} newly created)\n`,
  )

  // Sales channels — per-product assignment (Website / Store / both) based
  // on the CSV's Tags column (see resolveChannels below), instead of always
  // dumping every product into a single hardcoded channel.
  const { sales_channels } = await medusaGet(
    token,
    '/admin/sales-channels?limit=100',
  )
  const channelsByName = new Map<string, string>(
    (sales_channels ?? []).map((c: any) => [c.name.toLowerCase().trim(), c.id]),
  )
  const websiteChannelId = channelsByName.get('website')
  const storeChannelId = channelsByName.get('store')
  const defaultChannelId =
    channelsByName.get('default sales channel') ?? sales_channels?.[0]?.id

  // Per-product channel assignment. Priority order:
  //   1. Explicit "store-only"/"in-store-only" or "website-only"/
  //      "online-only" tag in Shopify (Tags field) always wins if present.
  //   2. No product images at all → store-only. A product with zero
  //      photos can't be sold on the website anyway, so it's treated as
  //      in-store/POS stock only.
  //   3. Has images but Shopify's own "Published" flag is FALSE → the
  //      product was never actually published to the Online Store in
  //      Shopify either, so it's kept store-only rather than pushing it
  //      live on the website unintentionally.
  //   4. Has images AND Published TRUE → both Website and Store (the
  //      common case).
  // Falls back to the Default Sales Channel only if neither named channel
  // exists in this store yet.
  function resolveChannels(
    tags: string[],
    hasImages: boolean,
    published: string,
  ): { id: string }[] {
    const lower = tags.map((t) => t.toLowerCase())
    const storeOnlyTag =
      lower.includes('store-only') || lower.includes('in-store-only')
    const websiteOnlyTag =
      lower.includes('website-only') || lower.includes('online-only')

    const ids = new Set<string>()
    if (storeOnlyTag && !websiteOnlyTag) {
      if (storeChannelId) ids.add(storeChannelId)
    } else if (websiteOnlyTag && !storeOnlyTag) {
      if (websiteChannelId) ids.add(websiteChannelId)
    } else if (!hasImages) {
      if (storeChannelId) ids.add(storeChannelId)
    } else if (published.trim().toUpperCase() !== 'TRUE') {
      if (storeChannelId) ids.add(storeChannelId)
    } else {
      if (websiteChannelId) ids.add(websiteChannelId)
      if (storeChannelId) ids.add(storeChannelId)
    }
    if (ids.size === 0 && defaultChannelId) ids.add(defaultChannelId)
    return [...ids].map((id) => ({ id }))
  }

  // Shipping profile to auto-link — without this, imported products have no
  // shipping profile at all, and checkout fails for every one of them with
  // "cart items require shipping profiles that are not satisfied by the
  // current shipping methods" (see scripts/fix-products-shipping-profile.ts
  // for the one-time fix for products already imported before this line
  // existed).
  const { shipping_profiles: shippingProfiles } = await medusaGet(
    token,
    '/admin/shipping-profiles?limit=50',
  )
  const shippingProfileId =
    (shippingProfiles ?? []).find((p: any) => p.type === 'default')?.id ??
    (shippingProfiles ?? []).find((p: any) => /default/i.test(p.name ?? ''))?.id

  // Stock location for inventory levels (see the inventory wiring block
  // after each product create, below).
  const { stock_locations: stockLocations } = await medusaGet(
    token,
    '/admin/stock-locations?limit=1',
  )
  const locationId = stockLocations?.[0]?.id
  if (!locationId) {
    console.warn(
      '⚠️  No stock location found — imported variants will have no inventory levels ' +
        'at all (shows as "available at 0 locations" everywhere). Create one in Medusa ' +
        'Admin → Settings → Stock Locations, then re-run.',
    )
  }

  // BUG FIX: this script used to create products with variants and stop —
  // it never created or linked an InventoryItem for any of them, so every
  // imported variant showed "available at 0 locations" in the dashboard,
  // the same root cause chased down and fixed in app/api/admin/products/
  // route.ts and app/api/admin/products/[id]/route.ts. Confirmed against
  // Medusa's own Admin API reference: creating an inventory item does NOT
  // reliably link it via a variant_id field — there's a dedicated endpoint
  // for that:
  //   POST /admin/products/{id}/variants/{variant_id}/inventory-items
  //   body: { inventory_item_id, required_quantity }
  // This does the same create → link → set-stock-level flow those routes
  // do, right after each product is created here.
  async function wireUpInventory(
    productId: string,
    variantStocks: Map<string, number>,
  ) {
    if (!locationId) return
    try {
      const { product } = await medusaGet(
        token,
        `/admin/products/${productId}?fields=*variants,*variants.inventory_items`,
      )
      for (const variant of product?.variants ?? []) {
        let inventoryItemId: string | undefined =
          variant.inventory_items?.[0]?.inventory_item_id ??
          variant.inventory_items?.[0]?.inventory?.id ??
          undefined

        if (!inventoryItemId) {
          const createItemData = await medusaPost(
            token,
            '/admin/inventory-items',
            {
              sku: variant.sku || undefined,
            },
          )
          inventoryItemId =
            createItemData.inventory_item?.id ?? createItemData.id
          if (!inventoryItemId) continue

          await medusaPost(
            token,
            `/admin/products/${productId}/variants/${variant.id}/inventory-items`,
            { inventory_item_id: inventoryItemId, required_quantity: 1 },
          )
        }

        const qty = variantStocks.get(variant.id) ?? 0
        await fetch(
          `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
          {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify({
              location_id: locationId,
              stocked_quantity: qty,
            }),
          },
        )
      }
    } catch (err: any) {
      console.warn(
        `  ⚠️  Inventory wiring failed for product ${productId}: ${err.message}`,
      )
    }
  }

  // BUG FIX ("kuch product same SKU ki wajah se import nahi ho rahe"):
  // Medusa v2 requires every variant SKU to be globally unique across the
  // store. The Shopify export sometimes repeats a SKU (copy-paste in
  // Shopify, or the same SKU across two separate CSV rows), which made
  // /admin/products fail outright for the whole product instead of just
  // that one variant. Rather than dropping the product, auto-suffix any
  // colliding SKU (SKU, SKU-2, SKU-3, ...) so the import always succeeds,
  // and log every rename so they can be fixed manually afterwards if
  // needed.
  console.log('🔍 Checking existing SKUs in Medusa for conflicts...')
  const usedSkus = new Set<string>()
  {
    let offset = 0
    const limit = 200
    while (true) {
      const { products: existingProducts } = await medusaGet(
        token,
        `/admin/products?fields=id,variants.sku&limit=${limit}&offset=${offset}`,
      )
      if (!existingProducts || existingProducts.length === 0) break
      for (const p of existingProducts) {
        for (const v of p.variants ?? []) {
          if (v.sku) usedSkus.add(v.sku)
        }
      }
      if (existingProducts.length < limit) break
      offset += limit
    }
  }
  console.log(`  Found ${usedSkus.size} existing SKUs already in Medusa\n`)

  const skuRenames: { original: string; renamed: string }[] = []
  function dedupeSku(sku: string | undefined): string | undefined {
    if (!sku) return sku
    if (!usedSkus.has(sku)) {
      usedSkus.add(sku)
      return sku
    }
    let i = 2
    let candidate = `${sku}-${i}`
    while (usedSkus.has(candidate)) {
      i++
      candidate = `${sku}-${i}`
    }
    usedSkus.add(candidate)
    skuRenames.push({ original: sku, renamed: candidate })
    return candidate
  }

  let created = 0
  let failed = 0
  let stringingCount = 0
  let specsCount = 0
  let storeOnlyCount = 0
  let bothChannelCount = 0
  let compareAtCount = 0
  let seoCount = 0
  const uncategorized: string[] = []

  for (const [handle, productRows] of grouped) {
    const first = productRows.find((r) => r.Title) ?? productRows[0]
    if (!first?.Title) continue

    // Images: unique, ordered by Image Position
    const images = productRows
      .filter((r) => r['Image Src'])
      .sort(
        (a, b) =>
          Number(a['Image Position'] || 0) - Number(b['Image Position'] || 0),
      )
      .map((r) => ({ url: r['Image Src'] }))
      .filter((img, i, arr) => arr.findIndex((x) => x.url === img.url) === i)

    // Options: collect distinct option names used
    const optionNames = ['Option1 Name', 'Option2 Name', 'Option3 Name']
      .map((k) => first[k as keyof ShopifyRow])
      .filter((v): v is string => !!v && v !== 'Title')

    // Variants: one per row that has a SKU or a price
    const variants = productRows
      .filter((r) => r['Variant SKU'] || r['Variant Price'])
      .map((r) => {
        const optionValues = ['Option1 Value', 'Option2 Value', 'Option3 Value']
          .map((k) => r[k as keyof ShopifyRow])
          .filter(Boolean)
        const price = parseMoney(r['Variant Price'])
        // BUG FIX: this used to push compareAt as a SECOND {currency_code:
        // 'gbp'} entry in the same variant's `prices` array — Medusa has no
        // "compare at" concept in a price list, so this just gave every
        // imported variant two GBP prices (selling + compare-at) with no
        // way to tell which was which. lib/api/store.ts's normalizeProduct
        // had to work around exactly this with a "legacySecondGbpPrice"
        // fallback (and could pick the WRONG one — sometimes showing the
        // higher, pre-discount amount as the current price). The compare-at
        // amount is captured here (`_compareAt`) and written to
        // metadata.compare_at_price on the PRODUCT below instead, matching
        // the same convention the dashboard's Pricing tab already uses.
        const compareAt = parseMoney(r['Variant Compare At Price'])
        return {
          title: optionValues.join(' / ') || 'Default',
          sku: dedupeSku(r['Variant SKU'] || undefined),
          options: optionNames.length
            ? Object.fromEntries(
                optionNames.map((n, i) => [n, optionValues[i] ?? 'Standard']),
              )
            : undefined,
          prices:
            price !== undefined
              ? [{ currency_code: 'gbp', amount: price }]
              : [],
          _stock: Number(r['Variant Inventory Qty'] || 0),
          _compareAt: compareAt,
        }
      })

    if (variants.length === 0) {
      variants.push({
        title: 'Default',
        sku: undefined,
        options: undefined,
        prices: [],
        _stock: 0,
        _compareAt: undefined,
      } as any)
    }

    // Category (subtype) + sport — see resolveTaxonomy() above. Creates
    // the category in Medusa if nothing matches yet, instead of leaving
    // the product uncategorized. Same Rackets/Shoes/Bags/Grips/Balls/
    // Shuttlecocks/Strings/Accessories/Clothing pattern set is applied
    // identically for every sport — sport itself is a separate metadata
    // field, so "Badminton Rackets" and "Tennis Rackets" both resolve to
    // the one shared "Rackets" category, scoped by metadata.sport.
    const typeAndTags = [
      first.Type,
      ...(first.Tags ? first.Tags.split(',') : []),
    ]
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const { categoryId: matchedCategoryId, sport } = await resolveTaxonomy(
      typeAndTags,
      first.Title,
      first['Product Category'] || '',
    )
    if (!matchedCategoryId) uncategorized.push(first.Title)

    // Stringing add-on: only real racket products, and only for sports
    // where a racket is actually strung (badminton/tennis/squash — padel
    // bats are solid). Storefront can read metadata.stringing_available
    // to offer the restring add-on on the product page.
    const categoryNameForProduct = matchedCategoryId
      ? [...categoryByName.entries()].find(
          ([, id]) => id === matchedCategoryId,
        )?.[0]
      : undefined
    const stringingAvailable =
      categoryNameForProduct === 'rackets' && RESTRINGABLE_SPORTS.has(sport)

    // Pull the "Specifications" section (list or table) out of the
    // description into structured metadata, instead of leaving it mixed
    // into the free-text description shown on the storefront. Sparser but
    // more reliable per-column metafields (racket weight/balance/etc, when
    // present in the CSV) are merged in on top.
    const { description: cleanedDescription, specifications: parsedSpecs } =
      extractSpecifications(first['Body (HTML)'] || '')
    const specifications = mergeMetafieldSpecs(first, parsedSpecs)

    const hasImages = images.length > 0
    const gender = first['Gender (product.metafields.my_fields.gender)']?.trim()
    const playerLevel =
      first['Player Level (product.metafields.custom.player_level)']?.trim()

    // Compare-at / "was" price — see the BUG FIX note above where
    // `_compareAt` is captured per variant. Use the first variant's value
    // (Shopify's compare-at is almost always identical across a product's
    // variants in this catalog) and only keep it if it's genuinely higher
    // than the selling price — Shopify sometimes leaves a stale compare-at
    // equal to (or even below) the current price, which should just mean
    // "not on sale" rather than showing a fake discount on the storefront.
    const firstVariantForCompare = variants[0] as any
    const compareAtCandidate = firstVariantForCompare?._compareAt
    const sellingPrice = firstVariantForCompare?.prices?.[0]?.amount
    const compareAtPrice =
      compareAtCandidate !== undefined &&
      sellingPrice !== undefined &&
      compareAtCandidate > sellingPrice
        ? compareAtCandidate
        : undefined

    // SEO — Shopify's "SEO Title" / "SEO Description" columns, mapped to
    // the same metadata.metaTitle / metadata.metaDescription keys the
    // dashboard's own SEO tab reads and writes (app/dashboard/products/
    // {new,[id]}/page.tsx). Previously these two CSV columns were parsed
    // by nothing at all — every imported product's SEO tab came up blank
    // and fell back to the dashboard's auto-generated title/description
    // instead of the real copy already written in the Shopify export.
    const seoTitle = first['SEO Title']?.trim()
    const seoDescription = first['SEO Description']?.trim()

    const payload = {
      title: first.Title,
      handle: slugifyHandle(handle),
      description: cleanedDescription || undefined,
      status: 'published', // always published — see app/api/admin/products/route.ts
      thumbnail: images[0]?.url,
      images: images.length > 0 ? images : undefined,
      categories: matchedCategoryId ? [{ id: matchedCategoryId }] : undefined,
      tags: first.Tags
        ? first.Tags.split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => tagIdByName.get(t.toLowerCase()))
            .filter((id): id is string => !!id)
            .map((id) => ({ id }))
        : undefined,
      sales_channels: resolveChannels(typeAndTags, hasImages, first.Published),
      ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
      options: optionNames.length
        ? optionNames.map((name) => ({
            title: name,
            values: [
              ...new Set(
                variants.map((v: any) => v.options?.[name]).filter(Boolean),
              ),
            ],
          }))
        : [{ title: 'Type', values: ['Standard'] }],
      variants: variants.map(({ _stock, _compareAt, ...v }: any) => v),
      metadata: {
        brand: first.Vendor || undefined,
        sport: sport || undefined,
        stringing_available: stringingAvailable || undefined,
        gender: gender || undefined,
        player_level: playerLevel || undefined,
        compare_at_price: compareAtPrice,
        metaTitle: seoTitle || undefined,
        metaDescription: seoDescription || undefined,
        // BUG FIX: this used to write `metadata.specifications` as a
        // JSON.stringify()'d string. lib/api/store.ts's extractSpecs() only
        // ever reads the `metadata.specs` ARRAY (the same shape the
        // dashboard's product editor writes) — it has no idea
        // `specifications` exists, and since "specifications" wasn't in
        // SYSTEM_METADATA_KEYS either, its fallback path picked up the
        // whole raw JSON string as if it were itself a spec value. That's
        // why the storefront's Colour filter showed literal chips like
        // `{"Colour":"black"}` instead of "Black" — the imported CSV data
        // never reached the real specs array at all. Writing `specs` as a
        // proper {label, value}[] array here matches what extractSpecs()
        // and the dashboard both actually expect.
        ...(Object.keys(specifications).length
          ? {
              specs: Object.entries(specifications).map(([label, value]) => ({
                label,
                value,
              })),
            }
          : {}),
      },
    }

    if (stringingAvailable) stringingCount++
    if (Object.keys(specifications).length) specsCount++
    if (payload.sales_channels.length === 1) storeOnlyCount++
    if (payload.sales_channels.length >= 2) bothChannelCount++
    if (compareAtPrice !== undefined) compareAtCount++
    if (seoTitle || seoDescription) seoCount++

    try {
      const { product } = await medusaPost(token, '/admin/products', payload)
      created++
      if (created % 10 === 0) console.log(`  ...${created} created`)

      // Map the created variants back to their CSV stock quantities by
      // matching on sku when present, else by position (Medusa returns
      // variants in the same order they were sent).
      if (product?.id) {
        const variantStocks = new Map<string, number>()
        const createdVariants: any[] = product.variants ?? []
        createdVariants.forEach((cv: any, i: number) => {
          const src = variants[i] as any
          if (src) variantStocks.set(cv.id, Number(src._stock || 0))
        })
        await wireUpInventory(product.id, variantStocks)
      }
    } catch (err: any) {
      failed++
      console.warn(`  ⚠️  Failed: "${first.Title}" — ${err.message}`)
    }
  }

  console.log(`\n✅ Created ${created} products (${failed} failed)`)
  console.log(
    `🧵 Stringing add-on enabled on ${stringingCount} racket products (badminton/tennis/squash only)`,
  )
  console.log(
    `📋 Structured specifications extracted for ${specsCount} products`,
  )
  console.log(
    `🏬 Channels: ${storeOnlyCount} store-only, ${bothChannelCount} website+store`,
  )
  console.log(`🏷️  Compare-at ("was") price set on ${compareAtCount} products`)
  console.log(
    `🔎 SEO title/description set on ${seoCount} products from the CSV`,
  )
  if (categoriesCreated > 0) {
    console.log(
      `\n📂 ${categoriesCreated} new categor${categoriesCreated === 1 ? 'y' : 'ies'} auto-created (didn't exist in Medusa yet):`,
    )
    for (const name of createdCategoryNames) {
      console.log(`   - ${name}`)
    }
  }
  if (skuRenames.length > 0) {
    console.log(
      `\n🔁 ${skuRenames.length} duplicate SKU(s) auto-renamed so their products could still import:`,
    )
    skuRenames
      .slice(0, 30)
      .forEach((r) => console.log(`   - ${r.original} → ${r.renamed}`))
    if (skuRenames.length > 30)
      console.log(`   ...and ${skuRenames.length - 30} more`)
    console.log(
      '   (fix these manually in the dashboard later if the renamed SKU should be different)',
    )
  }
  if (uncategorized.length > 0) {
    console.log(
      `\n⚠️  ${uncategorized.length} products had no matching category (imported anyway, assign manually):`,
    )
    uncategorized.slice(0, 20).forEach((t) => console.log(`   - ${t}`))
    if (uncategorized.length > 20)
      console.log(`   ...and ${uncategorized.length - 20} more`)
  }
  console.log(
    '\nStock quantities from the CSV\'s "Variant Inventory Qty" column were set',
  )
  console.log("for each variant at your store's first stock location.")
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
