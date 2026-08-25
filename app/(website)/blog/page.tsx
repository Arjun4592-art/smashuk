import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getBlogPosts, getBlogCategories } from '@/lib/blog-posts';
import { SPORTS } from '@/lib/blog-sports';
import { SITE_NAME } from '@/lib/constants';
export const metadata = {
  title: `Blog | ${SITE_NAME}`
};
export const revalidate = 120;
const PAGE_SIZE = 6;
type Post = Awaited<ReturnType<typeof getBlogPosts>>[number];
function Eyebrow({
  children
}: {
  children: React.ReactNode;
}) {
  return <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>;
}
function GridTexture() {
  return <svg className='absolute inset-0 w-full h-full opacity-[0.06]' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'>
      {Array.from({
      length: 20
    }).map((_, i) => <line key={'v' + i} x1={`${i * 5.5}%`} y1='0' x2={`${i * 5.5 + 3}%`} y2='100%' stroke='white' strokeWidth='1' />)}
      {Array.from({
      length: 12
    }).map((_, i) => <line key={'h' + i} x1='0' y1={`${i * 9}%`} x2='100%' y2={`${i * 9 + 2}%`} stroke='white' strokeWidth='1' />)}
    </svg>;
}
function formatDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
function FeaturedPost({
  post
}: {
  post: Post;
}) {
  return <Link href={`/blog/${post.slug}`} className='ls-card group grid sm:grid-cols-2 gap-0 bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden'>
      <div className='ls-card-img-wrap aspect-[16/10] sm:aspect-auto bg-gray-100'>
        {}
        <img src={post.coverImage} alt={post.title} className='w-full h-full object-cover' />
      </div>
      <div className='p-6 sm:p-8 flex flex-col justify-center'>
        <p className='text-[10px] text-[#E8553A] font-bold font-montserrat uppercase tracking-wider mb-3'>
          {post.category} · {post.readTime} · {formatDate(post.publishedAt)}
        </p>
        <h3 className='font-montserrat font-black text-[#0A1F44] text-xl leading-tight mb-3 group-hover:text-[#E8553A] transition-colors'>
          {post.title}
        </h3>
        <p className='text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3'>
          {post.excerpt}
        </p>
        <span className='ls-link-underline inline-block w-fit text-sm font-montserrat font-bold text-[#E8553A]'>
          Read The Full Guide →
        </span>
      </div>
    </Link>;
}
function PostCard({
  post
}: {
  post: Post;
}) {
  return <Link href={`/blog/${post.slug}`} className='ls-card group block bg-white rounded-2xl border border-[#0A1F44]/8 overflow-hidden'>
      <div className='ls-card-img-wrap aspect-[4/3] bg-gray-100'>
        {}
        <img src={post.coverImage} alt={post.title} className='w-full h-full object-cover' />
      </div>
      <div className='p-5'>
        <p className='text-[10px] text-[#E8553A] font-bold font-montserrat uppercase tracking-wider mb-2'>
          {post.category} · {post.readTime}
        </p>
        <h3 className='font-montserrat font-black text-[#0A1F44] text-base leading-snug mb-2 group-hover:text-[#E8553A] transition-colors'>
          {post.title}
        </h3>
        <p className='text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3'>
          {post.excerpt}
        </p>
        <span className='ls-link-underline inline-block text-xs font-montserrat font-semibold text-[#E8553A]'>
          Read Guide →
        </span>
      </div>
    </Link>;
}
export default async function BlogListPage({
  searchParams
}: {
  searchParams: Promise<{
    category?: string;
    page?: string;
  }>;
}) {
  const {
    category,
    page: pageParam
  } = await searchParams;
  const matchedSport = category ? SPORTS.find(s => s.name === category) : undefined;
  if (matchedSport) redirect(`/blog/${matchedSport.slug}`);
  const [categories, allPostsRaw] = await Promise.all([getBlogCategories(), getBlogPosts()]);
  const allPosts = [...allPostsRaw].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const active = category && categories.includes(category) ? category : 'All';
  const isFiltered = active !== 'All';
  const filteredPosts = isFiltered ? allPosts.filter(p => p.category === active) : allPosts;
  const showFeatured = !isFiltered;
  const featured = showFeatured ? filteredPosts[0] : undefined;
  const gridSource = showFeatured ? filteredPosts.slice(1) : filteredPosts;
  const totalPages = Math.max(1, Math.ceil(gridSource.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const pagePosts = gridSource.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const otherCategories = categories.filter(c => c !== 'All' && !SPORTS.some(s => s.name === c));
  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (isFiltered) params.set('category', active);
    if (n > 1) params.set('page', String(n));
    const qs = params.toString();
    return qs ? `/blog?${qs}` : '/blog';
  }
  const popular = allPosts.slice(0, 4);
  return <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-6xl mx-auto px-4 md:px-6 pt-16 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-6'>
            Blog
          </p>
          <Eyebrow>📝 Written by players, not copywriters</Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-4'>
            The {SITE_NAME.split(' ')[0]}{' '}
            <span className='text-[#E8553A]'>Blog</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-lg mb-8'>
            Buying guides, stringing advice and honest gear breakdowns from a
            team that actually plays badminton, tennis and padel — no fluff,
            just what actually helps your game.
          </p>
          <div className='flex flex-wrap gap-4 text-white/40 text-xs font-mono tracking-wide'>
            <span>{allPosts.length} guides published</span>
            <span>{Math.max(categories.length - 1, 0)} topics covered</span>
            <span>3 sports covered</span>
          </div>
        </div>
      </section>

      {}
      <section className='bg-white border-b border-[#0A1F44]/8 sticky top-0 z-10'>
        <div className='max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-2 overflow-x-auto'>
          <Link href='/blog' className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap ${active === 'All' ? 'bg-[#E8553A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            All
          </Link>
          {SPORTS.map(s => <Link key={s.slug} href={`/blog/${s.slug}`} className='px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap bg-gray-100 text-gray-500 hover:bg-gray-200'>
              <span className='mr-1'>{s.icon}</span>
              {s.name}
            </Link>)}
          {otherCategories.map(cat => <Link key={cat} href={`/blog?category=${encodeURIComponent(cat)}`} className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap ${active === cat ? 'bg-[#E8553A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {cat}
            </Link>)}
        </div>
      </section>

      {}
      <section className='max-w-6xl mx-auto px-4 md:px-6 py-12'>
        <div className='grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10'>
          {}
          <div>
            <div className='flex flex-wrap items-center justify-between gap-4 mb-8'>
              <h2 className='font-montserrat font-black text-[#0A1F44] text-2xl'>
                {isFiltered ? `${active} Guides` : 'Latest Posts'}
              </h2>
              {isFiltered && <Link href='/blog' className='bg-[#0A1F44]/5 hover:bg-[#0A1F44]/10 text-[#0A1F44] font-montserrat font-bold px-4 py-2 rounded-full text-xs transition-colors whitespace-nowrap'>
                  ← All Posts
                </Link>}
            </div>

            {filteredPosts.length === 0 ? <p className='text-gray-500 text-sm'>
                No {active.toLowerCase()} guides yet — check back soon.
              </p> : <div className='flex flex-col gap-8'>
                {featured && <FeaturedPost post={featured} />}

                {pagePosts.length > 0 && <div className='grid sm:grid-cols-2 gap-6'>
                    {pagePosts.map(post => <PostCard key={post.slug} post={post} />)}
                  </div>}
              </div>}

            {}
            {totalPages > 1 && <div className='flex items-center justify-center gap-2 mt-10'>
                <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page === 1} className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold transition-colors ${page === 1 ? 'pointer-events-none opacity-30 bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  ← Previous
                </Link>
                {Array.from({
              length: totalPages
            }).map((_, i) => {
              const n = i + 1;
              return <Link key={n} href={pageHref(n)} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-montserrat font-bold transition-colors ${page === n ? 'bg-[#E8553A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {n}
                    </Link>;
            })}
                <Link href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold transition-colors ${page === totalPages ? 'pointer-events-none opacity-30 bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  Next →
                </Link>
              </div>}
          </div>

          {}
          <aside className='flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start'>
            {}
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                Popular Posts
              </h3>
              <div className='flex flex-col gap-4'>
                {popular.map((post, i) => <Link key={post.slug} href={`/blog/${post.slug}`} className='group flex gap-3 items-center'>
                    <span className='flex-shrink-0 w-5 h-5 rounded-full bg-[#E8553A] text-white text-[11px] font-montserrat font-black flex items-center justify-center'>
                      {i + 1}
                    </span>
                    <div className='flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100'>
                      {}
                      <img src={post.coverImage} alt={post.title} className='w-full h-full object-cover' />
                    </div>
                    <span>
                      <span className='block text-sm font-montserrat font-bold text-[#0A1F44] leading-snug group-hover:text-[#E8553A] transition-colors'>
                        {post.title}
                      </span>
                      <span className='block text-[11px] text-gray-400 mt-1'>
                        {post.category} · {formatDate(post.publishedAt)}
                      </span>
                    </span>
                  </Link>)}
              </div>
            </div>

            {}
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                Browse By Sport
              </h3>
              <div className='flex flex-col gap-2'>
                {SPORTS.map(s => <Link key={s.slug} href={`/blog/${s.slug}`} className='flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-montserrat font-semibold bg-[#F5F3EF] text-[#0A1F44] hover:bg-[#0A1F44]/5 transition-colors'>
                    <span>
                      <span className='mr-2'>{s.icon}</span>
                      {s.name}
                    </span>
                    <span>→</span>
                  </Link>)}
              </div>
            </div>

            {}
            <div className='bg-[#0A1F44] rounded-2xl p-6'>
              <h3 className='font-montserrat font-black text-white text-sm uppercase tracking-wide mb-3'>
                Welcome
              </h3>
              <p className='text-white/50 text-[13px] leading-relaxed mb-4'>
                {SITE_NAME} is run by a team of racket sports players competing
                at club and county level in badminton, tennis and squash. We
                share what we&rsquo;ve learned on court so you can pick
                equipment that actually suits your game.
              </p>
              <Link href='/contact' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-5 py-2.5 rounded-full text-xs transition-colors'>
                Ask Us A Question
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>;
}
