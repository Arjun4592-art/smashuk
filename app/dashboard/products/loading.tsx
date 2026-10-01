export default function Loading() {
  return (
    <div className='space-y-5 animate-pulse'>
      <div className='h-7 w-40 bg-[#E1E3E5] rounded' />
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        <div className='h-14 border-b border-[#E1E3E5]' />
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className='flex items-center gap-3 px-4 py-3 border-b border-[#F1F1F1]'
          >
            <div className='w-4 h-4 bg-[#E1E3E5] rounded' />
            <div className='w-10 h-10 bg-[#E1E3E5] rounded-lg' />
            <div className='space-y-2'>
              <div className='w-48 h-3 bg-[#E1E3E5] rounded' />
              <div className='w-24 h-3 bg-[#E1E3E5] rounded' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
