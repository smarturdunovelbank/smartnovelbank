"use client";

import { useState, useEffect } from "react";
import NovelCard from "./NovelCard";
import SurpriseMe from "./SurpriseMe";

export default function FavoritesView({ defaultCount, children }) {
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const loadFavorites = () => {
    try {
      const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
      setFavorites(favs);
    } catch (e) {}
  };

  useEffect(() => {
    loadFavorites();
    window.addEventListener("favoritesUpdated", loadFavorites);
    return () => window.removeEventListener("favoritesUpdated", loadFavorites);
  }, []);

  useEffect(() => {
    if (showFavorites && favorites.length === 0 && recommendations.length === 0 && !loadingRecs) {
      setLoadingRecs(true);
      fetch('/api/random')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setRecommendations(data);
          }
          setLoadingRecs(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingRecs(false);
        });
    }
  }, [showFavorites, favorites.length, recommendations.length, loadingRecs]);

  return (
    <>
      <div className="controls">
        <span id="resultCount">
          {showFavorites ? `Favorites (${favorites.length})` : `Total Novels: ${defaultCount.toLocaleString()}`}
        </span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <SurpriseMe />
          <button
            className={`fav-section-btn ${showFavorites ? "active-fav-tab" : ""}`}
            onClick={() => setShowFavorites(!showFavorites)}
          >
            {showFavorites ? "Show All Novels" : "Show Favorites ❤️"}
          </button>
        </div>
      </div>

      {showFavorites ? (
        <>
          <div className="grid-container">
            {favorites.length === 0 ? (
              <div style={{ width: "100%", textAlign: "center", gridColumn: "1 / -1", padding: "40px 0" }}>
                <h3 style={{ fontFamily: "Georgia, serif" }}>Koi Favorite Nahi Hai</h3>
                <p style={{ color: "var(--sn-text-sub)" }}>Aapne abhi tak koi novel favorite mein shamil nahi kiya.</p>
              </div>
            ) : (
              favorites.map((novel) => <NovelCard key={novel.id} novel={novel} />)
            )}
          </div>
          
          {favorites.length === 0 && (
            <div style={{ marginTop: "20px" }}>
              <h2 className="related-heading">Aap ko ye bhi pasand aa sakte hain</h2>
              <div className="grid-container">
                {loadingRecs ? (
                  <div className="skeleton" style={{ height: "170px", width: "100%" }}></div>
                ) : (
                  recommendations.map((r) => <NovelCard key={r.id} novel={r} />)
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        children
      )}
    </>
  );
}
