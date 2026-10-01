import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EMPLOYEE_NAV = [
  { to: "/my-tickets", label: "My tickets", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" },
  { to: "/new-ticket", label: "New ticket", icon: "M12 4.5v15m7.5-7.5h-15" },
];

const AGENT_NAV = [
  { to: "/inbox", label: "Inbox", icon: "M9 12.75h6m-6 3h3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { to: "/hr-dashboard", label: "HR dashboard", icon: "M3 13.2V20h6v-6.8M14.5 4v16h-6V9.5M21 20h-6V8h6Z" },
];

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-50 text-accent-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <svg className="h-5 w-5 stroke-2" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
          </svg>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, onNavigate, onHide }) {
  const { user, isAgent, logout } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
        mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
      }`}
    >
      <button
        onClick={onHide}
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
        aria-label="Close menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path className="stroke-2" strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-lg font-bold text-white">
          H
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">HR Desk</p>
          <p className="text-[11px] text-slate-400">Internal ticketing</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {isAgent ? "HR workspace" : "Employee workspace"}
        </p>
        <NavItems items={isAgent ? AGENT_NAV : EMPLOYEE_NAV} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
            {user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-[11px] text-slate-400">{isAgent ? "HR agent" : "Employee"}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 15l-3-3m0 0 3-3m-3 3h9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
