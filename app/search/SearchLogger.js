"use client";

import { useEffect, useRef } from "react";
import { getUserId } from "../../lib/getUserId";

export default function SearchLogger({ query, resultCount }) {
  const lastLoggedQueryRef = useRef("");

  useEffect(() => {
    if (!query) return;

    function logSearch(q, hadNoResults) {
      const userId = getUserId();
      const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
      const params = new URLSearchParams({
        search: q,
        timestamp: new Date().toISOString(),
        noResults: hadNoResults ? "true" : "false",
        device,
        userId,
      });
      fetch(process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL, { method: 'POST', body: params }).catch(() => {});
    }

    if (query !== "" && query !== "all" && query !== lastLoggedQueryRef.current) {
      logSearch(query, resultCount === 0);
      lastLoggedQueryRef.current = query;
    }
  }, [query]); // Removed resultCount from deps to avoid re-firing on pagination edge cases

  return null;
}
