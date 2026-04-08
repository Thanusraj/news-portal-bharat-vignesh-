import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/newsbot/Sidebar";
import ChatHeader from "@/components/newsbot/ChatHeader";
import ChatMessages from "@/components/newsbot/ChatMessages";
import ChatInput from "@/components/newsbot/ChatInput";
import type { ChatSession, ChatMessage } from "@/types/newsBot.types";
import { sendNewsQueryGroq } from "@/services/newsBotApi";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Load sessions from storage */
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  /* Active session */
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

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

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                NewsBot AI
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                BharatNews AI Correspondent
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Get fast, trusted news summaries and briefings from BharatNews AI without leaving the portal.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
          <aside className="hidden xl:block">
            <div className="h-full rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              <Sidebar
                sessions={sessions}
                activeId={activeId}
                onNewChat={handleNewChat}
                onSelectSession={setActiveId}
                onDeleteSession={handleDeleteSession}
                onPinSession={handlePinSession}
              />
            </div>
          </aside>

          <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              <ChatHeader
                isGenerating={isGenerating}
                onOpenSidebar={() => setSidebarOpen(true)}
                onOpenSettings={() => setShowApiModal(true)}
              />
              <ChatMessages
                messages={messages}
                isGenerating={isGenerating}
                onTopicClick={(text) => setInput(text)}
                onFollowUp={handleFollowUp}
              />
            </div>

            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              <ChatInput
                value={input}
                onChange={(text) => setInput(text)}
                onSubmit={handleSend}
                isLoading={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Tablet/mobile sidebar as a drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)]">
            <Sidebar
              sessions={sessions}
              activeId={activeId}
              onNewChat={() => {
                handleNewChat();
                setSidebarOpen(false);
              }}
              onSelectSession={(id) => {
                setActiveId(id);
                setSidebarOpen(false);
              }}
              onDeleteSession={handleDeleteSession}
              onPinSession={handlePinSession}
              className="w-full h-full"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                API Key Setup
              </h2>
              <button
                onClick={() => setShowApiModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter your Groq API key to enable the chatbot
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
              placeholder="gsk_..."
              className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />

            <p className="text-xs text-gray-500 mb-4">
              Get your key at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                console.groq.com
              </a>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApiModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-semibold"
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
