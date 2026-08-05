'use client'
// components/website/ProductReviews.tsx
//
// Displays customer reviews on the product detail page.
// Fetches from GET /api/store/products/[productId]/reviews
// Used in app/(website)/shop/[slug]/ProductDetailClient.tsx

import { useState, useEffect } from 'react'
import { StarIcon } from '@/components/ui/Icons'
import type { ProductReview } from '@/app/api/store/products/[id]/reviews/route'

interface Props {
  productId: string
  initialRating: number
  initialCount: number
}

export default function ProductReviews({ productId, initialRating, initialCount }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/store/products/${productId}/reviews`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [productId])

  const count = reviews.length || initialCount
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : initialRating

  // Star distribution
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }))

  if (loading) {
    return (
      <div className='space-y-4 animate-pulse'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='bg-gray-100 rounded-2xl h-28' />
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Summary */}
      <div className='bg-[#F8F9FB] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6'>
        {/* Average */}
        <div className='text-center shrink-0'>
          <p className='font-montserrat font-black text-5xl text-[#0A1F44]'>{avg.toFixed(1)}</p>
          <div className='flex items-center justify-center gap-0.5 my-1'>
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon
                key={s}
                size={16}
                filled={s <= Math.round(avg)}
                className={s <= Math.round(avg) ? 'text-amber-400' : 'text-gray-200'}
              />
            ))}
          </div>
          <p className='text-xs text-gray-400 font-lato'>{count} review{count !== 1 ? 's' : ''}</p>
        </div>

        {/* Distribution */}
        <div className='flex-1 w-full space-y-1.5'>
          {dist.map(({ star, count: c, pct }) => (
            <div key={star} className='flex items-center gap-2'>
              <span className='text-xs text-gray-500 font-lato w-3 shrink-0'>{star}</span>
              <StarIcon size={10} filled className='text-amber-400 shrink-0' />
              <div className='flex-1 bg-gray-200 rounded-full h-2 overflow-hidden'>
                <div
                  className='bg-amber-400 h-2 rounded-full transition-all duration-500'
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className='text-xs text-gray-400 font-lato w-4 text-right shrink-0'>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review Cards */}
      {reviews.length === 0 ? (
        <div className='text-center py-10'>
          <p className='text-3xl mb-3'>✍️</p>
          <p className='font-montserrat font-bold text-[#0A1F44]'>No reviews yet</p>
          <p className='text-sm text-gray-400 font-lato mt-1'>
            Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className='space-y-4'>
          {reviews.map((review) => (
            <div key={review.id} className='bg-white border border-gray-100 rounded-2xl p-5'>
              {/* Header */}
              <div className='flex items-start justify-between gap-3 mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full bg-[#0A1F44] flex items-center justify-center shrink-0'>
                    <span className='text-white text-xs font-montserrat font-bold'>
                      {review.customerName
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44]'>
                      {review.customerName}
                    </p>
                    <p className='text-xs text-gray-400 font-lato flex items-center gap-1'>
                      <span className='text-green-500'>✓</span> Verified Purchase
                    </p>
                  </div>
                </div>
                <div className='text-right shrink-0'>
                  <div className='flex items-center gap-0.5 justify-end'>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon
                        key={s}
                        size={13}
                        filled={s <= review.rating}
                        className={s <= review.rating ? 'text-amber-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <p className='text-xs text-gray-400 font-lato mt-0.5'>
                    {new Date(review.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Content */}
              {review.title && (
                <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>{review.title}</p>
              )}
              <p className='text-sm text-gray-600 font-lato leading-relaxed'>{review.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}