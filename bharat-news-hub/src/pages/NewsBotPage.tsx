import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatSidebar from "@/components/bharatnews/ChatSidebar";
import NewsMessageCard from "@/components/bharatnews/NewsMessageCard";
import GeneratingIndicator from "@/components/bharatnews/GeneratingIndicator";
import ChatInput from "@/components/bharatnews/ChatInput";
import WelcomeScreen from "@/components/bharatnews/WelcomeScreen";
import BharatNewsLogo from "@/components/bharatnews/BharatNewsLogo";
import type { ChatSession, ChatMessage } from "@/types/newsBot.types";
import { sendNewsQuery } from "@/services/newsBotApi";
import { Settings, Wifi } from "lucide-react";

/* ─── localStorage helpers ──────────────────────────────────────── */
const STORAGE_KEY = "bharatnews_sessions_v2";

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

/* ─── Scrolling news ticker items ───────────────────────────────── */
const TICKER_ITEMS = [
  "📡 BharatNews AI — Your 24/7 news correspondent",
  "🇮🇳 Ask about India, global affairs, markets, tech and more",
  "⚡ Powered by Claude AI — Responses grounded in real knowledge",
  "📰 Type any topic for an instant professional briefing",
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
const NewsBotPage: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      (import.meta as any).env?.VITE_ANTHROPIC_API_KEY ||
      localStorage.getItem("bharatnews_api_key") ||
      ""
    );
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Load sessions from storage */
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  /* Active session */
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  /* Update sessions helper */
  const updateSessions = useCallback(
    (updater: (prev: ChatSession[]) => ChatSession[]) => {
      setSessions((prev) => {
        const next = updater(prev);
        persistSessions(next);
        return next;
      });
    },
    []
  );

  /* ── New session ──────────────────────────────────────────────── */
  const handleNewChat = useCallback(() => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id,
      title: "New Briefing",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    updateSessions((prev) => [newSession, ...prev]);
    setActiveId(id);
    setError(null);
  }, [updateSessions]);

  /* ── Delete session ───────────────────────────────────────────── */
  const handleDeleteSession = useCallback(
    (id: string) => {
      updateSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== id);
          setActiveId(remaining[0]?.id ?? null);
          return remaining;
        });
      }
    },
    [activeId, updateSessions]
  );

  /* ── Pin session ──────────────────────────────────────────────── */
  const handlePinSession = useCallback(
    (id: string) => {
      updateSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
      );
    },
    [updateSessions]
  );

  /* ── Ensure session exists ────────────────────────────────────── */
  const ensureSession = useCallback(
    (firstMessage: string): string => {
      if (activeId) return activeId;
      const id = Date.now().toString();
      const now = new Date().toISOString();
      const newSession: ChatSession = {
        id,
        title: firstMessage.slice(0, 45),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      updateSessions((prev) => [newSession, ...prev]);
      setActiveId(id);
      return id;
    },
    [activeId, updateSessions]
  );

  /* ── Send message ─────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    setInput("");
    setError(null);

    const sid = ensureSession(text);
    const now = new Date().toISOString();

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: now,
    };

    /* Append user message */
    updateSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              messages: [...s.messages, userMsg],
              title:
                s.title === "New Briefing" ? text.slice(0, 45) : s.title,
              updatedAt: now,
            }
          : s
      )
    );

    setIsGenerating(true);

    try {
      const currentMessages = sessions.find((s) => s.id === sid)?.messages ?? [];
      const newsData = await sendNewsQuery(text, [...currentMessages, userMsg], apiKey);

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: JSON.stringify(newsData),
        parsed: newsData,
        timestamp: new Date().toISOString(),
        type: "news",
      };

      updateSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                messages: [...s.messages, assistantMsg],
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errMsg);

      const errorMsg: ChatMessage = {
        id: `e_${Date.now()}`,
        role: "assistant",
        content: `Failed to fetch news: ${errMsg}`,
        timestamp: new Date().toISOString(),
        type: "error",
      };

      updateSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, apiKey, ensureSession, sessions, updateSessions]);

  /* ── Follow-up click ─────────────────────────────────────────── */
  const handleFollowUp = useCallback(
    (question: string) => {
      setInput(question);
    },
    []
  );

  /* ── Save API key ─────────────────────────────────────────────── */
  const handleSaveApiKey = () => {
    const key = tempApiKey.trim();
    if (key) {
      setApiKey(key);
      localStorage.setItem("bharatnews_api_key", key);
    }
    setShowApiModal(false);
    setTempApiKey("");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(15,28,80,0.6) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(8,20,60,0.5) 0%, transparent 60%), linear-gradient(160deg, #040916 0%, #060d24 50%, #030810 100%)",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }

        /* Animated constellation dots */
        @keyframes twinkle {
          0%,100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes ticker-scroll {
          from { transform: translateX(100%); }
          to { transform: translateX(-200%); }
        }

        .news-topbar-glow {
          box-shadow: 0 1px 0 rgba(99,102,241,0.15), 0 4px 20px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Background star particles */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${1 + Math.random()}px`,
              height: `${1 + Math.random()}px`,
              borderRadius: "50%",
              background: "white",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 20, flexShrink: 0 }}>
        <ChatSidebar
          sessions={sessions}
          activeId={activeId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onNewChat={handleNewChat}
          onSelectSession={setActiveId}
          onDeleteSession={handleDeleteSession}
          onPinSession={handlePinSession}
        />
      </div>

      {/* ─── MAIN AREA ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Top bar */}
        <div
          className="news-topbar-glow"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(4,8,22,0.75)",
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Animated logo — spins when generating */}
          <BharatNewsLogo size={32} spinning={isGenerating} />

          {/* Title + status */}
          <div style={{ flexShrink: 0 }}>
            <span
              style={{
                color: "#e2e8f0",
                fontSize: "15px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              BharatNews{" "}
              <span style={{ color: "#FF9933" }}>AI</span>
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "1px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isGenerating ? "#fbbf24" : "#22c55e",
                  animation: isGenerating
                    ? "twinkle 0.8s ease-in-out infinite"
                    : "none",
                }}
              />
              <span
                style={{
                  color: isGenerating ? "#fbbf24" : "#22c55e",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {isGenerating ? "GATHERING NEWS" : "LIVE"}
              </span>
            </div>
          </div>

          {/* Scrolling news ticker */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              height: "18px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                whiteSpace: "nowrap",
                animation: "ticker-scroll 28s linear infinite",
                color: "#334155",
                fontSize: "11px",
              }}
            >
              {TICKER_ITEMS.join("  ·  ")}
            </div>
          </div>

          {/* WiFi icon */}
          <Wifi size={14} style={{ color: isGenerating ? "#fbbf24" : "#22c55e", flexShrink: 0 }} />

          {/* Settings */}
          <button
            onClick={() => {
              setTempApiKey(apiKey);
              setShowApiModal(true);
            }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
            title="API Settings"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px 8px",
          }}
        >
          {/* Welcome screen */}
          {messages.length === 0 && !isGenerating && (
            <WelcomeScreen
              onTopicClick={(topic) => {
                setInput(topic);
              }}
            />
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <NewsMessageCard
              key={msg.id}
              message={msg}
              onFollowUp={handleFollowUp}
            />
          ))}

          {/* Generating indicator */}
          {isGenerating && <GeneratingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          isLoading={isGenerating}
        />
      </div>

      {/* ─── API KEY MODAL ─────────────────────────────────────────── */}
      {showApiModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowApiModal(false);
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(145deg, rgba(12,18,50,0.97), rgba(6,10,28,0.98))",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "2px solid #FF9933",
              borderRadius: "20px",
              padding: "28px 28px 24px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <BharatNewsLogo size={36} />
              <div>
                <div style={{ color: "#f1f5f9", fontSize: "17px", fontWeight: 800 }}>
                  API Configuration
                </div>
                <div style={{ color: "#475569", fontSize: "12px" }}>
                  Configure your Anthropic API key
                </div>
              </div>
            </div>

            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.7, marginBottom: "18px" }}>
              BharatNews AI uses the Claude API to generate news briefings.
              Your API key is stored locally and never sent to any external server.
            </p>

            <label
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Anthropic API Key
            </label>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
              placeholder="sk-ant-..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "11px 14px",
                color: "#e2e8f0",
                fontSize: "14px",
                outline: "none",
                marginBottom: "8px",
                fontFamily: "monospace",
              }}
            />
            <p style={{ color: "#334155", fontSize: "11px", marginBottom: "20px" }}>
              Get your key at{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#6366f1" }}
              >
                console.anthropic.com
              </a>
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowApiModal(false)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "11px",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                style={{
                  flex: 2,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "11px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
                }}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsBotPage;
