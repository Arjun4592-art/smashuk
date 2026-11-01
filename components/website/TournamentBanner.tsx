import Link from 'next/link'

export const TOURNAMENT_URL = 'https://smashnewyearcup2027.base44.app'

const TICKER = [
  '🏆 Smash New Year Cup 2027',
  '🏸 Grab your racket',
  '🔥 Jan 2027',
  '🤝 Community',
  '🎁 Prizes',
  '⚡ Fun',
]

// All motion for this banner lives here (self-contained, no globals.css change).
const CSS = `
@keyframes tb-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes tb-float { 0%,100% { transform: translate3d(0,0,0) } 50% { transform: translate3d(0,-18px,0) } }
@keyframes tb-trophy { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-10px) rotate(4deg) } }
@keyframes tb-glow { 0%,100% { opacity:.45; filter: hue-rotate(0deg) blur(14px) } 50% { opacity:.9; filter: hue-rotate(40deg) blur(18px) } }
@keyframes tb-shine { 0% { transform: translateX(-120%) skewX(-20deg) } 60%,100% { transform: translateX(260%) skewX(-20deg) } }
@keyframes tb-pan { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
@keyframes tb-rise { from { opacity:0; transform: translateY(24px) } to { opacity:1; transform: translateY(0) } }
.tb-marquee { animation: tb-marquee 30s linear infinite }
.tb-marquee:hover { animation-play-state: paused }
.tb-float { animation: tb-float 7s ease-in-out infinite }
.tb-trophy { animation: tb-trophy 4.5s ease-in-out infinite }
.tb-glow { background: conic-gradient(from 0deg, #e8553a, #ffd66b, #38bdf8, #e8553a); animation: tb-glow 5s ease-in-out infinite }
.tb-rise { animation: tb-rise .8s cubic-bezier(.22,1,.36,1) both }
.tb-text { background-image: linear-gradient(100deg,#e8553a 0%,#ff9a7a 45%,#ffd66b 70%,#e8553a 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: tb-pan 6s ease-in-out infinite }
.tb-text-light { background-image: linear-gradient(100deg,#ffd66b 0%,#ffb199 50%,#ffd66b 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: tb-pan 6s ease-in-out infinite }
.tb-btn::after { content:''; position:absolute; inset:0 auto 0 0; width:40%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent); transform: translateX(-120%) skewX(-20deg); animation: tb-shine 3.6s 1.2s ease-in-out infinite; pointer-events:none }
@media (prefers-reduced-motion: reduce) {
  .tb-marquee,.tb-float,.tb-trophy,.tb-glow,.tb-rise,.tb-text,.tb-text-light,.tb-btn::after { animation: none !important }
}
`

// Full-width promo band for the Smash New Year Cup 2027 tournament site.
// Rendered by HomeBlocks right after the "Featured Products" section.
export default function TournamentBanner() {
  return (
    <section className='relative w-full overflow-hidden bg-[#060F22]'>
      <style>{CSS}</style>

      {/* ── Scrolling ticker ── */}
      <div className='relative z-20 overflow-hidden border-b border-white/10 bg-[#E8553A] py-1.5'>
        <div className='tb-marquee flex w-max items-center'>
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className='flex shrink-0 items-center'
              aria-hidden={dup === 1}
            >
              {TICKER.concat(TICKER).map((t, i) => (
                <span
                  key={`${dup}-${i}`}
                  className='flex items-center whitespace-nowrap font-montserrat text-[10px] font-black uppercase tracking-[0.18em] text-white sm:text-xs sm:tracking-[0.2em]'
                >
                  <span className='px-4 sm:px-6'>{t}</span>
                  <span className='text-white/50'>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Background layers ── */}
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-[#0A1F44] via-[#0F2A5C] to-[#1B2E78]' />
      <div className='tb-float pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E8553A]/35 blur-3xl' />
      <div
        className='tb-float pointer-events-none absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl'
        style={{ animationDelay: '-5s' }}
      />
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.07]'
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className='pointer-events-none absolute -right-20 top-0 hidden h-full w-40 -skew-x-12 bg-linear-to-b from-[#E8553A]/25 to-transparent lg:block' />
      <span className='tb-float pointer-events-none absolute left-[46%] top-16 hidden select-none text-4xl opacity-25 lg:block'>
        🏸
      </span>
      <span
        className='tb-float pointer-events-none absolute bottom-12 left-[8%] hidden select-none text-5xl opacity-15 md:block'
        style={{ animationDelay: '-3s' }}
      >
        🏸
      </span>

      <div className='relative z-10 mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:px-6 sm:py-9 lg:grid-cols-[1fr_auto] lg:gap-10 lg:px-8 lg:py-10'>
        {/* ── Left: copy ── */}
        <div className='tb-rise text-center lg:text-left'>
          <span className='inline-flex items-center gap-2.5 rounded-full border border-[#E8553A]/50 bg-[#E8553A]/15 px-3.5 py-1.5 font-lato text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur'>
            <span className='relative flex h-2.5 w-2.5'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8553A] opacity-75' />
              <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E8553A]' />
            </span>
            Tournament Announced
          </span>

          <h2
            className='mt-3 font-montserrat font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
            style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.9rem)' }}
          >
            Smash New Year Cup <span className='tb-text'>2027</span>
          </h2>

          <p className='mx-auto mt-3 max-w-xl font-lato text-sm leading-relaxed text-white/80 sm:text-base lg:mx-0'>
            Our biggest tournament kicks off the new year. Grab your racket,
            check the details and get ready to compete.
          </p>

          <div className='mx-auto mt-5 flex max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start'>
            <Link
              href={`${TOURNAMENT_URL}/team-registration`}
              target='_blank'
              rel='noopener noreferrer'
              className='tb-btn group relative inline-flex w-full items-center justify-center gap-2 sm:w-auto overflow-hidden rounded-full bg-[#E8553A] px-7 py-3 font-montserrat text-sm font-black text-white shadow-xl shadow-[#E8553A]/40 transition-all duration-300 hover:-translate-y-1 hover:bg-[#d24a31] hover:shadow-2xl hover:shadow-[#E8553A]/60'
            >
              Join the Tournament
              <span className='transition-transform duration-300 group-hover:translate-x-1.5'>
                →
              </span>
            </Link>
            <Link
              href={TOURNAMENT_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='w-full rounded-full border border-white/30 bg-white/5 px-6 py-3 text-center sm:w-auto font-montserrat text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white hover:text-[#0A1F44]'
            >
              View event details
            </Link>
          </div>
        </div>

        {/* ── Right: trophy card (horizontal pill on mobile/tablet, tall card on desktop) ── */}
        <div
          className='tb-rise relative mx-auto w-full max-w-[340px] lg:mx-0 lg:ml-auto lg:max-w-[230px]'
          style={{ animationDelay: '0.15s' }}
        >
          <div className='tb-glow pointer-events-none absolute -inset-2 rounded-[2rem]' />
          <div className='relative flex items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/25 bg-[#0A1F44]/60 px-5 py-3.5 text-left shadow-2xl backdrop-blur-xl lg:block lg:bg-linear-to-b lg:from-white/20 lg:to-white/5 lg:p-4 lg:text-center'>
            <div className='pointer-events-none absolute -top-10 left-1/2 hidden h-40 w-40 -translate-x-1/2 rounded-full bg-[#E8553A]/50 blur-3xl lg:block' />

            <div className='tb-trophy relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#FFD66B] via-[#F5A524] to-[#E8553A] text-2xl shadow-[0_0_30px_rgba(245,165,36,0.55)] lg:mx-auto lg:h-14 lg:w-14 lg:text-3xl lg:shadow-[0_0_36px_rgba(245,165,36,0.55)]'>
              🏆
            </div>

            <div className='relative'>
              <p className='font-lato text-[10px] font-bold uppercase tracking-[0.3em] text-white/75 lg:mt-3'>
                Save the date
              </p>
              <p className='mt-0.5 flex items-baseline gap-2 font-montserrat font-black leading-none lg:mt-1 lg:block'>
                <span className='text-3xl text-white sm:text-4xl'>JAN</span>
                <span className='tb-text-light text-xl sm:text-2xl lg:mt-0.5 lg:block'>
                  2027
                </span>
              </p>
            </div>

            <div className='relative my-3 hidden h-px w-full bg-linear-to-r from-transparent via-white/40 to-transparent lg:block' />

            <p className='relative hidden font-lato text-xs font-semibold text-white/85 lg:block'>
              🏆 Prizes · 🏸 Fun · 🤝 Community
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
