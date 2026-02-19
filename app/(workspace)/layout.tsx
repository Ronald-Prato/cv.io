import type { ReactNode } from "react";

import { Sidebar } from "@/components/sidebar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <main className="flex h-screen w-full overflow-hidden border border-border bg-surface shadow-sm">
        <Sidebar />
        {children}
      </main>
    </div>
  );
}
