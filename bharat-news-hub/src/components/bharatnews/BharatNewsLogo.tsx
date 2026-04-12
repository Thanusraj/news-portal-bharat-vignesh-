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

      <img
        src="/logo%20part.png"
        alt="BharatNews AI Logo"
        width={size}
        height={size}
        className={className}
        style={{ ...spinStyle, objectFit: "contain" }}
      />
    </>
  );
};

export default BharatNewsLogo;
