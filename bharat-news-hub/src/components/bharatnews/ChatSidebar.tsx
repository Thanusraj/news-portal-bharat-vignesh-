import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
} from "lucide-react";
import type { ChatSession } from "../types/newsBot.types";
import BharatNewsLogo from "./BharatNewsLogo";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  isOpen: boolean;
  showToggle?: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onPinSession: (id: string) => void;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const groupSessionsByDate = (sessions: ChatSession[]) => {
  const groups: Record<string, ChatSession[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  sessions.forEach((session) => {
    if (session.pinned) {
      groups["Pinned"].push(session);
      return;
    }
    const d = new Date(session.updatedAt);
    if (d >= today) groups["Today"].push(session);
    else if (d >= yesterday) groups["Yesterday"].push(session);
    else if (d >= weekAgo) groups["This Week"].push(session);
    else groups["Earlier"].push(session);
  });

  return groups;
};

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onPin,
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onSelect}
        className={cn(
          "w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          isActive
            ? "bg-blue-50 border-blue-200"
            : "bg-transparent border-transparent hover:bg-gray-50"
        )}
      >
        <MessageSquare
          size={14}
          className={cn(
            "mt-0.5 shrink-0",
            isActive ? "text-blue-600" : "text-gray-400"
          )}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-medium truncate mb-0.5",
              isActive ? "text-gray-900" : "text-gray-700"
            )}
          >
            {session.title}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={10} className="text-gray-400" />
            <span>{formatRelativeTime(session.updatedAt)}</span>
            <span className="text-gray-300">·</span>
            <span>{session.messages.length} msgs</span>
          </div>
        </div>
      </button>

      {/* Action buttons on hover */}
      {showActions && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 rounded-md border border-gray-200 bg-white shadow-sm p-1"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
              session.pinned
                ? "bg-amber-50 text-amber-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
            title="Pin"
          >
            <Pin size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeId,
  isOpen,
  showToggle = true,
  onToggle,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onPinSession,
}) => {
  const [search, setSearch] = useState("");

  const filteredSessions = search.trim()
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  const grouped = groupSessionsByDate(filteredSessions);

  return (
    <>
      {/* Sidebar panel */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
          isOpen ? "w-[280px]" : "w-0"
        )}
      >
        <div
          className="w-[280px] h-full flex flex-col bg-white text-gray-900"
        >
          {/* Brand header */}
          <div
            className="px-4 pt-4 pb-3 border-b border-gray-200 flex items-center gap-3"
          >
            <BharatNewsLogo size={40} />
            <div>
              <div
                className="text-sm font-extrabold leading-tight"
              >
                BharatNews
              </div>
              <div
                className="mt-0.5 text-[10px] font-extrabold tracking-widest uppercase text-gray-500"
              >
                AI Correspondent
              </div>
            </div>
          </div>

          {/* New chat button */}
          <div className="px-4 pt-3 pb-2">
            <button
              onClick={onNewChat}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-semibold px-3 py-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} />
              New Briefing
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>
          </div>

          {/* Session list */}
          <div
            className="flex-1 overflow-y-auto px-3 pb-3"
          >
            {Object.entries(grouped).map(([groupName, groupSessions]) => {
              if (groupSessions.length === 0) return null;
              return (
                <div key={groupName} className="mb-2">
                  <div
                    className="px-1 pt-3 pb-1 text-[10px] font-extrabold tracking-widest uppercase text-gray-400 flex items-center gap-1.5"
                  >
                    {groupName === "Pinned" && "📌 "}
                    {groupName}
                  </div>
                  <div className="space-y-1">
                    {groupSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeId}
                        onSelect={() => onSelectSession(session.id)}
                        onDelete={() => onDeleteSession(session.id)}
                        onPin={() => onPinSession(session.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredSessions.length === 0 && (
              <div
                className="text-center py-10 text-sm text-gray-500"
              >
                {search ? "No chats match your search" : "No chat history yet"}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400 text-center"
          >
            Powered by Claude AI · v2.0
          </div>
        </div>
      </div>

      {/* Toggle tab on the edge */}
      {showToggle && (
        <button
          onClick={onToggle}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-50 h-12 w-5 border border-gray-200 bg-white text-gray-500 shadow-sm flex items-center justify-center transition-all",
            isOpen
              ? "left-[280px] rounded-r-md border-l-0"
              : "left-0 rounded-l-md"
          )}
        >
          {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      )}
    </>
  );
};

export default ChatSidebar;
