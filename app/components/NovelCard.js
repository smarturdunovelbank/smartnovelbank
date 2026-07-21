"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { novelPath } from "../../lib/slug";

export default function NovelCard({ novel }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
      if (favs.some((f) => f.id === novel.id)) {
        setIsFavorite(true);
      }
    } catch (e) {}
  }, [novel.id]);

  const toggleFavorite = () => {
    try {
      let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
      const exists = favs.some((f) => f.id === novel.id);

      if (exists) {
        favs = favs.filter((f) => f.id !== novel.id);
        setIsFavorite(false);
      } else {
        favs.push({ id: novel.id, Titles: novel.Titles });
        setIsFavorite(true);
      }
      localStorage.setItem("favorites", JSON.stringify(favs));
      
      // Dispatch event so FavoritesView can update if it's currently rendered
      window.dispatchEvent(new Event("favoritesUpdated"));
    } catch (e) {}
  };

  const copyLink = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${siteUrl}${novelPath(novel)}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <article className="novel-card">
      <h2 className="novel-title" title={novel.Titles}>
        <Link href={novelPath(novel)} scroll={false}>{novel.Titles}</Link>
      </h2>
      <div className="card-actions">
        <button
          className={`btn btn-secondary btn-fav ${isFavorite ? "active" : ""}`}
          onClick={toggleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>
        <button
          className="btn btn-secondary btn-copy"
          onClick={copyLink}
          aria-label="Copy novel link"
          title="Copy novel link"
        >
          {copied ? "✅" : "🔗"}
        </button>
        <Link href={novelPath(novel)} scroll={false} className="btn-download">
          📖 Read & Download
        </Link>
      </div>
    </article>
  );
}
