import Image from 'next/image'
import Link from 'next/link'

type Breadcrumb = {
  label: string
  href?: string
}

type LuxuryHeroProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  image?: string
  imageAlt?: string
  metaLines?: string[]
  breadcrumbs?: Breadcrumb[]
  size?: 'md' | 'lg'
}

export default function LuxuryHero({
  title,
  subtitle,
  eyebrow,
  image,
  imageAlt,
  metaLines,
  breadcrumbs,
  size = 'md',
}: LuxuryHeroProps) {
  const minHeight = size === 'lg' ? 'min-h-[420px] md:min-h-[520px]' : 'min-h-[320px] md:min-h-[400px]'

  return (
    <section className={`relative w-full ${minHeight} bg-[#0A1F44] overflow-hidden`}>
      {image && (
        <Image
          src={image}
          alt={imageAlt || title}
          fill
          priority
          className='object-cover opacity-40'
          sizes='100vw'
        />
      )}
      <div className='absolute inset-0 bg-linear-to-t from-[#0A1F44] via-[#0A1F44]/70 to-[#0A1F44]/30' />

      <div className='relative z-10 max-w-5xl mx-auto px-4 h-full flex flex-col justify-end pb-12 pt-24'>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className='flex items-center flex-wrap gap-2 text-xs font-lato text-white/60 mb-6'>
            {breadcrumbs.map((crumb, idx) => (
              <span key={`${crumb.label}-${idx}`} className='flex items-center gap-2'>
                {crumb.href ? (
                  <Link href={crumb.href} className='hover:text-white transition-colors'>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className='text-white'>{crumb.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <p className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-3'>
            {eyebrow}
          </p>
        )}

        <h1 className='font-montserrat font-black text-3xl md:text-5xl text-white max-w-2xl'>
          {title}
        </h1>

        {subtitle && (
          <p className='text-sm md:text-base text-white/70 font-lato leading-relaxed max-w-2xl mt-4'>
            {subtitle}
          </p>
        )}

        {metaLines && metaLines.length > 0 && (
          <div className='flex flex-wrap gap-x-6 gap-y-2 mt-6 text-xs md:text-sm text-white/80 font-lato'>
            {metaLines.map((line, idx) => (
              <span key={idx}>{line}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
