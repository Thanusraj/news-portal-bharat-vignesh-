import React from "react";
import { Zap, Newspaper, Brain, Globe, TrendingUp, Shield } from "lucide-react";
import BharatNewsLogo from "./BharatNewsLogo";

interface WelcomeScreenProps {
  onTopicClick: (topic: string) => void;
}

const FEATURED_TOPICS = [
  {
    category: "India",
    icon: <Globe size={16} />,
    color: "#FF9933",
    bg: "rgba(255,153,51,0.1)",
    border: "rgba(255,153,51,0.2)",
    queries: ["India GDP growth 2025", "Indian election results", "RBI monetary policy"],
  },
  {
    category: "Markets",
    icon: <TrendingUp size={16} />,
    color: "#34d399",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
    queries: ["Nifty 50 today", "Global stock market", "Crude oil prices"],
  },
  {
    category: "Technology",
    icon: <Zap size={16} />,
    color: "#a5b4fc",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.2)",
    queries: ["AI breakthroughs 2025", "Tech startup funding", "Semiconductor news"],
  },
  {
    category: "World",
    icon: <Newspaper size={16} />,
    color: "#c4b5fd",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
    queries: ["US-China tensions", "Middle East conflict", "G20 summit"],
  },
];

const FEATURES = [
  { icon: Zap, label: "Live Sources", color: "#fbbf24" },
  { icon: Brain, label: "AI Analysis", color: "#a5b4fc" },
  { icon: Shield, label: "Fact Checked", color: "#34d399" },
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onTopicClick }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px 20px",
        animation: "welcomeIn 0.5s ease-out",
      }}
    >
      <style>{`
        @keyframes welcomeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatLogo {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .topic-query:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #e2e8f0 !important;
          transform: translateX(3px);
        }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "20px", animation: "floatLogo 4s ease-in-out infinite" }}>
        <BharatNewsLogo size={80} />
      </div>

      {/* Title */}
      <h1
        style={{
          color: "#f1f5f9",
          fontSize: "30px",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          margin: "0 0 8px",
          textAlign: "center",
        }}
      >
        BharatNews{" "}
        <span
          style={{
            background: "linear-gradient(90deg, #FF9933, #ff6b00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI
        </span>
      </h1>
      <p
        style={{
          color: "#475569",
          fontSize: "14px",
          textAlign: "center",
          maxWidth: "380px",
          lineHeight: 1.7,
          margin: "0 0 28px",
        }}
      >
        Your AI-powered news correspondent. Ask about any topic for instant,
        professional briefings curated from trusted global sources.
      </p>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "36px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px",
              padding: "6px 14px",
            }}
          >
            <f.icon size={13} style={{ color: f.color }} />
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      {/* Category topics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "12px",
          width: "100%",
          maxWidth: "640px",
        }}
      >
        {FEATURED_TOPICS.map((cat) => (
          <div
            key={cat.category}
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${cat.border}`,
              borderRadius: "14px",
              padding: "14px",
              overflow: "hidden",
            }}
          >
            {/* Category header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginBottom: "12px",
              }}
            >
              <span style={{ color: cat.color }}>{cat.icon}</span>
              <span
                style={{
                  color: cat.color,
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {cat.category}
              </span>
            </div>

            {/* Query buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {cat.queries.map((q) => (
                <button
                  key={q}
                  onClick={() => onTopicClick(q)}
                  className="topic-query"
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "7px",
                    padding: "7px 8px",
                    cursor: "pointer",
                    color: "#64748b",
                    fontSize: "13px",
                    textAlign: "left",
                    transition: "all 0.18s",
                    display: "block",
                    width: "100%",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
