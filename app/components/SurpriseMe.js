"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { novelPath } from "../../lib/slug";

export default function SurpriseMe() {
  const [showModal, setShowModal] = useState(false);
  const [randomNovel, setRandomNovel] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomNovel = async () => {
    setLoading(true);
    try {
      // Approximate total novels to 75k to avoid out-of-bounds offset
      const randomOffset = Math.floor(Math.random() * 75000);
      const { data, error } = await supabase
        .from("urdu_novels")
        .select("id, Titles, Links")
        .range(randomOffset, randomOffset)
        .limit(1)
        .single();
      
      if (!error && data) {
        setRandomNovel(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const surpriseMe = () => {
    setShowModal(true);
    fetchRandomNovel();
  };

  return (
    <>
      <button className="surprise-btn" onClick={surpriseMe}>
        🎲 Surprise Me
      </button>

      {showModal && (
        <div className="surprise-overlay" onClick={(e) => { if(e.target.className === 'surprise-overlay') setShowModal(false) }}>
          <div className="surprise-modal">
            <button className="surprise-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <span className="surprise-dice">🎲</span>
            <span className="novel-label">Aaj ka novel</span>
            <div className="novel-name">
              {loading ? "Loading..." : randomNovel ? randomNovel.Titles : "Error fetching novel"}
            </div>
            
            {!loading && randomNovel && (
              <div className="surprise-actions">
                <a href={randomNovel.Links || "#"} target="_blank" rel="noopener noreferrer" className="surprise-download">
                  📥 Download PDF
                </a>
                <button className="surprise-again attention" onClick={fetchRandomNovel}>
                  🎲 Dobara
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
