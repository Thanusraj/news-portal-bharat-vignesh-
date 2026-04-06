import { Verdict } from "@/types/analysis";

interface ConfidenceGaugeProps {
  confidence: number;
  verdict: Verdict;
}

const ConfidenceGauge = ({ confidence, verdict }: ConfidenceGaugeProps) => {
  const colorMap: Record<string, { text: string; stroke: string; glow: string }> = {
    True: { text: "text-emerald-600", stroke: "#10b981", glow: "rgba(16,185,129,0.25)" },
    False: { text: "text-red-500", stroke: "#ef4444", glow: "rgba(239,68,68,0.25)" },
    "Partially True": { text: "text-amber-500", stroke: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
    Unverified: { text: "text-gray-400", stroke: "#9ca3af", glow: "rgba(156,163,175,0.15)" },
  };

  const c = colorMap[verdict] || colorMap.Unverified;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-60"
        style={{ backgroundColor: c.glow }}
      />
      
      <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          strokeWidth="7"
          className="stroke-gray-100"
        />
        {/* Animated progress arc */}
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={c.stroke}
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 6px ${c.glow})`,
          }}
        />
        {/* Tip dot */}
        {confidence > 0 && (
          <circle
            cx="60" cy="8" r="4"
            fill={c.stroke}
            style={{
              transformOrigin: '60px 60px',
              transform: `rotate(${(confidence / 100) * 360}deg)`,
              transition: "transform 1.5s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 4px ${c.glow})`,
            }}
          />
        )}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-extrabold ${c.text} tabular-nums`}>{confidence}%</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">confidence</span>
      </div>
    </div>
  );
};

export default ConfidenceGauge;
