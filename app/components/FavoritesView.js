"use client";

import { useState, useEffect } from "react";
import NovelCard from "./NovelCard";
import SurpriseMe from "./SurpriseMe";
import Link from "next/link";

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
        <div style={showFavorites ? { flex: 1, display: 'flex' } : {}}>
          <span id="resultCount">
            {showFavorites ? `Favorites (${favorites.length})` : `Total Novels: ${defaultCount.toLocaleString()}`}
          </span>
        </div>
        <div className="toolbar-buttons-wrapper" style={{ 
          display: "flex", 
          gap: "6px", 
          alignItems: "center", 
          justifyContent: showFavorites ? "center" : "flex-end"
        }}>
          <button
            className={`fav-section-btn ${showFavorites ? "active-fav-tab" : ""}`}
            onClick={() => setShowFavorites(!showFavorites)}
          >
            {showFavorites ? "⬅ Back to Library" : "❤️ Show Favorites"}
          </button>
          {!showFavorites && <SurpriseMe />}
          {!showFavorites && (
            <Link href="/request-novel" className="fav-section-btn active-fav-tab" style={{ textDecoration: 'none' }}>
              📬 Request Novel
            </Link>
          )}
        </div>
        {showFavorites && <div style={{ flex: 1 }}></div>}
      </div>

      {showFavorites ? (
        <>
          <div className="grid-container">
            {favorites.length === 0 ? (
              <div style={{ width: "100%", textAlign: "center", gridColumn: "1 / -1", paddingTop: "0", paddingBottom: "20px", marginTop: "-16px" }}>
                <h3 className="text-urdu" style={{ textAlign: "center", marginTop: "0", marginBottom: "16px" }}>کوئی پسندیدہ نہیں ہے</h3>
                <p className="text-urdu" style={{ color: "var(--sn-text-sub)", margin: "0" }}>آپ نے ابھی تک کوئی ناول پسندیدہ میں شامل نہیں کیا۔کوئی ناول پسند آئے تو اس کے کارڈ پر دل کے نشان🤍 پر کلک کریں، وہ یہاں محفوظ ہو جائے گا۔</p>
              </div>
            ) : (
              favorites.map((novel) => <NovelCard key={novel.id} novel={novel} />)
            )}
          </div>
          
          {favorites.length === 0 && (
            <div style={{ marginTop: "20px" }}>
              <h2 className="related-heading text-urdu">آپ کو یہ بھی پسند آ سکتے ہیں</h2>
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
