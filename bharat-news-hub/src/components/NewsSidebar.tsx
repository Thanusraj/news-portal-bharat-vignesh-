import React, { useState, useEffect } from "react";
import { X, Search, Clock, Trash2, ChevronRight } from "lucide-react";
import type { NewsArticle } from "@/services/newsApi";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "For You",
  "Technology",
  "Business",
  "World",
  "Sports",
  "Entertainment",
  "Science",
  "Health",
  "Politics"
];

interface NewsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  searchHistory: NewsArticle[];
  onSelectHistoryItem: (article: NewsArticle) => void;
  onClearHistory?: () => void;
}

const NewsSidebar: React.FC<NewsSidebarProps> = ({
  isOpen,
  onToggle,
  activeCategory,
  onSelectCategory,
  searchHistory,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredHistory = searchHistory.filter((a) =>
    (a.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative lg:translate-x-0 top-0 left-0 z-40 h-[calc(100vh-80px)] w-[280px] bg-card border-r border-border/50 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
          <h2 className="font-bold text-lg text-foreground">BharatNews</h2>
          <button
            onClick={onToggle}
            className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg bg-muted/50 border border-border/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-4 border-b border-border/50">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Categories
          </p>
          <div className="space-y-1">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => {
                  onSelectCategory(category);
                  // Close sidebar on mobile after selection
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                {category}
                {activeCategory === category && (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search History */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-border/50">
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Reads
            </p>
            {filteredHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1">
            {filteredHistory.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                {searchQuery ? "No matches found" : "No recent reads"}
              </p>
            ) : (
              filteredHistory.map((article) => (
                <button
                  key={article.url}
                  onClick={() => {
                    onSelectHistoryItem(article);
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className="w-full text-left group p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 transition-colors">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(article.publishedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50 flex-shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            India's Trusted News Source
          </p>
        </div>
      </aside>
    </>
  );
};

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "recently";
  }
}

export default NewsSidebar;
