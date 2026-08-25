'use client';
import { useState } from 'react';
import { StarIcon } from '@/components/ui/Icons';
interface ReviewItem {
  productId: string;
  productTitle: string;
  thumbnail?: string | null;
  orderId: string;
}
interface Props {
  item: ReviewItem;
  onClose: () => void;
  onSubmitted: () => void;
}
export default function WriteReviewModal({
  item,
  onClose,
  onSubmitted
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayRating = hoverRating || rating;
  const ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };
  async function handleSubmit() {
    if (!rating) {
      setError('Please select a star rating');
      return;
    }
    if (!body.trim()) {
      setError('Please write a review');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/products/${item.productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          rating,
          title: title.trim(),
          reviewBody: body.trim(),
          orderId: item.orderId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review');
        return;
      }
      onSubmitted();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm'>
      <div className='w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col'>
        {}
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0'>
          <h2 className='font-montserrat font-bold text-[#0A1F44] text-base'>
            Write a Review
          </h2>
          <button onClick={onClose} className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors'>
            ✕
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-5 space-y-5'>
          {}
          <div className='flex items-center gap-3 bg-gray-50 rounded-xl p-3'>
            {item.thumbnail ? <img src={item.thumbnail} alt={item.productTitle} className='w-12 h-12 rounded-lg object-cover shrink-0' /> : <div className='w-12 h-12 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-xl'>
                📦
              </div>}
            <p className='font-montserrat font-bold text-sm text-[#0A1F44] line-clamp-2'>
              {item.productTitle}
            </p>
          </div>

          {}
          <div>
            <p className='text-sm font-semibold text-[#0A1F44] font-montserrat mb-2'>
              Overall Rating <span className='text-[#E8553A]'>*</span>
            </p>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1'>
                {[1, 2, 3, 4, 5].map(star => <button key={star} type='button' onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className='transition-transform hover:scale-110 active:scale-95'>
                    <StarIcon size={32} filled={star <= displayRating} className={star <= displayRating ? 'text-amber-400' : 'text-gray-200'} />
                  </button>)}
              </div>
              {displayRating > 0 && <span className='text-sm font-semibold text-amber-600 font-lato'>
                  {ratingLabels[displayRating]}
                </span>}
            </div>
          </div>

          {}
          <div>
            <label className='text-sm font-semibold text-[#0A1F44] font-montserrat mb-2 block'>
              Review Title{' '}
              <span className='text-gray-400 font-normal'>(optional)</span>
            </label>
            <input type='text' value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder='Summarise your experience...' className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-lato text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#E8553A] transition-colors' />
          </div>

          {}
          <div>
            <label className='text-sm font-semibold text-[#0A1F44] font-montserrat mb-2 block'>
              Your Review <span className='text-[#E8553A]'>*</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={1000} placeholder='Tell other shoppers about your experience with this product...' className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-lato text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#E8553A] transition-colors resize-none' />
            <p className='text-xs text-gray-400 text-right mt-1 font-lato'>
              {body.length}/1000
            </p>
          </div>

          {error && <div className='bg-red-50 border border-red-200 rounded-xl px-4 py-3'>
              <p className='text-sm text-red-600 font-lato'>{error}</p>
            </div>}
        </div>

        {}
        <div className='px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3'>
          <button onClick={onClose} className='flex-1 border border-gray-200 text-gray-600 font-montserrat font-bold py-3 rounded-full hover:bg-gray-50 transition-colors text-sm'>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className='flex-1 bg-[#E8553A] text-white font-montserrat font-bold py-3 rounded-full hover:bg-[#D4441F] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed'>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>;
}
