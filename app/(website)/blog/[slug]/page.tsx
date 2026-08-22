import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBlogPost } from '@/lib/blog-posts'
import { SITE_NAME } from '@/lib/constants'
import { generateBlogPostSchema, safeJsonLd } from '@/lib/seo'

// Posts are managed live from the dashboard now, so this renders on
// demand (revalidated every 2 min via the fetch cache in
// lib/blog-posts.ts) instead of only pre-building the old static slugs.
export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return { title: SITE_NAME }
  return {
    title: post.seoTitle || `${post.title} | ${SITE_NAME}`,
    description: post.seoDescription || post.excerpt,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  return (
    <article className='max-w-2xl mx-auto px-4 py-12'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(generateBlogPostSchema(post)),
        }}
      />
      <Link
        href='/blog'
        className='text-[13px] text-[#E8553A] hover:underline font-lato'
      >
        ← Back to Blog
      </Link>

      <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider mt-6 mb-2'>
        {post.category} · {post.readTime} ·{' '}
        {new Date(post.publishedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-6 leading-tight'>
        {post.title}
      </h1>

      <div className='aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden mb-8'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverImage}
          alt={post.title}
          className='w-full h-full object-cover'
        />
      </div>

      <div className='prose prose-sm max-w-none font-lato text-gray-600 space-y-4 leading-relaxed'>
        {post.content.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className='mt-10 pt-8 border-t border-gray-100'>
        <Link
          href='/shop'
          className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors'
        >
          Shop {post.category}
        </Link>
      </div>
    </article>
  )
}
