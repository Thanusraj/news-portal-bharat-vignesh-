import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import { searchNews, type NewsArticle } from "@/services/newsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon } from "lucide-react";

const SearchPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q") || "";
  const [results, setResults] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    searchNews(query, 10).then((data) => {
      setResults(data);
      setLoading(false);
    });
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <SearchIcon className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">
            Results for "{query}"
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No results found. Try a different search term.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((article) => (
              <NewsCard
                key={article.url}
                article={article}
                size="medium"
                onClick={() => navigate("/article", { state: { article } })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
