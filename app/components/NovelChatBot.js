"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const INITIAL_MESSAGE = {
  role: "bot",
  text: "Assalam-o-Alaikum! 📚 Main Smart Novel AI Assistant hun. Kisi bhi novel ka naam likhein ya kahain 'Koi acha novel batao'!",
  items: [],
};

const QUICK_SUGGESTIONS = [
  "Namal Novel",
  "Romantic Novels",
  "Peer e Kamil",
  "Latest Episodes",
];

export default function NovelChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (overrideText) => {
    const textToSend = typeof overrideText === "string" ? overrideText : input;
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    // Build conversation history (last 4 to 6 messages mapped to role & content, plus current user message)
    const recentHistory = messages
      .filter((m) => m !== INITIAL_MESSAGE && m.text !== INITIAL_MESSAGE.text)
      .slice(-6)
      .map((m) => ({
        role: (m.role === "bot" || m.role === "assistant") ? "assistant" : "user",
        content: m.text || m.content || "",
      }))
      .filter((m) => m.content && m.content.trim().length > 0);

    const conversationHistory = [
      ...recentHistory,
      { role: "user", content: trimmed },
    ];

    // Add user message
    const userMsg = { role: "user", text: trimmed, items: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/novel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          message: trimmed,
        }),
      });

      const data = await res.json();
      const botMsg = {
        role: "bot",
        text: data.text || data.reply || "Koi response nahi mila.",
        items: data.items || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Network error — internet check karein aur dobara try karein.",
          items: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChipClick = (suggestion) => {
    if (isLoading) return;
    setInput(suggestion);
    sendMessage(suggestion);
  };

  return (
    <div className="chatbot-wrapper">
      {/* ── Toggle Button ── */}
      <button
        className={`chatbot-toggle-btn ${isOpen ? "chatbot-toggle-open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open AI chat assistant"}
        title={isOpen ? "Close" : "Ask AI"}
      >
        {isOpen ? "✕" : "🤖 Ask AI"}
      </button>

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <span className="chatbot-header-icon">📚</span>
            <div>
              <strong>Smart Novel AI</strong>
              <span className="chatbot-header-sub">Novel Finder & Recommender</span>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user" ? "chatbot-msg-user" : "chatbot-msg-bot"
                }
              >
                <p className="chatbot-msg-text">{msg.text}</p>

                {/* Novel download cards */}
                {msg.items && msg.items.length > 0 && (
                  <div className="chatbot-items-list">
                    {msg.items.map((item, j) => (
                      <div key={j} className="chatbot-item-card">
                        <span className="chatbot-item-title">{item.title}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chatbot-dl-btn"
                        >
                          📥 Download PDF
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Temporary typing indicator while waiting for API */}
            {isLoading && (
              <div className="chatbot-msg-bot">
                <div className="flex items-center gap-1.5 py-1 px-0.5 chatbot-typing">
                  <span
                    className="w-2 h-2 rounded-full bg-current opacity-70 animate-bounce chatbot-dot"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-current opacity-70 animate-bounce chatbot-dot"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-current opacity-70 animate-bounce chatbot-dot"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (hidden if messages length > 2) */}
          {messages.length <= 2 && (
            <div className="chatbot-suggestions flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-t border-[var(--sn-paper-line)] bg-[var(--sn-paper-card)] flex-shrink-0">
              {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleChipClick(suggestion)}
                  className="chatbot-chip whitespace-nowrap text-xs px-2.5 py-1 rounded-full border border-[var(--sn-paper-line)] bg-[var(--sn-paper)] text-[var(--sn-text-main)] hover:border-[var(--sn-gold)] hover:bg-[var(--sn-paper-card)] hover:text-[var(--sn-ink)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Novel ka naam likhein..."
              maxLength={200}
              disabled={isLoading}
              className="chatbot-input"
              id="chatbot-input-field"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="chatbot-send-btn"
              aria-label="Send message"
              id="chatbot-send-btn"
            >
              {isLoading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
