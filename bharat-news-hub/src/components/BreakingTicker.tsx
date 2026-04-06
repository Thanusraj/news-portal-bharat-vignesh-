import { memo } from "react";
import { Zap } from "lucide-react";
import { NewsArticle } from "@/services/newsApi";

interface BreakingTickerProps {
  articles: NewsArticle[];
}

const BreakingTicker = ({ articles }: BreakingTickerProps) => {
  if (!articles || articles.length === 0) return null;

  // Duplicate articles once to create a seamless infinite scroll loop
  const seamlessGroup = [...articles, ...articles];

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white overflow-hidden flex items-center h-10 border-b border-red-700/50 relative z-20">
      {/* Absolute left badge - covers the scrolling text underneath */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-gradient-to-r from-red-700 to-red-600 font-bold text-xs uppercase tracking-wider shadow-[4px_0_12px_rgba(0,0,0,0.2)]">
        <div className="relative flex items-center justify-center w-2 h-2 mr-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-pulse-dot"></span>
          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white"></span>
        </div>
        LIVE UPDATES
      </div>
      
      {/* Scroll Container */}
      <div className="flex-1 overflow-hidden ml-36 md:ml-40">
        <div className="flex whitespace-nowrap pl-4 animate-ticker hover:[animation-play-state:paused]">
          {seamlessGroup.map((article, i) => (
            <div key={`${article.url}-${i}`} className="flex items-center">
              <span className="px-4 text-sm font-medium opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                {article.title}
              </span>
              <span className="text-white/40 px-2">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(BreakingTicker);
