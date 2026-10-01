export default function Loading() {
  return (
    <div className='max-w-275 mx-auto space-y-5 animate-pulse'>
      <div className='h-7 w-64 bg-[#E1E3E5] rounded' />
      <div className='flex gap-2'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className='h-9 w-24 bg-[#E1E3E5] rounded-lg' />
        ))}
      </div>
      <div className='bg-white border border-[#E1E3E5] rounded-xl p-5 space-y-4'>
        <div className='h-10 bg-[#F1F1F1] rounded-lg' />
        <div className='h-32 bg-[#F1F1F1] rounded-lg' />
        <div className='grid grid-cols-2 gap-4'>
          <div className='h-10 bg-[#F1F1F1] rounded-lg' />
          <div className='h-10 bg-[#F1F1F1] rounded-lg' />
        </div>
      </div>
    </div>
  )
}
