"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy Policy" },
  ];

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div className="desktop-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            scroll={false}
            className={`nav-link ${pathname === link.href ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mobile-nav">
        <button
          className="hamburger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        {/* Dimmed Overlay */}
        <div 
          className={`mobile-menu-overlay ${isOpen ? "open" : ""}`} 
          onClick={() => setIsOpen(false)}
        />

        {/* Slide-in Drawer */}
        <div className={`mobile-menu-drawer ${isOpen ? "open" : ""}`}>
          <div className="drawer-header">
            <button 
              className="drawer-close-btn" 
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <div className="drawer-links">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                className={`mobile-nav-link ${pathname === link.href ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
