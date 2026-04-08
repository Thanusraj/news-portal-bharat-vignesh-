import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, Sparkles } from "lucide-react";
import { ChatMessage } from "@/types/analysis";

interface FollowUpChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading: boolean;
}

const FollowUpChat = ({ messages, onSend, isLoading }: FollowUpChatProps) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const quickActions = [
    "What are the main causes?",
    "Give more context",
    "Explain simply",
    "What's the future outlook?",
  ];

  return (
    <div
      className="rounded-3xl bg-white border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ animation: "slideUp 0.5s ease-out 0.25s both" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Follow-up Chat</h3>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-gray-400">AI Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="max-h-72 overflow-y-auto px-6 py-5 space-y-4 bg-[#fafbfc]">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-sm text-gray-500">Ask follow-up questions about this topic</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => onSend(action)}
                  className="text-xs px-4 py-2 rounded-full bg-white border border-gray-200/80 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:-translate-y-0.5 shadow-sm hover:shadow transition-all duration-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: `slideUp 0.3s ease-out ${0.05 * i}s both` }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-lg shadow-md shadow-indigo-500/15"
                  : "bg-white border border-gray-200/80 text-gray-700 rounded-bl-lg shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200/80 rounded-2xl rounded-bl-lg px-5 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-[bounce_1s_ease-in-out_infinite]" />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-[bounce_1s_ease-in-out_infinite_0.15s]" />
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-[bounce_1s_ease-in-out_infinite_0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
        <div className="relative flex-1 group">
          <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-md transition-opacity duration-300 ${focused ? "opacity-100" : "opacity-0"}`} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask a follow-up question..."
            className="relative w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-200/80 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
            input.trim() && !isLoading
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:-translate-y-0.5"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
export default FollowUpChat;
