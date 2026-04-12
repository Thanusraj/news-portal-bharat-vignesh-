import { memo } from "react";
import { motion } from "framer-motion";
import { GlassButton } from "@/components/ui/glass-button";

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
              <GlassButton
                key={cat}
                onClick={() => onSelect(cat)}
                size="sm"
                className={`flex-shrink-0 transition-all duration-300 ${
                  isActive
                    ? "bg-white/30 backdrop-blur-md border border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:bg-white/10 dark:border-white/20 text-slate-800 dark:text-white"
                    : "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 shadow-sm dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                }`}
                contentClassName={`font-semibold`}
              >
                {cat}
              </GlassButton>
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
