import React from "react";
import { cn } from "@/lib/utils";

interface NewsBotLayoutProps {
  className?: string;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const NewsBotLayout: React.FC<NewsBotLayoutProps> = ({
  className,
  sidebar,
  children,
}) => {
  return (
    <main className={cn("w-full bg-white", className)}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-[calc(100vh-160px)] grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <aside className="hidden md:block h-full border-r border-gray-200 bg-white overflow-y-auto">
            {sidebar}
          </aside>
          <section className="h-full min-h-0 bg-white flex flex-col">{children}</section>
        </div>
      </div>
    </main>
  );
};

export default NewsBotLayout;

