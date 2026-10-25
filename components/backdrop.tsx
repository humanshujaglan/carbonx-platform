/** Decorative scenery behind the platform: ripple rings in top corners and rolling forest hills along the bottom. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Ripples className="absolute -left-40 -top-40 size-[36rem] opacity-60" />
      <Ripples className="absolute -right-48 -top-24 size-[40rem] opacity-50" />

      <svg className="absolute inset-x-0 bottom-0 h-[40vh] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b3a18" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#030705" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hill-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e5020" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#030705" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hill-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#127a28" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#030705" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 210 C 180 130, 330 130, 520 190 S 860 120, 1040 170 S 1330 120, 1440 150 V 400 H 0 Z" fill="url(#hill-back)" />
        <path d="M0 270 C 160 200, 360 220, 560 260 S 900 190, 1120 240 S 1360 230, 1440 220 V 400 H 0 Z" fill="url(#hill-mid)" />
        <path d="M0 330 C 220 270, 420 300, 640 320 S 1010 270, 1240 300 S 1400 310, 1440 300 V 400 H 0 Z" fill="url(#hill-front)" />
        <path d="M0 330 C 220 270, 420 300, 640 320 S 1010 270, 1240 300 S 1400 310, 1440 300" fill="none" stroke="#4cf05e" strokeOpacity="0.22" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function Ripples({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className}>
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx="100" cy="100" r={18 + i * 6} fill="none" stroke="#c8ccd2" strokeOpacity={0.07 - i * 0.004} strokeWidth="0.35" />
      ))}
    </svg>
  );
}
