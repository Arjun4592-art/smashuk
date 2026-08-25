import Link from 'next/link';
import { getBlogPosts } from '@/lib/blog-posts';
import { SPORTS, type SportConfig } from '@/lib/blog-sports';
import { SITE_NAME } from '@/lib/constants';
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
type Post = Awaited<ReturnType<typeof getBlogPosts>>[number];
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
export default async function SportBlogHub({
  sport
}: {
  sport: SportConfig;
}) {
  const postsRaw = await getBlogPosts(sport.name);
  const posts = [...postsRaw].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const [featured, ...rest] = posts;
  const otherSports = SPORTS.filter(s => s.slug !== sport.slug);
  return <div className='bg-[#F5F3EF] min-h-screen'>
      {}
      <section className='relative bg-[#0A1F44] overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-6xl mx-auto px-4 md:px-6 pt-16 pb-16'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-6'>
            <Link href='/blog' className='hover:text-white/70 transition-colors'>
              Blog
            </Link>{' '}
            / {sport.name}
          </p>
          <Eyebrow>
            {sport.icon} {sport.name} Guides
          </Eyebrow>
          <h1 className='font-montserrat font-black text-white text-4xl md:text-5xl leading-tight mb-4'>
            {sport.name}{' '}
            <span className='text-[#E8553A]'>Guides &amp; Advice</span>
          </h1>
          <p className='text-white/60 text-sm leading-relaxed max-w-lg mb-8'>
            {sport.intro}
          </p>
          <div className='flex flex-wrap gap-4 text-white/40 text-xs font-mono tracking-wide'>
            <span>
              {posts.length} {sport.name.toLowerCase()} guides
            </span>
          </div>
        </div>
      </section>

      {}
      <section className='bg-white border-b border-[#0A1F44]/8 sticky top-0 z-10'>
        <div className='max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-2 overflow-x-auto'>
          <Link href='/blog' className='px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap bg-gray-100 text-gray-500 hover:bg-gray-200'>
            All
          </Link>
          {SPORTS.map(s => <Link key={s.slug} href={`/blog/${s.slug}`} className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-bold transition-colors whitespace-nowrap ${s.slug === sport.slug ? 'bg-[#E8553A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <span className='mr-1'>{s.icon}</span>
              {s.name}
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
                All {sport.name} Guides
              </h2>
              <Link href='/blog' className='bg-[#0A1F44]/5 hover:bg-[#0A1F44]/10 text-[#0A1F44] font-montserrat font-bold px-4 py-2 rounded-full text-xs transition-colors whitespace-nowrap'>
                ← All Posts
              </Link>
            </div>

            {posts.length === 0 ? <p className='text-gray-500 text-sm'>
                No {sport.name.toLowerCase()} guides yet — check back soon.
              </p> : <div className='flex flex-col gap-8'>
                {featured && <FeaturedPost post={featured} />}
                {rest.length > 0 && <div className='grid sm:grid-cols-2 gap-6'>
                    {rest.map(post => <PostCard key={post.slug} post={post} />)}
                  </div>}
              </div>}
          </div>

          {}
          <aside className='flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start'>
            {}
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'>
              <h3 className='font-montserrat font-black text-[#0A1F44] text-sm uppercase tracking-wide mb-4'>
                Other Sports
              </h3>
              <div className='flex flex-col gap-2'>
                {otherSports.map(s => <Link key={s.slug} href={`/blog/${s.slug}`} className='flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-montserrat font-semibold bg-[#F5F3EF] text-[#0A1F44] hover:bg-[#0A1F44]/5 transition-colors'>
                    <span>
                      <span className='mr-2'>{s.icon}</span>
                      {s.name}
                    </span>
                    <span>→</span>
                  </Link>)}
                <Link href='/blog' className='flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-montserrat font-semibold bg-[#F5F3EF] text-[#0A1F44] hover:bg-[#0A1F44]/5 transition-colors'>
                  <span>📚 All Guides</span>
                  <span>→</span>
                </Link>
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
