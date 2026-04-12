import React from "react";
import { Menu, Settings } from "lucide-react";
import BharatNewsLogo from "@/components/bharatnews/BharatNewsLogo";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  isGenerating: boolean;
  onOpenSidebar?: () => void;
  onOpenSettings: () => void;
  className?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  isGenerating,
  onOpenSidebar,
  onOpenSettings,
  className,
}) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-white",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        )}

        <BharatNewsLogo size={28} spinning={isGenerating} />

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">
            BharatNews <span className="text-blue-600">AI</span> Correspondent
          </h1>
          <div className="text-xs text-gray-500 -mt-0.5">AI Correspondent</div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isGenerating ? "bg-amber-400 animate-pulse" : "bg-green-500"
              )}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                isGenerating ? "text-amber-500" : "text-green-600"
              )}
            >
              {isGenerating ? "Generating..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5 text-gray-600" />
      </button>
    </header>
  );
};

export default ChatHeader;

