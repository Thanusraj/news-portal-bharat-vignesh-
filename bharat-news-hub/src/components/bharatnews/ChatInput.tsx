import React, { useRef, useEffect, useState } from "react";
import { Send, Mic, Sparkles } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
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
  placeholder = "Ask about any news topic...",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  /* Auto-resize textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        130
      )}px`;
    }
  }, [value]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div
      style={{
        padding: "14px 20px 18px",
      }}
    >
      {/* Hot topic chips — only show when empty */}
      {!value && !isLoading && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "nowrap",
            overflowX: "auto",
            marginBottom: "12px",
            paddingBottom: "2px",
            scrollbarWidth: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#334155",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            <Sparkles size={11} style={{ color: "#fbbf24" }} />
            Topics:
          </div>
          {HOT_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                onChange(topic);
                textareaRef.current?.focus();
              }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "20px",
                padding: "5px 12px",
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.18s",
                flexShrink: 0,
              }}
              className="topic-chip"
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
          background: "rgba(12,18,50,0.7)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${
            focused ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)"
          }`,
          borderRadius: "16px",
          padding: "6px 8px 6px 16px",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: focused
            ? "0 0 0 3px rgba(99,102,241,0.1), 0 4px 24px rgba(0,0,0,0.3)"
            : "0 2px 16px rgba(0,0,0,0.25)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e2e8f0",
            fontSize: "14px",
            lineHeight: "1.65",
            resize: "none",
            padding: "8px 0",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            overflowY: "hidden",
            maxHeight: "130px",
            opacity: isLoading ? 0.5 : 1,
          }}
        />

        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={!canSend}
          style={{
            background: canSend
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(255,255,255,0.04)",
            border: "none",
            borderRadius: "12px",
            width: "42px",
            height: "42px",
            flexShrink: 0,
            cursor: canSend ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            opacity: canSend ? 1 : 0.35,
            boxShadow: canSend ? "0 2px 12px rgba(99,102,241,0.35)" : "none",
            transform: canSend ? "scale(1)" : "scale(0.95)",
          }}
          title="Send (Enter)"
        >
          <Send
            size={16}
            style={{
              color: canSend ? "white" : "#475569",
              transform: "translateX(1px)",
            }}
          />
        </button>
      </div>

      {/* Hint text */}
      <div
        style={{
          textAlign: "center",
          color: "#64748b",
          fontSize: "11px",
          marginTop: "8px",
        }}
      >
        Press{" "}
        <kbd
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#475569",
          }}
        >
          Enter
        </kbd>{" "}
        to send ·{" "}
        <kbd
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#475569",
          }}
        >
          Shift+Enter
        </kbd>{" "}
        for new line
      </div>

      <style>{`
        .topic-chip:hover {
          background: rgba(99,102,241,0.14) !important;
          border-color: rgba(99,102,241,0.28) !important;
          color: #a5b4fc !important;
          transform: translateY(-1px);
        }
        textarea::placeholder { color: #334155; }
      `}</style>
    </div>
  );
};

export default ChatInput;
