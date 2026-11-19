export default function LoginHero() {
  return (
    <section className="login-brand">
      <div className="brand-mark">
        <svg
          width="80"
          height="80"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="lhSphereBg" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#1e3a4a" />
              <stop offset="50%" stopColor="#0d1f2d" />
              <stop offset="100%" stopColor="#060e14" />
            </radialGradient>
            <linearGradient id="lhRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a9e8e" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="lhWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="30%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="lhWaveGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="lhOuterGlow" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="lhGloss" cx="40%" cy="25%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <clipPath id="lhCircleClip">
              <circle cx="32" cy="32" r="29" />
            </clipPath>
          </defs>
          {/* Outer glow ring */}
          <circle cx="32" cy="32" r="31" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" filter="url(#lhOuterGlow)" />
          {/* Sphere background */}
          <circle cx="32" cy="32" r="30" fill="url(#lhSphereBg)" />
          {/* Rim border */}
          <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#lhRimGrad)" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="27" fill="none" stroke="#22c55e" strokeWidth="0.4" opacity="0.2" />
          {/* Waveforms clipped to circle */}
          <g clipPath="url(#lhCircleClip)" filter="url(#lhWaveGlow)">
            {/* Center baseline */}
            <line x1="8" y1="32" x2="56" y2="32" stroke="url(#lhWaveGrad)" strokeWidth="0.5" opacity="0.5" />
            {/* Layer 1 — faintest outer waves */}
            <path d="M8 32 C12 20, 16 14, 20 32 C24 50, 28 50, 32 32 C36 14, 40 14, 44 32 C48 50, 52 44, 56 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.5" opacity="0.2" />
            <path d="M8 32 C12 44, 16 50, 20 32 C24 14, 28 14, 32 32 C36 50, 40 50, 44 32 C48 14, 52 20, 56 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.5" opacity="0.2" />
            {/* Layer 2 */}
            <path d="M8 32 C12 22, 16 16, 20 32 C24 48, 28 48, 32 32 C36 16, 40 16, 44 32 C48 48, 52 42, 56 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.65" opacity="0.3" />
            <path d="M8 32 C12 42, 16 48, 20 32 C24 16, 28 16, 32 32 C36 48, 40 48, 44 32 C48 16, 52 22, 56 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.65" opacity="0.3" />
            {/* Layer 3 */}
            <path d="M10 32 C13 24, 17 18, 20 32 C23 46, 27 46, 32 32 C37 18, 41 18, 44 32 C47 46, 51 40, 54 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.8" opacity="0.45" />
            <path d="M10 32 C13 40, 17 46, 20 32 C23 18, 27 18, 32 32 C37 46, 41 46, 44 32 C47 18, 51 24, 54 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="0.8" opacity="0.45" />
            {/* Layer 4 */}
            <path d="M12 32 C15 25, 18 19, 20 32 C22 45, 26 45, 32 32 C38 19, 42 19, 44 32 C46 45, 49 39, 52 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="1" opacity="0.6" />
            <path d="M12 32 C15 39, 18 45, 20 32 C22 19, 26 19, 32 32 C38 45, 42 45, 44 32 C46 19, 49 25, 52 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="1" opacity="0.6" />
            {/* Layer 5 */}
            <path d="M14 32 C16 26, 19 20, 20 32 C21 44, 25 44, 32 32 C39 20, 43 20, 44 32 C45 44, 48 38, 50 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="1.2" opacity="0.8" />
            <path d="M14 32 C16 38, 19 44, 20 32 C21 20, 25 20, 32 32 C39 44, 43 44, 44 32 C45 20, 48 26, 50 32" fill="none" stroke="url(#lhWaveGrad)" strokeWidth="1.2" opacity="0.8" />
            {/* Layer 6 — brightest core */}
            <path d="M16 32 C18 27, 20 21, 20 32 C20 43, 24 43, 32 32 C40 21, 44 21, 44 32 C44 43, 46 37, 48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
            <path d="M16 32 C18 37, 20 43, 20 32 C20 21, 24 21, 32 32 C40 43, 44 43, 44 32 C44 21, 46 27, 48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
          </g>
          {/* Glass gloss overlay */}
          <circle cx="32" cy="32" r="29" fill="url(#lhGloss)" />
          {/* Top highlight arc */}
          <path d="M 16 14 A 20 20 0 0 1 48 14" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.1" />
        </svg>
      </div>
      <p className="eyebrow">EchoWave Premium</p>
      <h1>Sign in before the music starts.</h1>
      <p>
        High-fidelity playback, futuristic visuals, and a premium studio experience powered by Fastify and MongoDB.
      </p>
    </section>
  );
}
