'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Button,
  Chip,
  DeleteButton,
  Icon,
  PageHeader,
} from '@/components/dashboard/home/ui'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

interface BlogPost {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  published_at: string | null
  category?: {
    id: string
    name: string
  } | null
  category_id?: string | null
  author?: string | null
  content?: string | null
  excerpt?: string | null
  cover_image?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
}

function seoScore(post: BlogPost) {
  let score = 0
  const contentLen = (post.content || '').replace(/<[^>]*>/g, '').trim().length
  const seoTitle = post.seo_title || ''
  const seoDesc = post.seo_description || ''
  if (seoTitle.length >= 30 && seoTitle.length <= 65) score += 20
  else if (seoTitle.length > 0) score += 8
  if (seoDesc.length >= 50 && seoDesc.length <= 160) score += 20
  else if (seoDesc.length > 0) score += 8
  if (post.seo_keywords) score += 10
  if (contentLen >= 300) score += 15
  else if (contentLen > 0) score += 5
  if (post.cover_image) score += 10
  if (post.slug) score += 5
  if (post.category?.id || post.category_id) score += 10
  if (post.status === 'published') score += 10
  return Math.min(score, 100)
}

function SeoScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? { box: 'bg-[#E3F4EC] text-[#1F6F52]', dot: 'bg-[#2EAD7A]' }
      : score >= 50
        ? { box: 'bg-[#FFF1D6] text-[#8A6116]', dot: 'bg-[#F5A623]' }
        : { box: 'bg-[#FDECEA] text-[#B52A12]', dot: 'bg-[#D72C0D]' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {score}/100
    </span>
  )
}

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'

const actionCls =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-[#6D7175] no-underline transition-colors hover:bg-[#F1F2F3] hover:text-[#202223]'

function SelectBox({
  value,
  onChange,
  label,
  children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: ReactNode
}) {
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className='h-9 cursor-pointer appearance-none rounded-lg border border-[#E1E3E5] bg-white pl-3 pr-8 text-[13px] text-[#202223] outline-none transition-all hover:border-[#C9CCCF] focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
      >
        {children}
      </select>
      <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9196]'>
        <Icon.Chevron size={14} />
      </span>
    </div>
  )
}

const ALL = '__all__'

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [authorFilter, setAuthorFilter] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blogs')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load posts')
      setPosts(data.posts || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Post deleted')
      loadPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  const categoryOptions = Array.from(
    new Map(
      posts
        .filter((p) => p.category?.id)
        .map((p) => [p.category!.id, p.category!.name]),
    ).entries(),
  )
  const authorOptions = Array.from(
    new Set(posts.map((p) => p.author).filter((a): a is string => !!a)),
  )

  const filtered = posts.filter((p) => {
    if (!p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== ALL && p.status !== statusFilter) return false
    if (categoryFilter !== ALL && p.category?.id !== categoryFilter)
      return false
    if (authorFilter !== ALL && p.author !== authorFilter) return false
    if (dateFrom || dateTo) {
      if (!p.published_at) return false
      const d = new Date(p.published_at).getTime()
      if (dateFrom && d < new Date(dateFrom).getTime()) return false
      if (dateTo && d > new Date(dateTo).getTime() + 86400000 - 1) return false
    }
    return true
  })

  const clearFilters = () => {
    setSearch('')
    setStatusFilter(ALL)
    setCategoryFilter(ALL)
    setAuthorFilter(ALL)
    setDateFrom('')
    setDateTo('')
  }
  const hasActiveFilters =
    !!search ||
    statusFilter !== ALL ||
    categoryFilter !== ALL ||
    authorFilter !== ALL ||
    !!dateFrom ||
    !!dateTo

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  }
  const tabs: { key: string; label: string; count: number }[] = [
    { key: ALL, label: 'All', count: counts.all },
    { key: 'published', label: 'Published', count: counts.published },
    { key: 'draft', label: 'Drafts', count: counts.draft },
  ]

  return (
    <div className='w-full'>
      <PageHeader
        icon={<Icon.FileText size={20} />}
        title='Blog Posts'
        description='Write, publish and track the SEO of your blog content.'
        status={null}
      >
        <Link
          href='/dashboard/blog-categories'
          className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2D5D8] bg-white px-3.5 text-[12.5px] font-semibold text-[#202223] no-underline transition-colors hover:bg-[#F6F6F7]'
        >
          Manage categories
        </Link>
        <Link
          href='/dashboard/blogs/new'
          className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#008060] bg-[#008060] px-3.5 text-[12.5px] font-semibold text-white no-underline transition-colors hover:border-[#006E52] hover:bg-[#006E52]'
        >
          <Icon.Plus size={14} /> New post
        </Link>
      </PageHeader>

      <div className='space-y-4 pb-10'>
        <div className='inline-flex rounded-lg bg-[#F1F2F3] p-1'>
          {tabs.map((t) => {
            const active = statusFilter === t.key
            return (
              <button
                key={t.key}
                type='button'
                onClick={() => setStatusFilter(t.key)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-2 rounded-md border-none px-3.5 text-[12.5px] font-semibold cursor-pointer transition-all ${
                  active
                    ? 'bg-white text-[#202223] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'bg-transparent text-[#6D7175] hover:text-[#202223]'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-medium ${
                    active ? 'bg-[#F1F2F3] text-[#4A4F55]' : 'text-[#8C9196]'
                  }`}
                >
                  {loading ? '–' : t.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className='rounded-xl border border-[#E1E3E5] bg-white p-3'>
          <div className='flex flex-wrap items-center gap-2.5'>
            <div className='relative min-w-[200px] flex-1 sm:max-w-[280px]'>
              <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]'>
                <Icon.Search size={15} />
              </span>
              <input
                type='text'
                placeholder='Search posts…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-9 w-full rounded-lg border border-[#E1E3E5] bg-white pl-9 pr-3 text-[13px] text-[#202223] placeholder-[#8C9196] outline-none transition-all focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
              />
            </div>

            <SelectBox
              value={categoryFilter}
              onChange={setCategoryFilter}
              label='Filter by category'
            >
              <option value={ALL}>All categories</option>
              {categoryOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </SelectBox>

            <SelectBox
              value={authorFilter}
              onChange={setAuthorFilter}
              label='Filter by author'
            >
              <option value={ALL}>All authors</option>
              {authorOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectBox>

            <div className='flex h-9 items-center gap-2 rounded-lg border border-[#E1E3E5] bg-white px-2.5 transition-colors focus-within:border-[#008060] focus-within:ring-2 focus-within:ring-[#008060]/15'>
              <span className='text-[#8C9196]'>
                <Icon.Calendar size={14} />
              </span>
              <span className='text-[12px] text-[#6D7175]'>Published</span>
              <input
                type='date'
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className='w-[118px] border-none bg-transparent text-[12.5px] text-[#202223] outline-none'
                aria-label='Published from'
              />
              <span className='text-[#8C9196]'>–</span>
              <input
                type='date'
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className='w-[118px] border-none bg-transparent text-[12.5px] text-[#202223] outline-none'
                aria-label='Published to'
              />
            </div>

            {hasActiveFilters && (
              <button
                type='button'
                onClick={clearFilters}
                className='ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border-none bg-transparent px-3 text-[12.5px] font-semibold text-[#D72C0D] cursor-pointer transition-colors hover:bg-[#FFF1EF]'
              >
                <Icon.Close size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border border-[#E1E3E5] bg-white'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[880px] text-left text-[13px]'>
              <thead>
                <tr className='border-b border-[#E1E3E5] bg-[#FAFBFB] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8C9196]'>
                  <th className='px-4 py-3'>Post</th>
                  <th className='px-4 py-3'>Category</th>
                  <th className='px-4 py-3'>Author</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3'>SEO score</th>
                  <th className='px-4 py-3'>Published</th>
                  <th className='px-4 py-3'>
                    <span className='sr-only'>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2, 3].map((i) => (
                    <tr
                      key={i}
                      className='border-b border-[#F1F2F3] last:border-0'
                    >
                      <td colSpan={7} className='px-4 py-3'>
                        <div className='h-10 animate-pulse rounded-lg bg-[#F6F7F8]' />
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className='px-4 py-14 text-center'>
                      <span className='mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F2F3] text-[#8C9196]'>
                        <Icon.FileText size={20} />
                      </span>
                      {posts.length === 0 ? (
                        <>
                          <p className='text-[14px] font-semibold text-[#202223]'>
                            No blog posts yet
                          </p>
                          <p className='mb-4 mt-0.5 text-[12.5px] text-[#6D7175]'>
                            Write your first post to start ranking for the
                            things your customers search.
                          </p>
                          <Link
                            href='/dashboard/blogs/new'
                            className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#008060] bg-[#008060] px-3.5 text-[12.5px] font-semibold text-white no-underline hover:bg-[#006E52]'
                          >
                            <Icon.Plus size={14} /> Create your first post
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className='text-[14px] font-semibold text-[#202223]'>
                            No posts match your filters
                          </p>
                          <p className='mb-4 mt-0.5 text-[12.5px] text-[#6D7175]'>
                            Try a different search or clear the filters.
                          </p>
                          <Button onClick={clearFilters}>Clear filters</Button>
                        </>
                      )}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((post) => (
                    <tr
                      key={post.id}
                      className='border-b border-[#F1F2F3] transition-colors last:border-0 hover:bg-[#FAFBFB]'
                    >
                      <td className='px-4 py-3'>
                        <Link
                          href={`/dashboard/blogs/${post.id}`}
                          className='flex min-w-0 items-center gap-3 text-inherit no-underline'
                        >
                          <span className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E1E3E5] bg-[#F6F7F8] text-[#8C9196]'>
                            {post.cover_image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={post.cover_image}
                                alt=''
                                className='h-full w-full object-cover'
                              />
                            ) : (
                              <Icon.Image size={16} />
                            )}
                          </span>
                          <span className='min-w-0'>
                            <span className='block max-w-[320px] truncate text-[13.5px] font-semibold text-[#202223]'>
                              {post.title}
                            </span>
                            {post.slug && (
                              <span className='block max-w-[320px] truncate text-[11.5px] text-[#8C9196]'>
                                /blog/{post.slug}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className='px-4 py-3'>
                        {post.category?.name ? (
                          <Chip>{post.category.name}</Chip>
                        ) : (
                          <span className='text-[#C4C8CC]'>—</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-[#4A4F55]'>
                        {post.author || (
                          <span className='text-[#C4C8CC]'>—</span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            post.status === 'published'
                              ? 'bg-[#E3F4EC] text-[#1F6F52]'
                              : 'bg-[#F1F2F3] text-[#6D7175]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              post.status === 'published'
                                ? 'bg-[#2EAD7A]'
                                : 'bg-[#9AA0A6]'
                            }`}
                          />
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <SeoScoreBadge score={seoScore(post)} />
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-[#6D7175]'>
                        {formatDate(post.published_at)}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-0.5'>
                          {post.status === 'published' &&
                          post.slug &&
                          SITE_URL ? (
                            <a
                              href={`${SITE_URL}/blog/${post.slug}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className={actionCls}
                              title='View live post'
                              aria-label='View live post'
                            >
                              <Icon.External size={15} />
                            </a>
                          ) : (
                            <span
                              className={`${actionCls} cursor-not-allowed opacity-30`}
                              title={
                                post.status === 'draft'
                                  ? 'Publish the post to view it live'
                                  : 'Live link unavailable'
                              }
                            >
                              <Icon.External size={15} />
                            </span>
                          )}
                          <Link
                            href={`/dashboard/blogs/${post.id}`}
                            className={actionCls}
                            title='Edit post'
                            aria-label='Edit post'
                          >
                            <Icon.Edit size={15} />
                          </Link>
                          <DeleteButton
                            label='Delete post'
                            onConfirm={() => handleDelete(post.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!loading && posts.length > 0 && (
            <div className='border-t border-[#E1E3E5] bg-[#FAFBFB] px-4 py-2.5 text-[12px] text-[#6D7175]'>
              Showing {filtered.length} of {posts.length}{' '}
              {posts.length === 1 ? 'post' : 'posts'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
