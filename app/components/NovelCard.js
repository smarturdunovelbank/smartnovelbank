"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { novelPath } from "../../lib/slug";

export default function NovelCard({ novel }) {
  const [isFavorite, setIsFavorite] = useState(false);

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

  return (
    <article className="novel-card">
      <h2 className="novel-title">
        <Link href={novelPath(novel)}>{novel.Titles}</Link>
      </h2>
      <div className="card-actions">
        <Link href={novelPath(novel)} className="btn-download">
          📖 Read / Download
        </Link>
        <button
          className={`btn btn-secondary btn-fav ${isFavorite ? "active" : ""}`}
          onClick={toggleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>
      </div>
    </article>
  );
}
