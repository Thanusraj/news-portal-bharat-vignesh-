import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNewsImage } from "@/hooks/useNewsImage";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, ExternalLink, ArrowLeft, Clock, Building, Sparkles, Loader2, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { NewsArticle } from "@/services/newsApi";
import { fetchFullArticle } from "@/services/scraperApi";
import { optimizeArticleText, generateFromMetadata } from "@/services/openrouterApi";
import DOMPurify from "dompurify";

const NewsDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, toggleLike, toggleSave } = useAuth();
  const article = location.state?.article as NewsArticle | undefined;

  const [aiState, setAiState] = useState<"idle" | "scraping" | "optimizing" | "generating" | "done" | "error">("idle");
  const [fullArticleHtml, setFullArticleHtml] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const processArticle = useCallback(async () => {
    if (!article?.url) return;

    setAiError(null);
    setFullArticleHtml(null);
    setUsedFallback(false);

    let mounted = true;

    // Stage 1: Try ScraperAPI + Gemini optimize
    try {
      setAiState("scraping");
      const scraped = await fetchFullArticle(article.url);

      if (!mounted) return;
      setAiState("optimizing");

      const optimizedText = await optimizeArticleText(scraped.textContent);
      if (!mounted) return;

      const cleanHtml = DOMPurify.sanitize(optimizedText, {
        ADD_ATTR: ['class'],
        ADD_TAGS: ['div'],
      });
      setFullArticleHtml(cleanHtml);
      setAiState("done");
      return; // Success — done!
    } catch (scraperErr: any) {
      console.warn("ScraperAPI pipeline failed, falling back to AI-only:", scraperErr.message);
    }

    // Stage 2: Fallback — generate directly from article metadata via AI
    try {
      if (!mounted) return;
      setAiState("generating");
      setUsedFallback(true);

      const generated = await generateFromMetadata({
        title: article.title,
        description: article.description || "",
        content: article.content || "",
        sourceName: article.source?.name || "Unknown",
        publishedAt: article.publishedAt || "",
        url: article.url,
      });

      if (!mounted) return;
      const cleanHtml = DOMPurify.sanitize(generated, {
        ADD_ATTR: ['class'],
        ADD_TAGS: ['div'],
      });
      setFullArticleHtml(cleanHtml);
      setAiState("done");
    } catch (aiFallbackErr: any) {
      console.error("AI fallback also failed:", aiFallbackErr);
      if (mounted) {
        setAiState("error");
        setAiError(aiFallbackErr.message || "Failed to generate article content.");
      }
    }

    return () => {
      mounted = false;
    };
  }, [article]);

  useEffect(() => {
    if (!article?.url || aiState !== "idle") return;
    processArticle();
  }, [article, aiState, processArticle]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Article not found.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const { src } = useNewsImage(article.image, article.title.split(" ").slice(0, 3).join(" "));
  const isLiked = profile?.likedArticles?.some((a) => a.url === article.url) ?? false;
  const isSaved = profile?.savedArticles?.some((a) => a.url === article.url) ?? false;

  let cleanContent = article.content || "";
  const charsMatch = cleanContent.match(/\[\+?(\d+)\s+chars\]/i);
  const remainingChars = charsMatch ? charsMatch[1] : null;
  cleanContent = cleanContent.replace(/\s*\[.*?chars\]\s*/gi, "...").trim();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <article className="max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden mb-6">
          <img src={src} alt={article.title} className="w-full aspect-[16/9] object-cover" />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
            <Building className="w-3.5 h-3.5" /> {article.source.name}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> {format(new Date(article.publishedAt), "MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{article.title}</h1>

        {/* Highlighted Summary */}
        {article.description && (
          <div className="bg-muted/30 border-l-4 border-primary p-5 rounded-r-xl mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Editor's Summary</h3>
            <p className="text-lg text-foreground/80 leading-relaxed font-medium" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
              {article.description}
            </p>
          </div>
        )}

        {/* Content Section */}
        {aiState === "scraping" || aiState === "optimizing" || aiState === "generating" ? (
          <div className="mb-10 p-8 border rounded-2xl bg-muted/20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4 motion-reduce:animate-none" />
            <h3 className="text-xl font-bold mb-2">
              {aiState === "scraping" 
                ? "Extracting Article..." 
                : aiState === "optimizing" 
                  ? "AI Optimizing Formatting..."
                  : "Generating with AI..."}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {aiState === "scraping" 
                ? "Fetching full article from publisher source..." 
                : aiState === "optimizing"
                  ? "AI is structuring and cleaning the raw text for a perfect reading experience."
                  : "Generating a comprehensive article using AI from available metadata..."}
            </p>
          </div>
        ) : aiState === "done" && fullArticleHtml ? (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {usedFallback ? "AI Generated Article" : "AI Optimized Read"}
              </h3>
            </div>
            {usedFallback && (
              <p className="text-xs text-muted-foreground mb-4 bg-muted/40 px-3 py-2 rounded-lg inline-block">
                ℹ️ Full extraction was unavailable. This article was generated by AI from available metadata.
              </p>
            )}
            {/* We apply prose typography classes to beautifully style the HTML from AI */}
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-border prose-h2:pb-3 prose-h3:text-xl prose-h3:text-primary prose-h3:mt-8 prose-a:text-primary prose-li:marker:text-primary prose-p:text-foreground/90 prose-p:leading-8 prose-p:text-justify prose-p:mb-6 prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:not-italic" 
              style={{ fontFamily: "'Source Sans 3', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: fullArticleHtml }}
            />
          </div>
        ) : (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-xl font-bold">Content Preview</h3>
            </div>
            
            {aiState === "error" && (
              <div className="text-sm text-destructive mb-4 border border-destructive/50 bg-destructive/10 p-4 rounded-xl flex items-center justify-between">
                <span>AI processing failed: {aiError}. Showing standard preview.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-3 gap-1 shrink-0"
                  onClick={() => { setAiState("idle"); }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
              </div>
            )}

            <div className="prose prose-lg max-w-none" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-lg">
                {cleanContent}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-b border-border py-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLike(article)}
            className="gap-2"
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? "Liked" : "Like"}
          </Button>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSave(article)}
            className="gap-2"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto"
          >
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Read Original
            </Button>
          </a>
        </div>
      </article>
    </div>
  );
};

export default NewsDetail;
