import Link from 'next/link'

type Crumb = { label: string; href?: string }

export default function LuxuryHero({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt,
  breadcrumbs,
  size = 'md',
  cta,
  metaLines,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  image?: string
  imageAlt?: string
  breadcrumbs?: Crumb[]
  size?: 'md' | 'lg'
  cta?: { label: string; href: string }
  metaLines?: string[]
}) {
  const py = size === 'lg' ? 'py-20 md:py-28' : 'py-16 md:py-20'
  const titleSize =
    size === 'lg'
      ? 'text-4xl md:text-6xl leading-tight'
      : 'text-3xl md:text-4xl'

  return (
    <div className='ls-hero ls-hero-noise relative text-white overflow-hidden'>
      {/* Ambient floating glows */}
      <span
        className='ls-hero-glow hidden md:block'
        style={{ width: 260, height: 260, top: '-6%', left: '4%' }}
      />
      <span
        className='ls-hero-glow hidden md:block'
        style={{
          width: 220,
          height: 220,
          bottom: '-10%',
          right: '8%',
          animationDelay: '2.4s',
        }}
      />

      {image && (
        <div className='absolute inset-0 overflow-hidden'>
          <img
            src={image}
            alt={imageAlt || title}
            className='ls-hero-img absolute inset-0 w-full h-full object-cover opacity-25'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-[#050f22]/80 via-transparent to-transparent' />
        </div>
      )}

      <div className={`relative max-w-5xl mx-auto px-4 ${py} text-center`}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className='ls-hero-eyebrow mb-5 flex items-center justify-center gap-1.5 text-[11px] font-lato text-white/50'>
            {breadcrumbs.map((c, i) => (
              <span key={c.label} className='flex items-center gap-1.5'>
                {i > 0 && <span className='text-white/30'>/</span>}
                {c.href ? (
                  <Link href={c.href} className='hover:text-white/80 transition-colors'>
                    {c.label}
                  </Link>
                ) : (
                  <span className='text-white/70'>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <div className='ls-hero-eyebrow ls-eyebrow inline-flex items-center bg-white/10 text-white/80 text-xs font-lato font-semibold px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm'>
            {eyebrow}
          </div>
        )}

        <h1
          className={`ls-hero-title font-montserrat font-black ${titleSize} mb-4`}
        >
          {title}
        </h1>

        <span className='ls-hero-underline mx-auto mb-4' />

        {subtitle && (
          <p className='ls-hero-subtitle text-white/90 font-lato max-w-xl mx-auto leading-relaxed'>
            {subtitle}
          </p>
        )}

        {metaLines && metaLines.length > 0 && (
          <div className='ls-hero-subtitle mt-4'>
            {metaLines.map((line) => (
              <p key={line} className='text-white/60 font-lato text-sm'>
                {line}
              </p>
            ))}
          </div>
        )}

        {cta && (
          <div className='ls-hero-cta mt-7'>
            <Link
              href={cta.href}
              className='ls-btn-shine inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3 rounded-full text-sm'
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
