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
      <h1 className="logo" style={{ margin: 0, fontSize: "1.2rem" }}>
        EchoWave
      </h1>
    </nav>
  );
}
