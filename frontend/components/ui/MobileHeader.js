"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="mobile-header">
      <button
        className="mobile-menu-toggle"
        aria-label="Toggle menu"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Menu size={24} />
      </button>
      <h1 className="logo" style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <radialGradient id="mhSphereBg" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#1e3a4a" />
              <stop offset="50%" stopColor="#0d1f2d" />
              <stop offset="100%" stopColor="#060e14" />
            </radialGradient>
            <linearGradient id="mhRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a9e8e" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="mhWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="mhWaveGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="mhGloss" cx="40%" cy="25%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <clipPath id="mhCircleClip">
              <circle cx="32" cy="32" r="29" />
            </clipPath>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#mhSphereBg)" />
          <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#mhRimGrad)" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="27" fill="none" stroke="#22c55e" strokeWidth="0.4" opacity="0.2" />
          <g clipPath="url(#mhCircleClip)" filter="url(#mhWaveGlow)">
            <line x1="8" y1="32" x2="56" y2="32" stroke="url(#mhWaveGrad)" strokeWidth="0.5" opacity="0.5" />
            <path d="M10 32 C13 24, 17 18, 20 32 C23 46, 27 46, 32 32 C37 18, 41 18, 44 32 C47 46, 51 40, 54 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="0.8" opacity="0.4" />
            <path d="M10 32 C13 40, 17 46, 20 32 C23 18, 27 18, 32 32 C37 46, 41 46, 44 32 C47 18, 51 24, 54 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="0.8" opacity="0.4" />
            <path d="M12 32 C15 25, 18 19, 20 32 C22 45, 26 45, 32 32 C38 19, 42 19, 44 32 C46 45, 49 39, 52 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="1" opacity="0.6" />
            <path d="M12 32 C15 39, 18 45, 20 32 C22 19, 26 19, 32 32 C38 45, 42 45, 44 32 C46 19, 49 25, 52 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="1" opacity="0.6" />
            <path d="M14 32 C16 26, 19 20, 20 32 C21 44, 25 44, 32 32 C39 20, 43 20, 44 32 C45 44, 48 38, 50 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="1.2" opacity="0.85" />
            <path d="M14 32 C16 38, 19 44, 20 32 C21 20, 25 20, 32 32 C39 44, 43 44, 44 32 C45 20, 48 26, 50 32" fill="none" stroke="url(#mhWaveGrad)" strokeWidth="1.2" opacity="0.85" />
            <path d="M16 32 C18 27, 20 21, 20 32 C20 43, 24 43, 32 32 C40 21, 44 21, 44 32 C44 43, 46 37, 48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
            <path d="M16 32 C18 37, 20 43, 20 32 C20 21, 24 21, 32 32 C40 43, 44 43, 44 32 C44 21, 46 27, 48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
          </g>
          <circle cx="32" cy="32" r="29" fill="url(#mhGloss)" />
        </svg>
        EchoWave
      </h1>
    </nav>
  );
}
