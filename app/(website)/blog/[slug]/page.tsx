import { notFound } from 'next/navigation'
import Link from 'next/link'
import sanitizeHtml from 'sanitize-html'
import { getBlogPost, getBlogPosts } from '@/lib/blog-posts'
import { SPORTS } from '@/lib/blog-sports'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { generateBlogPostSchema, safeJsonLd } from '@/lib/seo'
import NewsletterForm from '@/components/website/NewsletterForm'
import ShareRow from '@/components/website/blog/ShareRow'
import BlogProductEmbedHydrator from '@/components/website/blog/BlogProductEmbedHydrator'
import { FacebookIcon, InstagramIcon, EditIcon } from '@/components/ui/Icons'
export const revalidate = 120
// sanitize-html is a pure-JS, dependency-light HTML sanitizer with no jsdom/ESM
// interop issues, so it works reliably in Vercel's serverless/Turbopack bundle
// (isomorphic-dompurify pulls in jsdom -> html-encoding-sniffer -> @exodus/bytes,
// which ships as an ESM-only file that Turbopack's server require() can't load).
function sanitizeBlogHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'video',
      'h1',
      'h2',
      'iframe',
      'p',
      'a',
      'button',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
      video: ['src', 'controls', 'width', 'height', 'poster'],
      button: ['type', 'class'],
      a: [
        'href',
        'name',
        'target',
        'rel',
        'class',
        'data-product-id',
        'data-handle',
        'data-title',
        'data-price',
      ],
      // "class" on div/p/a is only used for the product-embed and
      // product-grid-embed card markup produced by the blog editor's
      // product picker(s).
      div: [
        'class',
        'data-product-id',
        'data-handle',
        'data-title',
        'data-price',
        'data-count',
      ],
      p: ['class'],
      iframe: [
        'src',
        'width',
        'height',
        'allow',
        'allowfullscreen',
        'frameborder',
      ],
    },
    allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
  })
}
function formatDate(d: string) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string
  }>
}) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post)
    return {
      title: SITE_NAME,
    }
  return {
    title: post.seoTitle || `${post.title} | ${SITE_NAME}`,
    description: post.seoDescription || post.excerpt,
  }
}
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{
    slug: string
  }>
}) {
  const { slug } = await params
  const [post, allPostsRaw] = await Promise.all([
    getBlogPost(slug),
    getBlogPosts(),
  ])
  if (!post) notFound()
  const allPosts = [...allPostsRaw].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug)
  const previousPost =
    currentIndex >= 0 ? allPosts[currentIndex + 1] : undefined
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : undefined
  const popular = allPosts.filter((p) => p.slug !== post.slug).slice(0, 5)
  const sport = SPORTS.find((s) => s.name === post.category)
  const postUrl = `${SITE_URL}/blog/${post.slug}`
  return (
    <div className='bg-[#F5F3EF] min-h-screen'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(generateBlogPostSchema(post)),
        }}
      />

      <div className='max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14'>
        <Link
          href='/blog'
          className='text-[13px] text-[#E8553A] hover:underline font-lato font-semibold'
        >
          ← Back to Blog
        </Link>

        <div className='mt-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10'>
          {}
          <article className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6 md:p-10'>
            <p className='text-[10px] text-[#E8553A] font-bold font-montserrat uppercase tracking-wider mb-3'>
              {post.category} · {post.readTime} · {formatDate(post.publishedAt)}
            </p>

            <h1
              className={`font-montserrat font-black text-3xl md:text-4xl text-[#0A1F44] leading-tight ${post.author ? 'mb-2' : 'mb-4'}`}
            >
              {post.title}
            </h1>

            {post.author && (
              <p className='flex items-center gap-1.5 text-[13px] text-gray-500 font-lato mb-4'>
                By{' '}
                <span className='font-semibold text-[#0A1F44]'>
                  {post.author}
                </span>
                <EditIcon size={13} className='text-gray-400' />
              </p>
            )}

            <div className='mb-6'>
              <ShareRow url={postUrl} title={post.title} />
            </div>

            <div className='aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden mb-8'>
              {}
              <img
                src={post.coverImage}
                alt={post.title}
                className='w-full h-full object-cover'
              />
            </div>

            <div
              id='blog-post-content'
              className='prose prose-sm max-w-none font-lato text-gray-600 leading-relaxed [&_h1]:font-montserrat [&_h1]:font-black [&_h1]:text-[#0A1F44] [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:font-montserrat [&_h2]:font-black [&_h2]:text-[#0A1F44] [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:font-montserrat [&_h3]:font-bold [&_h3]:text-[#0A1F44] [&_h3]:text-lg [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:font-montserrat [&_h4]:font-bold [&_h4]:text-[#0A1F44] [&_h4]:text-base [&_h4]:mt-4 [&_h4]:mb-2 [&_h5]:font-montserrat [&_h5]:font-bold [&_h5]:text-[#0A1F44] [&_h5]:text-[13px] [&_h5]:uppercase [&_h5]:tracking-wide [&_h5]:mt-4 [&_h5]:mb-2 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-4 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8553A]/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-5 [&_blockquote]:italic [&_blockquote]:text-[#0A1F44] [&_a]:text-[#E8553A] [&_a]:underline [&_img]:rounded-xl [&_img]:my-5 [&_video]:rounded-xl [&_video]:my-5 [&_video]:max-w-full [&_table]:border-collapse [&_table]:w-full [&_table]:my-5 [&_table]:text-sm [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-montserrat [&_th]:font-bold [&_th]:text-[#0A1F44] [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_.product-embed]:not-prose [&_.product-embed]:my-6 [&_.product-embed]:border [&_.product-embed]:border-[#0A1F44]/10 [&_.product-embed]:rounded-2xl [&_.product-embed]:overflow-hidden [&_.product-embed]:max-w-[240px] [&_.product-embed]:bg-white [&_.product-embed]:transition-all [&_.product-embed]:duration-300 [&_.product-embed]:hover:shadow-[0_8px_32px_rgba(232,85,58,0.10)] [&_.product-embed]:hover:-translate-y-1 [&_.product-embed-link]:block [&_.product-embed-link]:no-underline [&_.product-embed-image-wrap]:aspect-square [&_.product-embed-image-wrap]:bg-[#F2F4F7] [&_.product-embed-image]:w-full [&_.product-embed-image]:h-full [&_.product-embed-image]:object-cover [&_.product-embed-info]:p-4 [&_.product-embed-info]:pb-3 [&_.product-embed-title]:font-montserrat [&_.product-embed-title]:font-bold [&_.product-embed-title]:text-[#0A1F44] [&_.product-embed-title]:text-sm [&_.product-embed-title]:my-0 [&_.product-embed-title]:line-clamp-2 [&_.product-embed-price]:text-[#E8553A] [&_.product-embed-price]:font-semibold [&_.product-embed-price]:text-sm [&_.product-embed-price]:my-0 [&_.product-embed-price]:mt-1.5 [&_.product-embed-add-btn]:block [&_.product-embed-add-btn]:mx-4 [&_.product-embed-add-btn]:mb-4 [&_.product-embed-add-btn]:w-[calc(100%-2rem)] [&_.product-embed-add-btn]:py-2.5 [&_.product-embed-add-btn]:rounded-xl [&_.product-embed-add-btn]:bg-[#0A1F44] [&_.product-embed-add-btn]:text-white [&_.product-embed-add-btn]:text-[12px] [&_.product-embed-add-btn]:font-montserrat [&_.product-embed-add-btn]:font-bold [&_.product-embed-add-btn]:uppercase [&_.product-embed-add-btn]:tracking-wide [&_.product-embed-add-btn]:transition-colors [&_.product-embed-add-btn]:cursor-pointer [&_.product-embed-add-btn]:hover:bg-[#E8553A] [&_.product-embed-add-btn]:disabled:opacity-60 [&_.product-embed-add-btn]:disabled:cursor-not-allowed [&_.product-grid-embed]:not-prose [&_.product-grid-embed]:grid [&_.product-grid-embed]:grid-cols-2 sm:[&_.product-grid-embed]:grid-cols-4 [&_.product-grid-embed]:gap-4 [&_.product-grid-embed]:my-6 [&_.product-grid-item]:flex [&_.product-grid-item]:flex-col [&_.product-grid-item]:justify-between [&_.product-grid-item]:border [&_.product-grid-item]:border-[#0A1F44]/10 [&_.product-grid-item]:rounded-xl [&_.product-grid-item]:p-3 [&_.product-grid-item]:bg-[#F5F3EF]/40 [&_.product-grid-item]:transition-transform [&_.product-grid-item]:hover:-translate-y-0.5 [&_.product-grid-link]:block [&_.product-grid-link]:no-underline [&_.product-grid-image]:w-full [&_.product-grid-image]:aspect-square [&_.product-grid-image]:rounded-lg [&_.product-grid-image]:object-cover [&_.product-grid-image]:mb-2 [&_.product-grid-title]:font-montserrat [&_.product-grid-title]:font-bold [&_.product-grid-title]:text-[#0A1F44] [&_.product-grid-title]:text-[13px] [&_.product-grid-title]:my-0 [&_.product-grid-title]:line-clamp-2 [&_.product-grid-price]:text-[#E8553A] [&_.product-grid-price]:font-semibold [&_.product-grid-price]:text-[13px] [&_.product-grid-price]:my-0 [&_.product-grid-price]:mt-1 [&_.product-grid-add-btn]:block [&_.product-grid-add-btn]:mt-3 [&_.product-grid-add-btn]:w-full [&_.product-grid-add-btn]:py-2 [&_.product-grid-add-btn]:rounded-lg [&_.product-grid-add-btn]:bg-[#0A1F44] [&_.product-grid-add-btn]:text-white [&_.product-grid-add-btn]:text-[11px] [&_.product-grid-add-btn]:font-montserrat [&_.product-grid-add-btn]:font-bold [&_.product-grid-add-btn]:uppercase [&_.product-grid-add-btn]:tracking-wide [&_.product-grid-add-btn]:transition-colors [&_.product-grid-add-btn]:cursor-pointer [&_.product-grid-add-btn]:hover:bg-[#E8553A] [&_.product-grid-add-btn]:disabled:opacity-60 [&_.product-grid-add-btn]:disabled:cursor-not-allowed'
            >
              {post.contentHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeBlogHtml(post.contentHtml),
                  }}
                />
              ) : (
                post.content.map((para, i) => <p key={i}>{para}</p>)
              )}
            </div>

            <BlogProductEmbedHydrator containerId='blog-post-content' />

            {}
            <div className='flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-gray-100'>
              <span className='text-[11px] font-montserrat font-bold text-gray-400 uppercase tracking-wide mr-1'>
                Tags
              </span>
              <Link
                href={sport ? `/blog/${sport.slug}` : '/blog'}
                className='px-3 py-1 rounded-full bg-[#F5F3EF] text-[#0A1F44] text-xs font-montserrat font-semibold hover:bg-[#0A1F44]/10 transition-colors'
              >
                {post.category}
              </Link>
              <Link
                href='/blog'
                className='px-3 py-1 rounded-full bg-[#F5F3EF] text-[#0A1F44] text-xs font-montserrat font-semibold hover:bg-[#0A1F44]/10 transition-colors'
              >
                Tips &amp; Advice
              </Link>
            </div>

            {}
            <div className='flex flex-wrap items-center justify-between gap-4 mt-6'>
              <ShareRow url={postUrl} title={post.title} />
              <Link
                href='/shop'
                className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap'
              >
                Shop {post.category}
              </Link>
            </div>

            {}
            {(previousPost || nextPost) && (
              <div className='grid sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100'>
                <div>
                  {previousPost && (
                    <Link
                      href={`/blog/${previousPost.slug}`}
                      className='group block'
                    >
                      <span className='text-[11px] text-gray-400 font-montserrat font-bold uppercase tracking-wide'>
                        ← Previous Article
                      </span>
                      <span className='block text-sm font-montserrat font-bold text-[#0A1F44] group-hover:text-[#E8553A] transition-colors mt-1'>
                        {previousPost.title}
                      </span>
                    </Link>
                  )}
                </div>
                <div className='sm:text-right'>
                  {nextPost && (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className='group block'
                    >
                      <span className='text-[11px] text-gray-400 font-montserrat font-bold uppercase tracking-wide'>
                        Next Article →
                      </span>
                      <span className='block text-sm font-montserrat font-bold text-[#0A1F44] group-hover:text-[#E8553A] transition-colors mt-1'>
                        {nextPost.title}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </article>

          {}
          <aside className='flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start'>
            {}
            {popular.length > 0 && (
              <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
                <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                  Popular Posts
                </h3>
                <div className='flex flex-col gap-4'>
                  {popular.map((p, i) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className='group flex gap-3 items-center'
                    >
                      <span className='flex-shrink-0 w-5 h-5 rounded-full bg-[#E8553A] text-white text-[11px] font-montserrat font-black flex items-center justify-center'>
                        {i + 1}
                      </span>
                      <div className='flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100'>
                        {}
                        <img
                          src={p.coverImage}
                          alt={p.title}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <span>
                        <span className='block text-sm font-montserrat font-bold text-[#0A1F44] leading-snug group-hover:text-[#E8553A] transition-colors'>
                          {p.title}
                        </span>
                        <span className='block text-[11px] text-gray-400 mt-1'>
                          {p.category} · {formatDate(p.publishedAt)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {}
            <div className='bg-[#0A1F44] rounded-2xl p-6'>
              <h3 className='font-montserrat font-black text-white text-sm uppercase tracking-wide mb-2'>
                Get Exclusive News &amp; Offers!
              </h3>
              <p className='text-white/50 text-[13px] leading-relaxed mb-4'>
                Get access to our weekly blog on the latest products and news!
              </p>
              <NewsletterForm variant='dark' />
              <p className='text-white/30 text-[11px] mt-6'>
                100% free, unsubscribe any time!
              </p>
            </div>

            {}
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                Follow Us
              </h3>
              <div className='flex gap-2'>
                <a
                  href='https://facebook.com/smashpro'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Follow us on Facebook'
                  className='w-9 h-9 rounded-full bg-[#F5F3EF] hover:bg-[#0A1F44]/10 flex items-center justify-center text-[#0A1F44] transition-colors'
                >
                  <FacebookIcon size={15} />
                </a>
                <a
                  href='https://instagram.com/smashpro'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Follow us on Instagram'
                  className='w-9 h-9 rounded-full bg-[#F5F3EF] hover:bg-[#0A1F44]/10 flex items-center justify-center text-[#0A1F44] transition-colors'
                >
                  <InstagramIcon size={15} />
                </a>
              </div>
            </div>

            {}
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                Browse By Sport
              </h3>
              <div className='flex flex-col gap-2'>
                {SPORTS.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/blog/${s.slug}`}
                    className='flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-montserrat font-semibold bg-[#F5F3EF] text-[#0A1F44] hover:bg-[#0A1F44]/5 transition-colors'
                  >
                    <span>
                      <span className='mr-2'>{s.icon}</span>
                      {s.name}
                    </span>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
