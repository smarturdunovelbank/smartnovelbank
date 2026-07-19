"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Skip scrolling on the initial mount so the browser's native scroll restoration
    // (like back-button behavior or #hash links) still works as expected.
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: isReducedMotion ? 'auto' : 'smooth'
    });
  }, [pathname, searchParams]);

  return null;
}
