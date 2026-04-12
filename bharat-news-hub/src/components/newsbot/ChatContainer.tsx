import React from "react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  className?: string;
  children: React.ReactNode;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ className, children }) => {
  return (
    <section
      className={cn(
        "h-full min-h-0 w-full bg-white flex flex-col",
        className
      )}
    >
      {children}
    </section>
  );
};

export default ChatContainer;

