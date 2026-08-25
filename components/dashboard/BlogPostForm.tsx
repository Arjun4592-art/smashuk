'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import RichTextEditor from '@/components/dashboard/Richtexteditor';
import CoverImageUpload from '@/components/dashboard/Coverimageupload';
import { SITE_URL } from '@/lib/constants';
interface Category {
  id: string;
  name: string;
}
interface Props {
  postId?: string;
}
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function CharBar({
  value,
  max,
  warn,
  danger
}: {
  value: number;
  max: number;
  warn: number;
  danger: number;
}) {
  const pct = Math.min(value / max * 100, 100);
  const color = value > danger ? 'bg-[#D82C0D]' : value > warn ? 'bg-[#008060]' : 'bg-[#FFC453]';
  return <div className='mt-1.5 h-1 bg-[#E1E3E5] rounded-full overflow-hidden'>
      <div className={`h-full rounded-full transition-all ${color}`} style={{
      width: `${pct}%`
    }} />
    </div>;
}
function SidebarCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
      <div className='px-4 py-3 border-b border-[#E1E3E5] bg-[#FAFBFB]'>
        <h3 className='text-[12.5px] font-semibold text-[#202223] uppercase tracking-wide'>
          {title}
        </h3>
      </div>
      <div className='p-4'>{children}</div>
    </div>;
}
export default function BlogPostForm({
  postId
}: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  useEffect(() => {
    fetch('/api/admin/blog-categories').then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!postId) return;
    fetch(`/api/admin/blogs/${postId}`).then(r => r.json()).then(d => {
      const p = d.post;
      setTitle(p.title);
      setSlug(p.slug);
      setExcerpt(p.excerpt || '');
      setContent(p.content || '');
      setCoverImage(p.cover_image || '');
      setCategoryId(p.category?.id || p.category_id || '');
      setAuthor(p.author || '');
      setStatus(p.status === 'published' ? 'published' : 'draft');
      setPublishedAt(p.published_at || null);
      setSeoTitle(p.seo_title || '');
      setSeoDescription(p.seo_description || '');
      setSeoKeywords(p.seo_keywords || '');
    }).catch(() => toast.error('Failed to load post')).finally(() => setLoading(false));
  }, [postId]);
  const handleSave = async (nextStatus?: 'draft' | 'published') => {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error('Title, slug and content are required');
      return;
    }
    const finalStatus = nextStatus ?? status;
    setSaving(true);
    const body = {
      title,
      slug,
      excerpt,
      content,
      cover_image: coverImage,
      category_id: categoryId || null,
      author,
      status: finalStatus,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords
    };
    try {
      const res = await fetch(postId ? `/api/admin/blogs/${postId}` : '/api/admin/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStatus(finalStatus);
      toast.success(finalStatus === 'published' ? postId ? 'Post updated' : 'Post published' : 'Draft saved');
      router.push('/dashboard/blogs');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className='p-6 text-[#8C9196] text-[13px]'>Loading...</div>;
  }
  const inputClass = 'w-full px-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all';
  const labelClass = 'block text-[12.5px] font-medium text-[#202223] mb-1.5';
  const effectiveSeoTitle = seoTitle || title;
  const effectiveSeoDescription = seoDescription || excerpt;
  return <div className='p-6 max-w-6xl'>
      {}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-semibold text-[#202223]'>
            {postId ? 'Edit Post' : 'Add New Post'}
          </h1>
          {status === 'published' && publishedAt && <p className='text-[12px] text-[#6D7175] mt-0.5'>
              Published on{' '}
              {new Date(publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
            </p>}
        </div>
        <button onClick={() => router.push('/dashboard/blogs')} className='px-3.5 py-2 text-[13px] font-medium text-[#202223] bg-white border border-[#E1E3E5] rounded-lg cursor-pointer hover:bg-[#F6F6F7]'>
          Cancel
        </button>
      </div>

      {}
      <div className='grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start'>
        {}
        <div className='flex flex-col gap-4 min-w-0'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-4'>
            <input className='w-full text-[24px] font-semibold text-[#202223] placeholder-[#C4C7CA] outline-none border-none mb-2' value={title} onChange={e => {
            setTitle(e.target.value);
            if (!postId) setSlug(slugify(e.target.value));
          }} placeholder='Add title' />

            {}
            <div className='flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#6D7175]'>
              <span>Permalink:</span>
              {editingSlug ? <>
                  <span className='text-[#8C9196]'>{SITE_URL}/blog/</span>
                  <input autoFocus className='px-2 py-1 border border-[#E1E3E5] rounded-md text-[12.5px] outline-none focus:border-[#008060]' value={slug} onChange={e => setSlug(slugify(e.target.value))} onBlur={() => setEditingSlug(false)} onKeyDown={e => e.key === 'Enter' && setEditingSlug(false)} />
                  <button type='button' onClick={() => setEditingSlug(false)} className='px-2.5 py-1 text-[12px] font-medium text-white bg-[#008060] rounded-md cursor-pointer hover:bg-[#006e52]'>
                    OK
                  </button>
                </> : <>
                  <span className='text-[#2C6ECB]'>
                    {SITE_URL}/blog/{slug || 'your-post-slug'}
                  </span>
                  <button type='button' onClick={() => setEditingSlug(true)} className='px-2 py-0.5 text-[12px] font-medium text-[#2C6ECB] bg-transparent border-none cursor-pointer hover:underline'>
                    Edit
                  </button>
                </>}
            </div>
          </div>

          <div className='bg-white border border-[#E1E3E5] rounded-xl p-4'>
            <label className={labelClass}>Content</label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className='bg-white border border-[#E1E3E5] rounded-xl p-4'>
            <label className={labelClass}>
              Excerpt{' '}
              <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                — shown in the blog list and used as fallback SEO description
              </span>
            </label>
            <textarea className={inputClass} rows={3} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder='A short summary shown in the blog list' />
          </div>
        </div>

        {}
        <div className='flex flex-col gap-4'>
          {}
          <SidebarCard title='Publish'>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between text-[13px]'>
                <span className='text-[#6D7175]'>Status:</span>
                <span className={`font-medium px-2 py-0.5 rounded-full text-[11.5px] ${status === 'published' ? 'bg-[#E3F5E9] text-[#008060]' : 'bg-[#F1F1F1] text-[#6D7175]'}`}>
                  {status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className='flex gap-2 pt-1 border-t border-[#F1F1F1]'>
                <button onClick={() => handleSave('draft')} disabled={saving} className='flex-1 px-3.5 py-2 text-[13px] font-medium text-[#202223] bg-white border border-[#E1E3E5] rounded-lg cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-60'>
                  Save Draft
                </button>
                <button onClick={() => handleSave('published')} disabled={saving} className='flex-1 px-3.5 py-2 text-[13px] font-medium text-white bg-[#008060] rounded-lg cursor-pointer hover:bg-[#006e52] disabled:opacity-60'>
                  {saving ? 'Saving...' : status === 'published' ? 'Update' : 'Publish'}
                </button>
              </div>
            </div>
          </SidebarCard>

          {}
          <SidebarCard title='Category'>
            <select className={inputClass} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value=''>No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>
                  {c.name}
                </option>)}
            </select>
          </SidebarCard>

          {}
          <SidebarCard title='Author'>
            <input type='text' className={inputClass} value={author} onChange={e => setAuthor(e.target.value)} placeholder='e.g. SMASH UK Team' />
            <p className='mt-1.5 text-[11px] text-[#8C9196]'>
              Shown on the post as &ldquo;By {author || '...'}&rdquo;
            </p>
          </SidebarCard>

          {}
          <SidebarCard title='Featured Image'>
            <CoverImageUpload value={coverImage} onChange={setCoverImage} />
          </SidebarCard>

          {}
          <SidebarCard title='SEO'>
            <div className='flex flex-col gap-4'>
              {}
              <div className='p-3 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg'>
                <p className='text-[10.5px] font-semibold text-[#8C9196] uppercase tracking-wide mb-2'>
                  Google Search Preview
                </p>
                <p className='text-[#2C6ECB] text-[14px] truncate'>
                  {effectiveSeoTitle || 'Post Title'}
                </p>
                <p className='text-[#008060] text-[11.5px] my-0.5'>
                  {SITE_URL}/blog/{slug || 'your-post-slug'}
                </p>
                <p className='text-[#6D7175] text-[12px] leading-relaxed line-clamp-2'>
                  {effectiveSeoDescription || 'Meta description will appear here...'}
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  SEO Title{' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    {seoTitle.length}/60
                  </span>
                </label>
                <input type='text' className={inputClass} value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={60} placeholder={title || 'Defaults to post title'} />
                <CharBar value={seoTitle.length} max={60} warn={30} danger={55} />
              </div>

              <div>
                <label className={labelClass}>
                  Meta Description{' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    {seoDescription.length}/160
                  </span>
                </label>
                <textarea className={inputClass} rows={3} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} maxLength={160} placeholder={excerpt || 'Defaults to excerpt'} />
                <CharBar value={seoDescription.length} max={160} warn={80} danger={150} />
              </div>

              <div>
                <label className={labelClass}>
                  Focus Keywords{' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    (comma separated)
                  </span>
                </label>
                <input type='text' className={inputClass} value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder='badminton racket, string tension' />
              </div>

              {}
              <div>
                <label className={labelClass}>
                  Schema (auto-generated){' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    — added automatically, nothing to fill in
                  </span>
                </label>
                <div className='px-3 py-2.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg text-[12px] text-[#6D7175] leading-relaxed'>
                  This post publishes with{' '}
                  <span className='font-mono text-[#202223]'>BlogPosting</span>{' '}
                  structured data (Google rich results) built from its title,
                  SEO description, cover image, category and publish date — no
                  setup needed here.
                </div>
              </div>
            </div>
          </SidebarCard>
        </div>
      </div>
    </div>;
}
