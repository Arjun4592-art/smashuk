'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? '';
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  published_at: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  category_id?: string | null;
  author?: string | null;
  content?: string | null;
  excerpt?: string | null;
  cover_image?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
}
function seoScore(post: BlogPost) {
  let score = 0;
  const contentLen = (post.content || '').replace(/<[^>]*>/g, '').trim().length;
  const seoTitle = post.seo_title || '';
  const seoDesc = post.seo_description || '';
  if (seoTitle.length >= 30 && seoTitle.length <= 65) score += 20;else if (seoTitle.length > 0) score += 8;
  if (seoDesc.length >= 50 && seoDesc.length <= 160) score += 20;else if (seoDesc.length > 0) score += 8;
  if (post.seo_keywords) score += 10;
  if (contentLen >= 300) score += 15;else if (contentLen > 0) score += 5;
  if (post.cover_image) score += 10;
  if (post.slug) score += 5;
  if (post.category?.id || post.category_id) score += 10;
  if (post.status === 'published') score += 10;
  return Math.min(score, 100);
}
function SeoScoreBadge({
  score
}: {
  score: number;
}) {
  const color = score >= 80 ? 'bg-[#E3F5F0] text-[#008060]' : score >= 50 ? 'bg-[#FFF4E4] text-[#B98900]' : 'bg-[#FDECEA] text-[#D82C0D]';
  const dot = score >= 80 ? 'bg-[#008060]' : score >= 50 ? 'bg-[#B98900]' : 'bg-[#D82C0D]';
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {score}/100
    </span>;
}
const ALL = '__all__';
export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [authorFilter, setAuthorFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blogs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load posts');
      setPosts(data.posts || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Post deleted');
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    }
  };
  const categoryOptions = Array.from(new Map(posts.filter(p => p.category?.id).map(p => [p.category!.id, p.category!.name])).entries());
  const authorOptions = Array.from(new Set(posts.map(p => p.author).filter((a): a is string => !!a)));
  const filtered = posts.filter(p => {
    if (!p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== ALL && p.status !== statusFilter) return false;
    if (categoryFilter !== ALL && p.category?.id !== categoryFilter) return false;
    if (authorFilter !== ALL && p.author !== authorFilter) return false;
    if (dateFrom || dateTo) {
      if (!p.published_at) return false;
      const d = new Date(p.published_at).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo && d > new Date(dateTo).getTime() + 86400000 - 1) return false;
    }
    return true;
  });
  const selectClass = 'px-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 bg-white text-[#202223] hover:border-[#C9CCCF] transition-colors cursor-pointer';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter(ALL);
    setCategoryFilter(ALL);
    setAuthorFilter(ALL);
    setDateFrom('');
    setDateTo('');
  };
  const hasActiveFilters = search || statusFilter !== ALL || categoryFilter !== ALL || authorFilter !== ALL || dateFrom || dateTo;
  return <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-semibold text-[#202223]'>Blog Posts</h1>
          <p className='text-[13px] text-[#6D7175] mt-1'>
            Manage your blog content
          </p>
        </div>
        <div className='flex gap-2'>
          <Link href='/dashboard/blog-categories' className='px-3.5 py-2 text-[13px] font-medium text-[#202223] bg-white border border-[#E1E3E5] rounded-lg no-underline hover:bg-[#F6F6F7]'>
            Manage Categories
          </Link>
          <Link href='/dashboard/blogs/new' className='px-3.5 py-2 text-[13px] font-medium text-white bg-[#008060] rounded-lg no-underline hover:bg-[#006e52]'>
            + New Post
          </Link>
        </div>
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-xl p-4 mb-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <div className='relative'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <circle cx='11' cy='11' r='7' />
              <path d='m21 21-4.35-4.35' strokeLinecap='round' />
            </svg>
            <input type='text' placeholder='Search posts...' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 pr-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 w-60 transition-shadow' />
          </div>

          <span className='w-px h-6 bg-[#E1E3E5]' />

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All statuses</option>
            <option value='draft'>Draft</option>
            <option value='published'>Published</option>
          </select>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All categories</option>
            {categoryOptions.map(([id, name]) => <option key={id} value={id}>
                {name}
              </option>)}
          </select>

          <select value={authorFilter} onChange={e => setAuthorFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All authors</option>
            {authorOptions.map(a => <option key={a} value={a}>
                {a}
              </option>)}
          </select>

          <span className='w-px h-6 bg-[#E1E3E5]' />

          <div className='flex items-center gap-1.5 bg-[#FAFBFB] border border-[#E1E3E5] rounded-lg px-2 py-1'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2' className='shrink-0'>
              <rect x='3' y='4' width='18' height='18' rx='2' />
              <path d='M16 2v4M8 2v4M3 10h18' strokeLinecap='round' />
            </svg>
            <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} className='text-[13px] bg-transparent outline-none border-none text-[#202223] w-[122px]' aria-label='Published from' />
            <span className='text-[13px] text-[#8C9196]'>–</span>
            <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} className='text-[13px] bg-transparent outline-none border-none text-[#202223] w-[122px]' aria-label='Published to' />
          </div>

          {hasActiveFilters && <button onClick={clearFilters} className='ml-auto flex items-center gap-1 px-3 py-2 text-[13px] font-medium text-[#D82C0D] bg-[#FDECEA] border-none rounded-lg cursor-pointer hover:bg-[#FBDBD7] transition-colors'>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                <path d='M18 6 6 18M6 6l12 12' strokeLinecap='round' />
              </svg>
              Clear filters
            </button>}
        </div>
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-lg overflow-hidden'>
        <table className='w-full text-left text-[13px]'>
          <thead>
            <tr className='border-b border-[#E1E3E5] bg-[#FAFBFB]'>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Title</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Category</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Author</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Status</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>
                SEO Score
              </th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>
                Published
              </th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-[#8C9196]'>
                  Loading...
                </td>
              </tr>}
            {!loading && filtered.length === 0 && <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-[#8C9196]'>
                  No blog posts yet.{' '}
                  <Link href='/dashboard/blogs/new' className='text-[#008060]'>
                    Create your first post
                  </Link>
                </td>
              </tr>}
            {filtered.map(post => <tr key={post.id} className='border-b border-[#E1E3E5] last:border-0 hover:bg-[#FAFBFB]'>
                <td className='px-4 py-3 font-medium text-[#202223]'>
                  {post.title}
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>
                  {post.category?.name ?? '—'}
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>
                  {post.author || '—'}
                </td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${post.status === 'published' ? 'bg-[#E3F5F0] text-[#008060]' : 'bg-[#F1F1F1] text-[#6D7175]'}`}>
                    {post.status}
                  </span>
                </td>
                <td className='px-4 py-3'>
                  <SeoScoreBadge score={seoScore(post)} />
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center justify-end gap-3'>
                    {}
                    {post.status === 'published' && post.slug && SITE_URL ? <a href={`${SITE_URL}/blog/${post.slug}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-[#6D7175] no-underline hover:text-[#202223] transition-colors' title={`${SITE_URL}/blog/${post.slug}`}>
                        View
                        <svg width='11' height='11' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                          <path d='M2 10L10 2M10 2H5.5M10 2V6.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      </a> : post.status === 'draft' ? <span className='text-[#C4C8CC] cursor-not-allowed' title='Publish post to view live'>
                        View
                      </span> : null}

                    <Link href={`/dashboard/blogs/${post.id}`} className='text-[#008060] no-underline hover:text-[#006e52]'>
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(post.id, post.title)} className='text-[#D82C0D] bg-transparent border-none cursor-pointer text-[13px] hover:text-[#b02309]'>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}
