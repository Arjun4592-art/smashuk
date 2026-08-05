import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog-posts'
import { SITE_NAME } from '@/lib/constants'

export const metadata = { title: `Blog | ${SITE_NAME}` }

const CATEGORIES = ['All', ...Array.from(new Set(BLOG_POSTS.map((p) => p.category)))]

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = category && CATEGORIES.includes(category) ? category : 'All'
  const posts =
    active === 'All' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === active)

  return (
    <div className='max-w-5xl mx-auto px-4 py-12'>
      <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-2'>
        The {SITE_NAME} Blog
      </h1>
      <p className='text-gray-500 font-lato mb-6'>
        Buying guides, gear tips, and how-tos from our team.
      </p>

      {/* ── Category Tabs ── */}
      <div className='flex flex-wrap gap-2 mb-10'>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={cat === 'All' ? '/blog' : `/blog?category=${encodeURIComponent(cat)}`}
            className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors ${
              active === cat
                ? 'bg-[#E8553A] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className='group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-[#E8553A]/30 hover:shadow-[0_8px_24px_rgba(232,85,58,0.08)] transition-all'
          >
            <div className='aspect-[4/3] bg-gray-100 overflow-hidden'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImage}
                alt={post.title}
                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
              />
            </div>
            <div className='p-5'>
              <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider mb-2'>
                {post.category} · {post.readTime}
              </p>
              <h2 className='font-montserrat font-bold text-[#0A1F44] leading-snug mb-2 group-hover:text-[#E8553A] transition-colors'>
                {post.title}
              </h2>
              <p className='text-[13px] text-gray-500 font-lato line-clamp-2'>
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
