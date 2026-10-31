import Link from 'next/link'

export const TOURNAMENT_URL = 'https://smashnewyearcup2027.base44.app'

// Full-width promo band for the Smash New Year Cup 2027 tournament site.
// Rendered by HomeBlocks right after the "Featured Products" section.
export default function TournamentBanner() {
  return (
    <section className='relative w-full overflow-hidden bg-gradient-to-br from-[#0A1F44] via-[#0F2A5C] to-[#13336E]'>
      {/* Decorative glows + court-line pattern */}
      <div className='pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[#E8553A]/30 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-28 left-0 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl' />
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.07]'
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className='pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 select-none text-[14rem] leading-none opacity-[0.07] xl:block'>
        🏸
      </div>

      <div className='relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1fr_auto] lg:gap-12 lg:px-8 lg:py-16'>
        {/* Left: copy */}
        <div className='text-center lg:text-left'>
          <span className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 font-lato text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur'>
            <span className='h-2 w-2 animate-pulse rounded-full bg-[#E8553A]' />
            Tournament Announced
          </span>

          <h2 className='mt-4 font-montserrat text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl'>
            Smash New Year Cup <span className='text-[#E8553A]'>2027</span>
          </h2>

          <p className='mx-auto mt-3 max-w-xl font-lato text-base text-white/75 sm:text-lg lg:mx-0'>
            Our biggest tournament kicks off the new year. Grab your racket,
            check the details and get ready to compete.
          </p>

          <div className='mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start'>
            <Link
              href={`${TOURNAMENT_URL}/team-registration`}
              target='_blank'              rel='noopener noreferrer'
              className='group inline-flex items-center gap-2 rounded-full bg-[#E8553A] px-8 py-3.5 font-montserrat text-base font-black text-white shadow-lg shadow-[#E8553A]/30 transition-all hover:-translate-y-0.5 hover:bg-[#d24a31]'
            >
              Join the Tournament
              <span className='transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
            <Link
              href={TOURNAMENT_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='font-lato text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline'
            >
              View event details
            </Link>
          </div>
        </div>

        {/* Right: date tile */}
        <div className='mx-auto flex w-full max-w-[220px] flex-col items-center rounded-2xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur lg:mx-0 lg:w-52 lg:max-w-none'>
          <span className='font-lato text-xs font-semibold uppercase tracking-[0.25em] text-white/70'>
            Save the date
          </span>
          <span className='mt-2 font-montserrat text-5xl font-black leading-none text-white'>
            JAN
          </span>
          <span className='mt-1 font-montserrat text-3xl font-black leading-none text-[#E8553A]'>
            2027
          </span>
          <div className='my-4 h-px w-full bg-white/15' />
          <span className='font-lato text-sm text-white/75'>
            🏆 Prizes · 🏸 Fun · 🤝 Community
          </span>
        </div>
      </div>
    </section>
  )
}
