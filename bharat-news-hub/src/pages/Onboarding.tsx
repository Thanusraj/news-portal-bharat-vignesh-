import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Heart, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
];

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

const stepIndicators = [
  { id: 1, label: "Region" },
  { id: 2, label: "Language" },
  { id: 3, label: "Interests" }
];

const Onboarding = () => {
  const { updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState("");
  const [language, setLanguage] = useState("en");
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error("Could not sign out. Please try again.");
    }
  };

  const toggleInterest = (id: string) => {
    setError("");
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setError("");
    setSubmitting(true);
    const payload = {
      state,
      language,
      interests,
      onboardingComplete: true,
    };
    
    try {
      await updateProfile(payload, { allowOffline: true });
      navigate("/", { replace: true, state: { fromOnboarding: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Could not sync your preferences. We'll retry when you're back online.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      icon: <MapPin className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      title: "Where are you from?",
      subtitle: "We'll personalize local news for your state",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {INDIAN_STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              className={`px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                state === s
                  ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-100 border-indigo-500 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-white/50 dark:bg-white/[0.03] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ),
      valid: !!state,
    },
    {
      icon: <Globe className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      title: "Preferred Language",
      subtitle: "Choose your primary reading language",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {LANGUAGES.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`relative flex items-center justify-between p-4 rounded-xl transition-all duration-200 border ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    : "bg-white/50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex flex-col items-start text-left">
                  <span className={`text-base font-semibold ${isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-gray-900 dark:text-zinc-200"}`}>
                    {l.label}
                  </span>
                  <span className={`text-sm ${isSelected ? "text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-zinc-500"}`}>
                    {l.native}
                  </span>
                </div>
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-indigo-600 dark:text-indigo-400">
                    <Check className="w-5 h-5" />
                  </motion.div>
                )}
              </button>
            )
          })}
        </div>
      ),
      valid: !!language,
    },
    {
      icon: <Heart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      title: "What interests you?",
      subtitle: "Pick at least 3 topics to personalize your feed",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {TOPICS.map((t) => {
            const isSelected = interests.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleInterest(t.id)}
                className={`p-4 rounded-xl transition-all duration-200 border flex flex-col items-center gap-2 ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md dark:shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105"
                    : "bg-white/50 dark:bg-white/[0.03] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-semibold text-sm">{t.label}</span>
              </button>
            )
          })}
        </div>
      ),
      valid: interests.length >= 3,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gray-50 dark:bg-[#0a0a0e] transition-colors duration-500">
      
      {/* 🔮 Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
           animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1], x: [0, -40, 0], y: [0, 50, 0] }}
           transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[0%] right-[0%] w-[45rem] h-[45rem] bg-indigo-400/50 dark:bg-indigo-600/30 rounded-full blur-[100px] dark:blur-[140px]"
        />
        <motion.div
           animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.15, 0.05], x: [0, 40, 0], y: [0, -30, 0] }}
           transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[0%] left-[0%] w-[40rem] h-[40rem] bg-purple-400/40 dark:bg-purple-600/20 rounded-full blur-[90px] dark:blur-[120px]"
        />
      </div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 dark:opacity-[0.03] pointer-events-none z-0 mix-blend-overlay dark:mix-blend-normal" />

      {/* Changed max-w-2xl to max-w-lg so the container is 'medium' size */}
      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        
        {/* Animated Step Circles Above Card */}
        <div className="flex items-center justify-center mb-8 w-full px-4 sm:px-8">
          {stepIndicators.map((indicator, i) => (
            <div key={indicator.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center justify-center relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: step === i ? 1.15 : 1, 
                    opacity: 1,
                    backgroundColor: step > i ? "#4f46e5" : step === i ? "rgba(79,70,229,0.15)" : "transparent",
                    borderColor: step >= i ? "#6366f1" : "rgba(107,114,128,0.2)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 font-bold bg-white/20 dark:bg-white/5 backdrop-blur-sm"
                >
                  {step > i ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-5 h-5 text-white" /></motion.div>
                  ) : (
                    <span className={step >= i ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-zinc-500"}>{indicator.id}</span>
                  )}
                </motion.div>
                <div className="absolute -bottom-6 flex w-32 justify-center">
                  <span className={`text-[10px] sm:text-xs font-bold tracking-wider uppercase ${step >= i ? "text-indigo-600 dark:text-indigo-300" : "text-gray-400 dark:text-zinc-600"}`}>
                    {indicator.label}
                  </span>
                </div>
              </div>

              {i < stepIndicators.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-gray-200 dark:bg-white/5 relative mt-[-24px]">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: step > i ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute inset-y-0 left-0 bg-indigo-500 shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 💎 Glassmorphism Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white/70 dark:bg-white/[0.03] backdrop-blur-[40px] border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
        >
          {/* Card Content with Smooth Presence Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <motion.div 
                   initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}
                   className="p-3 bg-indigo-50 dark:bg-white/5 rounded-2xl border border-indigo-100 dark:border-white/10 mb-4 shadow-sm dark:shadow-inner"
                >
                  {current.icon}
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{current.title}</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                  {current.subtitle}
                </p>
              </div>

              {current.content}
            </motion.div>
          </AnimatePresence>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 dark:text-red-400 mt-4 text-center">
              {error}
            </motion.p>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
            <Button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="bg-gray-100 dark:bg-transparent border-none dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            
            {step < steps.length - 1 ? (
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.39)] dark:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
                onClick={() => setStep((s) => s + 1)}
                disabled={!current.valid}
              >
                Next Step <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={!current.valid || submitting}
                className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl font-bold shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...</>
                ) : (
                  <>Complete Setup <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors font-medium underline"
            >
              Wrong account? Sign out
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Onboarding;
