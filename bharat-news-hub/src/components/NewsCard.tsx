import { memo, useState } from "react";
import { useNewsImage } from "@/hooks/useNewsImage";
import { Heart, Bookmark, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { NewsArticle } from "@/services/newsApi";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface NewsCardProps {
  article: NewsArticle;
  size?: "featured-1" | "featured-2" | "large" | "medium" | "trending" | "grid";
  onClick: () => void;
  imagePriority?: "high" | "low";
}

const itemVariant: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const NewsCard = ({ article, size = "medium", onClick, imagePriority = "low" }: NewsCardProps) => {
  const { profile, toggleLike, toggleSave } = useAuth();
  const { src, loaded, handleImageError, handleImageLoad } = useNewsImage(article.image, article.title.split(" ").slice(0, 3).join(" "));
  const [isHovered, setIsHovered] = useState(false);
  
  const isLiked = profile?.likedArticles?.some(a => a.url === article.url) ?? false;
  const isSaved = profile?.savedArticles?.some(a => a.url === article.url) ?? false;
  
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
  const loadingAttr = imagePriority === "high" ? "eager" : "lazy";
  const fetchPriorityAttr = imagePriority === "high" ? "high" : "low";

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: article.title, url: article.url }).catch(() => {});
    }
  };

  // ═══════════ FEATURED-1 VARIANT (Compact Overlay — Indigo Accent) ═══════════
  if (size === "featured-1") {
    return (
      <motion.div
        variants={itemVariant}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-shadow duration-500 cursor-pointer border border-white/10 dark:border-white/5 isolate"
        onClick={onClick}
      >
        <div className={`absolute inset-0 z-0 bg-zinc-800 ${!loaded ? "animate-shimmer" : ""}`} />
        <motion.img
          src={src}
          alt={article.title}
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`absolute inset-0 w-full h-full object-cover z-[1] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={loadingAttr}
          fetchPriority={fetchPriorityAttr}
          decoding="async"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
        {/* Indigo tint on hover */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-indigo-950/0 group-hover:bg-indigo-950/15 transition-colors duration-500" />

        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5 z-[3]">
          {/* Top */}
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-indigo-600 rounded-md shadow-md shadow-indigo-600/30">
              {article.source.name}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(article); }}
                className="p-2 rounded-lg bg-black/30 text-white backdrop-blur-sm border border-white/10 hover:bg-black/50 transition-all"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-black/30 text-white backdrop-blur-sm border border-white/10 hover:bg-black/50 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom */}
          <div className="transform transition-transform duration-400 group-hover:-translate-y-0.5">
            <h2 className="text-base md:text-lg font-bold leading-snug line-clamp-2 text-white mb-2 tracking-tight">
              {article.title}
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-200 font-semibold">{article.source.name}</span>
                <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                <span>{timeAgo}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(article); }}
                className={`p-1.5 rounded-full transition-all ${
                  isLiked ? "text-rose-400 bg-rose-500/20" : "text-zinc-400 hover:text-rose-400 hover:bg-white/10"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════ FEATURED-2 VARIANT (Compact Overlay — Emerald Accent) ═══════════
  if (size === "featured-2") {
    return (
      <motion.div
        variants={itemVariant}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 transition-shadow duration-500 cursor-pointer border border-white/10 dark:border-white/5 isolate"
        onClick={onClick}
      >
        <div className={`absolute inset-0 z-0 bg-zinc-800 ${!loaded ? "animate-shimmer" : ""}`} />
        <motion.img
          src={src}
          alt={article.title}
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`absolute inset-0 w-full h-full object-cover z-[1] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={loadingAttr}
          fetchPriority={fetchPriorityAttr}
          decoding="async"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />

        {/* Gradient overlay — different direction for visual contrast */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-tr from-black/90 via-black/50 to-transparent" />
        {/* Emerald tint on hover */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-emerald-950/0 group-hover:bg-emerald-950/15 transition-colors duration-500" />

        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5 z-[3]">
          {/* Top */}
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-emerald-600 rounded-md shadow-md shadow-emerald-600/30">
              {article.source.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleSave(article); }}
              className="p-2 rounded-lg bg-black/30 text-white backdrop-blur-sm border border-white/10 hover:bg-black/50 transition-all"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
            </button>
          </div>

          {/* Bottom */}
          <div className="transform transition-transform duration-400 group-hover:-translate-y-0.5">
            <h2 className="text-base md:text-lg font-bold leading-snug line-clamp-2 text-white mb-2 tracking-tight">
              {article.title}
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-200 font-semibold">{article.source.name}</span>
                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                <span>{timeAgo}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(article); }}
                  className={`p-1.5 rounded-full transition-all ${
                    isLiked ? "text-rose-400 bg-rose-500/20" : "text-zinc-400 hover:text-rose-400 hover:bg-white/10"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════ GRID, LARGE & MEDIUM VARIANTS ═══════════
  if (size === "large" || size === "medium" || size === "grid") {
    const isLg = size === "large";
    const isGrid = size === "grid";
    // For grid, take full width and let flex handle height. Otherwise fixed width + snap for carousel.
    const widthClass = isGrid ? "w-full h-full flex flex-col" : (isLg ? "w-[280px] md:w-[360px] flex-shrink-0 snap-start" : "w-[240px] md:w-[280px] flex-shrink-0 snap-start");
    
    return (
      <motion.div 
        variants={itemVariant}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`group relative ${widthClass} cursor-pointer rounded-[1.5rem] bg-card border border-border/60 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden`}
        onClick={onClick}
      >
        {/* Image portion - stretches if grid */}
        <div className={`relative w-full ${isGrid ? "flex-1 min-h-[60px]" : (isLg ? "aspect-[16/10]" : "aspect-[4/3]")} overflow-hidden rounded-t-[1.5rem] isolate`}>
          <div className={`absolute inset-0 bg-secondary ${!loaded ? "animate-shimmer" : ""}`} />
          <motion.img
            src={src}
            alt={article.title}
            animate={{ scale: isHovered ? 1.06 : 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`w-full h-full object-cover relative z-10 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading={loadingAttr}
            fetchPriority={fetchPriorityAttr}
            decoding="async"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {/* Inner shadow */}
          <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] z-20 pointer-events-none rounded-t-[1.5rem]" />
          
          <div className="absolute top-4 left-4 z-20">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              {article.source.name}
            </span>
          </div>
        </div>

        {/* Content portion */}
        <div className={`p-5 flex flex-col bg-card ${!isGrid ? (isLg ? "h-[160px]" : "h-[140px]") : "h-auto"}`}>
          <h3 className={`font-bold leading-snug line-clamp-2 md:line-clamp-3 mb-2 group-hover:text-primary transition-colors ${isLg || isGrid ? "text-lg" : "text-base"}`}>
            {article.title}
          </h3>
          {(isLg || isGrid) && (
            <p className="text-muted-foreground text-sm line-clamp-1 mb-3">
              {article.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{timeAgo}</span>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); toggleLike(article); }} className={`p-1.5 rounded-full transition-colors ${isLiked ? "text-red-500 bg-red-50 dark:bg-red-500/10" : "text-muted-foreground hover:bg-muted"}`}>
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleSave(article); }} className={`p-1.5 rounded-full transition-colors ${isSaved ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "text-muted-foreground hover:bg-muted"}`}>
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════ TRENDING VARIANT ═══════════
  if (size === "trending") {
    return (
      <motion.div 
        variants={itemVariant}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative rounded-[1.25rem] overflow-hidden shadow-lg hover:shadow-indigo-500/25 transition-shadow cursor-pointer aspect-[3/4] w-[180px] md:w-[220px] flex-shrink-0 snap-start isolate" 
        onClick={onClick}
      >
        <div className={`absolute inset-0 bg-secondary z-0 ${!loaded ? "animate-shimmer" : ""}`} />
        <motion.img
          src={src}
          alt={article.title}
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`absolute inset-0 w-full h-full object-cover z-10 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading={loadingAttr}
          fetchPriority={fetchPriorityAttr}
          decoding="async"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-90" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-4 z-30">
          <div className="flex justify-between items-start">
            <span className="px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider bg-primary/90 backdrop-blur-sm rounded-md shadow-sm">
              Trending
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight line-clamp-3 text-white mb-3 shadow-sm drop-shadow-md">
              {article.title}
            </h3>
            <div className="flex items-center justify-between">
               <span className="text-[10px] text-gray-300 font-medium truncate pr-2">{article.source.name}</span>
               <button onClick={(e) => { e.stopPropagation(); toggleLike(article); }} className={`p-1.5 rounded-full backdrop-blur-md bg-white/10 transition-colors hover:bg-white/20 ${isLiked ? "text-red-400" : "text-white"}`}>
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default memo(NewsCard);
