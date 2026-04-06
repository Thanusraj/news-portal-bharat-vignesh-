import { memo } from "react";
import { motion } from "framer-motion";

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

const CategoryTabs = ({ categories, activeCategory, onSelect }: CategoryTabsProps) => {
  return (
    <div className="w-full relative py-1 z-10">
      <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
        <div className="flex gap-2.5 mx-auto">
          {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex-shrink-0 cursor-pointer outline-none ${
                isActive 
                  ? "text-white" 
                  : "bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-foreground/70 hover:bg-white/90 dark:hover:bg-slate-800 border border-border/50 hover:shadow-sm"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 -z-10 shadow-lg shadow-indigo-500/25 glow-indigo"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {cat}
            </button>
          );
        })}
        </div>
      </div>
      {/* Fade edges */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
    </div>
  );
};

export default memo(CategoryTabs);
