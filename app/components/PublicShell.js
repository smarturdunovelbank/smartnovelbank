"use client";

import { usePathname } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import NovelChatBot from "./NovelChatBot";
import ToastContainer from "./ToastContainer";
import ScrollToTop from "./ScrollToTop";

/**
 * PublicShell — renders the global public site chrome (Footer, ThemeToggle,
 * BackToTop, NovelChatBot, etc.) on all routes EXCEPT /admin/*.
 *
 * Respects global site settings: if chatbot_enabled is false, NovelChatBot
 * is not rendered.
 */
export default function PublicShell() {
  const pathname = usePathname();
  const [chatbotEnabled, setChatbotEnabled] = useState(true);

  // Suppress all public chrome on admin routes
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    let mounted = true;
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.settings) return;
        if (data.settings.chatbot_enabled === false) {
          setChatbotEnabled(false);
        } else {
          setChatbotEnabled(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch chatbot visibility setting:", err);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <>
      <ThemeToggle />
      <Footer />
      <ToastContainer />
      <BackToTop />
      {chatbotEnabled && <NovelChatBot />}
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
    </>
  );
}
