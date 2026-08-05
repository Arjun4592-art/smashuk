// Shared layout for simple content pages (Delivery, Returns, Terms, Privacy)
export default function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt?: string
  children: React.ReactNode
}) {
  return (
    <div className='max-w-3xl mx-auto px-4 py-12'>
      <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-2'>{title}</h1>
      {updatedAt && (
        <p className='text-xs text-gray-400 font-lato mb-8'>Last updated: {updatedAt}</p>
      )}
      <div className='prose prose-sm max-w-none font-lato text-gray-600 space-y-4 [&_h2]:font-montserrat [&_h2]:font-bold [&_h2]:text-[#0A1F44] [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-2'>
        {children}
      </div>
    </div>
  )
}
