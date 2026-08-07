// lib/stringing-options.ts
//
// Single source of truth for racket stringing string/tension data.
// Used by:
//   - app/(website)/local-store/stringing/{badminton,tennis,squash}/page.tsx
//     (the detailed guide pages — tension guide + string brand listings)
//   - components/website/StringingBookingForm.tsx
//     (the "String & Tension" dropdowns, filtered by whichever racket type
//     is currently selected in the form)
//
// Previously this data was hardcoded three times over inside each sport's
// page.tsx, and the booking form's "String & Tension" field was a bare free
// -text input with no connection to any of it. Centralising here means the
// dropdown options and the guide pages can never drift out of sync, and
// there's one place to add/update strings going forward.

export type Sport = 'badminton' | 'tennis' | 'squash'

export interface TensionLevel {
  level: string
  range: string
  note: string
}

export interface StringBrand {
  brand: string
  intro?: string
  items?: string[]
  groups?: { label: string; items: string[] }[]
}

// ── Badminton ──────────────────────────────────────────────────────────────
export const BADMINTON_TENSIONS: TensionLevel[] = [
  {
    level: 'Beginner / Recreational',
    range: '18 – 22 lbs',
    note: 'Lower tension gives a bigger sweet spot and more forgiveness — easier to generate power with a slower swing.',
  },
  {
    level: 'Intermediate / Club',
    range: '22 – 26 lbs',
    note: "A balance of control and power for players who've settled into their swing and want more precision.",
  },
  {
    level: 'Advanced / Competitive',
    range: '26 – 30+ lbs',
    note: 'Higher tension for fast, controlled swings — less forgiving, but sharper feedback and control at speed.',
  },
]

export const BADMINTON_STRING_BRANDS: StringBrand[] = [
  {
    brand: 'Yonex Strings',
    items: [
      'BG 65',
      'BG 65 Titanium',
      'BG 80',
      'BG 80 Power',
      'BG 66 Ultimax',
      'Exbolt 68',
      'Exbolt 65',
      'Exbolt 63',
      'Aerobite',
      'Aerobite Boost',
      'Nanogy 98',
      'Nanogy 95',
    ],
  },
  {
    brand: 'Victor Strings',
    items: ['VBS 70', 'VBS 68 Power', 'VBS 66 Nano', 'VBS 63'],
  },
  {
    brand: 'Kizuna Strings',
    items: ['Kizuna 69', 'Kizuna 65', 'Kizuna 63'],
  },
  {
    brand: 'Ashaway Strings',
    items: [
      'Ashaway Zymax 69',
      'Ashaway Zymax 66 Fire Power',
      'Ashaway Rogue Duo Hybrid',
    ],
  },
]

// ── Tennis ─────────────────────────────────────────────────────────────────
export const TENNIS_TENSIONS: TensionLevel[] = [
  {
    level: 'Beginner / Recreational',
    range: '50 – 55 lbs',
    note: 'Lower tension for more power and comfort — forgiving on off-centre hits while you build your swing.',
  },
  {
    level: 'Intermediate / Club',
    range: '55 – 60 lbs',
    note: 'A balanced setup for players developing consistent spin and control.',
  },
  {
    level: 'Advanced / Competitive',
    range: '58 – 65+ lbs',
    note: 'Higher tension for players generating their own power who want maximum control and feel.',
  },
]

export const TENNIS_STRING_BRANDS: StringBrand[] = [
  {
    brand: 'Babolat',
    intro:
      'Best known for co-polyester ("poly") strings built for durability, spin and control.',
    groups: [
      {
        label: 'Natural Gut Strings',
        items: ['VS Touch', 'VS Team', 'Tonic+ Natural Gut'],
      },
      {
        label: 'Multifilament & Premium Nylon Strings',
        items: [
          'Xcel',
          'Xcel French Open Edition',
          'Addiction',
          'Origin',
          'N.Vy',
          'Synthetic Gut',
          'M7',
        ],
      },
      {
        label: 'Polyester / Co-Poly Strings (RPM & Pro Hurricane)',
        items: [
          'RPM Blast',
          'RPM Blast Rough',
          'RPM Team',
          'RPM Power',
          'RPM Hurricane',
          'Pro Hurricane',
          'Pro Hurricane Tour',
        ],
      },
    ],
  },
  {
    brand: 'Luxilon',
    items: [
      '4G Series',
      'Element Series',
      'Big Banger Alu Power Series',
      'Big Banger Original Series',
      'Adrenaline Series',
      'Savage Series',
      'Smart',
    ],
  },
  {
    brand: 'Solinco',
    items: ['Hyper-G', 'Tour-Bite', 'Outlast', 'Vanquish', 'Confidential'],
  },
  {
    brand: 'Head',
    items: [
      'Lynx Tour',
      'Velocity',
      'RIP Control',
      'Sonic Pro',
      'Hawk',
      'Hawk Touch',
    ],
  },
  {
    brand: 'Wilson',
    items: ['Sensation', 'NXT', 'NXT Comfort'],
  },
  {
    brand: 'Dunlop',
    items: ['Explosive Spin', 'Explosive Bite', 'NXT Comfort'],
  },
  {
    brand: 'Yonex',
    items: ['Polytour Pro', 'Polytour Spin', 'Polytour Air', 'Polytour Drive'],
  },
  {
    brand: 'Tecnifibre',
    items: ['X-One Biphase', 'Razor Soft', 'Black-Code'],
  },
]

// ── Squash ─────────────────────────────────────────────────────────────────
// Squash's guide page never named specific string products (unlike
// badminton/tennis) — just string *types* and the brands stocked. Kept as
// its own shape rather than forced into StringBrand.
export const SQUASH_TENSIONS: TensionLevel[] = [
  {
    level: 'Beginner / Recreational',
    range: '20 – 24 lbs',
    note: 'Lower tension for a bigger sweet spot and more power with less effort while you build technique.',
  },
  {
    level: 'Intermediate / Club',
    range: '24 – 27 lbs',
    note: 'A balance of touch and power for players developing consistent shot placement.',
  },
  {
    level: 'Advanced / Competitive',
    range: '27 – 30+ lbs',
    note: 'Higher tension for precise control and feel at speed — favoured by players with fast, compact swings.',
  },
]

export const SQUASH_STRINGS: { name: string; desc: string }[] = [
  {
    name: 'Standard Nylon/Synthetic Gut',
    desc: 'Durable, reliable and good value — a solid default for most squash players.',
  },
  {
    name: 'Thin-Gauge Multifilament',
    desc: 'Softer feel with more touch and control, popular with intermediate/advanced players.',
  },
  {
    name: 'Tournament-Grade Strings',
    desc: 'Premium construction for players wanting maximum feel and consistency.',
  },
]

export const SQUASH_BRANDS: string[] = [
  'Tecnifibre',
  'Ashaway',
  'Prince',
  'Head',
  'Wilson',
]

// ── Flattened, per-sport lookups for the booking-form dropdowns ────────────
// { group: <brand or category label>, items: [<string names>] }
export function getStringGroupsForSport(
  sport: string,
): { group: string; items: string[] }[] {
  switch (sport) {
    case 'badminton':
      return BADMINTON_STRING_BRANDS.map((b) => ({
        group: b.brand,
        items: b.items ?? [],
      }))
    case 'tennis':
      return TENNIS_STRING_BRANDS.map((b) => ({
        group: b.brand,
        items: b.groups ? b.groups.flatMap((g) => g.items) : (b.items ?? []),
      }))
    case 'squash':
      return [
        { group: 'String Type', items: SQUASH_STRINGS.map((s) => s.name) },
        { group: 'Preferred Brand', items: SQUASH_BRANDS },
      ]
    default:
      return []
  }
}

export function getTensionsForSport(sport: string): TensionLevel[] {
  switch (sport) {
    case 'badminton':
      return BADMINTON_TENSIONS
    case 'tennis':
      return TENNIS_TENSIONS
    case 'squash':
      return SQUASH_TENSIONS
    default:
      return []
  }
}
