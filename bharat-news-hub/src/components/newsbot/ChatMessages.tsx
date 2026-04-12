import React, { useEffect, useRef } from "react";
import WelcomeScreen from "@/components/bharatnews/WelcomeScreen";
import NewsMessageCard from "@/components/bharatnews/NewsMessageCard";
import GeneratingIndicator from "@/components/bharatnews/GeneratingIndicator";
import type { ChatMessage } from "@/types/newsBot.types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onTopicClick: (text: string) => void;
  onFollowUp: (question: string) => void;
  className?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isGenerating,
  onTopicClick,
  onFollowUp,
  className,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  return (
    <div
      className={cn(
        "flex-1 min-h-0 overflow-y-auto scroll-smooth px-6 py-6 space-y-4 bg-white",
        className
      )}
    >
      {messages.length === 0 ? (
        <WelcomeScreen onTopicClick={onTopicClick} />
      ) : (
        <>
          {messages.map((msg) => (
            <NewsMessageCard key={msg.id} message={msg} onFollowUp={onFollowUp} />
          ))}
          {isGenerating && <GeneratingIndicator />}
          <div ref={endRef} />
        </>
      )}
    </div>
  );
};

export default ChatMessages;

