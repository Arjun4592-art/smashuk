'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  published_at: string | null
  category?: { id: string; name: string } | null
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Post deleted')
      loadPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-semibold text-[#202223]'>Blog Posts</h1>
          <p className='text-[13px] text-[#6D7175] mt-1'>
            Manage your blog content
          </p>
        </div>
        <div className='flex gap-2'>
          <Link
            href='/dashboard/blog-categories'
            className='px-3.5 py-2 text-[13px] font-medium text-[#202223] bg-white border border-[#E1E3E5] rounded-lg no-underline hover:bg-[#F6F6F7]'
          >
            Manage Categories
          </Link>
          <Link
            href='/dashboard/blogs/new'
            className='px-3.5 py-2 text-[13px] font-medium text-white bg-[#008060] rounded-lg no-underline hover:bg-[#006e52]'
          >
            + New Post
          </Link>
        </div>
      </div>

      <div className='mb-4'>
        <input
          type='text'
          placeholder='Search posts...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full max-w-xs px-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060]'
        />
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-lg overflow-hidden'>
        <table className='w-full text-left text-[13px]'>
          <thead>
            <tr className='border-b border-[#E1E3E5] bg-[#FAFBFB]'>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Title</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Category</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Status</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>
                Published
              </th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className='px-4 py-8 text-center text-[#8C9196]'
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className='px-4 py-8 text-center text-[#8C9196]'
                >
                  No blog posts yet.{' '}
                  <Link href='/dashboard/blogs/new' className='text-[#008060]'>
                    Create your first post
                  </Link>
                </td>
              </tr>
            )}
            {filtered.map((post) => (
              <tr
                key={post.id}
                className='border-b border-[#E1E3E5] last:border-0'
              >
                <td className='px-4 py-3 font-medium text-[#202223]'>
                  {post.title}
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>
                  {post.category?.name ?? '—'}
                </td>
                <td className='px-4 py-3'>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      post.status === 'published'
                        ? 'bg-[#E3F5F0] text-[#008060]'
                        : 'bg-[#F1F1F1] text-[#6D7175]'
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString()
                    : '—'}
                </td>
                <td className='px-4 py-3 text-right'>
                  <Link
                    href={`/dashboard/blogs/${post.id}`}
                    className='text-[#008060] no-underline mr-3'
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className='text-[#D82C0D] bg-transparent border-none cursor-pointer text-[13px]'
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
