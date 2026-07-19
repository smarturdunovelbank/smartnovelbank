"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

const TYPING_TEXTS = [
  "Konsa novel parhna hai aaj?...",
  "Boring din? Ek acha novel search karein!...",
  "Apna pasandeeda novel search karein..."
];

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState(TYPING_TEXTS[0]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [shortError, setShortError] = useState(false);
  const wrapperRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    if (searchParams?.get("q")) {
      setValue(searchParams.get("q"));
    }
  }, [searchParams]);

  // Typewriter effect
  useEffect(() => {
    let typeTextIdx = 0;
    let charIdx = TYPING_TEXTS[0].length;
    let isDeleting = true;
    let timeout;
    let isActive = true;

    const type = () => {
      if (!isActive) return;
      const currentText = TYPING_TEXTS[typeTextIdx];
      
      if (isDeleting) {
        setPlaceholder(currentText.substring(0, charIdx - 1));
        charIdx--;
      } else {
        setPlaceholder(currentText.substring(0, charIdx + 1));
        charIdx++;
      }

      let speed = isDeleting ? 30 : 80;

      if (!isDeleting && charIdx === currentText.length) {
        speed = 3000;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        typeTextIdx = (typeTextIdx + 1) % TYPING_TEXTS.length;
        speed = 500;
      }

      timeout = setTimeout(type, speed);
    };

    timeout = setTimeout(type, 3000);
    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, []);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = value.trim();
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      const { data } = await supabase
        .from("urdu_novels")
        .select("id, Titles")
        .ilike("Titles", `%${q}%`)
        .limit(6);
      if (data) {
        setSuggestions(data);
      }
    };
    
    const debounceId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceId);
  }, [value]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submit = (e) => {
    if (e) e.preventDefault();
    const q = value.trim();
    if (q.length > 0 && q.length < 3 && q !== "all") {
      setShortError(true);
      return;
    }
    setShortError(false);
    if (q.length === 0) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selected = suggestions[selectedIndex];
        setValue(selected.Titles);
        setShowSuggestions(false);
        setShortError(false);
        router.push(`/search?q=${encodeURIComponent(selected.Titles)}`);
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (title) => {
    setValue(title);
    setShowSuggestions(false);
    setShortError(false);
    router.push(`/search?q=${encodeURIComponent(title)}`);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice search not supported on this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setValue("");
      setShortError(false);
      setIsListening(true);
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setValue(transcript);
      setIsListening(false);
      setShowSuggestions(false);
      
      const q = transcript.trim();
      if (q.length > 0 && q.length < 3 && q !== "all") {
        setShortError(true);
        return;
      }
      setShortError(false);
      if (q.length > 0) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "audio-capture") {
        showToast("Didn't catch that. Please try again.");
      } else if (e.error === "not-allowed") {
        showToast("Microphone access denied.");
      }
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="search-container" ref={wrapperRef} style={{ margin: "0 auto", width: "100%", zIndex: 100 }}>
      <form className="search-box-wrapper" onSubmit={submit}>
        <input
          id="searchBox"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
            setShortError(false);
          }}
          onFocus={() => { if(value.trim().length >= 3) setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening... Speak now" : placeholder}
          aria-label="Search novels"
          autoComplete="off"
        />
        <button 
          type="button" 
          id="clearBtn" 
          className={`action-icon ${value && !isListening ? 'show-btn' : ''}`} 
          onClick={() => { setValue(""); setSuggestions([]); setShortError(false); document.getElementById("searchBox").focus(); }}
          aria-label="Clear Search"
        >✕</button>
        <button
          type="button"
          className={`action-icon mic ${isListening ? "listening" : ""}`}
          onClick={startVoiceSearch}
          aria-label="Voice Search"
          title="Voice Search"
        >
          🎙️
        </button>
        <button type="submit" className="search-submit">
          Search
        </button>
      </form>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-box active">
          {suggestions.map((item, idx) => (
            <div 
              key={item.id} 
              className={`suggestion-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(item.Titles)}
            >
              <div className="suggestion-icon">🔍</div>
              {item.Titles}
            </div>
          ))}
        </div>
      )}

      {shortError && (
        <div className="request-banner alert-short" style={{ marginTop: 15 }}>
          <div className="request-banner-text">
             <h4>Sawal Bohat Chota Hai</h4>
             <p>Achi search ke liye kam az kam 3 alfaz likhein (Jaise: Peer e Kamil).</p>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="toast-container">
          <div className="toast show">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}
