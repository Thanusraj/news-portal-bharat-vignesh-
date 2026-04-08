import React from "react";
import BharatNewsLogo from "./BharatNewsLogo";

interface GeneratingIndicatorProps {
  stage?: string;
}

const STAGES = [
  "Scanning live news sources...",
  "Analyzing global developments...",
  "Verifying facts across sources...",
  "Composing your briefing...",
];

const GeneratingIndicator: React.FC<GeneratingIndicatorProps> = ({ stage }) => {
  const [stageIdx, setStageIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        marginBottom: "24px",
        animation: "genFadeIn 0.35s ease-out",
      }}
    >
      {/* Spinning logo */}
      <div style={{ flexShrink: 0 }}>
        <BharatNewsLogo size={44} spinning />
      </div>

      {/* Text content */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(12,18,50,0.75), rgba(6,10,28,0.85))",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px 14px 14px 4px",
          padding: "14px 18px",
          minWidth: "220px",
        }}
      >
        <div
          style={{
            color: "#FF9933",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          BharatNews AI
        </div>

        {/* Animated stage text */}
        <div
          key={stageIdx}
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            animation: "stageSwap 0.4s ease-out",
            marginBottom: "12px",
          }}
        >
          {stage || STAGES[stageIdx]}
        </div>

        {/* Pulse bars */}
        <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "20px" }}>
          {[0.6, 1, 0.8, 1.2, 0.7, 1.1, 0.9].map((h, i) => (
            <div
              key={i}
              style={{
                width: "3px",
                borderRadius: "2px",
                background: `rgba(99,102,241,${0.4 + i * 0.06})`,
                animation: `barPulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
                height: `${10 + h * 6}px`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes genFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stageSwap {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes barPulse {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GeneratingIndicator;
