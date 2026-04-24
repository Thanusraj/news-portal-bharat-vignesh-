import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import type { ChatSession, ChatMessage } from "@/types/newsBot.types";
import { processNewsQuery } from "@/services/newsbot/newsBotPipeline";
import { useAuth } from "@/contexts/AuthContext";
import {
  X,
  Plus,
  MessageSquare,
  Trash2,
  Pin,
  Search,
  Clock,
  Settings,
  Send,
  Sparkles,
  Menu,
  Zap,
  Newspaper,
  Brain,
  Globe,
  TrendingUp,
  Shield,
  TrendingDown,
  Minus,
  BookOpen,
  ChevronRight,
  PanelLeftClose,
  Volume2,
  VolumeX,
} from "lucide-react";
import BharatNewsLogo from "@/components/bharatnews/BharatNewsLogo";
import { cn } from "@/lib/utils";

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

/* ─── Relative time formatter ───────────────────────────────────── */
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/* ─── Group sessions by date ────────────────────────────────────── */
const groupSessionsByDate = (sessions: ChatSession[]) => {
  const groups: Record<string, ChatSession[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  sessions.forEach((session) => {
    if (session.pinned) {
      groups["Pinned"].push(session);
      return;
    }
    const d = new Date(session.updatedAt);
    if (d >= today) groups["Today"].push(session);
    else if (d >= yesterday) groups["Yesterday"].push(session);
    else if (d >= weekAgo) groups["This Week"].push(session);
    else groups["Earlier"].push(session);
  });
  return groups;
};

/* ─── Sentiment config ──────────────────────────────────────────── */
const SENTIMENT_CONFIG = {
  positive: { icon: TrendingUp, color: "#10b981", label: "Positive" },
  negative: { icon: TrendingDown, color: "#ef4444", label: "Negative" },
  mixed: { icon: Zap, color: "#f59e0b", label: "Mixed" },
  neutral: { icon: Minus, color: "#6b7280", label: "Neutral" },
};

/* ─── Loading animation stages ──────────────────────────────────── */
const STAGES = [
  "Understanding your query...",
  "Scanning live news sources...",
  "Fetching articles from multiple APIs...",
  "Extracting article content...",
  "Analyzing with AI...",
  "Composing your briefing...",
];

/* ─── Welcome topics ────────────────────────────────────────────── */
const WELCOME_TOPICS: any[] = [];
const HOT_TOPICS: string[] = [];

const GTTS_LANG_MAP: Record<string, string> = {
  en: "en",
  english: "en",
  hi: "hi",
  hindi: "hi",
  ta: "ta",
  tamil: "ta",
  te: "te",
  telugu: "te",
  bn: "bn",
  bengali: "bn",
  mr: "mr",
  marathi: "mr",
  gu: "gu",
  gujarati: "gu",
  kn: "kn",
  kannada: "kn",
  ml: "ml",
  malayalam: "ml",
};

const detectTtsLanguage = (text: string, profileLanguage?: string): string => {
  const preferred = GTTS_LANG_MAP[(profileLanguage || "").toLowerCase()];

  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0900-\u097F]/.test(text)) return preferred === "mr" ? "mr" : "hi";

  return preferred || "en";
};

const chunkTextForTts = (text: string, maxLen = 200): string[] => {
  const chunks: string[] = [];
  let remaining = text.replace(/\s+/g, " ").trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let cutAt = -1;
    for (let i = maxLen; i >= 0; i--) {
      if (".!?,;: ".includes(remaining[i])) {
        cutAt = i + 1;
        break;
      }
    }

    if (cutAt <= 0) cutAt = maxLen;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks.filter(Boolean);
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE — ChatGPT-style layout
═══════════════════════════════════════════════════════════════════ */
const NewsBotPage: React.FC = () => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // API keys auto-loaded from .env — no manual entry needed
  const apiKeyConfigured = Boolean(import.meta.env.VITE_GROQ_API_KEY);
  const [showApiModal, setShowApiModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [stageIdx, setStageIdx] = useState(0);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const audioAbortRef = React.useRef(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const stopAudio = useCallback(() => {
    audioAbortRef.current = true;
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
      } catch {}
    }
    window.speechSynthesis.cancel();
    setPlayingAudioId(null);
  }, []);

  const speakText = async (id: string, text: string) => {
    if (playingAudioId === id) {
      stopAudio();
      return;
    }

    const plainText = text.replace(/\s+/g, " ").trim();
    if (!plainText) return;

    stopAudio();
    audioAbortRef.current = false;
    setPlayingAudioId(id);

    const ttsLang = detectTtsLanguage(plainText, profile?.language);
    const chunks = chunkTextForTts(plainText, 200);

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }

    const player = audioPlayerRef.current;

    const playNext = async (index: number) => {
      if (audioAbortRef.current) return;
      if (index >= chunks.length) {
        setPlayingAudioId(null);
        return;
      }

      const url = `/api/gtts?ie=UTF-8&q=${encodeURIComponent(chunks[index])}&tl=${ttsLang}&client=tw-ob`;
      player.src = url;

      player.onended = () => {
        playNext(index + 1);
      };

      player.onerror = () => {
        console.error("AI article audio chunk failed to load.");
        playNext(index + 1);
      };

      try {
        await player.play();
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("AI article audio playback failed:", err);
          setPlayingAudioId(null);
        }
      }
    };

    playNext(0);
  };

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  /* Load sessions */
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  /* Generating stage rotation */
  useEffect(() => {
    if (!isGenerating) return;
    const t = setInterval(() => setStageIdx((i) => (i + 1) % STAGES.length), 1800);
    return () => clearInterval(t);
  }, [isGenerating]);

  /* Auto-scroll on new messages */
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

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

  const handlePinSession = useCallback(
    (id: string) => {
      updateSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
      );
    },
    [updateSessions]
  );

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

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

    updateSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              messages: [...s.messages, userMsg],
              title: s.title === "New Briefing" ? text.slice(0, 45) : s.title,
              updatedAt: now,
            }
          : s
      )
    );

    setIsGenerating(true);

    try {
      const currentMessages = sessions.find((s) => s.id === sid)?.messages ?? [];
      const newsData = await processNewsQuery(text, [...currentMessages, userMsg]);

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
          s.id === sid ? { ...s, messages: [...s.messages, errorMsg] } : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, ensureSession, sessions, updateSessions]);

  // API key modal is now informational only

  /* ─── Filtered sidebar sessions ─────────────────────────── */
  const filteredSessions = sidebarSearch.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : sessions;
  const grouped = groupSessionsByDate(filteredSessions);

  const canSend = input.trim().length > 0 && !isGenerating;

  return (
    <div className="newsbot-root">
      <style>{newsBotStyles}</style>
      <Header />

      <div className="newsbot-container">
        {/* ─── SIDEBAR ─────────────────────────────────── */}
        <aside className={cn("newsbot-sidebar", sidebarOpen && "open", sidebarMobileOpen && "mobile-open")}>
          {/* Sidebar top */}
          <div className="nb-sidebar-top">
            <div className="nb-sidebar-brand">
              <span className="nb-sidebar-brand-text" style={{ fontSize: "1.2rem", fontWeight: "600" }}>History</span>
            </div>
            <button
              className="nb-sidebar-close-btn"
              onClick={() => { setSidebarOpen(false); setSidebarMobileOpen(false); }}
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <button className="nb-new-chat-btn" onClick={() => { handleNewChat(); setSidebarMobileOpen(false); }}>
            <Plus size={16} />
            New Chat
          </button>

          {/* Search */}
          <div className="nb-sidebar-search">
            <Search size={14} className="nb-search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="nb-search-input"
            />
          </div>

          {/* Sessions list */}
          <div className="nb-sessions-list">
            {Object.entries(grouped).map(([groupName, groupSessions]) => {
              if (groupSessions.length === 0) return null;
              return (
                <div key={groupName} className="nb-session-group">
                  <div className="nb-session-group-label">
                    {groupName === "Pinned" && "📌 "}
                    {groupName}
                  </div>
                  {groupSessions.map((session) => (
                    <button
                      key={session.id}
                      className={cn("nb-session-item", session.id === activeId && "active")}
                      onClick={() => { setActiveId(session.id); setSidebarMobileOpen(false); }}
                    >
                      <MessageSquare size={14} className="nb-session-icon" />
                      <div className="nb-session-info">
                        <span className="nb-session-title">{session.title}</span>
                        <span className="nb-session-meta">
                          <Clock size={10} />
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                      </div>
                      <div className="nb-session-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={cn("nb-action-btn", session.pinned && "pinned")}
                          onClick={() => handlePinSession(session.id)}
                          title="Pin"
                        >
                          <Pin size={12} />
                        </button>
                        <button
                          className="nb-action-btn delete"
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
              <div className="nb-empty-sessions">
                {sidebarSearch ? "No matching chats" : "No chat history yet"}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="nb-sidebar-footer">
            <button className="nb-settings-btn" onClick={() => setShowApiModal(true)}>
              <Settings size={14} />
              API Settings
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarMobileOpen && <div className="nb-sidebar-overlay" onClick={() => setSidebarMobileOpen(false)} />}

        {/* ─── MAIN CHAT AREA ──────────────────────────── */}
        <main className="newsbot-main">
          {/* Top bar */}
          <div className="nb-topbar">
            <button
              className="nb-topbar-menu"
              onClick={() => { if (window.innerWidth < 768) setSidebarMobileOpen(true); else setSidebarOpen(true); }}
              style={{ display: sidebarOpen && window.innerWidth >= 768 ? "none" : undefined }}
            >
              <Menu size={20} />
            </button>
            <div className="nb-topbar-title">
              <BharatNewsLogo size={22} />
              <span>BharatNews AI</span>
              <span className={cn("nb-status-dot", isGenerating && "generating")} />
            </div>
            <button className="nb-topbar-settings" onClick={() => setShowApiModal(true)}>
              <Settings size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div className="nb-messages-area">
            <div className="nb-messages-inner">
              {messages.length === 0 ? (
                /* ─── WELCOME SCREEN ─── */
                <div className="nb-welcome">
                  <BharatNewsLogo size={56} />
                  <h2 className="nb-welcome-title">
                    BharatNews <span>AI</span>
                  </h2>
                  <p className="nb-welcome-subtitle">
                    Your AI-powered news correspondent. Ask about any topic for instant briefings.
                  </p>
                  {/* Features and topics removed per user request */}
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    /* USER MESSAGE */
                    if (msg.role === "user") {
                      return (
                        <div key={msg.id} className="nb-msg nb-msg-user">
                          <div className="nb-msg-content-wrap">
                            <div className="nb-msg-user-bubble">{msg.content}</div>
                            <div className="nb-msg-time">{time}</div>
                          </div>
                        </div>
                      );
                    }

                    /* ERROR MESSAGE */
                    if (msg.type === "error") {
                      return (
                        <div key={msg.id} className="nb-msg nb-msg-bot">
                          <div className="nb-msg-avatar nb-avatar-bot">
                            <BharatNewsLogo size={36} />
                          </div>
                          <div className="nb-msg-content-wrap">
                            <div className="nb-msg-error">
                              <span>⚠</span> {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* NEWS CARD (assistant) */
                    const data = msg.parsed;
                    if (!data) return null;

                    const sentCfg =
                      SENTIMENT_CONFIG[data.sentiment as keyof typeof SENTIMENT_CONFIG] ||
                      SENTIMENT_CONFIG.neutral;
                    const SentIcon = sentCfg.icon;

                    return (
                      <div key={msg.id} className="nb-msg nb-msg-bot">
                        <div className="nb-msg-avatar nb-avatar-bot">
                          <BharatNewsLogo size={36} />
                        </div>
                        <div className="nb-msg-content-wrap">
                          <div className="nb-msg-bot-label">
                            BharatNews AI <span className="nb-msg-time-inline">· {time}</span>
                          </div>

                          <div className={cn("nb-news-card", data.breaking && "breaking")}>
                            {data.breaking && (
                              <div className="nb-breaking-banner">
                                <span className="nb-breaking-dot" />
                                BREAKING NEWS
                              </div>
                            )}

                            <div className="nb-news-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div className="nb-news-tags">
                                {data.category && (
                                  <span className="nb-category-tag">{data.category}</span>
                                )}
                                <span className="nb-sentiment-tag" style={{ color: sentCfg.color }}>
                                  <SentIcon size={12} />
                                  {sentCfg.label}
                                </span>
                              </div>
                              <button 
                                onClick={() => speakText(msg.id, data.headline + ". " + data.summary)} 
                                className={`p-1.5 rounded-full transition-colors ${playingAudioId === msg.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 hover:bg-white/10 text-zinc-300"}`} 
                                title={playingAudioId === msg.id ? "Stop Listening" : "Listen to AI Article"}
                              >
                                {playingAudioId === msg.id ? <VolumeX size={16} /> : <Volume2 size={16} />}
                              </button>
                            </div>

                            <h3 className="nb-news-headline">{data.headline}</h3>
                            <p className="nb-news-summary">{data.summary}</p>

                            {data.keyPoints?.length > 0 && (
                              <div className="nb-news-section">
                                <div className="nb-section-label">
                                  <BookOpen size={14} />
                                  Key Developments
                                </div>
                                <ul className="nb-key-points">
                                  {data.keyPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Generating indicator */}
                  {isGenerating && (
                    <div className="nb-msg nb-msg-bot">
                      <div className="nb-msg-avatar nb-avatar-bot">
                        <BharatNewsLogo size={36} spinning />
                      </div>
                      <div className="nb-msg-content-wrap">
                        <div className="nb-generating">
                          <div className="nb-generating-text" key={stageIdx}>
                            {STAGES[stageIdx]}
                          </div>
                          <div className="nb-generating-dots">
                            <span /><span /><span />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ─── INPUT BAR ────────────────────────────────── */}
          <div className="nb-input-area">
            <div className="nb-input-container">
              {/* Quick topics removed per user request */}

              <div className="nb-input-box">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) handleSend();
                    }
                  }}
                  placeholder="Ask about any news topic..."
                  rows={1}
                  disabled={isGenerating}
                  className="nb-textarea"
                />
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn("nb-send-btn", canSend && "active")}
                  title="Send (Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="nb-input-hint">
                BharatNews AI can make mistakes. Verify important news from official sources.
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── API Key Modal ──────────────────────────────── */}
      {showApiModal && (
        <div className="nb-modal-overlay" onClick={() => setShowApiModal(false)}>
          <div className="nb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nb-modal-header">
              <h2>Pipeline Status</h2>
              <button onClick={() => setShowApiModal(false)} className="nb-modal-close">
                <X size={18} />
              </button>
            </div>
            <p className="nb-modal-desc">BharatNews AI Pipeline — all API keys are auto-configured from environment variables.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: apiKeyConfigured ? '#10b981' : '#ef4444' }}>{apiKeyConfigured ? '✓' : '✗'}</span>
                <span>Groq API (NLP + AI Processing)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: Boolean(import.meta.env.VITE_GNEWS_API_KEY_1) ? '#10b981' : '#ef4444' }}>{Boolean(import.meta.env.VITE_GNEWS_API_KEY_1) ? '✓' : '✗'}</span>
                <span>GNews API (News Fetching)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: Boolean(import.meta.env.VITE_NEWSAPI_KEY) ? '#10b981' : '#ef4444' }}>{Boolean(import.meta.env.VITE_NEWSAPI_KEY) ? '✓' : '✗'}</span>
                <span>NewsAPI (Secondary Source)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: Boolean(import.meta.env.VITE_SCRAPER_API_KEY) ? '#10b981' : '#ef4444' }}>{Boolean(import.meta.env.VITE_SCRAPER_API_KEY) ? '✓' : '✗'}</span>
                <span>ScraperAPI (Content Extraction)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: Boolean(import.meta.env.VITE_OPENROUTER_API_KEY) ? '#10b981' : '#ef4444' }}>{Boolean(import.meta.env.VITE_OPENROUTER_API_KEY) ? '✓' : '✗'}</span>
                <span>OpenRouter (AI Fallback)</span>
              </div>
            </div>
            <div className="nb-modal-actions" style={{ marginTop: '16px' }}>
              <button className="nb-modal-save" onClick={() => setShowApiModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   STYLES — ChatGPT-inspired dark sidebar + clean chat
═══════════════════════════════════════════════════════════════════ */
const newsBotStyles = `
/* ─── ROOT LAYOUT & ENVIRONMENT ───────────────────────── */
.newsbot-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #fafafa 0%, #f0f4f8 50%, #e2e8f0 100%);
  background-size: 200% 200%;
  animation: gradientShift 15s ease infinite;
  color: #0f172a;
  font-family: 'Inter', 'Roboto', sans-serif;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.newsbot-container {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 24px;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* ─── SIDEBAR ────────────────────────────────────────── */
.newsbot-sidebar {
  display: flex;
  flex-direction: column;
  width: 0;
  overflow: hidden;
  
  /* Light Glass Effect */
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 28px;
  box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  
  color: #334155;
  transition: width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.newsbot-sidebar::before, .newsbot-main::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  z-index: -1;
  opacity: 0.8;
}

.newsbot-sidebar.open {
  width: 300px;
}

@media (max-width: 767px) {
  .newsbot-container { padding: 12px; gap: 12px; }
  .newsbot-sidebar { position: fixed; top: 12px; left: 12px; bottom: 12px; z-index: 100; }
  .newsbot-sidebar.open { width: 0; }
  .newsbot-sidebar.mobile-open { width: calc(100% - 24px); }
  .newsbot-main { border-radius: 20px !important; }
}

/* Sidebar internals */
.nb-sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.nb-sidebar-brand { display: flex; align-items: center; gap: 10px; }
.nb-sidebar-brand-text {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}
.nb-sidebar-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}
.nb-sidebar-close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
  transform: scale(1.05);
}

.nb-new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 16px 8px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.6);
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.8);
}
.nb-new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,1);
}

.nb-sidebar-search {
  position: relative;
  margin: 8px 16px 12px;
}
.nb-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}
.nb-search-input {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.4);
  padding: 0 12px 0 36px;
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
  outline: none;
  transition: all 0.3s;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}
.nb-search-input::placeholder { color: #94a3b8; }
.nb-search-input:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1), inset 0 2px 4px rgba(0,0,0,0.02);
}

.nb-sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
}
.nb-sessions-list::-webkit-scrollbar { width: 4px; }
.nb-sessions-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

.nb-session-group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  padding: 16px 12px 6px;
}

.nb-session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #334155;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  margin-bottom: 2px;
}
.nb-session-item:hover {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 0.8);
}
.nb-session-item.active {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(255, 255, 255, 1);
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.nb-session-icon { flex-shrink: 0; color: #94a3b8; }
.nb-session-item.active .nb-session-icon { color: #3b82f6; }

.nb-session-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nb-session-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nb-session-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.nb-session-actions { display: none; gap: 4px; }
.nb-session-item:hover .nb-session-actions { display: flex; }
.nb-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: rgba(0,0,0,0.04);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.nb-action-btn:hover { background: rgba(0, 0, 0, 0.08); color: #0f172a; }
.nb-action-btn.pinned { color: #f59e0b; }
.nb-action-btn.delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.nb-empty-sessions {
  text-align: center;
  padding: 40px 16px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.nb-sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}
.nb-settings-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.nb-settings-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 0.8);
  color: #0f172a;
}

.nb-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
}

/* ─── MAIN AREA ──────────────────────────────────────── */
.newsbot-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  
  /* Light Glass Effect */
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 28px;
  box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.9);
  
  color: #0f172a;
  position: relative;
  z-index: 10;
}

/* ─── TOP BAR ────────────────────────────────────────── */
.nb-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  height: 64px;
  flex-shrink: 0;
  border-radius: 28px 28px 0 0;
}
.nb-topbar-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.nb-topbar-menu:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
}
.nb-topbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  flex: 1;
}
.nb-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  transition: background 0.3s;
}
.nb-status-dot.generating {
  background: #f59e0b;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
  animation: nbPulse 1.2s ease-in-out infinite;
}
.nb-topbar-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.03);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}
.nb-topbar-settings:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #0f172a;
  transform: rotate(45deg);
}

/* ─── MESSAGES AREA ──────────────────────────────────── */
.nb-messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 12px;
}
.nb-messages-area::-webkit-scrollbar { width: 6px; }
.nb-messages-area::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 6px; }

.nb-messages-inner {
  max-width: 840px;
  margin: 0 auto;
  padding: 24px 20px 32px;
}

/* ─── WELCOME SCREEN ─────────────────────────────────── */
.nb-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 16px 20px;
  text-align: center;
}
.nb-welcome-title {
  margin-top: 24px;
  font-size: 36px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.nb-welcome-title span {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nb-welcome-subtitle {
  margin-top: 12px;
  font-size: 16px;
  color: #475569;
  font-weight: 500;
  max-width: 460px;
  line-height: 1.6;
}
.nb-welcome-features {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
  justify-content: center;
}
.nb-feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}
.nb-feature-chip svg { color: #2563eb; }

.nb-welcome-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 40px;
  width: 100%;
  max-width: 720px;
}
@media (max-width: 600px) { .nb-welcome-grid { grid-template-columns: 1fr; } }

.nb-topic-card {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  overflow: hidden;
  transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
  color: #0f172a;
}
.nb-topic-card:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08), inset 0 1px 3px rgba(255, 255, 255, 1);
}
.nb-topic-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #475569;
}
.nb-topic-card-header svg { color: #2563eb; }
.nb-topic-card-queries { padding: 6px; }
.nb-topic-query {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}
.nb-topic-query:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.05);
  transform: translateX(4px);
}
.nb-topic-query svg { color: #94a3b8; transition: transform 0.2s; }
.nb-topic-query:hover svg { color: #2563eb; transform: translateX(2px); }

/* ─── MESSAGES ───────────────────────────────────────── */
.nb-msg {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  animation: nbFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
}
.nb-msg-user { flex-direction: row-reverse; }
.nb-msg-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.nb-avatar-user {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
}
.nb-avatar-bot {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 1);
  color: #0f172a;
  padding: 4px;
}

.nb-msg-content-wrap {
  flex: 1;
  min-width: 0;
  max-width: 85%;
}
.nb-msg-user .nb-msg-content-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.nb-msg-user-bubble {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 1);
  color: #0f172a;
  padding: 12px 18px;
  border-radius: 20px 20px 4px 20px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  word-break: break-word;
}

.nb-msg-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
  padding: 0 4px;
  font-weight: 500;
}

.nb-msg-bot-label {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.nb-msg-time-inline {
  font-weight: 500;
  color: #94a3b8;
  font-size: 12px;
}

.nb-msg-error {
  background: rgba(254, 242, 242, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(254, 202, 202, 1);
  border-radius: 16px;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.08);
}

/* ─── NEWS CARD ──────────────────────────────────────── */
.nb-news-card {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 1);
  overflow: hidden;
  color: #0f172a;
  transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
}
.nb-news-card:hover {
  transform: scale(1.02) translateY(-4px);
  background: rgba(255, 255, 255, 1);
  border-color: rgba(255, 255, 255, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), inset 0 1px 3px rgba(255, 255, 255, 1);
}
.nb-news-card.breaking {
  border-color: rgba(248, 113, 113, 0.8);
  background: rgba(254, 242, 242, 0.5);
  box-shadow: 0 12px 40px rgba(239, 68, 68, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.8);
}

.nb-breaking-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(254, 242, 242, 0.8);
  border-bottom: 1px solid rgba(254, 202, 202, 1);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #dc2626;
}
.nb-breaking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  animation: nbPulse 1s infinite;
}

.nb-news-card-header { padding: 16px 20px 0; }
.nb-news-tags { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.nb-category-tag {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
  color: #334155;
  border: 1px solid rgba(0, 0, 0, 0.05);
}
.nb-sentiment-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
}

.nb-news-headline {
  padding: 12px 20px 8px;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
}

.nb-news-summary {
  padding: 0 20px 16px;
  font-size: 15px;
  line-height: 1.6;
  color: #475569;
  font-weight: 500;
}

.nb-news-section {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  background: rgba(0, 0, 0, 0.02);
}
.nb-section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  margin-bottom: 12px;
}
.nb-section-label svg { color: #94a3b8; }

.nb-key-points { list-style: none; padding: 0; margin: 0; }
.nb-key-points li {
  position: relative;
  padding: 4px 0 6px 20px;
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
  font-weight: 500;
}
.nb-key-points li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 12px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
}

/* ─── GENERATING INDICATOR ───────────────────────────── */
.nb-generating {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(0,0,0,0.05);
}
.nb-generating-text {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  animation: nbSlideIn 0.3s ease-out;
}
.nb-generating-dots { display: flex; gap: 6px; }
.nb-generating-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
  animation: nbBounce 1.2s ease-in-out infinite;
}
.nb-generating-dots span:nth-child(2) { animation-delay: 0.15s; }
.nb-generating-dots span:nth-child(3) { animation-delay: 0.3s; }

/* ─── INPUT AREA ─────────────────────────────────────── */
.nb-input-area {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.4);
  padding: 16px 24px 20px;
  flex-shrink: 0;
  border-radius: 0 0 28px 28px;
}
.nb-input-container {
  max-width: 840px;
  margin: 0 auto;
}

.nb-quick-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.nb-quick-topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s ease;
}
.nb-quick-topic-chip:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 1);
  color: #0f172a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.nb-quick-topic-chip svg { color: #2563eb; }

.nb-input-box {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 20px;
  padding: 10px 10px 10px 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), inset 0 2px 4px rgba(255, 255, 255, 1);
  transition: all 0.3s ease;
}
.nb-input-box:focus-within {
  border-color: rgba(96, 165, 250, 0.8);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15), 0 12px 40px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.95);
}

.nb-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: #0f172a;
  background: transparent;
  max-height: 160px;
  font-family: inherit;
  padding: 6px 0;
}
.nb-textarea::placeholder { color: #94a3b8; }
.nb-textarea:disabled { opacity: 0.5; }

.nb-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  cursor: not-allowed;
  transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
  flex-shrink: 0;
}
.nb-send-btn.active {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
}
.nb-send-btn.active:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.5);
}

.nb-input-hint {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  margin-top: 12px;
}

/* ─── MODAL ──────────────────────────────────────────── */
.nb-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.nb-modal {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 24px;
  padding: 32px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 24px 64px rgba(0,0,0,0.1), inset 0 1px 4px rgba(255,255,255,1);
  color: #0f172a;
}
.nb-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.nb-modal-header h2 {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.nb-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(0, 0, 0, 0.02);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.nb-modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #0f172a;
  transform: rotate(90deg);
}
.nb-modal-desc {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  margin-bottom: 20px;
  line-height: 1.5;
}

.nb-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
.nb-modal-save {
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
}
.nb-modal-save:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.5);
}

/* ─── ANIMATIONS ─────────────────────────────────────── */
@keyframes nbPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}
@keyframes nbFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes nbSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes nbBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1.1); opacity: 1; }
}

/* ─── DARK MODE OVERRIDES ────────────────────────────── */
.dark .newsbot-root {
  background: linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%);
  color: #f8fafc;
}

.dark .newsbot-sidebar, .dark .newsbot-main {
  background: rgba(15, 23, 42, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.dark .nb-sidebar-top { border-bottom-color: rgba(255, 255, 255, 0.05); }
.dark .nb-sidebar-brand-text { color: #f8fafc; }
.dark .nb-sidebar-close-btn { background: rgba(255, 255, 255, 0.05); color: #94a3b8; }
.dark .nb-sidebar-close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f8fafc; }

.dark .nb-new-chat-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1);
}
.dark .nb-new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2);
}

.dark .nb-search-input { background: rgba(15, 23, 42, 0.6); border-color: rgba(255, 255, 255, 0.15); color: #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
.dark .nb-search-input:focus { background: rgba(15, 23, 42, 0.9); border-color: #3b82f6; }
.dark .nb-search-input::placeholder { color: #64748b; }

.dark .nb-session-group-label { color: #94a3b8; }
.dark .nb-session-item { color: #cbd5e1; }
.dark .nb-session-item:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1); }
.dark .nb-session-item.active { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); color: #f8fafc; }
.dark .nb-session-title { color: inherit; }
.dark .nb-empty-sessions { color: #64748b; }

.dark .nb-sidebar-footer { border-top-color: rgba(255, 255, 255, 0.05); }
.dark .nb-settings-btn { color: #cbd5e1; }
.dark .nb-settings-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1); color: #f8fafc; }

.dark .nb-topbar { background: rgba(15, 23, 42, 0.5); border-bottom-color: rgba(255, 255, 255, 0.05); }
.dark .nb-topbar-title { color: #f8fafc; }
.dark .nb-topbar-menu, .dark .nb-topbar-settings { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.05); color: #cbd5e1; }
.dark .nb-topbar-menu:hover, .dark .nb-topbar-settings:hover { background: rgba(255, 255, 255, 0.1); color: #f8fafc; }

.dark .nb-welcome-title { color: #f8fafc; }
.dark .nb-welcome-subtitle { color: #cbd5e1; }

.dark .nb-msg-user-bubble {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.05);
}
.dark .nb-avatar-bot { background: rgba(30, 41, 59, 0.8); border-color: rgba(255, 255, 255, 0.1); color: #f8fafc; }
.dark .nb-msg-bot-label { color: #e2e8f0; }
.dark .nb-msg-time, .dark .nb-msg-time-inline { color: #64748b; }

.dark .nb-news-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.05);
}
.dark .nb-news-card:hover { background: rgba(30, 41, 59, 0.9); border-color: rgba(255, 255, 255, 0.2); }
.dark .nb-news-headline { color: #f8fafc; }
.dark .nb-news-summary { color: #cbd5e1; }
.dark .nb-category-tag { background: rgba(255, 255, 255, 0.1); color: #f8fafc; border-color: rgba(255, 255, 255, 0.1); }
.dark .nb-news-section { background: rgba(255, 255, 255, 0.03); border-top-color: rgba(255, 255, 255, 0.05); }
.dark .nb-section-label { color: #94a3b8; }
.dark .nb-section-label svg { color: #64748b; }
.dark .nb-key-points li { color: #e2e8f0; }

.dark .nb-generating { background: rgba(30, 41, 59, 0.6); border-color: rgba(255, 255, 255, 0.1); }
.dark .nb-generating-text { color: #f8fafc; }

.dark .nb-input-area { background: rgba(15, 23, 42, 0.4); border-top-color: rgba(255, 255, 255, 0.05); }
.dark .nb-input-box { background: rgba(30, 41, 59, 0.7); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.05); }
.dark .nb-input-box:focus-within { background: rgba(30, 41, 59, 0.95); border-color: #3b82f6; }
.dark .nb-textarea { color: #f8fafc; }
.dark .nb-textarea::placeholder { color: #64748b; }
.dark .nb-send-btn { background: rgba(255, 255, 255, 0.05); }

.dark .nb-modal-overlay { background: rgba(0, 0, 0, 0.6); }
.dark .nb-modal { background: rgba(30, 41, 59, 0.95); border-color: rgba(255, 255, 255, 0.1); color: #f8fafc; box-shadow: 0 24px 64px rgba(0,0,0,0.4), inset 0 1px 4px rgba(255,255,255,0.05); }
.dark .nb-modal-header h2 { color: #f8fafc; }
.dark .nb-modal-desc { color: #cbd5e1; }
.dark .nb-modal-close { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.05); }
.dark .nb-modal-close:hover { background: rgba(255, 255, 255, 0.1); color: #f8fafc; }

`;

export default NewsBotPage;
