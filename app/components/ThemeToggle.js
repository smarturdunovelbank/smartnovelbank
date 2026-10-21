"use client";

import { useEffect, useState } from "react";
import { LuSun as Sun, LuMoon as Moon } from "react-icons/lu";

export default function ThemeToggle({ inline = false, style, className }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  if (!mounted) {
    if (inline) {
      return (
        <div
          style={{ width: "34px", height: "30px", ...style }}
          aria-hidden="true"
        />
      );
    }
    return <div className="theme-toggle" aria-hidden="true"></div>;
  }

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  if (inline) {
    return (
      <button
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="admin-theme-btn"
        style={{
          background: "var(--sn-paper-card)",
          border: "1px solid var(--sn-paper-line)",
          padding: "5px 10px",
          borderRadius: "8px",
          fontSize: "0.8rem",
          color: "var(--sn-text-sub)",
          cursor: "pointer",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          transition: "all 0.15s ease",
          ...style,
        }}
      >
        {isDark ? (
          <Sun size={13} style={{ color: "var(--sn-gold)" }} />
        ) : (
          <Moon size={13} />
        )}
        <span>{isDark ? "Light" : "Dark"}</span>
      </button>
    );
  }

  return (
    <button
      className={className || "theme-toggle"}
      style={style}
      onClick={toggleTheme}
      aria-label="Toggle Dark Mode"
      title="Toggle Dark Mode"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
