import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNewsImage } from "@/hooks/useNewsImage";
import Header from "@/components/Header";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, ExternalLink, ArrowLeft, Clock, Building, Sparkles, Loader2, FileText, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import type { NewsArticle } from "@/services/newsApi";
import { fastGenerateArticle } from "@/services/openrouterApi";
import { sanitizeHtmlWithStyles } from "@/utils/htmlSanitizer";
import { translateArticle } from "@/services/translationService";

const NewsDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, toggleLike, toggleSave } = useAuth();
  const article = location.state?.article as NewsArticle | undefined;

  const [aiState, setAiState] = useState<"idle" | "scraping" | "optimizing" | "generating" | "done" | "error">("idle");
  const [fullArticleHtml, setFullArticleHtml] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ===== TRANSLATION STATE =====
  const [selectedLang, setSelectedLang] = useState("english");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<string>("");
  const [translationEngine, setTranslationEngine] = useState<string>("");
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationTime, setTranslationTime] = useState<number | null>(null);

  /**
   * Translates article HTML using the robust translation service.
   * Engine priority: Local IndicTrans2 server → Browser-side MyMemory API.
   * If "english" is selected, it reverts to the original.
   */
  const handleLanguageChange = async (langKey: string) => {
    setSelectedLang(langKey);
    setTranslationError(null);

    // If switching back to English, just show the original
    if (langKey === "english") {
      if (originalHtml) {
        setFullArticleHtml(originalHtml);
      }
      setTranslatedHtml(null);
      setTranslationEngine("");
      setTranslationTime(null);
      return;
    }

    // Store the original English HTML on first translation
    const htmlToTranslate = originalHtml || fullArticleHtml;
    if (!htmlToTranslate) return;
    if (!originalHtml) {
      setOriginalHtml(htmlToTranslate);
    }

    setIsTranslating(true);
    setTranslationProgress("Starting translation...");

    try {
      const result = await translateArticle(
        htmlToTranslate,
        langKey,
        (done, total) => {
          if (total <= 1) {
            setTranslationProgress(
              done >= 1 ? "Finishing…" : "Starting translation…"
            );
          } else {
            const pct = Math.round((done / total) * 100);
            setTranslationProgress(
              `Translating part ${done} of ${total} (${pct}%) — long articles are split automatically`
            );
          }
        }
      );

      if (result.success && result.translatedHtml) {
        setTranslatedHtml(result.translatedHtml);
        setFullArticleHtml(result.translatedHtml);
        setTranslationEngine(result.engine);
        setTranslationTime(result.timeTakenMs);
        setTranslationError(null);
      } else {
        setTranslationError(result.error || "Translation failed. Please try again.");
        setTranslationTime(result.timeTakenMs);
      }
    } catch (err: any) {
      console.error("Translation request failed:", err.message);
      setTranslationError(err.message || "Translation failed unexpectedly.");
    } finally {
      setIsTranslating(false);
      setTranslationProgress("");
    }
  };

  const toggleSpeakArticle = (textHtml: string | null) => {
    if (!textHtml) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = textHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    if (plainText.trim() === "") return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const processArticle = useCallback(async () => {
    if (!article?.url) return;

    setAiError(null);
    setFullArticleHtml(null);
    setUsedFallback(false);

    let mounted = true;

    try {
      if (!mounted) return;
      setAiState("generating");
      setUsedFallback(true);

      const generated = await fastGenerateArticle({
        title: article.title,
        description: article.description || "",
        content: article.content || "",
        sourceName: article.source?.name || "Unknown",
        publishedAt: article.publishedAt || "",
        url: article.url,
      });

      if (!mounted) return;
      const cleanHtml = sanitizeHtmlWithStyles(generated);
      setFullArticleHtml(cleanHtml);
      setAiState("done");
    } catch (aiFallbackErr: any) {
      console.error("AI generation failed:", aiFallbackErr);
      if (mounted) {
        setAiState("error");
        setAiError(aiFallbackErr.message || "Failed to generate article content.");
      }
    }

    return () => {
      mounted = false;
      window.speechSynthesis.cancel();
    };
  }, [article]);

  useEffect(() => {
    if (!article?.url || aiState !== "idle") return;

    // ===== N8N INSTANT LOAD BYPASS =====
    // If the article already contains n8n-generated AI content, we instantly inject it
    // into the view, completely bypassing the slow ScraperAPI -> OpenRouter pipeline!
    if (article.ai_content && article.ai_content.length > 50) {
      setFullArticleHtml(article.ai_content);
      setAiState("done");
      // Set to true so the UI knows it's an AI article (from db instead of fallback)
      setUsedFallback(false);
      return;
    }

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

            {/* Custom Logo & Loading Circle setup */}
            <div className="relative flex items-center justify-center w-24 h-24 mb-6">
              {/* Outer spinning loading circle */}
              <div className="absolute inset-0 rounded-full border-[3.5px] border-primary/20 border-t-primary animate-spin shadow-[0_0_15px_rgba(var(--primary),0.2)]"></div>

              {/* Optional inner reverse spinning circle just for premium feel */}
              <div className="absolute inset-2 rounded-full border-[3.5px] border-primary/10 border-b-primary animate-[spin_1.5s_linear_infinite_reverse]"></div>

              {/* Logo Image */}
              <img src="/logo part.png" alt="AI Generator Logo" className="w-12 h-12 object-contain z-10 relative left-0.5" />
            </div>

            <h3 className="text-xl font-bold mb-2">
              {aiState === "scraping"
                ? "Extracting Article..."
                : aiState === "optimizing"
                  ? "AI Optimizing Formatting..."
                  : "Generating with AI..."}
            </h3>
          </div>
        ) : aiState === "done" && fullArticleHtml ? (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-2 mb-8">
              <div className="flex items-center gap-3">
                <img src="/logo part.png" alt="Logo" className="h-8 w-auto object-contain drop-shadow-sm" />
                <h3 className="text-2xl font-bold text-foreground">
                  {article?.ai_content ? "n8n AI Generated Article" : usedFallback ? "AI Generated Article" : "AI Optimized Read"}
                </h3>
              </div>
              <Button
                variant={isSpeaking ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-full font-bold shadow-sm"
                onClick={() => toggleSpeakArticle(fullArticleHtml)}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isSpeaking ? "Stop Listening" : "Listen"}
              </Button>
            </div>

            {/* Badge for workflow-generated content */}
            {article?.ai_content ? (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <p className="text-sm font-semibold text-primary">⚡ Powered by n8n Workflow</p>
              </div>
            ) : null}

            {/* Language Selector for IndicTrans2 translation */}
            <LanguageSelector
              selectedLang={selectedLang}
              onSelectLanguage={handleLanguageChange}
              isTranslating={isTranslating}
            />

            {/* Translating progress overlay */}
            {isTranslating && (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <p className="text-sm font-medium text-primary">
                  {translationProgress || "Connecting to translation engine..."}
                </p>
              </div>
            )}

            {/* Translation error message */}
            {translationError && !isTranslating && (
              <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-sm font-medium text-destructive">{translationError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => handleLanguageChange(selectedLang)}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
              </div>
            )}

            {/* Engine badge when translation is active */}
            {translationEngine && selectedLang !== "english" && !isTranslating && !translationError && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                  Translated via {translationEngine}
                  {translationTime !== null && (
                    <span className="ml-1.5 text-green-600/70 dark:text-green-400/70 font-medium">
                      • {translationTime < 1000 ? `${translationTime}ms` : `${(translationTime / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* We apply prose typography classes to beautifully style the HTML from AI */}
            <div
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-h2:text-2xl prose-h2:font-bold prose-h2:text-foreground prose-h2:mt-8 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b-2 prose-h2:border-foreground/20 prose-h3:text-lg prose-h3:font-bold prose-h3:text-foreground prose-h3:mt-6 prose-h3:mb-4 prose-a:text-primary prose-a:font-semibold prose-li:marker:text-primary prose-p:text-foreground/85 prose-p:leading-8 prose-p:text-justify prose-p:mb-5 prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/10 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-foreground/80 prose-blockquote:font-semibold"
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
