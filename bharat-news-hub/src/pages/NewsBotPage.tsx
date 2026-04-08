import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import ChatSidebar from "@/components/bharatnews/ChatSidebar";
import NewsMessageCard from "@/components/bharatnews/NewsMessageCard";
import GeneratingIndicator from "@/components/bharatnews/GeneratingIndicator";
import ChatInput from "@/components/bharatnews/ChatInput";
import WelcomeScreen from "@/components/bharatnews/WelcomeScreen";
import BharatNewsLogo from "@/components/bharatnews/BharatNewsLogo";
import type { ChatSession, ChatMessage } from "@/types/newsBot.types";
import { sendNewsQueryGroq } from "@/services/newsBotApi";
import { Settings, X } from "lucide-react";

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
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      (import.meta as any).env?.VITE_GROQ_API_KEY ||
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
      const newsData = await sendNewsQueryGroq(text, [...currentMessages, userMsg], apiKey);

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border p-4 h-full overflow-y-auto">
              <button
                onClick={handleNewChat}
                className="w-full mb-4 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                + New Chat
              </button>

              <ChatSidebar
                sessions={sessions}
                activeId={activeId}
                isOpen={true}
                onToggle={() => {}}
                onNewChat={handleNewChat}
                onSelectSession={setActiveId}
                onDeleteSession={handleDeleteSession}
                onPinSession={handlePinSession}
              />
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Chat Header */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BharatNewsLogo size={28} spinning={isGenerating} />
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      BharatNews <span className="text-orange-500">AI</span>
                    </h1>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isGenerating
                            ? "bg-amber-400 animate-pulse"
                            : "bg-green-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isGenerating
                            ? "text-amber-400"
                            : "text-green-500"
                        }`}
                      >
                        {isGenerating ? "Generating..." : "Ready"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiModal(true)}
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <WelcomeScreen
                    onTopicClick={(text) => setInput(text)}
                  />
                ) : (
                  <>
                    {messages.map((msg) => (
                      <NewsMessageCard
                        key={msg.id}
                        message={msg}
                        onFollowUp={handleFollowUp}
                      />
                    ))}
                    {isGenerating && <GeneratingIndicator />}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-border p-4 bg-muted/30">
                <ChatInput
                  value={input}
                  onChange={(text) => setInput(text)}
                  onSubmit={handleSend}
                  isLoading={isGenerating}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                API Key Setup
              </h2>
              <button
                onClick={() => setShowApiModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Enter your Groq API key to enable the chatbot
            </p>

            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
              placeholder="gsk_..."
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <p className="text-xs text-muted-foreground mb-4">
              Get your key at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.groq.com
              </a>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApiModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsBotPage;
