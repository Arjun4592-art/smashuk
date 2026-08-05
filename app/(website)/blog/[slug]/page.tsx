import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BLOG_POSTS, getBlogPost } from '@/lib/blog-posts'
import { SITE_NAME } from '@/lib/constants'

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  return { title: post ? `${post.title} | ${SITE_NAME}` : SITE_NAME }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <article className='max-w-2xl mx-auto px-4 py-12'>
      <Link href='/blog' className='text-[13px] text-[#E8553A] hover:underline font-lato'>
        ← Back to Blog
      </Link>

      <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider mt-6 mb-2'>
        {post.category} · {post.readTime} ·{' '}
        {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-6 leading-tight'>
        {post.title}
      </h1>

      <div className='aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden mb-8'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.coverImage} alt={post.title} className='w-full h-full object-cover' />
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
