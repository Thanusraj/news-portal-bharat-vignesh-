import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  className?: string;
}

const HOT_TOPICS = [
  "India budget 2025",
  "AI & technology news",
  "Stock market today",
  "Global politics",
  "Climate updates",
  "Space exploration",
  "Cricket latest",
  "RBI policy news",
];

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      140
    )}px`;
  }, [value]);

  const canSend = useMemo(() => value.trim().length > 0 && !isLoading, [value, isLoading]);

  return (
    <div className={cn("sticky bottom-0 bg-white border-t border-gray-200", className)}>
      <div className="px-4 py-3">
        {!value && !isLoading && (
          <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Topics
            </div>
            {HOT_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  onChange(topic);
                  textareaRef.current?.focus();
                }}
                className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            "flex items-end gap-3 rounded-lg border bg-white px-3 py-2 transition-shadow",
            focused ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask about any news topic..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 max-h-[140px]"
          />

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
              canSend
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            title="Send (Enter)"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 text-center text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono text-[11px] text-gray-700">Enter</kbd>{" "}
          to send ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono text-[11px] text-gray-700">Shift+Enter</kbd>{" "}
          for new line
        </div>
      </div>
    </div>
  );
};

export default ChatInput;

