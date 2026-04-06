import { AnalysisResult } from "@/types/analysis";
import VerdictBadge from "./VerdictBadge";
import ConfidenceGauge from "./ConfidenceGauge";
import { Quote, ListChecks } from "lucide-react";

interface ResultCardProps {
  result: AnalysisResult;
}

const ResultCard = ({ result }: ResultCardProps) => {
  const borderColorMap: Record<string, string> = {
    True: "border-emerald-200",
    False: "border-red-200",
    "Partially True": "border-amber-200",
    Unverified: "border-gray-200",
  };

  const bgGlowMap: Record<string, string> = {
    True: "from-emerald-50/80 to-white",
    False: "from-red-50/80 to-white",
    "Partially True": "from-amber-50/80 to-white",
    Unverified: "from-gray-50/80 to-white",
  };

  return (
    <div
      className={`relative rounded-3xl border ${borderColorMap[result.verdict] || "border-gray-200"} bg-gradient-to-br ${bgGlowMap[result.verdict] || "from-gray-50 to-white"} p-7 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden`}
      style={{ animation: "slideUp 0.5s ease-out" }}
    >
      {/* Decorative corner gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100/30 to-transparent rounded-bl-full pointer-events-none" />

      {/* Top row: Claim + Verdict + Gauge */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-7">
        <div className="flex-1 space-y-3">
          {/* Claim */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              <Quote className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Analyzed Claim</p>
              <p className="text-sm text-gray-700 font-medium leading-relaxed italic">"{result.rawClaim}"</p>
            </div>
          </div>
          {/* Verdict Badge */}
          <VerdictBadge verdict={result.verdict} />
        </div>
        
        {/* Confidence Gauge */}
        <ConfidenceGauge confidence={result.confidence} verdict={result.verdict} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

      {/* Reasoning */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reasoning</h3>
        </div>
        <ul className="space-y-3 pl-1">
          {result.reasons.map((reason, i) => (
            <li 
              key={i} 
              className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed group"
              style={{ animation: `slideUp 0.4s ease-out ${0.1 * (i + 1)}s both` }}
            >
              <span className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 group-hover:scale-125 transition-transform" />
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResultCard;
