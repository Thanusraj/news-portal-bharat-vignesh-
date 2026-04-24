import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, Loader2, Globe, Sparkles, CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
];

const TOPICS = [
  { id: "general", label: "General", emoji: "📰" },
  { id: "nation", label: "Politics", emoji: "🏛️" },
  { id: "technology", label: "Technology", emoji: "💻" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "health", label: "Health", emoji: "🏥" },
  { id: "world", label: "World", emoji: "🌍" },
];

const Profile = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [language, setLanguage] = useState(profile?.language || "en");
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  if (!profile || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (interests.length < 1) {
      toast.error("Please select at least one topic.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ language, interests }, { allowOffline: true });
      toast.success("Profile preferences updated!");
    } catch (err) {
      toast.error("Could not update profile right now.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = language !== profile.language || JSON.stringify(interests) !== JSON.stringify(profile.interests);

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Navigation & Header */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        {/* Profile Card setup */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          
          {/* Top Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          </div>
          
          <div className="px-8 pb-8">
            {/* Avatar over banner */}
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  {user.photoURL && !photoError ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-md"
                      onError={() => setPhotoError(true)}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-semibold border-4 border-card shadow-md">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-card rounded-full"></div>
                </div>
                <div className="pt-12">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-xs sm:max-w-md">{user.email}</h1>
                  <p className="text-primary font-medium text-sm flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-4 h-4" /> Premium Reader
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-10 mt-10">
              
              {/* Language Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Content Language</h2>
                    <p className="text-sm text-muted-foreground">Select your primary language for reading news.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {LANGUAGES.map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguage(l.code)}
                        className={`group relative flex flex-col items-start p-3 rounded-2xl border transition-all duration-200 ease-in-out ${
                          isSelected
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-transparent border-input hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className={`text-sm font-semibold mb-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {l.label}
                        </span>
                        <span className={`text-xs ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                          {l.native}
                        </span>
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-primary animate-in zoom-in">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <hr className="border-border" />

              {/* Topics Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Your Interests</h2>
                    <p className="text-sm text-muted-foreground">Tailor your feed by selecting topics you love.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {TOPICS.map((t) => {
                    const isSelected = interests.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleInterest(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                            : "bg-card border-input text-foreground hover:bg-muted/80 hover:border-primary/40"
                        }`}
                      >
                        <span className="text-lg">{t.emoji}</span>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Floating Action Bar for Unsaved Changes */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 animate-in slide-in-from-bottom-8 duration-300 z-50">
            <div className="bg-card/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-full p-2 pl-6 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">You have unsaved changes</span>
              <Button onClick={handleSave} disabled={saving} className="rounded-full px-6">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
                ) : (
                  'Save Updates'
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
