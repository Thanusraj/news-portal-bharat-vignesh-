import React from "react";
import { Zap, Newspaper, Brain, Globe, TrendingUp, Shield } from "lucide-react";
import BharatNewsLogo from "./BharatNewsLogo";

interface WelcomeScreenProps {
  onTopicClick: (topic: string) => void;
}

const FEATURED_TOPICS = [
  {
    category: "India",
    icon: Globe,
    queries: ["India GDP growth 2025", "Indian election results", "RBI monetary policy"],
  },
  {
    category: "Markets",
    icon: TrendingUp,
    queries: ["Nifty 50 today", "Global stock market", "Crude oil prices"],
  },
  {
    category: "Technology",
    icon: Zap,
    queries: ["AI breakthroughs 2025", "Tech startup funding", "Semiconductor news"],
  },
  {
    category: "World",
    icon: Newspaper,
    queries: ["US-China tensions", "Middle East conflict", "G20 summit"],
  },
] as const;

const FEATURES = [
  { icon: Zap, label: "Live Sources" },
  { icon: Brain, label: "AI Analysis" },
  { icon: Shield, label: "Fact Checked" },
] as const;

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onTopicClick }) => {
  return (
    <div className="flex flex-col items-center px-6 py-10">
      <div className="mb-5">
        <BharatNewsLogo size={72} />
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 text-center">
        BharatNews <span className="text-blue-600">AI</span> Correspondent
      </h2>
      <p className="mt-2 text-sm text-gray-600 text-center max-w-[560px] leading-relaxed">
        Ask about any topic for instant, professional briefings curated from trusted sources.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
          >
            <f.icon className="h-3.5 w-3.5 text-blue-600" />
            {f.label}
          </div>
        ))}
      </div>

      <div className="mt-8 w-full max-w-[760px] grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURED_TOPICS.map((cat) => (
          <div key={cat.category} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className="h-4 w-4 text-blue-600" />
              <div className="text-xs font-extrabold tracking-widest uppercase text-gray-500">
                {cat.category}
              </div>
            </div>
            <div className="space-y-2">
              {cat.queries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onTopicClick(q)}
                  className="w-full text-left rounded-md border border-transparent px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50 hover:border-gray-200 transition-colors"
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
