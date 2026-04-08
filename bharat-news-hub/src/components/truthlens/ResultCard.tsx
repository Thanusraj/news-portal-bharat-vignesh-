import { AnalysisResult } from "@/types/analysis";
import { ListChecks, Newspaper } from "lucide-react";

interface ResultCardProps {
  result: AnalysisResult;
}

const ResultCard = ({ result }: ResultCardProps) => {
  const borderColorMap: Record<string, string> = {
    Positive: "border-emerald-200",
    Negative: "border-red-200",
    Neutral: "border-gray-200",
    Mixed: "border-amber-200",
  };

  const bgGlowMap: Record<string, string> = {
    Positive: "from-emerald-50/80 to-white",
    Negative: "from-red-50/80 to-white",
    Neutral: "from-gray-50/80 to-white",
    Mixed: "from-amber-50/80 to-white",
  };

  const textColorMap: Record<string, string> = {
    Positive: "text-emerald-700",
    Negative: "text-red-700",
    Neutral: "text-gray-700",
    Mixed: "text-amber-700",
  };

  return (
    <div
      className={`relative rounded-3xl border ${borderColorMap[result.sentiment] || "border-gray-200"} bg-gradient-to-br ${bgGlowMap[result.sentiment] || "from-gray-50 to-white"} p-7 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden`}
      style={{ animation: "slideUp 0.5s ease-out" }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100/30 to-transparent rounded-bl-full pointer-events-none" />

      <div className="relative flex flex-col items-start gap-4 mb-7">
        <div className="flex items-center justify-between w-full">
           <div className="flex items-center gap-2 max-w-[60%]">
             <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                 <Newspaper className="w-4 h-4 text-indigo-500" />
             </div>
             <div className="truncate">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">Topic Target</p>
                <p className="text-sm text-gray-700 font-medium truncate">"{result.rawQuery}"</p>
             </div>
           </div>
           
           <div className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide border ${borderColorMap[result.sentiment] || "border-gray-200"} ${bgGlowMap[result.sentiment] || "from-gray-50 to-white"} ${textColorMap[result.sentiment] || "text-gray-700"}`}>
             Sentiment: {result.sentiment || "Neutral"}
           </div>
        </div>
        
        <div className="text-gray-800 text-sm leading-relaxed bg-white/60 p-4 rounded-xl border border-gray-100 shadow-sm w-full whitespace-pre-wrap">
          {result.summary}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Key Takeaways</h3>
        </div>
        <ul className="space-y-3 pl-1">
          {result.takeaways?.map((takeaway, i) => (
            <li 
              key={i} 
              className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed group"
              style={{ animation: `slideUp 0.4s ease-out ${0.1 * (i + 1)}s both` }}
            >
              <span className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 group-hover:scale-125 transition-transform" />
              {takeaway}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
export default ResultCard;
