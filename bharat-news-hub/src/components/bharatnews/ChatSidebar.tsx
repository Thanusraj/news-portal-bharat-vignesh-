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

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  isOpen: boolean;
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
        style={{
          width: "100%",
          background: isActive
            ? "rgba(99,102,241,0.18)"
            : "transparent",
          border: `1px solid ${
            isActive ? "rgba(99,102,241,0.35)" : "transparent"
          }`,
          borderRadius: "10px",
          padding: "10px 12px",
          cursor: "pointer",
          textAlign: "left",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
        className="hover:bg-white/5"
      >
        <MessageSquare
          size={14}
          style={{
            color: isActive ? "#a5b4fc" : "#475569",
            flexShrink: 0,
            marginTop: "2px",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: isActive ? "#e2e8f0" : "#94a3b8",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "3px",
            }}
          >
            {session.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#475569",
              fontSize: "11px",
            }}
          >
            <Clock size={10} />
            {formatRelativeTime(session.updatedAt)}
            <span style={{ color: "#334155" }}>·</span>
            <span>{session.messages.length} msgs</span>
          </div>
        </div>
      </button>

      {/* Action buttons on hover */}
      {showActions && (
        <div
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: "2px",
            background: "rgba(8,14,40,0.95)",
            borderRadius: "8px",
            padding: "3px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            style={{
              background: session.pinned
                ? "rgba(245,158,11,0.2)"
                : "transparent",
              border: "none",
              borderRadius: "5px",
              padding: "4px",
              cursor: "pointer",
              color: session.pinned ? "#fbbf24" : "#64748b",
              display: "flex",
              alignItems: "center",
            }}
            title="Pin"
          >
            <Pin size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "5px",
              padding: "4px",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
            }}
            className="hover:text-red-400"
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
        style={{
          width: isOpen ? "280px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            width: "280px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(180deg, rgba(6,10,28,0.97) 0%, rgba(4,8,22,0.98) 100%)",
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "0",
            overflow: "hidden",
          }}
        >
          {/* Brand header */}
          <div
            style={{
              padding: "20px 18px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <BharatNewsLogo size={40} />
            <div>
              <div
                style={{
                  color: "#f1f5f9",
                  fontSize: "16px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                BharatNews
              </div>
              <div
                style={{
                  color: "#FF9933",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginTop: "2px",
                }}
              >
                AI Correspondent
              </div>
            </div>
          </div>

          {/* New chat button */}
          <div style={{ padding: "14px 14px 10px" }}>
            <button
              onClick={onNewChat}
              style={{
                width: "100%",
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.18))",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "10px",
                color: "#a5b4fc",
                fontSize: "13px",
                fontWeight: 700,
                padding: "10px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
                letterSpacing: "0.01em",
              }}
            >
              <Plus size={15} />
              New Briefing
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "0 14px 10px" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#475569",
                }}
              />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  padding: "7px 10px 7px 30px",
                  color: "#94a3b8",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Session list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 10px 10px",
            }}
          >
            {Object.entries(grouped).map(([groupName, groupSessions]) => {
              if (groupSessions.length === 0) return null;
              return (
                <div key={groupName} style={{ marginBottom: "4px" }}>
                  <div
                    style={{
                      color: "#334155",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "10px 4px 5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {groupName === "Pinned" && "📌 "}
                    {groupName}
                  </div>
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
              );
            })}

            {filteredSessions.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 10px",
                  color: "#334155",
                  fontSize: "12px",
                }}
              >
                {search ? "No chats match your search" : "No chat history yet"}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              color: "#334155",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            Powered by Claude AI · v2.0
          </div>
        </div>
      </div>

      {/* Toggle tab on the edge */}
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          left: isOpen ? "280px" : "0px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          background: "rgba(8,14,40,0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderLeft: isOpen ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: isOpen ? "0 8px 8px 0" : "8px 0 0 8px",
          width: "20px",
          height: "48px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </>
  );
};

export default ChatSidebar;
