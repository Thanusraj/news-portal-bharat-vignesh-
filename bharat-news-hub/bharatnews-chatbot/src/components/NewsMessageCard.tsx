import React from "react";
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import type { ChatMessage } from "../types/newsBot.types";
import BharatNewsLogo from "./BharatNewsLogo";

interface NewsMessageCardProps {
  message: ChatMessage;
  onFollowUp: (question: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Politics: {
    bg: "rgba(239,68,68,0.12)",
    text: "#f87171",
    border: "rgba(239,68,68,0.25)",
  },
  Business: {
    bg: "rgba(16,185,129,0.12)",
    text: "#34d399",
    border: "rgba(16,185,129,0.25)",
  },
  Technology: {
    bg: "rgba(99,102,241,0.12)",
    text: "#a5b4fc",
    border: "rgba(99,102,241,0.25)",
  },
  Sports: {
    bg: "rgba(245,158,11,0.12)",
    text: "#fbbf24",
    border: "rgba(245,158,11,0.25)",
  },
  Science: {
    bg: "rgba(6,182,212,0.12)",
    text: "#22d3ee",
    border: "rgba(6,182,212,0.25)",
  },
  World: {
    bg: "rgba(139,92,246,0.12)",
    text: "#c4b5fd",
    border: "rgba(139,92,246,0.25)",
  },
  India: {
    bg: "rgba(255,153,51,0.12)",
    text: "#FF9933",
    border: "rgba(255,153,51,0.25)",
  },
  Markets: {
    bg: "rgba(16,185,129,0.12)",
    text: "#34d399",
    border: "rgba(16,185,129,0.25)",
  },
  Health: {
    bg: "rgba(236,72,153,0.12)",
    text: "#f472b6",
    border: "rgba(236,72,153,0.25)",
  },
};

const SENTIMENT_CONFIG = {
  positive: {
    icon: <TrendingUp size={12} />,
    color: "#34d399",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    label: "Positive",
  },
  negative: {
    icon: <TrendingDown size={12} />,
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    label: "Negative",
  },
  mixed: {
    icon: <Zap size={12} />,
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    label: "Mixed",
  },
  neutral: {
    icon: <Minus size={12} />,
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.25)",
    label: "Neutral",
  },
};

const NewsMessageCard: React.FC<NewsMessageCardProps> = ({
  message,
  onFollowUp,
}) => {
  const time = new Date(message.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  /* ─── USER MESSAGE ─────────────────────────────────────── */
  if (message.role === "user") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
          animation: "msgSlideIn 0.3s ease-out",
        }}
      >
        <div style={{ maxWidth: "70%" }}>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "18px 18px 4px 18px",
              padding: "12px 18px",
              color: "#e2e8f0",
              fontSize: "14px",
              lineHeight: 1.65,
              boxShadow:
                "0 4px 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {message.content}
          </div>
          <div
            style={{
              textAlign: "right",
              color: "#334155",
              fontSize: "10px",
              marginTop: "4px",
              paddingRight: "6px",
            }}
          >
            {time}
          </div>
        </div>
      </div>
    );
  }

  /* ─── ERROR MESSAGE ────────────────────────────────────── */
  if (message.type === "error") {
    return (
      <div style={{ marginBottom: "20px", animation: "msgSlideIn 0.3s ease-out" }}>
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderLeft: "3px solid #ef4444",
            borderRadius: "12px",
            padding: "14px 16px",
            color: "#f87171",
            fontSize: "13px",
            lineHeight: 1.6,
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "16px" }}>⚠</span>
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  /* ─── NEWS CARD (assistant) ────────────────────────────── */
  const data = message.parsed;
  if (!data) return null;

  const sentimentCfg =
    SENTIMENT_CONFIG[data.sentiment as keyof typeof SENTIMENT_CONFIG] ||
    SENTIMENT_CONFIG.neutral;
  const categoryCfg = data.category
    ? CATEGORY_COLORS[data.category] || CATEGORY_COLORS["Technology"]
    : null;

  return (
    <div
      style={{
        marginBottom: "24px",
        animation: "msgSlideIn 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Source watermark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          paddingLeft: "4px",
        }}
      >
        <BharatNewsLogo size={22} />
        <span
          style={{
            color: "#FF9933",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          BharatNews AI
        </span>
        <span style={{ color: "#1e293b", fontSize: "11px" }}>·</span>
        <span style={{ color: "#334155", fontSize: "11px" }}>{time}</span>
      </div>

      {/* Main card */}
      <div
        style={{
          background:
            "linear-gradient(145deg, rgba(12,18,50,0.85) 0%, rgba(6,10,28,0.92) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderTop: data.breaking
            ? "2px solid #ef4444"
            : "2px solid #FF9933",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* BREAKING banner */}
        {data.breaking && (
          <div
            style={{
              background: "rgba(239,68,68,0.9)",
              padding: "5px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "white",
                animation: "blinkDot 1s ease-in-out infinite",
              }}
            />
            <span
              style={{
                color: "white",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.2em",
              }}
            >
              BREAKING NEWS
            </span>
          </div>
        )}

        {/* Card header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Category + Sentiment badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {categoryCfg && data.category && (
                <span
                  style={{
                    background: categoryCfg.bg,
                    border: `1px solid ${categoryCfg.border}`,
                    color: categoryCfg.text,
                    borderRadius: "6px",
                    padding: "3px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {data.category}
                </span>
              )}
            </div>
            <span
              style={{
                background: sentimentCfg.bg,
                border: `1px solid ${sentimentCfg.border}`,
                color: sentimentCfg.color,
                borderRadius: "999px",
                padding: "3px 10px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {sentimentCfg.icon}
              {sentimentCfg.label}
            </span>
          </div>

          {/* Headline */}
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1.35,
              margin: 0,
              fontFamily:
                "'Georgia', 'Times New Roman', 'Palatino', serif",
              letterSpacing: "-0.01em",
            }}
          >
            {data.headline}
          </h2>
        </div>

        {/* Summary */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p
            style={{
              color: "#cbd5e1",
              fontSize: "14px",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {data.summary}
          </p>
        </div>

        {/* Key Developments */}
        {data.keyPoints && data.keyPoints.length > 0 && (
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginBottom: "12px",
              }}
            >
              <BookOpen size={13} style={{ color: "#475569" }} />
              <span
                style={{
                  color: "#475569",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Key Developments
              </span>
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "9px",
              }}
            >
              {data.keyPoints.map((point, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "#e2e8f0",
                    fontSize: "13px",
                    lineHeight: 1.65,
                    animation: `keyPointIn 0.3s ease-out ${0.08 * i}s both`,
                  }}
                >
                  <span
                    style={{
                      color: "#FF9933",
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: "3px",
                      fontSize: "10px",
                    }}
                  >
                    ▸
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        {data.sources && data.sources.length > 0 && (
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "9px",
              }}
            >
              <ExternalLink size={12} style={{ color: "#475569" }} />
              <span
                style={{
                  color: "#475569",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Sources
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {data.sources.map((source, i) => (
                <span
                  key={i}
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    color: "#818cf8",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {data.followUpSuggestions && data.followUpSuggestions.length > 0 && (
          <div style={{ padding: "12px 20px" }}>
            <div
              style={{
                color: "#334155",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "9px",
              }}
            >
              Continue Reading
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {data.followUpSuggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(q)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "9px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "#64748b",
                    fontSize: "12px",
                    textAlign: "left",
                    transition: "all 0.18s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                  className="follow-up-btn"
                >
                  <span>{q}</span>
                  <ChevronRight
                    size={12}
                    style={{ flexShrink: 0, color: "#334155" }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes keyPointIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes blinkDot {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .follow-up-btn:hover {
          background: rgba(99,102,241,0.1) !important;
          border-color: rgba(99,102,241,0.25) !important;
          color: #a5b4fc !important;
        }
      `}</style>
    </div>
  );
};

export default NewsMessageCard;
