import { useRef, memo } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface NewsCarouselProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

const NewsCarousel = ({ title, className = "", children }: NewsCarouselProps) => {
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
        <div className="flex items-center gap-3">
          {/* Section-specific icons */}
          {title.toLowerCase() === "recommended for you" && (
            <img src="/logo part.png" alt="Logo" className="h-8 md:h-10 object-contain drop-shadow-sm" />
          )}
          {title.toLowerCase().includes("trending") && (
            <img src="/trending-events-icon.png" alt="Trending" className="h-8 md:h-10 object-contain drop-shadow-sm" />
          )}
          {title.toLowerCase().includes("global") && (
            <img src="/global-perspective-icon.png" alt="Global" className="h-8 md:h-10 object-contain drop-shadow-sm" />
          )}
          <h2 
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ fontFamily: '"Noto Serif", serif' }}
          >
            {title}
          </h2>
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
