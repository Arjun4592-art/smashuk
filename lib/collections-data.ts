// Dedicated /collections/[handle] pages — one per legacy Shopify collection URL.
// Each entry maps a handle to the /shop filter combination that reproduces
// the same product set, plus unique SEO metadata and on-page copy.
//
// filters map 1:1 onto the query params ShopClient already understands
// (see lib/mega-menu-data.ts for the equivalent nav-level mapping).

export interface CollectionFilters {
  sport?: string
  category?: string
  brand?: string
  gender?: string
  level?: string
  style?: string
  badge?: string
  q?: string
}

export interface CollectionFaq {
  q: string
  a: string
}

export interface CollectionBodySection {
  heading: string
  content: string
}

export interface CollectionConfig {
  handle: string
  breadcrumb: string
  h1: string
  metaTitle: string
  metaDescription: string
  metaKeywords?: string
  intro: string
  filters: CollectionFilters
  body?: CollectionBodySection[]
  faqs?: CollectionFaq[]
  /** true for the brand-directory landing page ("vendors") which has no product filter of its own */
  isVendorIndex?: boolean
}

const BRAND_LABELS: Record<string, string> = {
  yonex: 'Yonex',
  victor: 'Victor',
  'li-ning': 'Li-Ning',
  babolat: 'Babolat',
  head: 'HEAD',
  'k-swiss': 'K-Swiss',
  adidas: 'adidas',
  wilson: 'Wilson',
  bullpadel: 'Bullpadel',
  tecnifibre: 'Tecnifibre',
  dunlop: 'Dunlop',
}

function brandBlurb(handle: string): string {
  const blurbs: Record<string, string> = {
    yonex:
      "Yonex is the world's leading racket sports brand, trusted by top professionals for its innovative frame technology and consistent build quality.",
    victor:
      'Victor is a Taiwanese brand known for striking a reliable balance between power and control, popular with club and county-level players.',
    'li-ning':
      'Li-Ning is a Chinese brand recognised for durable, stylish rackets that punch well above their price point.',
    babolat:
      'Babolat is a French heritage brand loved for stylish, performance-focused rackets and a strong following among junior and club players.',
    head: 'HEAD is an Austrian brand with decades of racket-engineering pedigree across tennis and padel.',
    'k-swiss':
      'K-Swiss brings a classic tennis heritage to court footwear, built for comfort over long matches.',
    adidas:
      'adidas combines court-tested performance with everyday comfort across its footwear and racket ranges.',
    wilson:
      'Wilson is one of the most recognised names in racket sports, equipping players from grassroots to the pro tour.',
    bullpadel:
      'Bullpadel is a padel specialist brand, designing rackets purpose-built for the sport rather than adapted from tennis.',
    tecnifibre:
      'Tecnifibre is a French performance brand known for its string technology as much as its rackets.',
    dunlop:
      'Dunlop is a long-standing name across tennis, padel and squash, known for dependable, control-oriented equipment.',
  }
  return blurbs[handle] ?? ''
}

const SHARED_FAQS: Record<string, CollectionFaq[]> = {
  'badminton-rackets': [
    {
      q: 'How do I choose the right badminton racket?',
      a: 'Match the racket to your skill level and play style: beginners generally suit lighter, more head-light or even-balanced frames, while advanced players often prefer head-heavy, stiffer rackets for more attacking power.',
    },
    {
      q: 'What does "frame only" mean?',
      a: "A frame-only racket ships unstrung so you can choose your own string and tension. We're professional stringers and can string any frame to your spec before dispatch.",
    },
    {
      q: 'Do Yonex and Victor rackets come with a cover?',
      a: 'Most Yonex and Victor rackets are supplied without a cover or bag — check the individual product page for what is included.',
    },
    {
      q: 'Can I use a tennis racket for badminton instead?',
      a: "No — tennis rackets are heavier and larger, so they're not built for badminton's fast, light swing. You'll want a dedicated badminton frame for the sport.",
    },
    {
      q: 'How often should I replace my badminton strings?',
      a: 'It depends how often you play, but a good rule of thumb is to restring as many times a year as you play per week — or as soon as a string breaks or feels dead.',
    },
    {
      q: 'Is a heavier racket better for a beginner?',
      a: 'No — lighter, more evenly balanced rackets are usually easier to control when you\u2019re starting out, with power coming more from technique as you progress.',
    },
  ],
  'tennis-rackets': [
    {
      q: 'What racket weight is right for a beginner?',
      a: 'Beginners typically get on best with a lighter frame (around 260–285g strung) for easier swing speed and manoeuvrability, moving to heavier, more stable frames as technique develops.',
    },
    {
      q: 'Do you offer junior tennis rackets?',
      a: 'Yes — see our dedicated junior tennis racket range, sized for younger players as they progress.',
    },
  ],
  'padel-rackets': [
    {
      q: "What's the difference between round, teardrop and diamond padel rackets?",
      a: 'Round shapes favour control and are the most forgiving for beginners, teardrop is an all-round balance of power and control, and diamond-shaped rackets concentrate weight toward the tip for maximum power at the cost of some control.',
    },
    {
      q: 'How often should I replace my padel racket?',
      a: 'Most club players get 1–2 seasons of regular play from a racket before the core noticeably softens and power drops off; frequent, high-intensity players may want to replace sooner.',
    },
  ],
}

const collections: CollectionConfig[] = [
  // ───────────────────────── BADMINTON ─────────────────────────
  {
    handle: 'badminton-rackets',
    breadcrumb: 'Badminton Rackets',
    h1: 'Badminton Rackets',
    metaTitle:
      'Badminton Rackets UK | Yonex, Victor, Li-Ning & More — Smash Racket Pro',
    metaDescription:
      'Shop badminton rackets from Yonex, Victor, Li-Ning and Babolat. Frame-only and pre-strung options, free string upgrades on performance frames, and expert advice from club-level players.',
    metaKeywords:
      'badminton rackets, badminton racket uk, yonex badminton racket, victor badminton racket',
    intro:
      "Whether you're picking up a racket for the first time or looking for your next tournament frame, our full badminton racket range covers every brand, weight and balance point.",
    filters: { sport: 'badminton', category: 'rackets' },
    body: [
      {
        heading: 'Understanding the basics',
        content:
          "Every racket comes down to three parts working together: the grip, the shaft and the frame. The grip is the handle size and the material wrapped around it — get this right and you'll hold the racket comfortably with full control over direction and speed, without straining your hand. The shaft's flex determines how much of the power comes from the racket versus your own swing, and the frame — usually a carbon composite — sets the racket's weight and balance.",
      },
      {
        heading: 'Choosing the right racket',
        content:
          'The three things that matter most are weight, balance and stiffness. Lighter, head-light rackets are easier to manoeuvre and suit developing players; head-heavy rackets store more power for attacking smashes but demand faster arm speed to control. Shaft stiffness follows a similar pattern — flexible shafts help generate power at slower swing speeds, while stiff shafts reward players who can already generate their own power and want more precision.',
      },
      {
        heading: 'Weight and balance explained',
        content:
          'Badminton rackets typically weigh 70–89g and are graded 3U (heaviest, 85–89g) down to 6U (lightest, 70–74g) — lighter frames are quicker to manoeuvre and suit fast, defensive play, while heavier ones carry more weight through the shot for extra power. String tension matters too: higher tension rewards a fast, precise swing with more control, while lower tension is more forgiving and gives easier power — advanced players tend to string tighter than beginners.',
      },
      {
        heading: 'Frame-only vs strung',
        content:
          'Buying frame-only lets you choose your own string type and tension rather than accepting a generic factory string job. Our team are trained stringers, and we offer a free string upgrade on our performance frames plus 50% off upgrades on most graphite frames. Please note Yonex and Victor frames are typically supplied without a cover or bag.',
      },
      {
        heading: 'Brands we stock',
        content:
          "We carry Yonex — the biggest name in the sport for innovative, high-performance frames — alongside Victor, known for a strong balance of power and control, Li-Ning's durable, striking designs, and Babolat, a popular pick with juniors. We also stock FZ Forza and Ashaway for players after something a little different. Can't decide? Get in touch and our club-level players will help you find the right frame for your game.",
      },
    ],
    faqs: SHARED_FAQS['badminton-rackets'],
  },
  {
    handle: 'yonex-badminton-rackets',
    breadcrumb: 'Yonex Badminton Rackets',
    h1: 'Yonex Badminton Rackets',
    metaTitle:
      'Yonex Badminton Rackets UK — Astrox, Nanoflare, Arcsaber | Smash Racket Pro',
    metaDescription:
      'Shop the full Yonex badminton racket range including Astrox, Nanoflare and Arcsaber. UK stock, competitive pricing and free string upgrades on performance frames.',
    intro:
      brandBlurb('yonex') +
      ' Browse the full Astrox, Nanoflare and Arcsaber line-up below.',
    filters: { sport: 'badminton', category: 'rackets', brand: 'yonex' },
    body: [
      {
        heading: 'Cutting-Edge Technology',
        content:
          "Yonex's Isometric head shape gives you a larger sweet spot and improved accuracy for consistently powerful shots. Nanomesh Neo and Nanocell construction add stability and reduce vibration for a smoother, more precise feel, while the Aero+Box frame blends aerodynamic speed with a solid hitting sensation for fast rallies.",
      },
      {
        heading: 'Versatility and Performance',
        content:
          'Our Yonex range caters to diverse playing styles, from ultra-light frames built for speed to more balanced designs that deliver all-round control. Explore popular series like Astrox, Nanoflare, Voltric and Arcsaber, each engineered with proprietary materials that maximise shuttlecock repulsion and fine-tune shot placement.',
      },
      {
        heading: 'Series Breakdown',
        content:
          "Yonex divides its badminton frames to suit every playing level: PRO and TOUR models for advanced players, the GAME model for intermediate players, and PLAY for beginners. We're an official Yonex UK stockist and carry the full range — please note all latest Yonex rackets do not come with bags or covers.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our curated Yonex Badminton Racket collection and find the perfect match to level up your game. We offer competitive prices, fast shipping and dedicated customer support — and if you need help choosing, check out our detailed racket guide or get in touch for free advice.',
      },
    ],
  },
  {
    handle: 'victor-badminton-rackets',
    breadcrumb: 'Victor Badminton Rackets',
    h1: 'Victor Badminton Rackets',
    metaTitle: 'Victor Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop Victor badminton rackets — a reliable balance of power and control, popular with club and county-level players. UK stock with fast delivery.',
    intro: brandBlurb('victor'),
    filters: { sport: 'badminton', category: 'rackets', brand: 'victor' },
    body: [
      {
        heading: 'Power, Control & Manoeuvrability',
        content:
          'Trusted by professionals around the globe, Victor badminton rackets feature cutting-edge materials and innovative technologies that deliver exceptional stability and precision on every swing — designed to enhance power, control and manoeuvrability for players of all levels.',
      },
      {
        heading: 'A Frame for Every Style',
        content:
          "From lightweight, speed-focused models to powerful, head-heavy designs across the Thruster, Auraspeed, Drive X and Light Fighter series, our Victor range caters to diverse playing styles. Whether you're perfecting your net play or aiming for explosive smashes, each racket is engineered to give you the competitive edge you need. Need more advice? Check out our detailed badminton racket guide, or drop us an email for custom recommendations.",
      },
    ],
  },
  {
    handle: 'li-ning-badminton-rackets',
    breadcrumb: 'Li-Ning Badminton Rackets',
    h1: 'Li-Ning Badminton Rackets',
    metaTitle: 'Li-Ning Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop Li-Ning badminton rackets — durable, stylish frames that punch above their price point. UK stock with fast delivery.',
    intro: brandBlurb('li-ning'),
    filters: { sport: 'badminton', category: 'rackets', brand: 'li-ning' },
    body: [
      {
        heading: 'Unrivalled Power & Precision',
        content:
          "Engineered using advanced materials and cutting-edge technology, Li-Ning badminton rackets offer outstanding manoeuvrability, enhanced stability and optimal sweet spots. Explore the Windstorm, BladeX and AxForce series — whether you're a casual player or aiming for professional tournaments, you'll find the perfect match in our lineup.",
      },
      {
        heading: 'Trusted by Top Athletes',
        content:
          'Revered by top athletes around the world for its exceptional balance, durability and responsiveness, a Li-Ning racket empowers precise shots and explosive smashes. Shop our collection today and experience superior quality that sets you apart on the court.',
      },
    ],
  },
  {
    handle: 'babolat-badminton-rackets',
    breadcrumb: 'Babolat Badminton Rackets',
    h1: 'Babolat Badminton Rackets',
    metaTitle: 'Babolat Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop Babolat badminton rackets — stylish, performance-focused frames popular with junior and club players. UK stock with fast delivery.',
    intro: brandBlurb('babolat'),
    filters: { sport: 'badminton', category: 'rackets', brand: 'babolat' },
    body: [
      {
        heading: 'Superior Craftsmanship',
        content:
          "Whether you're a beginner seeking dependable power or a seasoned competitor aiming for precision smashes, Babolat badminton rackets — including the Prime, I-Pulse, X-Feel and Satelite series — are engineered to deliver outstanding control, stability and responsiveness.",
      },
      {
        heading: 'Lightweight to Head-Heavy Options',
        content:
          'From lightweight, manoeuvrable frames to powerful, head-heavy options, each Babolat badminton racket offers an ideal blend of comfort and performance. Shop our collection today and experience how a Babolat frame can transform your on-court confidence.',
      },
    ],
  },
  {
    handle: 'badminton-shoes',
    breadcrumb: 'Badminton Shoes',
    h1: 'Badminton Shoes',
    metaTitle: "Badminton Shoes UK | Men's & Women's — Smash Racket Pro",
    metaDescription:
      'Shop badminton shoes from Yonex, Victor, Li-Ning and Babolat for men and women. Court-specific grip and cushioning built for fast lateral movement.',
    intro:
      "Badminton demands quick lateral movement and sudden stops, so a dedicated court shoe with the right grip and lateral support matters more than in most other sports. Browse our full men's and women's range below.",
    filters: { sport: 'badminton', category: 'shoes' },
    body: [
      {
        heading: 'Why Court-Specific Shoes Matter',
        content:
          "Running shoes are built for forward motion and can't handle the repeated side-to-side lunging badminton demands — the tread pattern, cushioning and lateral support of a proper badminton shoe significantly reduce the risk of ankle rolls and knee strain.",
      },
      {
        heading: 'How To Choose the Right Shoe',
        content:
          'Think about your play style — aggressive smashers and defensive players need different levels of support — plus your foot type (neutral, flat or high arch) and make sure the fit is snug, since sizing can vary from brand to brand.',
      },
      {
        heading: 'Top Brands',
        content:
          'Yonex leads the market with innovative technology across the range; Li-Ning balances quality and price for beginners and pros alike; Victor is known for sturdy, long-lasting builds; Babolat offers excellent grip and support.',
      },
      {
        heading: 'Care and Maintenance',
        content:
          'Clean with a soft brush and mild soap to keep shoes performing at their best, and store them in a cool, dry place — never in a hot car or under direct sunlight, as heat can damage the material and shorten their lifespan.',
      },
    ],
    faqs: [
      {
        q: 'Are running shoes suitable for badminton?',
        a: 'No, running shoes are not recommended for badminton as they lack the necessary grip and cushioning.',
      },
      {
        q: 'How often should I replace my badminton shoes?',
        a: "This largely depends on how frequently you play, but generally it's good to replace them every year or so.",
      },
      {
        q: 'Can I use badminton shoes for other sports?',
        a: "It's best not to, as other sports have different requirements which badminton shoes may not meet.",
      },
      {
        q: 'What are non-marking shoes in badminton?',
        a: 'Non-marking shoes are those that do not leave any scuffs or marks on the court surface.',
      },
      {
        q: 'Do badminton shoes require breaking in?',
        a: 'Yes, new badminton shoes might feel a bit tight initially but will become comfortable after a few uses.',
      },
    ],
  },
  {
    handle: 'badminton-shoes-for-men',
    breadcrumb: "Men's Badminton Shoes",
    h1: "Men's Badminton Shoes",
    metaTitle: "Men's Badminton Shoes UK | Smash Racket Pro",
    metaDescription:
      "Shop men's badminton shoes from Yonex, Victor, Li-Ning and Babolat. Court-specific grip and cushioning for fast lateral movement.",
    intro:
      'Welcome to our distinguished collection of badminton shoes for men, specifically engineered to help you conquer the court with grace, agility and power. Our selection comprises top-tier shoes from globally acclaimed brands, promising to elevate your game and provide optimal foot health.',
    filters: { sport: 'badminton', category: 'shoes', gender: 'men' },
    body: [
      {
        heading: 'Why Opt for Our Men\u2019s Badminton Shoes?',
        content:
          'Advanced Design — lightweight for quick movements, sturdy for robust play, and stylish for the fashionable sportsman. Top-Notch Quality — each pair is crafted with high-quality materials for demanding games and long-lasting wear. Perfect Fit — a range of sizes available, with competitive prices across the board.',
      },
    ],
  },
  {
    handle: 'women-badminton-shoes',
    breadcrumb: "Women's Badminton Shoes",
    h1: "Women's Badminton Shoes",
    metaTitle: "Women's Badminton Shoes UK | Smash Racket Pro",
    metaDescription:
      "Shop women's badminton shoes from Yonex, Victor, Li-Ning and Babolat. Court-specific grip and cushioning for fast lateral movement.",
    intro:
      'Step up your game with our specially curated lineup of badminton shoes female athletes trust for top performance. Each pair is meticulously crafted with lightweight, breathable materials, providing the perfect balance of support, agility and comfort.',
    filters: { sport: 'badminton', category: 'shoes', gender: 'women' },
    body: [
      {
        heading: 'Built for Every Level',
        content:
          "From cushioned midsoles that reduce fatigue to reinforced outsoles for enhanced durability, our badminton shoes for women ensure you stay at the top of your game — whether you're smashing at the net or defending the backcourt.",
      },
    ],
  },
  {
    handle: 'yonex-badminton-shoes',
    breadcrumb: 'Yonex Badminton Shoes',
    h1: 'Yonex Badminton Shoes',
    metaTitle: 'Yonex Badminton Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop the full range of Yonex badminton court shoes for men and women, UK stock with fast delivery.',
    intro: brandBlurb('yonex'),
    filters: { sport: 'badminton', category: 'shoes', brand: 'yonex' },
    faqs: [
      {
        q: "What's the difference between Yonex's 65Z, Aerus and Cascade Drive lines?",
        a: "The 65Z series is Yonex's flagship performance line used by pros; Aerus is built for lightweight speed; Cascade Drive is the best-selling all-round option balancing comfort and support.",
      },
      {
        q: 'Do Yonex badminton shoes come in wide fit?',
        a: 'Yes — several models, including the Aerus Z and Strider ranges, are available in a Wide fit for players who need extra room across the forefoot.',
      },
      {
        q: 'How often should I replace my Yonex badminton shoes?',
        a: 'Roughly every 40–60 hours of court time, or sooner if the outsole tread has worn smooth.',
      },
    ],
  },
  {
    handle: 'babolat-badminton-shoes',
    breadcrumb: 'Babolat Badminton Shoes',
    h1: 'Babolat Badminton Shoes',
    metaTitle: 'Babolat Badminton Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Babolat badminton court shoes for men and women, UK stock with fast delivery.',
    intro: brandBlurb('babolat'),
    filters: { sport: 'badminton', category: 'shoes', brand: 'babolat' },
    faqs: [
      {
        q: "Do Babolat badminton shoes come in men's and women's fits?",
        a: "Yes — the range covers both men's and women's specific lasts, including the Shadow Team and Shadow Spirit lines.",
      },
      {
        q: 'What makes the Michelin Performance outsole different?',
        a: "It's co-developed with Michelin's tyre expertise to maximise grip and lateral traction on indoor court surfaces, similar to the technology used in Babolat's tennis footwear.",
      },
      {
        q: 'How often should I replace my Babolat badminton shoes?',
        a: 'Roughly every 40–60 hours of court time, or sooner if the outsole tread has worn smooth.',
      },
    ],
  },
  {
    handle: 'victor-badminton-shoes',
    breadcrumb: 'Victor Badminton Shoes',
    h1: 'Victor Badminton Shoes',
    metaTitle: 'Victor Badminton Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Victor badminton court shoes for men and women, UK stock with fast delivery.',
    intro: brandBlurb('victor'),
    filters: { sport: 'badminton', category: 'shoes', brand: 'victor' },
    faqs: [
      {
        q: 'Are Victor badminton shoes true to size?',
        a: 'Most players find Victor runs true to standard UK sizing, but check the individual product\u2019s size guide as it can vary slightly between the A- and P-series.',
      },
      {
        q: "What's the difference between the A-series and P-series?",
        a: "The A-series (e.g. A970, A930) is Victor's all-court performance line, while the P-series is generally lighter and built for speed-focused players.",
      },
      {
        q: 'How often should I replace my Victor badminton shoes?',
        a: 'Roughly every 40–60 hours of court time, or sooner if the outsole tread has worn smooth.',
      },
    ],
  },
  {
    handle: 'li-ning-badminton-shoes',
    breadcrumb: 'Li-Ning Badminton Shoes',
    h1: 'Li-Ning Badminton Shoes',
    metaTitle: 'Li-Ning Badminton Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Li-Ning badminton court shoes for men and women, UK stock with fast delivery.',
    intro: brandBlurb('li-ning'),
    filters: { sport: 'badminton', category: 'shoes', brand: 'li-ning' },
    faqs: [
      {
        q: 'Are Li-Ning badminton shoes suitable for beginners?',
        a: 'Yes — models like the Dagger II SE offer a forgiving, cushioned ride that suits developing players as well as more experienced competitors.',
      },
      {
        q: 'Do Li-Ning badminton shoes run true to size?',
        a: "Li-Ning can run slightly narrower than Yonex or Victor, so we'd recommend checking the specific product's size guide before ordering.",
      },
      {
        q: 'How often should I replace my Li-Ning badminton shoes?',
        a: 'Roughly every 40–60 hours of court time, or sooner if the outsole tread has worn smooth.',
      },
    ],
  },
  {
    handle: 'badminton-racket-bags',
    breadcrumb: 'Badminton Racket Bags',
    h1: 'Badminton Racket Bags',
    metaTitle: 'Badminton Racket Bags UK | Smash Racket Pro',
    metaDescription:
      'Shop badminton racket bags and kit bags from all major brands, with room for multiple frames, shoes and accessories.',
    intro:
      'Protect your rackets and keep your kit organised with our full range of badminton bags, from slim 2-racket covers to full team kit bags.',
    filters: { sport: 'badminton', category: 'bags' },
    body: [
      {
        heading: 'Built to Protect',
        content:
          'Each bag in this collection combines durable materials, ergonomic straps and ample storage to keep your racket, shoes and accessories organised and protected wherever you go.',
      },
      {
        heading: 'From Local Courts to Tournaments',
        content:
          "Whether you're travelling to local courts or competing internationally, our badminton bags — from Babolat, HEAD, Li-Ning, Victor and Yonex — offer the perfect balance of comfort, style and functionality.",
      },
    ],
  },
  {
    handle: 'badminton-shuttlecocks',
    breadcrumb: 'Badminton Shuttlecocks',
    h1: 'Badminton Shuttlecocks',
    metaTitle: 'Badminton Shuttlecocks UK — Feather & Nylon | Smash Racket Pro',
    metaDescription:
      'Shop feather and nylon badminton shuttlecocks in a range of speeds, suited to club, tournament and school play.',
    intro:
      "From tournament-grade feather shuttles to durable nylon shuttles for regular club sessions, we stock speeds to suit your venue's altitude and temperature.",
    filters: { sport: 'badminton', category: 'shuttlecocks' },
    body: [
      {
        heading: 'Feathered vs Plastic',
        content:
          'Feathered shuttlecocks, made from duck or goose feathers, are preferred by professionals and experienced players for their natural flight and precision, though they wear out faster and cost more. Plastic (synthetic) shuttlecocks are highly durable and cost-effective, ideal for beginners or tight budgets, but offer a different flight path and less responsive feel.',
      },
      {
        heading: 'Choosing by Level, Environment & Frequency',
        content:
          'Beginners suit plastic shuttlecocks, which withstand inaccurate shots; intermediate and advanced players benefit from the control and natural flight of feathered shuttles. Both types work indoors; outdoors, plastic shuttlecocks resist wind better. Regular players may find quality feathered shuttles worth the investment, while occasional players often prefer the longer shelf life of plastic ones.',
      },
    ],
  },
  {
    handle: 'badminton-racket-grips',
    breadcrumb: 'Badminton Racket Grips',
    h1: 'Badminton Racket Grips',
    metaTitle: 'Badminton Racket Grips UK | Smash Racket Pro',
    metaDescription:
      'Shop replacement and overgrip tape for badminton rackets — towel grips for absorbency, PU grips for a tacky feel.',
    intro:
      'Keep your grip fresh with our range of replacement and overgrips, in towel and synthetic PU finishes.',
    filters: { sport: 'badminton', category: 'grips' },
    body: [
      {
        heading: 'Hold, Comfort & Control',
        content:
          'Each grip in our collection features premium materials with excellent sweat absorption for a secure feel during intense rallies — whether you prefer a tacky surface for extra traction or a softer texture for added cushioning.',
      },
      {
        heading: 'Small Upgrade, Big Difference',
        content:
          'The right grip can elevate your footwork, boost shot precision and help you maintain confidence on court. Shop our collection today, including brand pages for Yonex, Victor, Karakal, Wilson and Babolat.',
      },
    ],
  },
  {
    handle: 'beginner-badminton-rackets',
    breadcrumb: 'Beginner Badminton Rackets',
    h1: 'Beginner Badminton Rackets',
    metaTitle: 'Best Badminton Rackets for Beginners UK | Smash Racket Pro',
    metaDescription:
      'Lightweight, forgiving badminton rackets picked for beginners — easy to control with a larger sweet spot to build confidence.',
    intro:
      'New to badminton? These lightweight, evenly-balanced rackets are the easiest to control while you build technique, with a larger sweet spot that forgives off-centre hits.',
    filters: { sport: 'badminton', category: 'rackets', level: 'beginner' },
    body: [
      {
        heading: 'Choosing Your First Racket',
        content:
          "Before choosing, ask yourself how long you plan to play and whether you want to progress to higher levels or are happy playing socially. For developing social players, a graphite racket is a better choice than a steel-alloy frame — it offers a stronger frame at a lighter weight, helping you build the correct swing and wrist technique. A good racket enhances your game but won't replace proper coaching and fundamentals.",
      },
      {
        heading: 'Weight',
        content:
          'Rackets range from 3U (85–89g) down to 2F (under 70g). Heavier rackets need more arm strength and developed technique and add stress to the wrist; very light rackets are easy to swing but lack power. We generally recommend 4U (80–84g) to 5U (75–79g) as the most comfortable range for developing social players.',
      },
      {
        heading: 'Balance',
        content:
          "Head-heavy frames give more power but are slower to reset between shots — not ideal while you're still developing technique. Even-balance and head-light rackets are easier to manoeuvre and let you focus on technique first.",
      },
      {
        heading: 'Flexibility & Budget',
        content:
          'Flexible shafts give beginners more whip and power from the racket rather than the arm, so we recommend a flexible shaft for most new players. A decent beginner racket typically costs £40–£80, usually a basic graphite frame strung at 22–26 lbs — good starting points include Yonex Play and Game models, Li-Ning Calibar and Turbocharging, and Babolat Prime and I-Pulse.',
      },
    ],
  },
  {
    handle: 'intermediate-badminton-rackerts',
    breadcrumb: 'Intermediate Badminton Rackets',
    h1: 'Intermediate Badminton Rackets',
    metaTitle: 'Intermediate Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Badminton rackets suited to intermediate club players who have developed a consistent swing and want more control and power.',
    intro:
      "Once you've got a consistent swing down, these rackets offer a step up in control and power over beginner frames.",
    filters: { sport: 'badminton', category: 'rackets', level: 'intermediate' },
    body: [
      {
        heading: 'Why Choose an Intermediate Racket?',
        content:
          "Designed for those who have mastered the basics and are looking to refine their skills, these rackets offer the perfect balance of power, control and manoeuvrability. Whether you're working on your smashes, drop shots or defensive play, the right racket can enhance your performance and help you compete with confidence.",
      },
      {
        heading: 'Enhanced Power, Control & Comfort',
        content:
          'Optimised weight distribution and flexible shafts provide the perfect combination of speed and precision, crafted from high-quality graphite for durability without sacrificing ease of movement. A well-balanced racket also reduces strain on the wrist and arm, letting you play longer without fatigue.',
      },
    ],
  },
  {
    handle: 'advanced-badminton-rackets',
    breadcrumb: 'Advanced Badminton Rackets',
    h1: 'Advanced Badminton Rackets',
    metaTitle: 'Advanced Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Stiff, head-heavy performance badminton rackets for advanced and tournament-level players who can generate their own power.',
    intro:
      'Built for players who can already generate their own power and want maximum precision and attacking punch — our advanced racket range.',
    filters: { sport: 'badminton', category: 'rackets', level: 'advanced' },
    body: [
      {
        heading: 'What Makes a Professional Racket?',
        content:
          'Advanced players have strong fundamentals, exceptional shot control and the ability to transition between hard and soft touches during fast-paced rallies. Their game demands a racket with stiff to extra-stiff flex for maximum accuracy, high tension capability for sharper shuttle control, and custom grip sizes tailored to personal technique.',
      },
      {
        heading: 'Optimised Balance Points',
        content:
          'Head-heavy suits singles players executing powerful smashes and deep clears; even-balanced suits all-round versatility; head-light suits fast doubles and front-court dominance.',
      },
      {
        heading: 'Weight Categories',
        content:
          '3U (85–89g) is preferred by strong players who need stability and power, while 4U (80–84g) offers a great balance of speed and power for quicker reactions during intense rallies.',
      },
      {
        heading: 'Price Range',
        content:
          'Premium professional rackets start at around £140, with top-tier models priced between £180 and £210. Yonex Pro models cater specifically to advanced players, while Li-Ning rackets numbered 700 and above are designed for high-performance gameplay.',
      },
    ],
  },
  {
    handle: 'head-heavy-badminton-racket',
    breadcrumb: 'Head-Heavy Badminton Rackets',
    h1: 'Head-Heavy Badminton Rackets',
    metaTitle: 'Head-Heavy Badminton Rackets UK | Smash Racket Pro',
    metaDescription:
      'Head-heavy badminton rackets that store extra weight in the frame tip for more powerful, attacking smashes.',
    intro:
      'Head-heavy rackets shift weight toward the frame tip, storing extra power for attacking smashes and clears at the cost of a little manoeuvrability.',
    filters: { sport: 'badminton', category: 'rackets', style: 'head-heavy' },
    faqs: [
      {
        q: 'Is a head-heavy racket good for beginners?',
        a: 'Generally no — head-heavy rackets are harder to manoeuvre and reset between shots, so we\u2019d recommend an even-balanced or head-light frame until your technique and wrist strength develop.',
      },
      {
        q: 'Will a head-heavy racket slow down my defensive play?',
        a: 'It can — the extra weight at the head takes slightly longer to reset for quick blocks and net play, which is why it best suits attacking singles players rather than fast doubles specialists.',
      },
      {
        q: 'What weight range should I look for in a head-heavy racket?',
        a: 'Most players find 3U (85–89g) to 4U (80–84g) the most comfortable range for a head-heavy frame, depending on arm and wrist strength.',
      },
    ],
  },
  {
    handle: '2024-badminton-new-products',
    breadcrumb: 'New Badminton Arrivals',
    h1: 'Latest Badminton Arrivals',
    metaTitle: 'New Badminton Products 2026 | Smash Racket Pro',
    metaDescription:
      'Check out the newest badminton rackets, shoes and accessories just landed in stock at Smash Racket Pro.',
    intro:
      "Fresh stock, just landed. Our New Arrivals collection brings together the newest badminton rackets and shoes from Yonex, Victor and Li-Ning, including the latest Astrox, Auraspeed and Thruster racket generations alongside new-season footwear. Stock moves quickly on new releases, so browse now and be among the first to play with this season's launches.",
    filters: { sport: 'badminton', badge: 'NEW' },
  },

  // ───────────────────────── TENNIS ─────────────────────────
  {
    handle: 'tennis-rackets',
    breadcrumb: 'Tennis Rackets',
    h1: 'Tennis Rackets',
    metaTitle: 'Tennis Rackets UK | Babolat, HEAD, Yonex — Smash Racket Pro',
    metaDescription:
      'Shop tennis rackets from Babolat, HEAD and Yonex for every level, plus a dedicated junior range. UK stock with fast delivery and expert stringing.',
    intro:
      'From junior first rackets to tour-level frames, our tennis racket range spans every major brand and playing style.',
    filters: { sport: 'tennis', category: 'rackets' },
    body: [
      {
        heading: 'Finding the right weight and head size',
        content:
          'Heavier, smaller-headed rackets generally suit players with a fuller swing who want more control and feel, while lighter, larger-headed rackets are more forgiving and easier to generate power with — a good starting point for improving players.',
      },
    ],
    faqs: SHARED_FAQS['tennis-rackets'],
  },
  {
    handle: 'babolat-tennis-rackets',
    breadcrumb: 'Babolat Tennis Rackets',
    h1: 'Babolat Tennis Rackets',
    metaTitle: 'Babolat Tennis Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Babolat tennis racket range, UK stock with fast delivery and expert stringing available.',
    intro: brandBlurb('babolat'),
    filters: { sport: 'tennis', category: 'rackets', brand: 'babolat' },
    body: [
      {
        heading: 'Series Breakdown',
        content:
          "Pure Drive — the all-round power frame, Babolat's best-seller for club and league players who want easy pace. Pure Aero — the spin-focused frame made famous by Rafael Nadal, built for players who like to load the ball with topspin. Pure Strike — a control-first frame favoured by advanced players who want a crisper, more precise feel. Boost / Evoke / Evo Drive — lighter, more forgiving frames for improvers who want a Babolat feel without the tour-level weight. We're an official Babolat stockist carrying frames from junior sizes through to tour specification — check out our tennis racket guide or get in touch for free advice.",
      },
    ],
  },
  {
    handle: 'head-tennis-rackets',
    breadcrumb: 'HEAD Tennis Rackets',
    h1: 'HEAD Tennis Rackets',
    metaTitle: 'HEAD Tennis Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full HEAD tennis racket range, UK stock with fast delivery and expert stringing available.',
    intro:
      'Discover the remarkable range of HEAD tennis rackets at Smash Racket Pro, home to some of the most recognisable frames on tour. From the all-court Speed series to the topspin-friendly Gravity range and the classic control of Extreme and Prestige, HEAD covers every playing style with genuine tour-level engineering.',
    filters: { sport: 'tennis', category: 'rackets', brand: 'head' },
    body: [
      {
        heading: 'Cutting-Edge Technology',
        content:
          "Graphene 360+ — HEAD's signature layup redistributes material for a better balance of power, feel and stability through the frame. Auxetic 2.0 — used in the Gravity range to soften impact on off-centre hits while keeping the sweet spot lively.",
      },
      {
        heading: 'Versatility and Performance',
        content:
          "Whether you're chasing the explosive power of the Speed series, the heavy topspin of Gravity, or the classic control of Extreme and Prestige, HEAD's range suits aggressive baseliners and all-court players alike. Our Intermediate Series bridges the gap for developing players stepping up from a starter frame.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our curated collection of HEAD tennis rackets and find the frame to take your game further. We offer competitive prices, fast UK shipping and dedicated customer support from a team of active players.',
      },
    ],
  },
  {
    handle: 'yonex-tennis-rackets',
    breadcrumb: 'Yonex Tennis Rackets',
    h1: 'Yonex Tennis Rackets',
    metaTitle: 'Yonex Tennis Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Yonex tennis racket range, UK stock with fast delivery and expert stringing available.',
    intro:
      "Smash Racket Pro is the UK home for Yonex tennis rackets, bringing Yonex's badminton-honed engineering to the tennis court. The VCORE range is built around a sweet, powerful response and a genuinely huge sweet spot.",
    filters: { sport: 'tennis', category: 'rackets', brand: 'yonex' },
    body: [
      {
        heading: 'Cutting-Edge Technology',
        content:
          'Isometric Frame — squares off the racket head to expand the sweet spot without adding bulk. 2D Micro Core — dampens unwanted vibration for a cleaner, more connected feel through contact.',
      },
      {
        heading: 'Versatility and Performance',
        content:
          'The VCORE 98 offers a control-oriented spec for advanced players, while the VCORE 100 provides a slightly more forgiving, power-friendly platform for club and league players. Both frames are available strung or frame-only.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our Yonex tennis racket range for competitive prices, fast shipping and advice from a team who play at club to county level.',
      },
    ],
  },
  {
    handle: 'junior-tennis-rackets',
    breadcrumb: 'Junior Tennis Rackets',
    h1: 'Junior Tennis Rackets',
    metaTitle: 'Junior Tennis Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop junior tennis rackets sized for younger players, from mini tennis through to teen frames.',
    intro:
      'Right-sized rackets help junior players develop good technique early — browse our full range by age and length below.',
    filters: { sport: 'tennis', category: 'rackets', level: 'junior' },
  },
  {
    handle: 'tennis-shoes',
    breadcrumb: 'Tennis Shoes',
    h1: 'Tennis Shoes',
    metaTitle: "Tennis Shoes UK | Men's & Women's — Smash Racket Pro",
    metaDescription:
      'Shop tennis shoes for men and women from Babolat, HEAD, K-Swiss, Yonex, adidas and Wilson, for clay, hard and all-court surfaces.',
    intro:
      "Court surface matters as much as fit when picking tennis shoes — browse our full men's and women's range across all major brands below.",
    filters: { sport: 'tennis', category: 'shoes' },
    body: [
      {
        heading: 'Why Choose Our Tennis Shoes?',
        content:
          'Our tennis shoes feature durable outsoles and reinforced toe caps for the constant stop-start, lateral movement of tennis, manufactured from top-grade materials for long-lasting wear even on abrasive hard courts — starting from under £45 up to premium tour models.',
      },
      {
        heading: 'Understanding Court Surface',
        content:
          'Hard courts need maximum durability and cushioning; clay courts need a herringbone sole for grip and easy sliding; indoor courts favour non-marking gum soles. Foot type (neutral, flat or high arch) matters too, and fit varies slightly by brand.',
      },
      {
        heading: 'Top Brands',
        content:
          "K-Swiss offers exceptional durability across the Express, Ultrashot and Bigshot ranges; Babolat pairs racket expertise with lightweight designs like the Jet Tere; HEAD's Sprint and Revolt Court ranges deliver great value; Wilson, Adidas and Yonex round out our selection for players who prefer a specific brand feel.",
      },
      {
        heading: 'Care and Maintenance',
        content:
          'Use a soft brush and mild soap to gently scrub away clay or court dust, and store your shoes in a cool, dry place away from direct sunlight or car boots, as heat can damage the sole material.',
      },
    ],
    faqs: [
      {
        q: 'Are running shoes suitable for tennis?',
        a: 'No, running shoes are not recommended for tennis as they lack the lateral support and durable outsoles required.',
      },
      {
        q: 'How often should I replace my tennis shoes?',
        a: "This depends on how frequently you play, but generally it's good to replace them every 45-60 hours of court time.",
      },
      {
        q: 'Can I use tennis shoes for other sports?',
        a: "It's best not to, as other sports have different grip and support requirements that tennis shoes may not meet.",
      },
      {
        q: 'What are non-marking shoes?',
        a: 'Non-marking shoes have soles that do not leave scuffs on indoor court surfaces.',
      },
      {
        q: 'Do tennis shoes require breaking in?',
        a: 'Yes, new tennis shoes might feel a little tight initially but will become comfortable after a few uses.',
      },
    ],
  },
  {
    handle: 'men-tennis-shoes',
    breadcrumb: "Men's Tennis Shoes",
    h1: "Men's Tennis Shoes",
    metaTitle: "Men's Tennis Shoes UK | Smash Racket Pro",
    metaDescription:
      "Shop men's tennis shoes from Babolat, HEAD, K-Swiss, Yonex, adidas and Wilson.",
    intro: "Our full men's tennis shoe range across every major brand.",
    filters: { sport: 'tennis', category: 'shoes', gender: 'men' },
    faqs: [
      {
        q: "What's the difference between men's and women's tennis shoes?",
        a: "Men's tennis shoes are generally built on a wider last with a firmer heel counter, while women's models use a narrower fit and softer cushioning tuned to a lighter average bodyweight.",
      },
      {
        q: 'Which sole works best on hard courts?',
        a: 'A durable modified herringbone or all-court sole handles hard courts best, balancing grip with the abrasion resistance needed on concrete-based surfaces.',
      },
      {
        q: 'How do I know my size across different brands?',
        a: "Sizing varies slightly between K-Swiss, HEAD and Babolat — check each product's size guide, and size up half a size if you're between sizes for a snugger match-day fit.",
      },
    ],
  },
  {
    handle: 'women-tennis-shoes',
    breadcrumb: "Women's Tennis Shoes",
    h1: "Women's Tennis Shoes",
    metaTitle: "Women's Tennis Shoes UK | Smash Racket Pro",
    metaDescription:
      "Shop women's tennis shoes from Babolat, HEAD, K-Swiss, Yonex, adidas and Wilson.",
    intro: "Our full women's tennis shoe range across every major brand.",
    filters: { sport: 'tennis', category: 'shoes', gender: 'women' },
    faqs: [
      {
        q: "Do women's tennis shoes run true to size?",
        a: 'Most run true to standard UK women\u2019s sizing, though K-Swiss and Babolat can come up slightly narrow — check the product size guide before ordering.',
      },
      {
        q: 'Can I use these shoes for padel too?',
        a: 'Not ideally — padel courts have a different surface, and a dedicated padel shoe offers better grip on artificial grass than a tennis all-court sole.',
      },
      {
        q: 'How often should I replace my tennis shoes?',
        a: 'Around every 45–60 hours of court time, or sooner once the outsole tread starts to smooth out or the midsole loses its cushioning response.',
      },
    ],
  },
  {
    handle: 'babolat-tennis-shoes',
    breadcrumb: 'Babolat Tennis Shoes',
    h1: 'Babolat Tennis Shoes',
    metaTitle: 'Babolat Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Babolat tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      "Babolat pairs decades of racket-making expertise with lightweight, breathable shoe design across the Jet Tere, SFX and Propulse ranges. Every pair is built around Babolat's Michelin-sourced outsole compound for genuine hard-court grip and durability.",
    filters: { sport: 'tennis', category: 'shoes', brand: 'babolat' },
    body: [
      {
        heading: 'Why Choose Babolat Tennis Shoes?',
        content:
          'Michelin Outsole — co-developed with Michelin for exceptional grip and long-lasting wear on hard courts. Lightweight Uppers — breathable mesh construction keeps feet cool through long rallies without sacrificing lateral support.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our full Babolat tennis shoe range for men and women, backed by fast UK shipping and advice from our in-house team of active players.',
      },
    ],
  },
  {
    handle: 'head-tennis-shoes',
    breadcrumb: 'HEAD Tennis Shoes',
    h1: 'HEAD Tennis Shoes',
    metaTitle: 'HEAD Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop HEAD tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      "HEAD's Sprint and Revolt ranges are built for players who prioritise speed and lateral stability without paying tour prices. Reinforced toe caps and durable outsoles are designed specifically for the constant stop-start movement of tennis.",
    filters: { sport: 'tennis', category: 'shoes', brand: 'head' },
    body: [
      {
        heading: 'Why Choose HEAD Tennis Shoes?',
        content:
          'Reinforced Toe Cap — protects against the toe-drag common in aggressive baseline play. Durable Outsole — built to handle abrasive hard courts through a full season of club and league matches.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our HEAD tennis shoe range for men and women, with competitive prices and fast UK dispatch.',
      },
    ],
  },
  {
    handle: 'k-swiss-tennis-shoes',
    breadcrumb: 'K-Swiss Tennis Shoes',
    h1: 'K-Swiss Tennis Shoes',
    metaTitle: 'K-Swiss Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop K-Swiss tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      'K-Swiss is a specialist tennis footwear brand and our single largest tennis shoe range, offering exceptional durability and support across the Express, Ultrashot, Bigshot and Defier lines for men and women.',
    filters: { sport: 'tennis', category: 'shoes', brand: 'k-swiss' },
    body: [
      {
        heading: 'Why Choose K-Swiss Tennis Shoes?',
        content:
          "Dura-Wrap Technology — a supportive external cage that reinforces the shoe's structure through hard lateral movement. Aosta Rubber Outsole — engineered specifically for hard-court durability. Wide Range of Fits — from the lightweight Express Light for club players to the more supportive Bigshot for baseline grinders.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our full K-Swiss range — the widest tennis shoe selection on Smash Racket Pro — with fast UK shipping and expert advice from our team.',
      },
    ],
  },
  {
    handle: 'yonex-tennis-shoes',
    breadcrumb: 'Yonex Tennis Shoes',
    h1: 'Yonex Tennis Shoes',
    metaTitle: 'Yonex Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Yonex tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      "Yonex brings its badminton court-craft to the tennis court with the Power Cushion Lumio range, built for players who want lightweight comfort and reliable support through long rallies. Every pair uses Yonex's Power Cushion midsole technology to absorb impact and reduce fatigue over a full match.",
    filters: { sport: 'tennis', category: 'shoes', brand: 'yonex' },
    body: [
      {
        heading: 'Power Cushion Midsole',
        content:
          'Absorbs shock on every landing, reducing strain on the knees and ankles during long baseline rallies.',
      },
      {
        heading: 'Lightweight Build',
        content:
          'The Lumio 3 is designed to feel fast underfoot without compromising on court support. Browse our Yonex tennis shoe range for competitive prices and fast UK shipping.',
      },
    ],
  },
  {
    handle: 'adidas-tennis-shoes',
    breadcrumb: 'adidas Tennis Shoes',
    h1: 'adidas Tennis Shoes',
    metaTitle: 'adidas Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop adidas tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      'Adidas brings iconic streetwear styling to the court with the Barricade and GameCourt ranges, combining Adiwear rubber outsoles with breathable mesh uppers for all-day comfort.',
    filters: { sport: 'tennis', category: 'shoes', brand: 'adidas' },
    body: [
      {
        heading: 'Why Choose Adidas Tennis Shoes?',
        content:
          'Adiwear Outsole — a durable rubber compound built to handle the toughest hard-court surfaces. Iconic Styling — the three-stripe look on and off the court, for players who want performance and fashion in one shoe.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our Adidas tennis shoe range for competitive prices and fast UK shipping.',
      },
    ],
  },
  {
    handle: 'wilson-tennis-shoes',
    breadcrumb: 'Wilson Tennis Shoes',
    h1: 'Wilson Tennis Shoes',
    metaTitle: 'Wilson Tennis Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop Wilson tennis shoes for men and women, UK stock with fast delivery.',
    intro:
      "Wilson's Kaos Devo range is built for players who want tour-level lateral support at a mid-range price point, with a supportive midfoot cage and durable outsole built for hard-court play.",
    filters: { sport: 'tennis', category: 'shoes', brand: 'wilson' },
    body: [
      {
        heading: 'Why Choose Wilson Tennis Shoes?',
        content:
          'Duralast Outsole — engineered for hard-court durability and long-lasting grip. Supportive Cage Construction — locks the foot in place through aggressive change-of-direction movement.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our Wilson Kaos Devo range for men and women, backed by competitive prices and fast UK shipping.',
      },
    ],
  },
  {
    handle: 'tennis-balls',
    breadcrumb: 'Tennis Balls',
    h1: 'Tennis Balls',
    metaTitle: 'Tennis Balls UK | Smash Racket Pro',
    metaDescription:
      'Shop tennis balls for match play, coaching and practice from all major brands.',
    intro:
      "Choosing the right tennis ball can make a bigger difference to your game than you'd think — the wrong ball changes bounce, spin and control on every single shot.",
    filters: { sport: 'tennis', category: 'balls' },
    body: [
      {
        heading: 'Regular Duty vs Extra Duty',
        content:
          "Regular Duty balls use a thinner felt for clay and indoor courts, where the surface doesn't wear the felt down as quickly. Extra Duty balls use a thicker, more durable felt built specifically for hard courts, which chew through a regular duty ball far faster.",
      },
      {
        heading: 'Court Surface & Playing Level',
        content:
          'Match the ball to your court — extra duty for hard courts, regular duty for clay and indoor surfaces. Club and league players benefit from pressurised balls like Dunlop Fort or Slazenger Wimbledon for tournament-standard bounce; casual players can save money with a mixed-use can.',
      },
      {
        heading: 'Frequency of Play',
        content:
          'Balls lose pressure and bounce after just a few sessions — regular players should budget for a fresh can roughly every 2–3 sessions of serious play.',
      },
    ],
  },
  {
    handle: 'tennis-bags',
    breadcrumb: 'Tennis Bags',
    h1: 'Tennis Bags',
    metaTitle: 'Tennis Bags UK | Smash Racket Pro',
    metaDescription:
      'Shop tennis racket bags and holdalls with room for multiple frames, shoes and kit.',
    intro:
      'Protect your rackets and carry your kit in style with our full range of tennis bags.',
    filters: { sport: 'tennis', category: 'bags' },
  },
  {
    handle: 'tennis-racket-grips',
    breadcrumb: 'Tennis Racket Grips',
    h1: 'Tennis Racket Grips',
    metaTitle: 'Tennis Racket Grips UK | Smash Racket Pro',
    metaDescription:
      'Shop replacement grips and overgrips for tennis rackets, in tacky, absorbent and cushioned finishes.',
    intro:
      'Keep your grip fresh with our range of replacement grips and overgrips.',
    filters: { sport: 'tennis', category: 'grips' },
    body: [
      {
        heading: 'Replacement Grips vs Overgrips',
        content:
          'A replacement grip replaces the original grip fitted at the factory and sits directly on the handle — swap it out every few months or once it hardens and loses tack. An overgrip wraps over the top of your existing grip for extra cushioning and sweat control — most players get through one every few weeks of regular play, and it\u2019s the cheapest, easiest upgrade you can make to your racket.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Discover how the right grip can elevate your feel, boost shot precision and help you maintain confidence deep into a long match — from Babolat, HEAD, Wilson, Karakal, Yonex and Victor.',
      },
    ],
  },
  {
    handle: 'babolat-tennis-store',
    breadcrumb: 'Babolat Tennis Store',
    h1: 'Babolat Tennis Store',
    metaTitle: 'Shop Babolat Tennis | Rackets, Shoes & Bags — Smash Racket Pro',
    metaDescription:
      'Shop the full Babolat tennis range in one place — rackets, shoes, bags and accessories.',
    intro:
      'From the Pure Drive and Pure Aero on the tour to the Jet Tere on your feet, Babolat is one of the most complete tennis brands in the game. Browse our full Babolat storefront — rackets, shoes, bags, balls and grips — all in one place, with official UK stock, fast shipping and expert advice.',
    filters: { sport: 'tennis', brand: 'babolat' },
  },
  {
    handle: 'yonex-tennis-store',
    breadcrumb: 'Yonex Tennis Store',
    h1: 'Yonex Tennis Store',
    metaTitle: 'Shop Yonex Tennis | Rackets, Shoes & Bags — Smash Racket Pro',
    metaDescription:
      'Shop the full Yonex tennis range in one place — rackets, shoes, bags and accessories.',
    intro:
      'Yonex brings its badminton-honed engineering to tennis with the VCORE racket range and Power Cushion footwear technology. Browse the full Yonex tennis storefront at Smash Racket Pro, backed by official UK stock and fast shipping.',
    filters: { sport: 'tennis', brand: 'yonex' },
  },
  {
    handle: 'head-tennis-store',
    breadcrumb: 'HEAD Tennis Store',
    h1: 'HEAD Tennis Store',
    metaTitle: 'Shop HEAD Tennis | Rackets, Shoes & Bags — Smash Racket Pro',
    metaDescription:
      'Shop the full HEAD tennis range in one place — rackets, shoes, bags and accessories.',
    intro:
      'From the Speed and Gravity racket series to the Sprint and Revolt shoe ranges, HEAD covers every part of your tennis kit bag. Browse the full HEAD storefront at Smash Racket Pro for competitive prices and fast UK delivery.',
    filters: { sport: 'tennis', brand: 'head' },
  },
  {
    handle: 'tennis-sale',
    breadcrumb: 'Tennis Sale',
    h1: 'Tennis Clearance Sale',
    metaTitle:
      'Tennis Sale UK | Clearance Rackets, Shoes & Bags — Smash Racket Pro',
    metaDescription:
      'Shop discounted tennis rackets, shoes and accessories in our clearance sale. Limited stock, while it lasts.',
    intro:
      'Limited stock, unbeatable prices. Our Tennis Clearance Sale brings together reduced rackets, shoes, bags and accessories from Babolat, HEAD, Yonex, K-Swiss and more — while stock lasts. Shop now before your size or favourite frame sells out.',
    filters: { sport: 'tennis', badge: 'SALE' },
  },

  // ───────────────────────── PADEL ─────────────────────────
  {
    handle: 'padel-rackets',
    breadcrumb: 'Padel Rackets',
    h1: 'Padel Rackets',
    metaTitle:
      'Padel Rackets UK | adidas, Babolat, Bullpadel, HEAD — Smash Racket Pro',
    metaDescription:
      'Shop padel rackets from adidas, Babolat, Bullpadel, HEAD, Tecnifibre and Dunlop, in round, teardrop and diamond shapes.',
    intro:
      'Padel is one of the fastest-growing racket sports in the UK — browse our full range of rackets across every major brand and shape.',
    filters: { sport: 'padel', category: 'rackets' },
    faqs: SHARED_FAQS['padel-rackets'],
  },
  {
    handle: 'adidas-padel-rackets',
    breadcrumb: 'adidas Padel Rackets',
    h1: 'adidas Padel Rackets',
    metaTitle: 'adidas Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full adidas padel racket range, UK stock with fast delivery.',
    intro:
      'Adidas brings serious carbon-fibre engineering to padel with the Metalbone range — the racket behind some of the biggest names on the professional padel tour — alongside the more accessible Match and Drive series for club and improving players.',
    filters: { sport: 'padel', category: 'rackets', brand: 'adidas' },
    body: [
      {
        heading: 'Why Choose Adidas Padel Rackets?',
        content:
          'Carbon Construction — the Metalbone range uses full carbon faces for maximum power and durability at the top end of the range. Range for Every Level — from the beginner-friendly Drive and Match rackets to the tour-level Metalbone, Adidas covers every stage of your padel journey.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our Adidas padel racket range for competitive prices and fast UK shipping. Shop now and play with the same technology trusted by the world's top padel professionals.",
      },
    ],
  },
  {
    handle: 'babolat-padel-rackets',
    breadcrumb: 'Babolat Padel Rackets',
    h1: 'Babolat Padel Rackets',
    metaTitle: 'Babolat Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Babolat padel racket range, UK stock with fast delivery.',
    intro:
      "Babolat's padel range spans the lightweight, control-focused Air series through to the powerful Technical Viper and the Juan Lebron signature Veron — our single largest padel racket brand range, covering every playing style and budget.",
    filters: { sport: 'padel', category: 'rackets', brand: 'babolat' },
    body: [
      {
        heading: 'Why Choose Babolat Padel Rackets?',
        content:
          "Cotton Power Frame Technology — Babolat's proprietary construction improves ball pocketing for a more consistent, controlled response. Full Range of Shapes — round, teardrop and diamond options across the Air, Counter and Technical lines suit everyone from beginners to advanced attacking players.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our full Babolat padel racket collection for competitive prices, fast UK shipping and advice from a team of active players.',
      },
    ],
  },
  {
    handle: 'bullpadel-padel-rackets',
    breadcrumb: 'Bullpadel Padel Rackets',
    h1: 'Bullpadel Padel Rackets',
    metaTitle: 'Bullpadel Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Bullpadel padel racket range, UK stock with fast delivery.',
    intro:
      'Bullpadel is one of the most decorated brands in professional padel, and the Vertex and Xplo series bring that same tour-level engineering to club players who want a genuinely elite racket.',
    filters: { sport: 'padel', category: 'rackets', brand: 'bullpadel' },
    body: [
      {
        heading: 'Why Choose Bullpadel Padel Rackets?',
        content:
          'Tour-Proven Design — the Vertex range is used by multiple top-10 professional players on the World Padel Tour. Power and Precision — a diamond-shaped, head-heavy profile built for players who want maximum power on their smash.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our Bullpadel range for competitive prices and fast UK shipping. Shop now and play with one of padel's most respected performance brands.",
      },
    ],
  },
  {
    handle: 'head-padel-rackets',
    breadcrumb: 'HEAD Padel Rackets',
    h1: 'HEAD Padel Rackets',
    metaTitle: 'HEAD Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full HEAD padel racket range, UK stock with fast delivery.',
    intro:
      'HEAD brings its tennis and squash racket engineering to the padel court, combining carbon-fibre construction with the same technology found in its tour-level tennis frames.',
    filters: { sport: 'padel', category: 'rackets', brand: 'head' },
    body: [
      {
        heading: 'Shop With Confidence',
        content:
          'Check back soon as we expand our HEAD padel racket range, or get in touch and our team can let you know when new stock arrives.',
      },
    ],
  },
  {
    handle: 'tecnifibre-padel-rackets',
    breadcrumb: 'Tecnifibre Padel Rackets',
    h1: 'Tecnifibre Padel Rackets',
    metaTitle: 'Tecnifibre Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Tecnifibre padel racket range, UK stock with fast delivery.',
    intro:
      'Tecnifibre is a French performance brand known across tennis and padel for precision-engineered frames built for control-focused players.',
    filters: { sport: 'padel', category: 'rackets', brand: 'tecnifibre' },
    body: [
      {
        heading: 'Shop With Confidence',
        content:
          'Check back soon as we expand our Tecnifibre padel racket range, or contact our team for the latest stock updates.',
      },
    ],
  },
  {
    handle: 'dunlop-padel-rackets',
    breadcrumb: 'Dunlop Padel Rackets',
    h1: 'Dunlop Padel Rackets',
    metaTitle: 'Dunlop Padel Rackets UK | Smash Racket Pro',
    metaDescription:
      'Shop the full Dunlop padel racket range, UK stock with fast delivery.',
    intro:
      "Dunlop's padel range brings over a century of racket sports heritage to the fast-growing sport of padel, with frames designed for club and improving players.",
    filters: { sport: 'padel', category: 'rackets', brand: 'dunlop' },
    body: [
      {
        heading: 'Shop With Confidence',
        content:
          'Check back soon as we expand our Dunlop padel racket range, or contact our team for the latest stock updates.',
      },
    ],
  },
  {
    handle: 'padel-tennis-racket-sale',
    breadcrumb: 'Padel Racket Sale',
    h1: 'Padel Racket Sale',
    metaTitle: 'Padel Racket Sale UK | Clearance Prices — Smash Racket Pro',
    metaDescription: 'Shop discounted padel rackets while stock lasts.',
    intro:
      'Limited stock, unbeatable prices on padel rackets from Adidas, Babolat and Bullpadel. Shop our Padel Racket Sale while stock lasts and grab a genuine performance frame at a fraction of the price.',
    filters: { sport: 'padel', category: 'rackets', badge: 'SALE' },
  },
  {
    handle: 'best-padel-rackets',
    breadcrumb: 'Best Padel Rackets',
    h1: 'Best-Selling Padel Rackets',
    metaTitle: 'Best Padel Rackets UK 2026 | Smash Racket Pro',
    metaDescription:
      'Our best-selling padel rackets, picked by players across every level and shape.',
    intro:
      "Not sure where to start? Here's our team's pick of the best padel rackets across every level.",
    filters: { sport: 'padel', category: 'rackets', badge: 'BESTSELLER' },
    body: [
      {
        heading: 'Best for Beginners',
        content:
          'A round-shaped, lighter racket (350–360g) like the Adidas Match or Babolat Air Origin, prioritising control and a forgiving sweet spot.',
      },
      {
        heading: 'Best for Intermediate Players',
        content:
          'A teardrop-shaped racket such as the Babolat Counter Vertuo, balancing power and control as your game develops.',
      },
      {
        heading: 'Best for Advanced Players',
        content:
          'A diamond-shaped, head-heavy frame like the Bullpadel Vertex 05 or Babolat Technical Viper, built for players who want maximum power on the smash. Still not sure? Check out our full padel racket guide or get in touch for personalised advice.',
      },
    ],
  },
  {
    handle: 'padel-balls',
    breadcrumb: 'Padel Balls',
    h1: 'Padel Balls',
    metaTitle: 'Padel Balls UK | Smash Racket Pro',
    metaDescription:
      'Shop padel balls for match and practice play from all major brands.',
    intro:
      'Padel balls look similar to tennis balls but are pressurised slightly lower for the smaller, enclosed padel court — using the wrong ball changes bounce height and can affect your control at the net.',
    filters: { sport: 'padel', category: 'balls' },
    body: [
      {
        heading: 'Why the Right Padel Ball Matters',
        content:
          "Padel balls typically use a slightly lower internal pressure than tennis balls, giving a lower, more controlled bounce suited to padel's walled, enclosed court. Using a standard tennis ball on a padel court gives an unpredictable, overly lively bounce.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our padel ball range for competitive prices and fast UK shipping, and keep a fresh tube on hand — padel balls lose pressure faster than tennis balls thanks to the extra wall rebounds during play.',
      },
    ],
  },
  {
    handle: 'padel-shoes',
    breadcrumb: 'Padel Shoes',
    h1: 'Padel Shoes',
    metaTitle: 'Padel Shoes UK | Smash Racket Pro',
    metaDescription:
      'Shop padel shoes built for the multi-directional movement and quick stops padel demands.',
    intro:
      'Padel courts favour a specific grip pattern — browse our full padel shoe range below.',
    filters: { sport: 'padel', category: 'shoes' },
    faqs: [
      {
        q: 'Can I wear tennis shoes for padel?',
        a: 'Tennis shoes can work on hard padel courts, but purpose-built padel shoes offer better grip on artificial grass surfaces.',
      },
      {
        q: 'How often should I replace padel shoes?',
        a: 'Roughly every 40-60 hours of play, or sooner if the outsole tread has worn smooth.',
      },
    ],
  },
  {
    handle: 'padel-bag',
    breadcrumb: 'Padel Bags',
    h1: 'Padel Bags',
    metaTitle: 'Padel Bags UK | Smash Racket Pro',
    metaDescription:
      'Shop padel racket bags with room for multiple rackets, shoes and kit.',
    intro: 'Carry your padel kit in style with our full range of padel bags.',
    filters: { sport: 'padel', category: 'bags' },
    body: [
      {
        heading: 'Why Invest in a Padel Bag?',
        content:
          'Protective Racket Sleeve — padel rackets are solid and unstrung, so a padded sleeve is essential protection against impact damage. Organised Storage — separate compartments for shoes, balls and accessories keep match day simple.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our padel bag range for competitive prices and fast UK shipping, and find the bag to match your padel kit.',
      },
    ],
  },

  // ───────────────────────── CLOTHING ─────────────────────────
  {
    handle: 'apparel',
    breadcrumb: 'Apparel',
    h1: 'Racket Sports Apparel',
    metaTitle: "Racket Sports Clothing UK | Men's & Women's — Smash Racket Pro",
    metaDescription:
      "Shop men's and women's performance clothing for badminton, tennis and padel — tops, bottoms and socks.",
    intro:
      'Welcome to our exclusive collection of racket sports apparel, meticulously designed for maximum comfort, breathability, and freedom of movement on court. Our range includes shirts, shorts, skorts, skirts, trackpants and jackets from top brands, helping you look and perform your best whether you play badminton, tennis, padel or squash.',
    filters: { sport: 'clothing' },
    body: [
      {
        heading: 'Why Choose Our Apparel?',
        content:
          'Breathable Fabrics — moisture-wicking technical fabrics keep you cool and dry through the most intense rallies. Wide Selection — with 214 products across men\u2019s, women\u2019s and unisex ranges, there\u2019s something to suit every playing style and budget. Trusted Brands — we stock official kit from Yonex, Victor, Babolat, Adidas, HEAD, K-Swiss, Li-Ning and FZ Forza.',
      },
      {
        heading: 'How To Choose the Right Apparel',
        content:
          'Fit — slim/athletic fits reduce drag and are preferred by competitive players; regular fits suit recreational and club players who want more freedom of movement. Fabric — look for polyester-elastane blends for stretch and quick-dry performance. Occasion — match shirts and skorts for competition; trackpants and jackets for warm-ups and travel to and from the club.',
      },
      {
        heading: 'Care and Maintenance',
        content:
          'Wash technical fabrics in cold water and avoid fabric softener, which can clog moisture-wicking fibres. Air dry where possible to preserve elastane stretch and colour.',
      },
    ],
    faqs: [
      {
        q: 'What size should I order?',
        a: 'Check each product\u2019s size guide, as sizing varies slightly between Yonex, Victor and other brands.',
      },
      {
        q: 'Is this apparel suitable for multiple sports?',
        a: 'Yes — most shirts, shorts and socks work equally well for badminton, tennis, padel and squash.',
      },
      {
        q: 'Do you stock junior sizes?',
        a: 'Yes, selected ranges include junior and youth sizing — check the size filter on each collection.',
      },
    ],
  },
  {
    handle: 'men-clothing',
    breadcrumb: "Men's Clothing",
    h1: "Men's Clothing",
    metaTitle: "Men's Racket Sports Clothing UK | Smash Racket Pro",
    metaDescription:
      "Shop men's tops, bottoms and socks for badminton, tennis and padel.",
    intro:
      "Shop our full range of men's badminton, tennis and padel clothing — from match-day shirts to training tops, shorts and performance socks — sourced from the same official brands worn on tour: Yonex, Victor, Babolat, Adidas, HEAD, K-Swiss and Li-Ning.",
    filters: { sport: 'clothing', gender: 'men' },
    body: [
      {
        heading: "Why Choose Our Men's Clothing?",
        content:
          'Breathable, Technical Fabrics — moisture-wicking polyester-elastane blends keep you cool and dry through the most intense rallies and smashes. Match Day to Training — slim, athletic-fit shirts and shorts for competition, alongside relaxed trackpants and jackets for warm-ups and travel to the club.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our men's clothing collection for competitive prices, fast UK shipping and official brand kit worn by the pros.",
      },
    ],
  },
  {
    handle: 'men-tops',
    breadcrumb: "Men's Tops",
    h1: "Men's Tops",
    metaTitle: "Men's Sports Tops UK | Smash Racket Pro",
    metaDescription:
      "Shop men's performance tops and t-shirts for badminton, tennis and padel.",
    intro:
      "Shop our range of men's match shirts, tanks and jackets from Yonex, Victor, Babolat and more — engineered with breathable, moisture-wicking fabric to keep you cool through the longest rallies.",
    filters: { sport: 'clothing', gender: 'men', category: 'tops' },
    body: [
      {
        heading: 'How To Choose',
        content:
          'Fit — slim and athletic fits reduce drag and are favoured by competitive players; regular fits suit recreational players who want more freedom of movement. Occasion — match shirts and tanks for competition; lightweight jackets for warm-ups and travel to and from the club.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our men's tops range for competitive prices and fast UK shipping, with sizing guidance available on every product page.",
      },
    ],
  },
  {
    handle: 'men-bottoms',
    breadcrumb: "Men's Bottoms",
    h1: "Men's Bottoms",
    metaTitle: "Men's Sports Shorts & Bottoms UK | Smash Racket Pro",
    metaDescription:
      "Shop men's performance shorts and bottoms for badminton, tennis and padel.",
    intro:
      "Shop our range of men's match shorts and training trackpants, built from stretch, quick-dry fabric that moves with you through every lunge and split-step.",
    filters: { sport: 'clothing', gender: 'men', category: 'bottoms' },
    body: [
      {
        heading: 'How To Choose',
        content:
          "Shorts — look for a built-in inner brief and side pockets for on-court storage during matches. Trackpants — ideal for warm-ups, travel and cooler-weather sessions, with a tapered fit that won't catch on your footwork.",
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our men's bottoms range for competitive prices and fast UK shipping, from top brands including Yonex, Victor and Babolat.",
      },
    ],
  },
  {
    handle: 'socks',
    breadcrumb: 'Sports Socks',
    h1: 'Sports Socks',
    metaTitle: 'Sports Socks UK | Smash Racket Pro',
    metaDescription:
      'Shop cushioned performance socks for badminton, tennis and padel.',
    intro:
      'Often overlooked, the right pair of socks makes a real difference to comfort and blister prevention through a long match. Our range includes cushioned, moisture-wicking performance socks from Yonex, Victor and Babolat.',
    filters: { sport: 'clothing', category: 'socks' },
    body: [
      {
        heading: 'Why Choose Our Socks?',
        content:
          'Cushioned Zones — extra padding at the heel and forefoot reduces impact through repeated lunging and jumping. Moisture-Wicking Fabric — keeps feet dry to help prevent blisters during long, intense matches.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          'Browse our socks collection for competitive prices and fast UK shipping — a small upgrade that makes a big difference on court.',
      },
    ],
  },
  {
    handle: 'women-clothing',
    breadcrumb: "Women's Clothing",
    h1: "Women's Clothing",
    metaTitle: "Women's Racket Sports Clothing UK | Smash Racket Pro",
    metaDescription:
      "Shop women's tops, bottoms and socks for badminton, tennis and padel.",
    intro:
      "Shop our full range of women's badminton, tennis and padel clothing — shirts, skorts, skirts, tanks and training wear from official brands including Yonex, Victor, Babolat and Adidas.",
    filters: { sport: 'clothing', gender: 'women' },
    body: [
      {
        heading: "Why Choose Our Women's Clothing?",
        content:
          'Breathable, Technical Fabrics — moisture-wicking polyester-elastane blends keep you cool and dry through the most intense rallies and smashes. Match Day to Training — fitted match shirts and skorts for competition, alongside relaxed trackpants and jackets for warm-ups and travel to the club.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our women's clothing collection for competitive prices, fast UK shipping and official brand kit worn by the pros.",
      },
    ],
  },
  {
    handle: 'women-tops',
    breadcrumb: "Women's Tops",
    h1: "Women's Tops",
    metaTitle: "Women's Sports Tops UK | Smash Racket Pro",
    metaDescription:
      "Shop women's performance tops for badminton, tennis and padel.",
    intro:
      "Shop our range of women's match shirts, tanks and jackets from Yonex, Victor, Babolat and more, engineered with breathable, moisture-wicking fabric for maximum comfort through long matches.",
    filters: { sport: 'clothing', gender: 'women', category: 'tops' },
    body: [
      {
        heading: 'How To Choose',
        content:
          'Fit — fitted, athletic cuts reduce drag for competitive players; relaxed fits suit recreational and social players. Occasion — match shirts and tanks for competition; lightweight jackets for warm-ups and travel to and from the club.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our women's tops range for competitive prices and fast UK shipping, with sizing guidance available on every product page.",
      },
    ],
  },
  {
    handle: 'women-bottoms',
    breadcrumb: "Women's Bottoms",
    h1: "Women's Bottoms",
    metaTitle: "Women's Sports Skirts, Shorts & Bottoms UK | Smash Racket Pro",
    metaDescription:
      "Shop women's performance skirts, shorts and bottoms for badminton, tennis and padel.",
    intro:
      "Shop our range of women's match skorts, skirts, shorts and training trackpants, built from stretch, quick-dry fabric that moves with you through every lunge and split-step.",
    filters: { sport: 'clothing', gender: 'women', category: 'bottoms' },
    body: [
      {
        heading: 'How To Choose',
        content:
          'Skorts & Skirts — built-in shorts underneath give full freedom of movement with a match-ready look. Trackpants — ideal for warm-ups, travel and cooler-weather sessions, with a fit that won\u2019t catch on your footwork.',
      },
      {
        heading: 'Shop With Confidence',
        content:
          "Browse our women's bottoms range for competitive prices and fast UK shipping, from top brands including Yonex, Victor and Babolat.",
      },
    ],
  },

  // ───────────────────────── OTHERS ─────────────────────────
  {
    handle: 'vendors',
    breadcrumb: 'Shop by Brand',
    h1: 'Shop by Brand',
    metaTitle: 'Shop by Brand | Yonex, Babolat, HEAD & More — Smash Racket Pro',
    metaDescription:
      'Browse every brand we stock across badminton, tennis and padel, from Yonex and Victor to Babolat, HEAD, Bullpadel and more.',
    intro:
      'Browse the full list of brands we stock at Smash Racket Pro, from Yonex, Victor, Babolat and HEAD through to K-Swiss, Adidas, Bullpadel, Li-Ning and more. Select a brand to see every racket, shoe, bag and piece of clothing we carry from them, all in one place.',
    filters: {},
    isVendorIndex: true,
  },
]

const collectionsByHandle: Record<string, CollectionConfig> =
  Object.fromEntries(collections.map((c) => [c.handle, c]))

export function getCollectionConfig(
  handle: string,
): CollectionConfig | undefined {
  return collectionsByHandle[handle]
}

export function getAllCollectionHandles(): string[] {
  return collections.map((c) => c.handle)
}

export function getAllCollections(): CollectionConfig[] {
  return collections
}

export function collectionFiltersToSearchParams(
  filters: CollectionFilters,
): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

export const VENDOR_BRAND_LIST = Object.entries(BRAND_LABELS).map(
  ([slug, label]) => ({
    slug,
    label,
  }),
)
