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
import { cn } from "@/lib/utils";

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
    icon: TrendingUp,
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Positive",
  },
  negative: {
    icon: TrendingDown,
    className: "text-red-700 bg-red-50 border-red-200",
    label: "Negative",
  },
  mixed: {
    icon: Zap,
    className: "text-amber-700 bg-amber-50 border-amber-200",
    label: "Mixed",
  },
  neutral: {
    icon: Minus,
    className: "text-gray-700 bg-gray-50 border-gray-200",
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
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-gray-900">
            {message.content}
          </div>
          <div className="mt-1 text-right text-[11px] text-gray-500">{time}</div>
        </div>
      </div>
    );
  }

  /* ─── ERROR MESSAGE ────────────────────────────────────── */
  if (message.type === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2 items-start">
        <span className="text-base leading-none">⚠</span>
          <span>{message.content}</span>
      </div>
    );
  }

  /* ─── NEWS CARD (assistant) ────────────────────────────── */
  const data = message.parsed;
  if (!data) return null;

  const sentimentCfg =
    SENTIMENT_CONFIG[data.sentiment as keyof typeof SENTIMENT_CONFIG] ||
    SENTIMENT_CONFIG.neutral;
  const SentimentIcon = sentimentCfg.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <BharatNewsLogo size={18} />
        <span className="font-extrabold tracking-widest uppercase text-gray-500">
          BharatNews AI
        </span>
        <span className="text-gray-300">·</span>
        <span>{time}</span>
      </div>

      <article
        className={cn(
          "rounded-lg border bg-white overflow-hidden",
          data.breaking ? "border-red-200" : "border-gray-200"
        )}
      >
        {data.breaking && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[11px] font-extrabold tracking-widest text-red-700">
              BREAKING NEWS
            </span>
          </div>
        )}

        <div className="px-4 pt-4 pb-3 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {data.category && (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700">
                  {data.category}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
                sentimentCfg.className
              )}
            >
              <SentimentIcon className="h-3.5 w-3.5" />
              {sentimentCfg.label}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {data.headline}
          </h3>
        </div>

        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm leading-relaxed text-gray-700">{data.summary}</p>
        </div>

        {data.keyPoints?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-xs font-extrabold tracking-widest uppercase text-gray-500">
              <BookOpen className="h-4 w-4 text-gray-400" />
              Key Developments
            </div>
            <ul className="space-y-2">
              {data.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="mt-1 text-blue-600 font-bold">•</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.sources?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-xs font-extrabold tracking-widest uppercase text-gray-500">
              <ExternalLink className="h-4 w-4 text-gray-400" />
              Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {data.sources.map((source, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.followUpSuggestions?.length > 0 && (
          <div className="px-4 py-3">
            <div className="mb-2 text-xs font-extrabold tracking-widest uppercase text-gray-500">
              Continue Reading
            </div>
            <div className="space-y-2">
              {data.followUpSuggestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onFollowUp(q)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-left">{q}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

export default NewsMessageCard;
