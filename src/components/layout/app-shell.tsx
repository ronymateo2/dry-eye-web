import { useEffect, useState } from "react";
import { BottomNav } from "./bottom-nav";
import { FloatingQuickActions } from "./floating-quick-actions";
import { AppHeader } from "./app-header";
import { useOfflineSync } from "@/lib/hooks/use-offline-sync";

function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Sin conexión</p>
    </div>
  );
}

function SyncTrigger() {
  useOfflineSync();
  return null;
}

export function AppShell({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  return (
    <div className="app-shell">
      {isAuthenticated && <NetworkBanner />}
      {isAuthenticated && <SyncTrigger />}
      <main className={isAuthenticated ? "app-frame app-frame--with-nav" : "app-frame"}>
        {isAuthenticated && <AppHeader />}
        {children}
      </main>
      {isAuthenticated && (
        <>
          <FloatingQuickActions />
          <BottomNav />
        </>
      )}
    </div>
  );
}
