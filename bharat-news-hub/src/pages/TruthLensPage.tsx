import { useState, useCallback } from "react";
import Header from "@/components/Header";
import ClaimInput from "@/components/truthlens/ClaimInput";
import ResultCard from "@/components/truthlens/ResultCard";
import EvidenceSection from "@/components/truthlens/EvidenceSection";
import FollowUpChat from "@/components/truthlens/FollowUpChat";
import ApiKeyModal from "@/components/truthlens/ApiKeyModal";
import { AnalysisResult, ChatMessage } from "@/types/analysis";
import { getApiKeys, hasRequiredKeys } from "@/services/apiKeys";
import { analyzeClaim } from "@/services/analyzeClaim";
import { followUpChat } from "@/services/groq";
import { Shield, Key, Sparkles, Zap, Eye, Brain } from "lucide-react";

const TruthLensPage = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (input: string) => {
    if (!hasRequiredKeys()) {
      setSettingsOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setChatMessages([]);

    try {
      const keys = getApiKeys();
      const analysis = await analyzeClaim(input, keys, setProgress);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Check your API keys and try again.");
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  }, []);

  const handleFollowUp = useCallback(
    async (message: string) => {
      if (!result) return;
      const keys = getApiKeys();

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        const context = `Verdict: ${result.verdict} (${result.confidence}%)\nReasons: ${result.reasons.join("; ")}`;
        const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
        const reply = await followUpChat(result.rawClaim, context, message, history, keys.groq);

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [result, chatMessages]
  );

  return (
    <div className="min-h-screen bg-[#fafbfc] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-24 w-72 h-72 bg-gradient-to-br from-blue-200/25 to-cyan-200/25 rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-200/20 to-rose-200/20 rounded-full blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <Header />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* ═══════════ HERO SECTION ═══════════ */}
        {!result && !isAnalyzing && (
          <div className="text-center pt-8 pb-4 space-y-6">
            {/* Animated Shield Icon */}
            <div className="relative w-24 h-24 mx-auto">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-300/50 animate-[spin_20s_linear_infinite]" />
              {/* Middle pulse ring */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 animate-[pulse_3s_ease-in-out_infinite]" />
              {/* Inner icon */}
              <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              {/* Floating sparkles */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-amber-400/30">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Title with gradient */}
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                <span className="text-gray-800">Truth</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Lens</span>
                <span className="text-gray-400 text-2xl md:text-3xl ml-2 font-bold">AI</span>
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
                Multi-source fact-checking powered by advanced AI. Paste any claim, headline, or URL and receive an instant verdict backed by real evidence.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {[
                { icon: Zap, label: "Instant Analysis", color: "from-amber-500 to-orange-500" },
                { icon: Eye, label: "Multi-Source Verification", color: "from-emerald-500 to-teal-500" },
                { icon: Brain, label: "AI-Powered Reasoning", color: "from-indigo-500 to-purple-500" },
              ].map((feat) => (
                <div
                  key={feat.label}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                >
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${feat.color} flex items-center justify-center`}>
                    <feat.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">{feat.label}</span>
                </div>
              ))}
            </div>

            {/* API Key Setup Button */}
            {!hasRequiredKeys() && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <Key className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Set up API keys to get started
              </button>
            )}
          </div>
        )}

        {/* ═══════════ CLAIM INPUT (always visible) ═══════════ */}
        <ClaimInput onSubmit={handleAnalyze} isLoading={isAnalyzing} progressMessage={progress} />

        {/* ═══════════ ANALYZING OVERLAY ═══════════ */}
        {isAnalyzing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: "slideUp 0.4s ease-out" }}>
            {/* Frosted glass backdrop — keeps background visible */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />

            {/* Centered spinner content */}
            <div className="relative flex flex-col items-center space-y-6">
              {/* Animated scanning effect */}
              <div className="relative w-32 h-32">
                {/* Outer glow pulse */}
                <div className="absolute -inset-4 rounded-full bg-indigo-400/10 animate-[pulse_2s_ease-in-out_infinite]" />
                {/* Outer spinning ring */}
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-[spin_3s_linear_infinite]" 
                     style={{ borderTopColor: '#6366f1', borderRightColor: '#8b5cf6' }} />
                {/* Middle pulsing ring */}
                <div className="absolute inset-3 rounded-full border-2 border-purple-200 animate-[spin_2s_linear_infinite_reverse]"
                     style={{ borderBottomColor: '#a855f7' }} />
                {/* Inner icon */}
                <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/40 animate-pulse">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              
              {/* Progress text */}
              <div className="text-center space-y-3">
                <p className="text-xl font-bold text-gray-800 tracking-tight">Analyzing Claim</p>
                {progress && (
                  <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 border border-indigo-100 shadow-sm backdrop-blur-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-[bounce_1s_ease-in-out_infinite]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-[bounce_1s_ease-in-out_infinite_0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-[bounce_1s_ease-in-out_infinite_0.3s]" />
                    </div>
                    <span className="text-sm text-indigo-600 font-semibold">{progress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ ERROR STATE ═══════════ */}
        {error && (
          <div className="rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-lg">!</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">Analysis Failed</p>
                <p className="text-sm text-red-600/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ RESULTS ═══════════ */}
        {result && (
          <div className="space-y-6">
            <ResultCard result={result} />
            <EvidenceSection evidence={result.evidence} />
            <FollowUpChat messages={chatMessages} onSend={handleFollowUp} isLoading={isChatLoading} verdict={result.verdict} />
          </div>
        )}
      </main>

      <ApiKeyModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default TruthLensPage;
