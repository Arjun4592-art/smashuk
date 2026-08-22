'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blog-categories')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setCategories(data.categories || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug || slugify(name) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      toast.success('Category created')
      setName('')
      setSlug('')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete "${catName}"?`)) return
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Category deleted')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category')
    }
  }

  const inputClass =
    'px-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060]'

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-[#202223] mb-6'>
        Blog Categories
      </h1>

      <div className='flex gap-2 mb-6 max-w-lg'>
        <input
          className={`${inputClass} flex-1`}
          placeholder='Category name'
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSlug(slugify(e.target.value))
          }}
        />
        <input
          className={`${inputClass} flex-1`}
          placeholder='slug'
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={saving}
          className='px-3.5 py-2 text-[13px] font-medium text-white bg-[#008060] rounded-lg cursor-pointer hover:bg-[#006e52] disabled:opacity-60 whitespace-nowrap'
        >
          Add
        </button>
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-lg overflow-hidden max-w-lg'>
        <table className='w-full text-left text-[13px]'>
          <thead>
            <tr className='border-b border-[#E1E3E5] bg-[#FAFBFB]'>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Name</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Slug</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={3}
                  className='px-4 py-6 text-center text-[#8C9196]'
                >
                  Loading...
                </td>
              </tr>
            )}
            {!loading && categories.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className='px-4 py-6 text-center text-[#8C9196]'
                >
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className='border-b border-[#E1E3E5] last:border-0'
              >
                <td className='px-4 py-3 font-medium text-[#202223]'>
                  {cat.name}
                </td>
                <td className='px-4 py-3 text-[#6D7175]'>{cat.slug}</td>
                <td className='px-4 py-3 text-right'>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
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
