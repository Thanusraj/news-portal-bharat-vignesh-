import { useState } from "react";
import { Search, Loader2, Sparkles, ArrowRight } from "lucide-react";

interface ClaimInputProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  progressMessage?: string;
}

const ClaimInput = ({ onSubmit, isLoading, progressMessage }: ClaimInputProps) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
  };

  const examples = [
    "Latest technology updates",
    "Global election news",
    "Stock market today",
    "Recent AI developments",
  ];

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl transition-opacity duration-500 ${focused ? "opacity-100" : "opacity-0"}`} />
        
        <div className="relative rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg focus-within:shadow-xl transition-all duration-300 overflow-hidden">
          <div className={`h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ${focused ? "opacity-100" : "opacity-0"}`} />
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Enter a topic to get a professional news briefing..."
            rows={3}
            className="w-full px-6 py-5 bg-transparent text-gray-800 placeholder:text-gray-400 text-[15px] resize-none focus:outline-none leading-relaxed"
          />
          
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            {isLoading && progressMessage ? (
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-[bounce_1s_ease-in-out_infinite]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-[bounce_1s_ease-in-out_infinite_0.15s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-[bounce_1s_ease-in-out_infinite_0.3s]" />
                </div>
                <span className="text-xs font-medium text-indigo-600">{progressMessage}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200/80 text-[10px] font-mono font-semibold text-gray-500">Enter</kbd>
                <span>to fetch news</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 scale-100"
                  : "bg-gray-100 text-gray-400 scale-95"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Fetch News
              {input.trim() && !isLoading && <ArrowRight className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>
      </form>

      {!isLoading && (
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Try these:
          </span>
          {examples.map((ex, i) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="text-xs px-3.5 py-1.5 rounded-full bg-white border border-gray-200/80 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:-translate-y-0.5 shadow-sm hover:shadow transition-all duration-200"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimInput;
