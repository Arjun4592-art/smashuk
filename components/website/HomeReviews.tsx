import HomeReviewsCarousel, {
  type HomeReview,
} from '@/components/website/HomeReviewsCarousel'

// Homepage reviews carousel data.
const REVIEWS: HomeReview[] = [
  {
    quote:
      "Best racket specialist in the UK. Whether it's badminton, tennis or padel — they actually know what they're talking about. Not just selling, proper advice.",
    name: 'James H.',
    meta: 'Leeds',
  },
  {
    quote:
      'Got my rackets strung at their local store. Stringing quality is top level — perfect tension, holds really well. You can feel the consistency.',
    name: 'Oliver B.',
    meta: 'Manchester',
  },
  {
    quote:
      'Ordered online and strung same day. Super fast service and really helpful team. My go-to for everything now.',
    name: 'Sophie L.',
    meta: 'London',
  },
  {
    quote:
      'Bought clothing and new shuttles as well. Great range, genuine products and quick delivery. Love the New Arrivals section.',
    name: 'Thomas R.',
    meta: 'Birmingham',
  },
  {
    quote:
      "Went to the local store for the first time. Staff were amazing, talked me through string options and didn't rush me. Proper customer service.",
    name: 'Emily W.',
    meta: 'Bristol',
  },
  {
    quote:
      'Hard to find someone who knows Padel rackets in the UK, but SMASH does. Strung my Head racket perfectly and gave me great tips on tension.',
    name: 'Daniel K.',
    meta: 'Sheffield',
  },
  {
    quote:
      "I send all my rackets here now. Every time it's the same high quality. You know exactly what you're going to get — reliable and consistent.",
    name: 'Harry M.',
    meta: 'Nottingham',
  },
  {
    quote:
      'Got a gift card for my brother — he loved it. Easy to buy and he got his favourite racket strung. Great idea.',
    name: 'Lucy P.',
    meta: 'Edinburgh',
  },
  {
    quote:
      'From stringing quality to customer service — SMASH is the best. Fast, knowledgeable, consistent. My only place for rackets now.',
    name: 'Ben A.',
    meta: 'Glasgow',
  },
]

/** Homepage reviews carousel (replaces the API-driven ReviewsSlider here). */
export default function HomeReviews() {
  return (
    <section className='bg-white overflow-hidden'>
      <div className='max-w-5xl mx-auto px-4 sm:px-6 py-14'>
        <div className='text-center'>
          <p className='text-[10px] font-bold text-[#E8553A] uppercase tracking-[0.22em] font-montserrat mb-2'>
            Reviews
          </p>
          <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] tracking-tight'>
            What Athletes Say
          </h2>
        </div>
        <HomeReviewsCarousel reviews={REVIEWS} />
      </div>
    </section>
  )
}
