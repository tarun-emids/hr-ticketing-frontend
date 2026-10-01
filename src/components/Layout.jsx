import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar mobileOpen={mobileOpen} onNavigate={close} onHide={close} />
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/25 lg:hidden" onClick={close} />
      )}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Menu
          </button>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
