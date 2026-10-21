"use client";

import { Suspense } from "react";
import ToastContainer from "../components/ToastContainer";
import ThemeToggle from "../components/ThemeToggle";
import ScrollToTop from "../components/ScrollToTop";

/**
 * Admin Layout — isolated from the public website shell.
 *
 * - No public Header/Footer/NavLinks/NovelChatBot/BackToTop
 * - Provides its own ToastContainer for admin notifications
 * - ThemeToggle is preserved for dark/light mode parity
 * - Full-screen flex container so the dashboard fills the viewport
 */
export default function AdminLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--sn-paper)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >

      {/* Main admin content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {/* Admin-specific toast notifications */}
      <ToastContainer />

      {/* Scroll-to-top on route navigation within admin tabs */}
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
    </div>
  );
}
