import { NextRequest, NextResponse } from 'next/server';
import { medusaAdmin } from '@/lib/medusa-server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const CATEGORY_TREE = [{
  name: 'Badminton',
  handle: 'badminton',
  children: [{
    name: 'Badminton Rackets',
    handle: 'badminton-rackets'
  }, {
    name: 'Badminton Shoes',
    handle: 'badminton-shoes'
  }, {
    name: 'Badminton Racket Bags',
    handle: 'badminton-racket-bags'
  }, {
    name: 'Shuttlecocks',
    handle: 'badminton-shuttlecocks'
  }, {
    name: 'Racket Grips',
    handle: 'badminton-racket-grips'
  }]
}, {
  name: 'Tennis',
  handle: 'tennis',
  children: [{
    name: 'Tennis Rackets',
    handle: 'tennis-rackets'
  }, {
    name: 'Tennis Shoes',
    handle: 'tennis-shoes'
  }, {
    name: 'Tennis Balls',
    handle: 'tennis-balls'
  }, {
    name: 'Tennis Bags',
    handle: 'tennis-bags'
  }, {
    name: 'Tennis Grips',
    handle: 'tennis-racket-grips'
  }]
}, {
  name: 'Padel',
  handle: 'padel',
  children: [{
    name: 'Padel Rackets',
    handle: 'padel-rackets'
  }, {
    name: 'Padel Balls',
    handle: 'padel-balls'
  }, {
    name: 'Padel Shoes',
    handle: 'padel-shoes'
  }, {
    name: 'Padel Bags',
    handle: 'padel-bag'
  }]
}, {
  name: 'Clothing',
  handle: 'apparel',
  children: [{
    name: "Men's Clothing",
    handle: 'men-clothing'
  }, {
    name: "Women's Clothing",
    handle: 'women-clothing'
  }, {
    name: 'Socks',
    handle: 'socks'
  }]
}];
const CAT_ID_TO_HANDLE: Record<string, string> = {
  'cat-001-01': 'badminton-rackets',
  'cat-001-02': 'badminton-shoes',
  'cat-001-03': 'badminton-racket-bags',
  'cat-001-04': 'badminton-shuttlecocks',
  'cat-001-05': 'badminton-racket-grips',
  'cat-002-01': 'tennis-rackets',
  'cat-002-02': 'tennis-shoes',
  'cat-002-03': 'tennis-balls',
  'cat-002-04': 'tennis-bags',
  'cat-002-05': 'tennis-racket-grips',
  'cat-003-01': 'padel-rackets',
  'cat-003-02': 'padel-balls',
  'cat-003-03': 'padel-shoes',
  'cat-003-04': 'padel-bag',
  'cat-004-01': 'men-clothing',
  'cat-004-02': 'women-clothing',
  'cat-004-03': 'socks'
};
const PRODUCTS = [{
  id: 'prod-001',
  name: 'Yonex ArcSaber 11 Pro Badminton Racket',
  slug: 'yonex-arcsaber-11-pro-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/products/yonex-arcsaber-11-pro-badminton-racketbadminton-racquets-sets-209970.jpg?v=1738712581',
    alt: 'Yonex ArcSaber 11 Pro'
  }],
  sale_price: 189.99,
  regular_price: 229.99,
  variants: [{
    name: '3U (85-89g)',
    price: 189.99
  }, {
    name: '4U (80-84g)',
    price: 189.99
  }],
  description: 'The Arcsaber 11 Pro delivers more power than its predecessor and still maintains manoeuvrability.',
  specifications: {
    balance: 'Even Balance',
    flex: 'Stiff',
    grip_size: 'G4',
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-002',
  name: 'Yonex Astrox 88D Pro Generation 3 Badminton Racket',
  slug: 'yonex-astrox-88d-pro-generation-3-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/products/yonex-astrox-88d-pro-generation-3-badminton-racket-silver-black-frame-only.jpg',
    alt: 'Yonex Astrox 88D Pro Gen 3'
  }],
  sale_price: 189.99,
  regular_price: 220.0,
  variants: [{
    name: 'Silver/Black',
    price: 189.99
  }],
  description: 'Yonex Astrox 88D Pro Generation 3 — head-heavy balance for powerful smashes.',
  specifications: {
    balance: 'Head-Heavy',
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-003',
  name: 'Yonex ArcSaber 7 Play Badminton Racket',
  slug: 'yonex-arcsaber-7-play-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 44.99,
  regular_price: 50.0,
  variants: [{
    name: 'Standard',
    price: 44.99
  }],
  description: 'Yonex ArcSaber 7 Play — great entry-level racket for developing players.',
  specifications: {
    player_level: 'Developing Player'
  }
}, {
  id: 'prod-004',
  name: 'Yonex Astrox 77 Pro Badminton Racket',
  slug: 'yonex-astrox-77-pro-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 184.99,
  regular_price: 220.0,
  variants: [{
    name: 'Standard',
    price: 184.99
  }],
  description: 'Yonex Astrox 77 Pro — head-heavy balance for attacking play.',
  specifications: {
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-005',
  name: 'Yonex ArcSaber 7 Pro Badminton Racket',
  slug: 'yonex-arcsaber-7-pro-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 157.99,
  regular_price: 190.0,
  variants: [{
    name: 'Standard',
    price: 157.99
  }],
  description: 'Yonex ArcSaber 7 Pro — precision control for advanced players.',
  specifications: {
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-006',
  name: 'Yonex Nanoflare 1000 Z Badminton Racket',
  slug: 'yonex-nanoflare-1000-z-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 200.0,
  regular_price: 239.99,
  variants: [{
    name: 'Standard',
    price: 200.0
  }],
  description: 'Yonex Nanoflare 1000 Z — ultra fast head-light racket.',
  specifications: {
    balance: 'Head-Light',
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-007',
  name: 'Yonex Nanoflare 700 Pro Badminton Racket',
  slug: 'yonex-nanoflare-700-pro-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 169.99,
  regular_price: 220.0,
  variants: [{
    name: 'Standard',
    price: 169.99
  }],
  description: 'Yonex Nanoflare 700 Pro — speed and control.',
  specifications: {
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-008',
  name: 'Yonex Astrox 88S PRO 3RD Gen Badminton Racket',
  slug: 'yonex-astrox-88s-pro-3rd-gen-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 191.99,
  regular_price: 229.99,
  variants: [{
    name: 'Standard',
    price: 191.99
  }],
  description: 'Yonex Astrox 88S Pro 3rd Gen — for net play and deceptive shots.',
  specifications: {
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-009',
  name: 'Yonex Nanoflare 800 PRO Badminton Racket - Deep Green',
  slug: 'yonex-nanoflare-800-pro-badminton-racket-deep-green',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 184.99,
  regular_price: 249.99,
  variants: [{
    name: 'Deep Green',
    price: 184.99
  }],
  description: 'Yonex Nanoflare 800 Pro — explosive speed and accuracy.',
  specifications: {
    balance: 'Head-Light',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-010',
  name: 'Yonex Astrox 100 ZZ VA Badminton Racket',
  slug: 'yonex-astrox-100-zz-va-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/files/yonex-astrox-100-zz-va-badminton-racket-viktor-axelsen-limited-version.webp',
    alt: 'Yonex Astrox 100 ZZ VA'
  }],
  sale_price: 279.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 279.99
  }],
  description: 'Viktor Axelsen Limited Edition — the racket of a World Champion.',
  specifications: {
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-011',
  name: 'Yonex Astrox 88D Tour 3RD Generation Badminton Racket',
  slug: 'yonex-astrox-88d-tour-3rd-generation-badminton-racket',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 134.99,
  regular_price: 175.0,
  variants: [{
    name: 'Standard',
    price: 134.99
  }],
  description: 'Yonex Astrox 88D Tour 3rd Gen — intermediate club level.',
  specifications: {
    player_level: 'Intermediate Club Player',
    strung: false
  }
}, {
  id: 'prod-012',
  name: 'Yonex Astrox 99 Pro Badminton Racket Black/Green',
  slug: 'yonex-astrox-99-pro-badminton-racket-black-green',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/products/yonex-astrox-99-pro-badminton-racket-black-green-frame-only.jpg',
    alt: 'Yonex Astrox 99 Pro'
  }],
  sale_price: 199.99,
  regular_price: 249.99,
  variants: [{
    name: 'Black/Green',
    price: 199.99
  }],
  description: 'Yonex Astrox 99 Pro — steep angle smash power.',
  specifications: {
    player_level: 'Advanced Player',
    balance: 'Head-Heavy',
    strung: false
  }
}, {
  id: 'prod-013',
  name: 'Yonex Astrox 77 Play Badminton Racket (Light Beige)',
  slug: 'yonex-astrox-77-play-badminton-racket-2026',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 74.99,
  regular_price: null,
  variants: [{
    name: 'Light Beige',
    price: 74.99
  }],
  description: 'Yonex Astrox 77 Play 2026 — developing player racket.',
  specifications: {
    player_level: 'Developing Player'
  }
}, {
  id: 'prod-014',
  name: 'Yonex Nanoflare 700 Play Badminton Racket 2026',
  slug: 'yonex-nanoflare-700-play-badminton-racket-2026',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 59.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 59.99
  }],
  description: 'Yonex Nanoflare 700 Play 2026 — fast and lightweight for beginners.',
  specifications: {
    player_level: 'Developing Player'
  }
}, {
  id: 'prod-015',
  name: 'Yonex Arcsaber 7 Play Badminton Racket 2026 Light Beige',
  slug: 'yonex-arcsaber-7-play-badminton-racket-2026',
  brand: 'Yonex',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 49.99,
  regular_price: null,
  variants: [{
    name: 'Light Beige',
    price: 49.99
  }],
  description: 'Yonex Arcsaber 7 Play 2026 — control for beginners.',
  specifications: {
    player_level: 'Developing Player'
  }
}, {
  id: 'prod-016',
  name: 'Li-Ning Windstorm 74 Badminton Racket',
  slug: 'li-ning-windstorm-74-badminton-racket',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/products/lining-windstorm-74-yellow-badminton-racket.jpg',
    alt: 'Li-Ning Windstorm 74 Yellow'
  }, {
    url: 'https://smashuk.co/cdn/shop/products/lining-windstorm-74-white-badminton-racket.jpg',
    alt: 'Li-Ning Windstorm 74 White'
  }],
  sale_price: 109.99,
  regular_price: 134.99,
  variants: [{
    name: 'Yellow',
    price: 109.99
  }, {
    name: 'White',
    price: 109.99
  }],
  description: 'Li-Ning Windstorm 74 — aerodynamic frame for intermediate players.',
  specifications: {
    player_level: 'Intermediate Club Player',
    strung: false
  }
}, {
  id: 'prod-017',
  name: 'Li-Ning BladeX 73 Badminton Racket',
  slug: 'li-ning-blade-x-73-badminton-racket',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 99.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 99.99
  }],
  description: 'Li-Ning BladeX 73 — powerful intermediate racket.',
  specifications: {
    player_level: 'Intermediate Club Player',
    strung: false
  }
}, {
  id: 'prod-018',
  name: 'Li-Ning BladeX 900 Max Sun Badminton Racket - Gold',
  slug: 'li-ning-bladex-900-max-sun-badminton-racket-gold',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 169.99,
  regular_price: 209.99,
  variants: [{
    name: 'Gold',
    price: 169.99
  }],
  description: 'Li-Ning BladeX 900 Max Sun Gold — elite performance.',
  specifications: {
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-019',
  name: 'Li-Ning BladeX 900 Max Moon Badminton Racket - Blue',
  slug: 'li-ning-bladex-900-max-moon-badminton-racket-blue',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 169.99,
  regular_price: 209.99,
  variants: [{
    name: 'Blue',
    price: 169.99
  }],
  description: 'Li-Ning BladeX 900 Max Moon Blue — elite performance.',
  specifications: {
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-020',
  name: 'Li-Ning AX FORCE 80 Badminton Racket',
  slug: 'li-ning-ax-force-80-badminton-racket',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 174.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 174.99
  }],
  description: 'Li-Ning AX FORCE 80 — aggressive power frame.',
  specifications: {
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-021',
  name: 'Li-Ning Axforce 90 Dragon Badminton Racket - Blue',
  slug: 'li-ning-axforce-90-dragon-badminton-racket-blue',
  brand: 'Li-Ning',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 187.99,
  regular_price: 209.99,
  variants: [{
    name: 'Blue',
    price: 187.99
  }],
  description: 'Li-Ning Axforce 90 Dragon — dragon-inspired elite racket.',
  specifications: {
    player_level: 'Advanced Player',
    strung: false
  }
}, {
  id: 'prod-022',
  name: 'Victor Auraspeed Fantome Badminton Racket',
  slug: 'victor-auraspeed-fantome-badminton-racket',
  brand: 'Victor',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 149.99,
  regular_price: 199.99,
  variants: [{
    name: 'Standard',
    price: 149.99
  }],
  description: 'Victor Auraspeed Fantome — lightning-fast head-light racket.',
  specifications: {
    player_level: 'Advanced Player',
    balance: 'Head-Light'
  }
}, {
  id: 'prod-023',
  name: 'Victor Thruster Ryuga Metallic C Badminton Racket',
  slug: 'victor-thruster-ryuga-metallic-c-badminton-racket',
  brand: 'Victor',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 139.99,
  regular_price: 199.99,
  variants: [{
    name: 'Metallic C',
    price: 139.99
  }],
  description: 'Victor Thruster Ryuga Metallic C — dynamic power.',
  specifications: {
    player_level: 'Intermediate Club Player',
    strung: false
  }
}, {
  id: 'prod-024',
  name: 'VICTOR Auraspeed FANTOME AF 4UG5 - Limited',
  slug: 'victor-auraspeed-fantome-af-4ug5-limited',
  brand: 'Victor',
  category_ids: ['cat-001-01'],
  images: [],
  sale_price: 169.99,
  regular_price: 209.99,
  variants: [{
    name: '4UG5',
    price: 169.99
  }],
  description: 'Victor Auraspeed Fantome Limited 4UG5 — exclusive speed racket.',
  specifications: {
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-025',
  name: 'Babolat Boost Aero Womens Tennis Racket - Black/Pink',
  slug: 'babolat-boost-aero-womens-tennis-racket-black-pink',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 79.99,
  regular_price: 99.99,
  variants: [{
    name: 'G0',
    price: 79.99
  }, {
    name: 'G1',
    price: 79.99
  }, {
    name: 'G2',
    price: 79.99
  }, {
    name: 'G3',
    price: 79.99
  }],
  description: 'Babolat Boost Aero Womens — lightweight for beginner women.',
  specifications: {
    player_level: 'Beginner',
    strung: true
  }
}, {
  id: 'prod-026',
  name: 'Babolat Pure Drive Tennis Racket 2025 - Strung',
  slug: 'babolat-pure-drive-tennis-racket-2025',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 184.99,
  regular_price: 209.99,
  variants: [{
    name: 'G1',
    price: 184.99
  }, {
    name: 'G2',
    price: 184.99
  }, {
    name: 'G3',
    price: 184.99
  }, {
    name: 'G4',
    price: 184.99
  }],
  description: 'Babolat Pure Drive 2025 — most popular tennis racket.',
  specifications: {
    player_level: 'Intermediate/Advanced',
    strung: true
  }
}, {
  id: 'prod-027',
  name: 'Babolat Pure Drive Team Gen11 Tennis Racket',
  slug: 'babolat-pure-drive-team-gen11-tennis-racket',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 179.99,
  regular_price: 199.99,
  variants: [{
    name: 'G2',
    price: 179.99
  }, {
    name: 'G3',
    price: 179.99
  }],
  description: 'Babolat Pure Drive Team Gen11 — lighter version of Pure Drive.',
  specifications: {
    strung: true
  }
}, {
  id: 'prod-028',
  name: 'Babolat EVO Strike Tennis Racket 2024 - Strung',
  slug: 'babolat-evo-strike-tennis-racket-2024',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 129.99,
  regular_price: null,
  variants: [{
    name: 'G2',
    price: 129.99
  }, {
    name: 'G3',
    price: 129.99
  }],
  description: 'Babolat EVO Strike 2024 — for aggressive baseline players.',
  specifications: {
    strung: true
  }
}, {
  id: 'prod-029',
  name: 'Babolat Evoke Tour Tennis Racket 2024',
  slug: 'babolat-evoke-tour-tennis-racket-2024',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 44.99,
  regular_price: 64.99,
  variants: [{
    name: 'Standard',
    price: 44.99
  }],
  description: 'Babolat Evoke Tour 2024 — great value beginner racket.',
  specifications: {
    player_level: 'Beginner',
    strung: true
  }
}, {
  id: 'prod-030',
  name: 'Babolat Evoke Team Tennis Racket 2024',
  slug: 'babolat-evoke-team-tennis-racket-2024',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 44.99,
  regular_price: 64.99,
  variants: [{
    name: 'Standard',
    price: 44.99
  }],
  description: 'Babolat Evoke Team 2024 — lightweight beginner racket.',
  specifications: {
    player_level: 'Beginner',
    strung: true
  }
}, {
  id: 'prod-031',
  name: 'Head IG Challenge Team Tennis Racket - Mint',
  slug: 'head-ig-challenge-team-tennis-racket-mint',
  brand: 'HEAD',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 99.99,
  regular_price: 119.99,
  variants: [{
    name: 'G2 Mint',
    price: 99.99
  }, {
    name: 'G3 Mint',
    price: 99.99
  }],
  description: 'Head IG Challenge Team Mint — comfortable intermediate racket.',
  specifications: {
    player_level: 'Intermediate',
    strung: true
  }
}, {
  id: 'prod-032',
  name: 'Head Radical MP Tennis Racket 2025',
  slug: 'head-radical-mp-tennis-racket-2025',
  brand: 'HEAD',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 174.99,
  regular_price: null,
  variants: [{
    name: 'G2',
    price: 174.99
  }, {
    name: 'G3',
    price: 174.99
  }],
  description: 'Head Radical MP 2025 — versatile all-court racket.',
  specifications: {
    player_level: 'Advanced',
    strung: false
  }
}, {
  id: 'prod-033',
  name: 'Babolat Pure Strike 100 Tennis Racket 2024 - Strung',
  slug: 'babolat-pure-strike-100-tennis-racket-2024',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 184.99,
  regular_price: 189.99,
  variants: [{
    name: 'G2',
    price: 184.99
  }, {
    name: 'G3',
    price: 184.99
  }],
  description: 'Babolat Pure Strike 100 2024 — precision and power.',
  specifications: {
    strung: true
  }
}, {
  id: 'prod-034',
  name: 'Yonex VCORE 100 Tennis Racket 2026 - Ruby Red',
  slug: 'yonex-vcore-100-tennis-racket-2026-ruby-red',
  brand: 'Yonex',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 269.99,
  regular_price: null,
  variants: [{
    name: 'Ruby Red',
    price: 269.99
  }],
  description: 'Yonex VCORE 100 2026 — spin-focused advanced racket.',
  specifications: {
    strung: false,
    player_level: 'Advanced'
  }
}, {
  id: 'prod-035',
  name: 'Yonex VCORE 98 Tennis Racket - Ruby Red',
  slug: 'yonex-vcore-98-tennis-racket-ruby-red',
  brand: 'Yonex',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 234.99,
  regular_price: null,
  variants: [{
    name: 'Ruby Red',
    price: 234.99
  }],
  description: 'Yonex VCORE 98 — high spin generation.',
  specifications: {
    strung: false,
    player_level: 'Advanced'
  }
}, {
  id: 'prod-036',
  name: 'Yonex VCORE 98 Tennis Racket - Sand Beige',
  slug: 'yonex-vcore-98-tennis-racket-sand-beige',
  brand: 'Yonex',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 189.99,
  regular_price: 199.99,
  variants: [{
    name: 'Sand Beige',
    price: 189.99
  }],
  description: 'Yonex VCORE 98 Sand Beige — elegant elite performance.',
  specifications: {
    strung: false,
    player_level: 'Advanced'
  }
}, {
  id: 'prod-037',
  name: 'Dunlop Tristorm Elite 270 Tennis Racket - Silver',
  slug: 'dunlop-tristorm-elite-270-tennis-racket-silver',
  brand: 'Dunlop',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 54.99,
  regular_price: 84.99,
  variants: [{
    name: 'Silver',
    price: 54.99
  }],
  description: 'Dunlop Tristorm Elite 270 — lightweight beginner racket.',
  specifications: {
    player_level: 'Beginner'
  }
}, {
  id: 'prod-038',
  name: 'Babolat Pure Aero Team Gen 9 Tennis Racket 2026',
  slug: 'babolat-pure-aero-team-gen-9-tennis-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-002-01'],
  images: [],
  sale_price: 239.99,
  regular_price: null,
  variants: [{
    name: 'G2',
    price: 239.99
  }, {
    name: 'G3',
    price: 239.99
  }],
  description: 'Babolat Pure Aero Team Gen 9 2026 — aerodynamic and powerful.',
  specifications: {
    player_level: 'Advanced'
  }
}, {
  id: 'prod-039',
  name: 'Adidas RX Series Light 2026 Padel Racket',
  slug: 'adidas-rx-series-light-2026-padel-racket',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [{
    url: 'https://smashuk.co/cdn/shop/files/adidas-rx-series-light-2026-padel-racketpadel-racquets-2815263.webp?v=1765992195',
    alt: 'Adidas RX Series Light 2026'
  }],
  sale_price: 94.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 94.99
  }],
  description: 'Adidas RX Series Light 2026 — fiberglass padel racket for beginners.',
  specifications: {
    material: 'Fiberglass',
    player_level: 'Intermediate Club Player',
    balance: 'Even Balance'
  }
}, {
  id: 'prod-040',
  name: 'Adidas Metalbone Team Light Padel Racket 2026',
  slug: 'adidas-metalbone-team-light-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 154.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 154.99
  }],
  description: 'Adidas Metalbone Team Light 2026 — carbon padel for intermediates.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-041',
  name: 'Adidas Metalbone Team Padel Racket 2026',
  slug: 'adidas-metalbone-team-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 169.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 169.99
  }],
  description: 'Adidas Metalbone Team 2026 — balanced carbon padel racket.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-042',
  name: 'Adidas Metalbone Carbon Padel Racket 2026',
  slug: 'adidas-metalbone-carbon-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 199.99,
  regular_price: 229.99,
  variants: [{
    name: 'Standard',
    price: 199.99
  }],
  description: 'Adidas Metalbone Carbon 2026 — high performance carbon padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-043',
  name: 'Adidas Metalbone Padel Racket 2026',
  slug: 'adidas-metalbone-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 300.0,
  regular_price: 349.99,
  variants: [{
    name: 'Standard',
    price: 300.0
  }],
  description: 'Adidas Metalbone 2026 — flagship head-heavy padel racket.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-044',
  name: 'Adidas Metalbone Carbon Ctrl Padel Racket 2026',
  slug: 'adidas-metalbone-carbon-ctrl-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 199.99,
  regular_price: 229.99,
  variants: [{
    name: 'Standard',
    price: 199.99
  }],
  description: 'Adidas Metalbone Carbon Ctrl 2026 — control-focused advanced padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-045',
  name: 'Adidas Arrow Hit Padel Racket 2026',
  slug: 'adidas-arrow-hit-padel-racket-2026',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 310.0,
  regular_price: 350.0,
  variants: [{
    name: 'Standard',
    price: 310.0
  }],
  description: 'Adidas Arrow Hit 2026 — precision attack padel racket.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-046',
  name: 'Adidas Cross It CTRL 3.4 Padel Racket 2025',
  slug: 'adidas-cross-it-ctrl-3-4-padel-racket-2025',
  brand: 'Adidas',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 219.99,
  regular_price: 349.99,
  variants: [{
    name: 'Standard',
    price: 219.99
  }],
  description: 'Adidas Cross It CTRL 3.4 2025 — control padel at a great price.',
  specifications: {
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-047',
  name: 'Babolat Air Veron 2.6 Padel Racket',
  slug: 'babolat-air-veron-2-6-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 189.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 189.99
  }],
  description: 'Babolat Air Veron 2.6 — lightweight carbon padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-048',
  name: 'Babolat Counter Origin Padel Racket',
  slug: 'babolat-counter-origin-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 79.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 79.99
  }],
  description: 'Babolat Counter Origin — entry-level fiberglass padel.',
  specifications: {
    material: 'Fiberglass',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-049',
  name: 'Babolat Air Origin Padel Racket',
  slug: 'babolat-air-origin-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 79.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 79.99
  }],
  description: 'Babolat Air Origin — affordable entry padel racket.',
  specifications: {
    material: 'Fiberglass',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-050',
  name: 'Babolat Air Vertuo 2.6 Padel Racket',
  slug: 'babolat-air-vertuo-2-6-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 159.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 159.99
  }],
  description: 'Babolat Air Vertuo 2.6 — carbon intermediate padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-051',
  name: 'Babolat Dyna Energy Padel Racket',
  slug: 'babolat-dyna-energy-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 159.99,
  regular_price: 179.99,
  variants: [{
    name: 'Standard',
    price: 159.99
  }],
  description: 'Babolat Dyna Energy — dynamic padel for club players.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-052',
  name: 'Babolat Technical Veron 3.0 Padel Racket 2026',
  slug: 'babolat-technical-veron-3-0-padel-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 199.99,
  regular_price: 229.99,
  variants: [{
    name: 'Standard',
    price: 199.99
  }],
  description: 'Babolat Technical Veron 3.0 2026 — head-heavy advanced padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-053',
  name: 'Babolat Stima Energy Padel Racket',
  slug: 'babolat-stima-energy-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 159.99,
  regular_price: 179.99,
  variants: [{
    name: 'Standard',
    price: 159.99
  }],
  description: 'Babolat Stima Energy — energetic padel for club players.',
  specifications: {
    material: 'Carbon',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-054',
  name: 'Babolat Stima Vita Padel Racket',
  slug: 'babolat-stima-vita-padel-racket',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 69.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 69.99
  }],
  description: 'Babolat Stima Vita — affordable fiberglass padel.',
  specifications: {
    material: 'Fiberglass',
    player_level: 'Intermediate Club Player'
  }
}, {
  id: 'prod-055',
  name: 'Babolat Veron Juan Lebron 3.0 Padel Racket 2026',
  slug: 'babolat-veron-juan-lebron-3-0-padel-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 209.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 209.99
  }],
  description: 'Babolat Veron Juan Lebron 3.0 — racket of world number one.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-056',
  name: 'Babolat Technical Viper Soft 3.0 Padel Racket 2026',
  slug: 'babolat-technical-viper-soft-3-0-padel-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 249.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 249.99
  }],
  description: 'Babolat Technical Viper Soft 3.0 — soft core for better feel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-057',
  name: 'Babolat Technical Viper 3.0 Padel Racket 2026',
  slug: 'babolat-technical-viper-3-0-padel-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 299.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 299.99
  }],
  description: 'Babolat Technical Viper 3.0 — head-heavy power padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-058',
  name: 'Babolat Counter Viper 2.6 Padel Racket 2026',
  slug: 'babolat-counter-viper-2-6-padel-racket-2026',
  brand: 'Babolat',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 279.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 279.99
  }],
  description: 'Babolat Counter Viper 2.6 — control-focused advanced padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-059',
  name: 'Bullpadel Vertex 05 Padel Racket 2026',
  slug: 'bullpadel-vertex-05-padel-racket-2026',
  brand: 'Bullpadel',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 294.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 294.99
  }],
  description: 'Bullpadel Vertex 05 2026 — professional padel racket.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player',
    balance: 'Head-Heavy'
  }
}, {
  id: 'prod-060',
  name: 'Bullpadel Xplo Padel Racket 2026',
  slug: 'bullpadel-xplo-padel-racket-2026',
  brand: 'Bullpadel',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 259.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 259.99
  }],
  description: 'Bullpadel Xplo 2026 — explosive power padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-061',
  name: 'Bullpadel Hack 04 Padel Racket 2026',
  slug: 'bullpadel-hack-04-padel-racket-2026',
  brand: 'Bullpadel',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 284.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 284.99
  }],
  description: 'Bullpadel Hack 04 2026 — aggressive attack padel.',
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}, {
  id: 'prod-062',
  name: 'Bullpadel Vertex 05 W Padel Racket 2026',
  slug: 'bullpadel-vertex-05-w-padel-racket-2026',
  brand: 'Bullpadel',
  category_ids: ['cat-003-01'],
  images: [],
  sale_price: 224.99,
  regular_price: null,
  variants: [{
    name: 'Standard',
    price: 224.99
  }],
  description: "Bullpadel Vertex 05 W 2026 — women's professional padel.",
  specifications: {
    material: 'Carbon',
    player_level: 'Advanced Player'
  }
}];
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const log: string[] = [];
  const categoryMap: Record<string, string> = {};
  try {
    log.push('Creating categories...');
    for (const parent of CATEGORY_TREE) {
      try {
        const {
          product_category: p
        } = await medusaAdmin.admin.productCategory.create({
          name: parent.name,
          handle: parent.handle,
          is_active: true,
          is_internal: false
        });
        categoryMap[parent.handle] = p.id;
        log.push(`  ✓ ${p.name}`);
        for (const child of parent.children) {
          try {
            const {
              product_category: c
            } = await medusaAdmin.admin.productCategory.create({
              name: child.name,
              handle: child.handle,
              is_active: true,
              is_internal: false,
              parent_category_id: p.id
            });
            categoryMap[child.handle] = c.id;
            log.push(`    ✓ ${c.name}`);
          } catch {
            log.push(`    ~ ${child.name} (already exists)`);
          }
        }
      } catch {
        log.push(`  ~ ${parent.name} (already exists)`);
      }
    }
    const allCats = await medusaAdmin.admin.productCategory.list({
      limit: 100
    });
    for (const cat of allCats.product_categories ?? []) {
      if (!categoryMap[cat.handle]) categoryMap[cat.handle] = cat.id;
    }
    log.push(`Category map ready: ${Object.keys(categoryMap).length} categories`);
    log.push('Creating products...');
    let created = 0,
      updated = 0,
      failed = 0;
    for (const p of PRODUCTS) {
      try {
        const categoryIds = p.category_ids.map(cid => {
          const h = CAT_ID_TO_HANDLE[cid];
          return h ? categoryMap[h] : null;
        }).filter(Boolean) as string[];
        const payload: any = {
          title: p.name,
          handle: p.slug,
          description: p.description,
          status: 'published',
          thumbnail: p.images[0]?.url ?? undefined,
          images: p.images.length > 0 ? p.images : undefined,
          categories: categoryIds.map(id => ({
            id
          })),
          metadata: {
            brand: p.brand,
            sale_price: p.sale_price,
            regular_price: p.regular_price,
            string_upgrade_available: p.category_ids.some((cid: string) => ['cat-001-01', 'cat-002-01', 'cat-003-01'].includes(cid)),
            specs: Object.entries(p.specifications ?? {}).map(([key, value]) => ({
              label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)
            }))
          },
          options: [{
            title: 'Variant',
            values: p.variants.map((v: any) => v.name)
          }],
          variants: p.variants.map((v: any) => ({
            title: v.name,
            options: {
              Variant: v.name
            },
            prices: [{
              amount: Math.round(v.price * 100) / 100,
              currency_code: 'gbp'
            }]
          }))
        };
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
        const existing = await medusaAdmin.admin.product.list({
          handle: p.slug,
          limit: 1
        });
        if (existing.products?.length > 0) {
          const existingId = existing.products[0].id;
          await medusaAdmin.admin.product.update(existingId, {
            description: payload.description,
            thumbnail: payload.thumbnail,
            metadata: payload.metadata
          });
          updated++;
          log.push(`  ↻ [updated] ${p.name}`);
        } else {
          await medusaAdmin.admin.product.create(payload);
          created++;
          log.push(`  ✓ [${created}] ${p.name}`);
        }
      } catch (err: any) {
        failed++;
        log.push(`  ✗ ${p.name}: ${err?.message}`);
      }
    }
    log.push(`\nDone! Products created: ${created}, updated: ${updated}, failed: ${failed}`);
    return NextResponse.json({
      success: true,
      log,
      created,
      updated,
      failed
    });
  } catch (err: any) {
    log.push(`FATAL: ${err.message}`);
    return NextResponse.json({
      success: false,
      log,
      error: err.message
    }, {
      status: 500
    });
  }
}
