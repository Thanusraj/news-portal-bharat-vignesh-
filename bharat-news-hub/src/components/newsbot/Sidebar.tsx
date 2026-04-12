import React from "react";
import ChatSidebar from "@/components/bharatnews/ChatSidebar";
import type { ChatSession } from "@/types/newsBot.types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onPinSession: (id: string) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onPinSession,
  className,
}) => {
  return (
    <aside
      className={cn(
        "w-[280px] shrink-0 h-full bg-white",
        className
      )}
    >
      {/* `ChatSidebar` already contains brand + new chat + search + sessions list. */}
      <div className="h-full overflow-y-auto">
        <ChatSidebar
          sessions={sessions}
          activeId={activeId}
          isOpen={true}
          showToggle={false}
          onToggle={() => {}}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          onPinSession={onPinSession}
        />
      </div>
    </aside>
  );
};

export default Sidebar;

