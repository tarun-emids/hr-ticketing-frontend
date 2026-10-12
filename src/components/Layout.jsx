import { useState } from "react";
import { Outlet } from "react-router-dom";
import { IconMenu2 } from "@tabler/icons-react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const close = () => setMobileOpen(false);
  return (
    <div className="min-h-screen bg-canvas text-warm">
      <Sidebar
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onNavigate={close}
        onHide={close}
      />
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-canvas/70 lg:hidden" onClick={close} />
      )}
      <main className={sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setMobileOpen(true)}
              className="mono-label inline-flex items-center gap-2 border border-warm/30 bg-transparent px-3 py-3 text-[10px] text-warm lg:hidden"
              aria-label="Open menu"
            >
              <IconMenu2 size={16} aria-hidden />
              Menu
            </button>
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
