'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { SiteReview } from '@/types';
const SPORTS = ['Badminton', 'Tennis', 'Padel', 'Squash', 'Clothing'];
const emptyForm = {
  name: '',
  sport: 'Badminton',
  city: '',
  rating: 5,
  review: '',
  published: true
};
function authHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}
function PlusIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M12 4v16M4 12h16' />
    </svg>;
}
function CloseIcon({
  size = 14
}: {
  size?: number;
}) {
  return <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M18 6L6 18M6 6l12 12' />
    </svg>;
}
function TrashIcon({
  size = 13,
  color = 'currentColor'
}: {
  size?: number;
  color?: string;
}) {
  return <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M3 6h18' />
      <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' />
      <path d='M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v5M14 11v5' />
    </svg>;
}
function StarIcon({
  filled
}: {
  filled: boolean;
}) {
  return <svg width='16' height='16' viewBox='0 0 24 24' fill={filled ? '#FBBF24' : 'none'} stroke={filled ? '#FBBF24' : '#C4C8CC'} strokeWidth='1.5'>
      <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
    </svg>;
}
function SpinnerIcon() {
  return <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v8H4z' />
    </svg>;
}
function ChatIcon() {
  return <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#C4C8CC' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
    </svg>;
}
function StatCard({
  label,
  value,
  icon,
  colorClasses
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClasses: string;
}) {
  return <div className='bg-white border border-[#E1E3E5] rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200'>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClasses}`}>{icon}</div>
      <div>
        <p className='font-sora text-[22px] font-bold text-[#202223] leading-tight tracking-tight'>{value}</p>
        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>{label}</p>
      </div>
    </div>;
}
function Toggle({
  checked,
  onChange,
  title
}: {
  checked: boolean;
  onChange: () => void;
  title?: string;
}) {
  return <button onClick={onChange} title={title} className={`relative w-9 h-5 rounded-full transition-colors duration-200 border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${checked ? 'bg-[#008060] focus-visible:ring-[#008060]' : 'bg-[#D1D5DB] focus-visible:ring-[#8C9196]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>;
}
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    ...emptyForm
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  const openAdd = () => {
    setForm({
      ...emptyForm
    });
    setSaveError(null);
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim() || !form.review.trim()) {
      setSaveError('Name and review text are required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const toastId = toast.loading('Adding review...');
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Create failed');
      const data = await res.json();
      setReviews(prev => [data.review, ...prev]);
      toast.success('Review added', {
        id: toastId
      });
      setShowModal(false);
    } catch (err: any) {
      setSaveError(err.message);
      toast.error(err.message ?? 'Something went wrong', {
        id: toastId
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    const name = reviews.find(r => r.id === id)?.name;
    setReviews(prev => prev.filter(r => r.id !== id));
    setDeleteId(null);
    const toastId = toast.loading('Deleting review...');
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed');
      toast.success(`Review by "${name}" deleted`, {
        id: toastId
      });
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed', {
        id: toastId
      });
      fetchReviews();
    }
  };
  const togglePublished = async (review: SiteReview) => {
    const next = !review.published;
    setReviews(prev => prev.map(r => r.id === review.id ? {
      ...r,
      published: next
    } : r));
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          published: next
        })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(next ? 'Review published to website' : 'Review hidden from website');
    } catch (err: any) {
      setReviews(prev => prev.map(r => r.id === review.id ? {
        ...r,
        published: review.published
      } : r));
      toast.error(err.message ?? 'Failed to update');
    }
  };
  const published = reviews.filter(r => r.published).length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
  return <div className='space-y-5'>
      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>Reviews</h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            Manage the testimonials shown on the website&apos;s homepage slider
          </p>
        </div>
        <button onClick={openAdd} className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] text-white text-[13px] font-medium rounded-lg transition-all duration-150 shadow-sm shadow-[#008060]/20 border-none cursor-pointer'>
          <PlusIcon /> Add Review
        </button>
      </div>

      {}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
        <StatCard label='Total Reviews' value={reviews.length} icon={<ChatIcon />} colorClasses='bg-[#2C6ECB]/8 text-[#2C6ECB]' />
        <StatCard label='Published (live)' value={published} icon={<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
              <circle cx='12' cy='12' r='10' />
              <path d='M8 12l3 3 5-6' />
            </svg>} colorClasses='bg-[#008060]/8 text-[#008060]' />
        <StatCard label='Average Rating' value={avgRating === '—' ? avgRating : `${avgRating}★`} icon={<StarIcon filled />} colorClasses='bg-[#FBBF24]/10 text-[#B45309]' />
      </div>

      {}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden'>
        {loading ? <div className='flex items-center justify-center py-16 text-[#8C9196] gap-2 text-[13px]'>
            <SpinnerIcon /> Loading reviews...
          </div> : reviews.length === 0 ? <div className='flex flex-col items-center justify-center py-16 gap-3'>
            <ChatIcon />
            <p className='text-[13px] text-[#8C9196]'>No reviews yet</p>
            <button onClick={openAdd} className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors border-none cursor-pointer'>
              <PlusIcon /> Add your first review
            </button>
          </div> : <div className='divide-y divide-[#F1F2F3]'>
            {reviews.map(r => <div key={r.id} className='flex items-start gap-4 p-4 hover:bg-[#FAFBFB] transition-colors'>
                <div className='w-10 h-10 bg-[#0A1F44] text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0'>
                  {r.avatar}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <p className='font-sora font-semibold text-[13.5px] text-[#202223]'>{r.name}</p>
                    <span className='text-[11px] text-[#8C9196]'>
                      {[r.sport, r.city].filter(Boolean).join(' · ')}
                    </span>
                    <div className='flex items-center gap-0.5 ml-1'>
                      {[...Array(5)].map((_, i) => <StarIcon key={i} filled={i < r.rating} />)}
                    </div>
                  </div>
                  <p className='text-[13px] text-[#4B5563] mt-1.5 leading-relaxed'>&quot;{r.review}&quot;</p>
                  <p className='text-[11px] text-[#B5B9BD] mt-1.5'>
                    Added {new Date(r.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
                  </p>
                </div>
                <div className='flex items-center gap-3 shrink-0'>
                  <Toggle checked={r.published} onChange={() => togglePublished(r)} title={r.published ? 'Live on website — click to hide' : 'Hidden — click to publish'} />
                  <button onClick={() => setDeleteId(r.id)} className='w-8 h-8 rounded-lg flex items-center justify-center text-[#8C9196] hover:bg-[#FEF2F2] hover:text-[#D82C0D] transition-colors border-none bg-transparent cursor-pointer' title='Delete'>
                    <TrashIcon />
                  </button>
                </div>
              </div>)}
          </div>}
      </div>

      {}
      {showModal && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-[2px]' onClick={() => setShowModal(false)} />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='font-sora text-[16px] font-semibold text-[#202223]'>Add Review</h3>
              <button onClick={() => setShowModal(false)} className='text-[#8C9196] hover:text-[#202223] border-none bg-transparent cursor-pointer'>
                <CloseIcon />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='text-[12px] font-medium text-[#6D7175] block mb-1.5'>Customer name *</label>
                <input value={form.name} onChange={e => setForm({
              ...form,
              name: e.target.value
            })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060]' placeholder='e.g. James Whitfield' />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-[12px] font-medium text-[#6D7175] block mb-1.5'>Sport</label>
                  <select value={form.sport} onChange={e => setForm({
                ...form,
                sport: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060]'>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className='text-[12px] font-medium text-[#6D7175] block mb-1.5'>City</label>
                  <input value={form.city} onChange={e => setForm({
                ...form,
                city: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060]' placeholder='e.g. London' />
                </div>
              </div>
              <div>
                <label className='text-[12px] font-medium text-[#6D7175] block mb-1.5'>Rating</label>
                <div className='flex items-center gap-1'>
                  {[1, 2, 3, 4, 5].map(n => <button key={n} type='button' onClick={() => setForm({
                ...form,
                rating: n
              })} className='border-none bg-transparent cursor-pointer p-0.5'>
                      <StarIcon filled={n <= form.rating} />
                    </button>)}
                </div>
              </div>
              <div>
                <label className='text-[12px] font-medium text-[#6D7175] block mb-1.5'>Review text *</label>
                <textarea value={form.review} onChange={e => setForm({
              ...form,
              review: e.target.value
            })} rows={4} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060] resize-none' placeholder="What did the customer say?" />
              </div>
              <div className='flex items-center justify-between'>
                <label className='text-[12px] font-medium text-[#6D7175]'>Publish to website immediately</label>
                <Toggle checked={form.published} onChange={() => setForm({
              ...form,
              published: !form.published
            })} />
              </div>

              {saveError && <p className='text-[12px] text-[#D82C0D]'>{saveError}</p>}

              <div className='flex gap-2.5 pt-2'>
                <button onClick={() => setShowModal(false)} className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className='flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#008060]/20 flex items-center justify-center gap-2'>
                  {saving && <SpinnerIcon />} Save Review
                </button>
              </div>
            </div>
          </div>
        </div>}

      {}
      {deleteId && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-[2px]' onClick={() => setDeleteId(null)} />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-sm p-6'>
            <div className='w-12 h-12 bg-[#D82C0D]/8 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <TrashIcon size={22} color='#D82C0D' />
            </div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] text-center mb-2'>Delete Review</h3>
            <p className='text-[13px] text-[#6D7175] text-center leading-relaxed mb-6'>
              Are you sure you want to delete the review by{' '}
              <span className='font-semibold text-[#202223]'>{reviews.find(r => r.id === deleteId)?.name}</span>?
              This will remove it from the website immediately.
            </p>
            <div className='flex gap-2.5'>
              <button onClick={() => setDeleteId(null)} className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#be2209] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#D82C0D]/20'>
                Delete
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
