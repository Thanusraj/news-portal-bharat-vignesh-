import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import { searchNews, type NewsArticle } from "@/services/newsApi";
import { Bookmark } from "lucide-react";

const SavedPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const openArticle = (article: NewsArticle) => {
    navigate("/article", { state: { article } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Saved Articles</h2>
        </div>

        {!profile?.savedArticles.length ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border mt-4">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No saved articles yet. Start saving articles you love!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {profile.savedArticles.map((article) => (
              <NewsCard 
                key={article.url} 
                article={article} 
                size="medium" 
                onClick={() => openArticle(article)} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SavedPage;
