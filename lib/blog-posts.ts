// lib/blog-posts.ts
//
// Posts written in the dashboard (components/dashboard/BlogPostForm.tsx)
// are saved to Medusa's blog-post module via /admin/blog-posts. The
// website's /blog pages now read real, published posts straight from
// Medusa (getBlogPosts / getBlogPost below) instead of a static array.
//
// FALLBACK_BLOG_POSTS below is kept as seed/placeholder content — it's
// only shown if the Medusa fetch fails or returns zero published posts
// (e.g. fresh install, backend down), so /blog never renders empty.
//
// Follows the same server-vs-client fetch split used in lib/api/store.ts:
// server components (these functions) hit Medusa directly with the
// publishable key; client components should go through
// /api/store/blogs instead.

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string[] // paragraphs
  coverImage: string
  category: string
  publishedAt: string
  readTime: string
  seoTitle?: string
  seoDescription?: string
}

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

function estimateReadTime(html: string): string {
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 200))
  return `${minutes} min read`
}

function normalizeMedusaPost(p: any): BlogPost {
  // Content comes back from the rich text editor as HTML. The website
  // renders BlogPost.content as an array of paragraphs, so split on
  // block-level tags rather than trying to render raw HTML in a <p>.
  const html: string = p.content || ''
  const paragraphs = html
    .split(/<\/(?:p|h2|h3|li)>/i)
    .map((chunk: string) => chunk.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)

  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || '',
    content: paragraphs.length ? paragraphs : [html.replace(/<[^>]+>/g, '')],
    coverImage: p.cover_image || '/placeholder-blog.jpg',
    category: p.category?.name || 'General',
    publishedAt: p.published_at || p.created_at,
    readTime: estimateReadTime(html),
    seoTitle: p.seo_title || undefined,
    seoDescription: p.seo_description || undefined,
  }
}

/** Server-side only — fetches published posts directly from Medusa. */
export async function getBlogPosts(category?: string): Promise<BlogPost[]> {
  try {
    const params = new URLSearchParams({ status: 'published', limit: '100' })
    const res = await fetch(`${MEDUSA_URL}/store/blog-posts?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      next: { revalidate: 120 },
    })
    if (!res.ok) throw new Error(`Medusa blog-posts error: ${res.status}`)
    const data = await res.json()
    const posts: any[] = data.posts ?? data.blog_posts ?? []
    if (!posts.length) return FALLBACK_BLOG_POSTS
    const normalized = posts.map(normalizeMedusaPost)
    return category && category !== 'All'
      ? normalized.filter((p) => p.category === category)
      : normalized
  } catch (err) {
    console.error('[lib/blog-posts] getBlogPosts fallback:', err)
    return category && category !== 'All'
      ? FALLBACK_BLOG_POSTS.filter((p) => p.category === category)
      : FALLBACK_BLOG_POSTS
  }
}

/** Server-side only — fetches one published post by slug from Medusa. */
export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const res = await fetch(
      `${MEDUSA_URL}/store/blog-posts/${encodeURIComponent(slug)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        next: { revalidate: 120 },
      },
    )
    if (res.ok) {
      const data = await res.json()
      const post = data.post ?? data.blog_post
      if (post && post.status === 'published') return normalizeMedusaPost(post)
    }
  } catch (err) {
    console.error('[lib/blog-posts] getBlogPost fallback:', err)
  }
  // Fall back to seed content so a slug like the original placeholder
  // posts still resolves if Medusa is unreachable or the post isn't found.
  return FALLBACK_BLOG_POSTS.find((p) => p.slug === slug)
}

export async function getBlogCategories(): Promise<string[]> {
  const posts = await getBlogPosts()
  return ['All', ...Array.from(new Set(posts.map((p) => p.category)))]
}

export const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-choose-a-badminton-racket',
    title: 'How to Choose the Right Badminton Racket',
    excerpt:
      "Weight, balance, and string tension all change how a racket feels. Here's how to pick one that actually suits your game.",
    coverImage:
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80',
    category: 'Badminton',
    publishedAt: '2026-06-15',
    readTime: '5 min read',
    content: [
      'Picking a badminton racket comes down to three things: weight, balance, and string tension — and getting these right matters more than the brand on the frame.',
      'Weight is usually shown as 3U (85-89g) or 4U (80-84g). Lighter rackets (4U) are easier to swing fast for quick net play and defense, while heavier 3U rackets carry more power into your smashes if you can generate the swing speed.',
      'Balance is either head-heavy, even-balance, or head-light. Head-heavy rackets hit harder but tire your wrist faster; head-light rackets are quicker to maneuver, better for doubles and fast exchanges at the net.',
      "String tension changes feel more than most players expect. Lower tension (18-22 lbs) gives a bigger sweet spot and more power for beginners. Higher tension (24-28 lbs) gives more control and a crisper feel, but shrinks your margin for error — it's for players with consistent technique.",
      "If you're not sure, start with a 4U, even-balance racket strung around 20-22 lbs. It's the most forgiving setup to learn on, and you can always go heavier or tighter once you know what you're missing.",
    ],
  },
  {
    slug: 'squash-string-tension-guide',
    title: 'Squash String & Tension: A Practical Guide',
    excerpt:
      'Before choosing a squash string, get familiar with sweet spot size, tension trade-offs, and what actually suits beginners vs advanced players.',
    coverImage:
      'https://images.unsplash.com/photo-1613918431703-aa50889a3c19?w=1200&q=80',
    category: 'Squash',
    publishedAt: '2026-05-28',
    readTime: '4 min read',
    content: [
      'Every racket has a "sweet spot" — the area on the string bed that gives you maximum power with the least effort. Tension directly controls how big that sweet spot is.',
      'Higher tension shrinks the sweet spot but rewards players who consistently hit it dead-center with more control. Lower tension grows the sweet spot, making it far more forgiving — which is exactly why beginners and casual players get more power from lower tension, not higher.',
      'That\'s counter-intuitive to a lot of new players who assume "tighter strings = more power," but for anyone still developing consistent technique, a looser string bed does more of the work for you.',
      "The trade-off: tighter strings under high tension break more easily on mis-hits, since they're already stretched close to their limit.",
      'For string type, synthetic gut is durable and a great all-rounder for social players. Premium multifilament strings (like those from Tecnifibre and Ashaway) give better feel and control and are popular with intermediate-to-advanced players who can justify the higher cost and shorter lifespan.',
      "Not sure what tension your racket is currently strung at, or want to switch it up? Book a restring with us — it's often the cheapest performance upgrade you can make.",
    ],
  },
  {
    slug: 'tennis-racket-grip-size-guide',
    title: 'Tennis Racket Grip Size: How to Get It Right',
    excerpt:
      "The wrong grip size causes more mishits and arm strain than most players realize. Here's how to measure and choose correctly.",
    coverImage:
      'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=1200&q=80',
    category: 'Tennis',
    publishedAt: '2026-04-10',
    readTime: '3 min read',
    content: [
      'Grip size is one of the most overlooked specs when buying a tennis racket, but it directly affects control, comfort, and injury risk over time.',
      "A simple way to check: hold the racket in your normal grip, and try to fit the index finger of your free hand into the gap between your fingertips and palm. If it fits snugly, that's your size. Too much space means the grip is too small; no space at all means it's too big.",
      "A grip that's too small forces you to squeeze harder to control the racket, which is a common cause of tennis elbow over time. Too large, and you lose wrist snap and racket-head speed.",
      "If you're between sizes, sizing down and adding an overgrip is usually the better call — overgrips are cheap, easy to swap, and let you fine-tune the feel without committing to a grip that's permanently too big.",
    ],
  },
]
