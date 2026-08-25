'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
interface Category {
  id: string;
  name: string;
  slug: string;
}
interface BlogPostLite {
  category?: {
    id: string;
  } | null;
  category_id?: string | null;
}
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, postsRes] = await Promise.all([fetch('/api/admin/blog-categories'), fetch('/api/admin/blogs')]);
      const catData = await catRes.json();
      if (!catRes.ok) throw new Error(catData.error || 'Failed to load');
      setCategories(catData.categories || []);
      const postsData = await postsRes.json().catch(() => ({}));
      const posts: BlogPostLite[] = postsRes.ok ? postsData.posts || [] : [];
      const counts: Record<string, number> = {};
      for (const p of posts) {
        const catId = p.category?.id || p.category_id;
        if (!catId) continue;
        counts[catId] = (counts[catId] || 0) + 1;
      }
      setPostCounts(counts);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);
  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditSlug('');
  };
  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName,
          slug: editSlug || slugify(editName)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Category updated');
      cancelEdit();
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    } finally {
      setEditSaving(false);
    }
  };
  useEffect(() => {
    load();
  }, [load]);
  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          slug: slug || slugify(name)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success('Category created');
      setName('');
      setSlug('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete "${catName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Category deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };
  const inputClass = 'px-3 py-2 text-[13px] border border-[#E1E3E5] rounded-lg outline-none focus:border-[#008060]';
  return <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-xl font-semibold text-[#202223]'>
          Blog Categories
        </h1>
        <p className='text-[13px] text-[#6D7175] mt-1'>
          Organize your blog posts into categories
        </p>
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-xl p-5 mb-6 max-w-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)]'>
        <h2 className='text-[13px] font-semibold text-[#202223] mb-3 flex items-center gap-1.5'>
          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#008060' strokeWidth='2'>
            <path d='M12 5v14M5 12h14' strokeLinecap='round' />
          </svg>
          Add a new category
        </h2>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='flex-1 min-w-[160px]'>
            <label className='block text-[12px] font-medium text-[#6D7175] mb-1.5'>
              Category name
            </label>
            <input className={`${inputClass} w-full`} placeholder='e.g. Tennis' value={name} onChange={e => {
            setName(e.target.value);
            setSlug(slugify(e.target.value));
          }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className='flex-1 min-w-[160px]'>
            <label className='block text-[12px] font-medium text-[#6D7175] mb-1.5'>
              Slug
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#C4C8CC] pointer-events-none'>
                /
              </span>
              <input className={`${inputClass} w-full pl-6`} placeholder='auto-generated' value={slug} onChange={e => setSlug(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving} className='px-4 py-2 text-[13px] font-medium text-white bg-[#008060] rounded-lg cursor-pointer hover:bg-[#006e52] disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5 transition-colors'>
            {saving ? 'Adding...' : <>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                  <path d='M12 5v14M5 12h14' strokeLinecap='round' />
                </svg>
                Add category
              </>}
          </button>
        </div>
      </div>

      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden max-w-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)]'>
        <table className='w-full text-left text-[13px]'>
          <thead>
            <tr className='border-b border-[#E1E3E5] bg-[#FAFBFB]'>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Name</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Slug</th>
              <th className='px-4 py-3 font-medium text-[#6D7175]'>Posts</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr>
                <td colSpan={4} className='px-4 py-6 text-center text-[#8C9196]'>
                  Loading...
                </td>
              </tr>}
            {!loading && categories.length === 0 && <tr>
                <td colSpan={4} className='px-4 py-6 text-center text-[#8C9196]'>
                  No categories yet.
                </td>
              </tr>}
            {categories.map(cat => editingId === cat.id ? <tr key={cat.id} className='border-b border-[#E1E3E5] last:border-0 bg-[#FAFBFB]'>
                  <td className='px-4 py-2'>
                    <input className={inputClass} value={editName} onChange={e => {
                setEditName(e.target.value);
                setEditSlug(slugify(e.target.value));
              }} autoFocus />
                  </td>
                  <td className='px-4 py-2'>
                    <input className={inputClass} value={editSlug} onChange={e => setEditSlug(e.target.value)} />
                  </td>
                  <td className='px-4 py-3 text-[#6D7175]'>
                    {postCounts[cat.id] || 0}
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-end gap-3'>
                      <button onClick={() => handleUpdate(cat.id)} disabled={editSaving} className='text-[#008060] bg-transparent border-none cursor-pointer text-[13px] font-medium disabled:opacity-60'>
                        Save
                      </button>
                      <button onClick={cancelEdit} className='text-[#6D7175] bg-transparent border-none cursor-pointer text-[13px]'>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr> : <tr key={cat.id} className='border-b border-[#E1E3E5] last:border-0 hover:bg-[#FAFBFB]'>
                  <td className='px-4 py-3 font-medium text-[#202223]'>
                    {cat.name}
                  </td>
                  <td className='px-4 py-3 text-[#6D7175]'>{cat.slug}</td>
                  <td className='px-4 py-3 text-[#6D7175]'>
                    <span className='inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F1F1] text-[#202223]'>
                      {postCounts[cat.id] || 0}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-end gap-3'>
                      <button onClick={() => startEdit(cat)} className='text-[#008060] bg-transparent border-none cursor-pointer text-[13px]'>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cat.id, cat.name)} className='text-[#D82C0D] bg-transparent border-none cursor-pointer text-[13px]'>
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
