import { useRef, memo } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface NewsCarouselProps {
  title: string;
  icon: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

const NewsCarousel = ({ title, icon: Icon, className = "", children }: NewsCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section className={`relative group ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            <Icon className="w-5 h-5 flex-shrink-0" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>
        <button className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          See all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Arrows (Desktop overlay) */}
      <button 
        onClick={() => scrollBy(-400)}
        className="hidden md:flex absolute left-[-20px] top-[calc(50%+1rem)] -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full glass-card text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={() => scrollBy(400)}
        className="hidden md:flex absolute right-[-20px] top-[calc(50%+1rem)] -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full glass-card text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 md:px-0 pb-6 pt-2"
        style={{ scrollPaddingLeft: "1rem" }}
      >
        {children}
      </div>
    </section>
  );
}

export default memo(NewsCarousel);
