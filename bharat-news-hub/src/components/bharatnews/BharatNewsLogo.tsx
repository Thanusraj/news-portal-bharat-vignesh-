import React from "react";

interface BharatNewsLogoProps {
  size?: number;
  spinning?: boolean;
  pulse?: boolean;
  className?: string;
}

const BharatNewsLogo: React.FC<BharatNewsLogoProps> = ({
  size = 48,
  spinning = false,
  pulse = false,
  className = "",
}) => {
  // 24 spokes of the Ashoka Chakra
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 24;
    const inner = 6;
    const outer = 18;
    return (
      <line
        key={i}
        x1={50 + inner * Math.cos(angle)}
        y1={50 + inner * Math.sin(angle)}
        x2={50 + outer * Math.cos(angle)}
        y2={50 + outer * Math.sin(angle)}
        stroke="rgba(200,218,255,0.85)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    );
  });

  const spinStyle: React.CSSProperties = spinning
    ? { animation: "bharatLogoSpin 1.8s linear infinite" }
    : pulse
    ? { animation: "bharatLogoPulse 2s ease-in-out infinite" }
    : {};

  return (
    <>
      <style>{`
        @keyframes bharatLogoSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bharatLogoPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        style={spinStyle}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="globeBg" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#162760" />
            <stop offset="100%" stopColor="#060e2a" />
          </radialGradient>
          <radialGradient id="chakraBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d2060" />
            <stop offset="100%" stopColor="#060f35" />
          </radialGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Globe base circle */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="url(#globeBg)"
          stroke="#1e3a8a"
          strokeWidth="2"
        />

        {/* Longitude lines */}
        <ellipse
          cx="50"
          cy="50"
          rx="30"
          ry="46"
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="0.7"
          opacity="0.45"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="14"
          ry="46"
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="0.7"
          opacity="0.45"
        />
        {/* Equator */}
        <line
          x1="3"
          y1="50"
          x2="97"
          y2="50"
          stroke="#1e3a8a"
          strokeWidth="0.7"
          opacity="0.4"
        />

        {/* Indian Tricolor Swooshes */}
        {/* Saffron */}
        <path
          d="M 9 37 C 28 27, 72 27, 91 37"
          stroke="#FF9933"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#logoGlow)"
        />
        {/* White */}
        <path
          d="M 5 50 C 28 43, 72 43, 95 50"
          stroke="rgba(245,245,245,0.88)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Green */}
        <path
          d="M 9 63 C 28 57, 72 57, 91 63"
          stroke="#138808"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#logoGlow)"
        />

        {/* Ashoka Chakra center */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="url(#chakraBg)"
          stroke="#2a50c0"
          strokeWidth="1.5"
        />
        {spokes}
        {/* Hub */}
        <circle cx="50" cy="50" r="4" fill="#4a7aff" filter="url(#logoGlow)" />
        <circle cx="50" cy="50" r="2" fill="#90b8ff" />

        {/* WiFi/Signal arcs on right */}
        <path
          d="M 77 32 Q 92 50 77 68"
          stroke="#FF9933"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 82 38 Q 94 50 82 62"
          stroke="#FF9933"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M 86 43 Q 95 50 86 57"
          stroke="#FF9933"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </>
  );
};

export default BharatNewsLogo;
