import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import CategoryTabs from "@/components/CategoryTabs";
import NewsCarousel from "@/components/NewsCarousel";
import {
  fetchNewsByTopic,
  fetchWorldNews,
  fetchEventsNews,
  clearNewsCache,
  NewsApiError,
  type NewsArticle,
} from "@/services/newsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Globe, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useHighQualityFeatured } from "@/hooks/useHighQualityFeatured";

export type DashboardProps = {
  onPersonalLoadComplete?: () => void;
};

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const Dashboard = ({ onPersonalLoadComplete }: DashboardProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [personalNews, setPersonalNews] = useState<NewsArticle[]>([]);
  const [globalNews, setGlobalNews] = useState<NewsArticle[]>([]);
  const [eventsNews, setEventsNews] = useState<NewsArticle[]>([]);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState("For You");

  const interestsKey = useMemo(
    () => (profile?.interests?.length ? profile.interests.slice(0, 3).join("|") : "general"),
    [profile?.interests]
  );
  const preferredInterests = useMemo(
    () => (interestsKey === "general" ? ["general"] : interestsKey.split("|")),
    [interestsKey]
  );
  const language = profile?.language || "en";
  const fetchKey = useMemo(() => `${interestsKey}::${language}::${retryCount}`, [interestsKey, language, retryCount]);

  const secondaryRunIdRef = useRef(0);
  const personalRef = useRef<NewsArticle[]>([]);

  useEffect(() => {
    personalRef.current = personalNews;
  }, [personalNews]);

  const dedupeArticles = (articles: NewsArticle[]) => {
    const seen = new Set<string>();
    return articles.filter((a) => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });
  };

  const handleRetry = useCallback(() => {
    clearNewsCache();
    setApiError(null);
    setRetryCount((c) => c + 1);
  }, []);

  const personalLoadNotifiedRef = useRef(false);
  useEffect(() => {
    if (personalLoading) {
      personalLoadNotifiedRef.current = false;
      return;
    }
    if (!personalLoadNotifiedRef.current) {
      personalLoadNotifiedRef.current = true;
      onPersonalLoadComplete?.();
    }
  }, [personalLoading, onPersonalLoadComplete]);

  // Phase 1: personalize feed ASAP
  useEffect(() => {
    let cancelled = false;

    const loadPersonal = async () => {
      setPersonalLoading(true);
      setGlobalLoading(true);
      setEventsLoading(true);
      setPersonalNews([]);
      setGlobalNews([]);
      setEventsNews([]);
      setApiError(null);

      const interests = preferredInterests;
      const lang = language;

      const primaryTopic = activeCategory !== "For You" ? activeCategory.toLowerCase() : (interests[0] ?? "general");
      let basePersonal: NewsArticle[] = [];
      try {
        const firstBatch = await fetchNewsByTopic(primaryTopic, lang, "in", 15);
        if (cancelled) return;
        basePersonal = dedupeArticles(firstBatch);
        setPersonalNews(basePersonal);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof NewsApiError) {
          setApiError(e.message);
        } else {
          setApiError("Failed to fetch news. Please check your internet connection.");
        }
      } finally {
        if (!cancelled) {
          setPersonalLoading(false);
        }
      }

      if (activeCategory !== "For You") return;

      const extraTopics = interests.slice(1, 3);
      if (extraTopics.length === 0) return;

      try {
        const extraResults = await Promise.all(
          extraTopics.map((topic) => fetchNewsByTopic(topic, lang, "in", 5))
        );
        if (cancelled) return;
        
        const allTopicsArrays = [basePersonal, ...extraResults];
        const interleaved: NewsArticle[] = [];
        let i = 0;
        while (true) {
          let added = false;
          for (const arr of allTopicsArrays) {
            if (i < arr.length) {
              interleaved.push(arr[i]);
              added = true;
            }
          }
          if (!added) break;
          i++;
        }
        
        const merged = dedupeArticles(interleaved);
        setPersonalNews(merged);
      } catch {
        // ignore enrichment failures
      }
    };

    void loadPersonal();
    return () => {
      cancelled = true;
    };
  }, [fetchKey, activeCategory, language]);

  // Phase 2: fetch global & events
  useEffect(() => {
    const runId = ++secondaryRunIdRef.current;
    let cancelled = false;

    const startSecondary = async () => {
      setGlobalLoading(true);
      setEventsLoading(true);

      const uniquePersonal = personalRef.current;
      const personalUrls = new Set(uniquePersonal.map((a) => a.url).filter(Boolean));

      const globalPromise = (async () => {
        try {
          const world = await fetchWorldNews(language, "in", 12, "fast");
          if (cancelled || secondaryRunIdRef.current !== runId) return;
          let filteredWorld = world.filter((a) => a.url && !personalUrls.has(a.url));
          if (filteredWorld.length === 0 && world.length > 0) filteredWorld = world;
          setGlobalNews(filteredWorld);
        } catch (e) {
          console.warn("Failed to fetch global news:", e);
        } finally {
          if (!cancelled && secondaryRunIdRef.current === runId) {
            setGlobalLoading(false);
          }
        }
      })();

      const eventsPromise = (async () => {
        try {
          const events = await fetchEventsNews(language, "in", 12);
          if (cancelled || secondaryRunIdRef.current !== runId) return;
          let filteredEvents = events.filter((a) => a.url && !personalUrls.has(a.url));
          if (filteredEvents.length === 0 && events.length > 0) filteredEvents = events;
          setEventsNews(filteredEvents);
        } catch (e) {
          console.warn("Failed to fetch events news:", e);
        } finally {
          if (!cancelled && secondaryRunIdRef.current === runId) {
            setEventsLoading(false);
          }
        }
      })();

      await Promise.all([globalPromise, eventsPromise]);
    };

    void startSecondary();
    return () => { cancelled = true; };
  }, [fetchKey, language, activeCategory]);

  const openArticle = (article: NewsArticle) => {
    navigate("/article", { state: { article } });
  };

  const tickerArticles = useMemo(() => personalNews.slice(0, 5), [personalNews]);
  // Runtime image quality validation — only shows articles with real high-res cover photos
  const { featured: featuredArticles, validating: featuredValidating } = useHighQualityFeatured(personalNews, 3, personalLoading);
  const remainingArticles = useMemo(() => {
    const featuredUrls = new Set(featuredArticles.map(a => a.url));
    const arr = personalNews.filter(a => !featuredUrls.has(a.url));
    return activeCategory === "For You" ? arr.slice(0, 10) : arr;
  }, [personalNews, featuredArticles, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Container */}
      <main className="w-full pb-20">
        
        {/* Category Tabs Bar */}
        <div className="border-b border-border/50 mb-8 pt-1 pb-1">
          <div className="max-w-7xl mx-auto">
            <CategoryTabs 
              categories={CATEGORIES} 
              activeCategory={activeCategory} 
              onSelect={setActiveCategory} 
            />
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-8 md:space-y-12">
          
          {/* API Error Banner */}
          {apiError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 animate-fade-in shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-destructive/10 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">Unable to Load News</h3>
                  <p className="text-sm text-muted-foreground mb-4">{apiError}</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {!apiError && (
            <>
              {/* FEATURED SECTION */}
              <section className="animate-fade-in">
                {(personalLoading || featuredValidating) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 lg:gap-6">
                    {/* Main Card Skeleton - Simple Block */}
                    <Skeleton className="w-full h-full min-h-[320px] lg:min-h-[380px] rounded-[1.5rem] animate-shimmer border border-border/40 bg-muted/30" />
                    
                    {/* Side Cards Skeletons - Simple Blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="w-full h-full min-h-[220px] rounded-[1.25rem] animate-shimmer border border-border/40 bg-muted/30" />
                      ))}
                    </div>
                  </div>
                ) : featuredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 lg:gap-6">
                    {/* Left side main card (60%) */}
                    <div className="flex flex-col h-full">
                      <NewsCard
                        article={featuredArticles[0]}
                        size="featured-main"
                        imagePriority="high"
                        onClick={() => openArticle(featuredArticles[0])}
                      />
                    </div>
                    {/* Right side grid (40%) - side by side to make them more square/portrait */}
                    {featuredArticles.length > 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 h-full">
                        <div className="flex flex-col h-full">
                          <NewsCard
                            article={featuredArticles[1]}
                            size="featured-side"
                            imagePriority="high"
                            onClick={() => openArticle(featuredArticles[1])}
                          />
                        </div>
                        {featuredArticles.length > 2 && (
                          <div className="flex flex-col h-full">
                            <NewsCard
                              article={featuredArticles[2]}
                              size="featured-side"
                              imagePriority="high"
                              onClick={() => openArticle(featuredArticles[2])}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>

              {/* PERSONAL CAROUSEL OR GRID */}
              {(!personalLoading && remainingArticles.length > 0) && (
                activeCategory === "For You" ? (
                  <NewsCarousel title="Recommended For You" icon={Sparkles}>
                    {remainingArticles.map((article) => (
                      <NewsCard
                        key={article.url}
                        article={article}
                        size="medium"
                        onClick={() => openArticle(article)}
                      />
                    ))}
                  </NewsCarousel>
                ) : (
                  <section className="animate-fade-in mt-12 pb-12">
                    <div className="flex items-center gap-2 mb-6 px-1 text-foreground">
                      <Sparkles className="w-6 h-6 text-indigo-600" />
                      <h2 className="text-2xl font-bold tracking-tight">{activeCategory} Highlights</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {remainingArticles.map((article) => (
                        <NewsCard
                          key={article.url}
                          article={article}
                          size="medium"
                          onClick={() => openArticle(article)}
                        />
                      ))}
                    </div>
                  </section>
                )
              )}

              {/* TRENDING AND GLOBAL SECTIONS - ONLY "FOR YOU" */}
              {activeCategory === "For You" && (
                <>
                  {/* TRENDING SECTION */}
                  <NewsCarousel title="Trending & Events" icon={Calendar} className="bg-surface-2 dark:bg-surface-1 -mx-4 md:-mx-8 px-4 md:px-8 py-10 my-8">
                    {eventsLoading ? (
                      [...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-[3/4] w-[180px] md:w-[220px] rounded-[1.25rem] flex-shrink-0 snap-start animate-shimmer" />
                      ))
                    ) : (
                      eventsNews.map((article) => (
                        <NewsCard
                          key={article.url}
                          article={article}
                          size="trending"
                          onClick={() => openArticle(article)}
                        />
                      ))
                    )}
                    {!eventsLoading && eventsNews.length === 0 && (
                      <div className="w-full py-12 text-center text-muted-foreground">No trending events right now.</div>
                    )}
                  </NewsCarousel>

                  {/* GLOBAL NEWS */}
                  <NewsCarousel title="Global Perspective" icon={Globe}>
                    {globalLoading ? (
                      [...Array(6)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[240px] md:w-[280px] snap-start border border-border/50 rounded-[1.5rem] overflow-hidden">
                          <Skeleton className="aspect-[4/3] w-full animate-shimmer" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-4 w-1/4 animate-shimmer" />
                            <Skeleton className="h-4 w-full animate-shimmer" />
                            <Skeleton className="h-4 w-2/3 animate-shimmer" />
                          </div>
                        </div>
                      ))
                    ) : (
                      globalNews.map((article) => (
                        <NewsCard
                          key={article.url}
                          article={article}
                          size="medium"
                          onClick={() => openArticle(article)}
                        />
                      ))
                    )}
                    {!globalLoading && globalNews.length === 0 && (
                      <div className="w-full py-12 text-center text-muted-foreground">No global news right now.</div>
                    )}
                  </NewsCarousel>
                </>
              )}

            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
