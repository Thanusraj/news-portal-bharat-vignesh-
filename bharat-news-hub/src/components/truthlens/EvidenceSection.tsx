import { EvidenceSource } from "@/types/analysis";
import { ExternalLink, Newspaper, BookOpen, Search } from "lucide-react";

interface EvidenceSectionProps {
  evidence: EvidenceSource[];
}

const EvidenceSection = ({ evidence }: EvidenceSectionProps) => {
  if (!evidence.length) return null;

  const sourceConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    news: { icon: <Newspaper className="w-3 h-3" />, label: "News", color: "bg-blue-100 text-blue-700" },
    scraper: { icon: <Search className="w-3 h-3" />, label: "Deep Search", color: "bg-amber-100 text-amber-700" },
    wikipedia: { icon: <BookOpen className="w-3 h-3" />, label: "Wikipedia", color: "bg-purple-100 text-purple-700" },
  };

  return (
    <div
      className="rounded-3xl bg-white border border-gray-200/80 p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ animation: "slideUp 0.5s ease-out 0.15s both" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Evidence Sources
        </h3>
        <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {evidence.slice(0, 3).length} top sources
        </span>
      </div>

      <div className="space-y-3">
        {evidence.slice(0, 3).map((e, i) => {
          const src = sourceConfig[e.source] || sourceConfig.news;
          return (
            <div
              key={i}
              className="group rounded-2xl bg-gray-50/80 border border-gray-100 p-5 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-300"
              style={{ animation: `slideUp 0.4s ease-out ${0.1 * (i + 1)}s both` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${src.color}`}>
                      {src.icon}
                      {src.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {e.title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{e.snippet}</p>
                </div>
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 hover:-translate-y-0.5 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default EvidenceSection;
