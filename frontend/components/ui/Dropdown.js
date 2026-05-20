"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function Dropdown({ value, onChange, options = [], name = "", className = "", style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Find active option
  const activeOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(optValue) {
    if (onChange) {
      onChange({ target: { name, value: optValue } });
    }
    setIsOpen(false);
  }

  return (
    <div className={`custom-dropdown ${className}`} style={{ position: "relative", ...style }} ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="dropdown-trigger-text">
          {activeOption ? activeOption.label : "Select option..."}
        </span>
        <ChevronDown size={14} className={`dropdown-chevron ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`dropdown-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span className="dropdown-item-text">{opt.label}</span>
                {isSelected && <Check size={14} className="dropdown-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
