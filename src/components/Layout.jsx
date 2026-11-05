import { useState } from "react";
import { Outlet } from "react-router-dom";
import { IconMenu2 } from "@tabler/icons-react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import AssistantBubble from "../rag/AssistantBubble";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const close = () => setMobileOpen(false);
  return (
    <div className="min-h-screen bg-canvas text-warm">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal focus:px-4 focus:py-2 focus:text-body focus:font-medium focus:text-canvas"
      >
        Skip to main content
      </a>
      <Sidebar
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onNavigate={close}
        onHide={close}
      />
      {mobileOpen && <div className="fixed inset-0 z-30 bg-canvas/70 lg:hidden" onClick={close} />}
      <main
        id="main"
        tabIndex={-1}
        className={`focus:outline-none ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-warm/15 px-3 py-2 text-caption font-medium text-ink-2 transition-colors hover:bg-surface-2 lg:hidden"
              aria-label="Open menu"
            >
              <IconMenu2 size={16} aria-hidden />
              Menu
            </button>
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
          <Outlet />
        </div>
      </main>
      {/* HR assistant (RAG): reachable from every signed-in screen */}
      <AssistantBubble />
    </div>
  );
}
