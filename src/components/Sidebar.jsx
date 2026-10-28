import { NavLink } from "react-router-dom";
import {
  IconChartBar,
  IconClipboardList,
  IconInbox,
  IconLogout,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

// Shared landing page: role-aware nav boxes + knowledge-base search.
const HOME_ITEM = {
  to: "/dashboard",
  label: "Home / search",
  icon: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
};

const EMPLOYEE_NAV = [
  HOME_ITEM,
  { to: "/my-tickets", label: "My tickets", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" },
  { to: "/new-ticket", label: "New ticket", icon: "M12 4.5v15m7.5-7.5h-15" },
];

const ADMIN_NAV = [
  HOME_ITEM,
  {
    to: "/admin",
    label: "Ticket analytics",
    icon: "M3 13.2V20h6v-6.8M14.5 4v16h-6V9.5M21 20h-6V8h6Z",
  },
  { to: "/admin/worktable", label: "Agents × tickets", icon: "M8 3v18M16 3v18M3 8h18M3 16h18" },
  {
    to: "/admin/accounts",
    label: "Accounts",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    to: "/admin/kb",
    label: "Policy library",
    icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  },
];

const AGENT_NAV = [
  HOME_ITEM,
  { to: "/inbox", label: "Inbox", icon: "M9 12.75h6m-9 3h3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  {
    to: "/hr-dashboard",
    label: "HR dashboard",
    icon: "M3 13.2V20h6v-6.8M14.5 4v16h-6V9.5M21 20h-6V8h6Z",
  },
];

function NavItems({ items, onNavigate, collapsed }) {
  return (
    <nav className="flex flex-col">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          aria-label={item.label}
          className={({ isActive }) =>
            `flex items-center gap-3 border-b border-warm/10 py-3 text-[10px] transition-colors mono-label ${
              collapsed ? "lg:justify-center" : ""
            } ${isActive ? "text-teal" : "text-warm/50 hover:text-warm"}`
          }
        >
          {({ isActive }) => (
            <>
              <svg
                className={`h-4 w-4 shrink-0 ${isActive ? "text-teal" : "text-warm/40"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d={item.icon} />
              </svg>
              <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              {isActive && (
                <span className={`ml-auto h-[2px] w-6 bg-teal ${collapsed ? "lg:hidden" : ""}`} />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, collapsed, onToggleCollapse, onNavigate, onHide }) {
  const { user, isAgent, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-2 bg-canvas transition-[width,transform] lg:translate-x-0 ${
        collapsed ? "lg:w-16" : "lg:w-64"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <button
        onClick={onHide}
        className="absolute right-3 top-3 border border-warm/35 p-1 text-warm/50 hover:text-warm lg:hidden"
        aria-label="Close menu"
      >
        <IconX size={16} aria-hidden />
      </button>

      <div
        className={`flex flex-col gap-2 border-b border-surface-2 px-6 pb-5 pt-6 ${collapsed ? "lg:items-center lg:px-2" : ""}`}
      >
        <span className={collapsed ? "lg:hidden" : ""}>
          <Logo size="nav" />
        </span>
        {collapsed && (
          <span className="hidden lg:block">
            <Logo size="nav" markOnly />
          </span>
        )}
        <p className={`mono-label text-[10px] text-warm/40 ${collapsed ? "lg:hidden" : ""}`}>
          HR Desk / Internal ticketing
        </p>
        <button
          onClick={onToggleCollapse}
          className={`hidden border border-warm/15 p-1.5 text-warm/50 hover:border-teal hover:text-teal lg:block ${collapsed ? "self-center" : "self-start"}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="workspace-navigation"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.75" y="4.5" width="16.5" height="15" rx="1.5" />
            <path d="M9 4.5v15" />
            <path d={collapsed ? "m13.5 9 3 3-3 3" : "m15 9-3 3 3 3"} />
          </svg>
        </button>
      </div>

      <div
        id="workspace-navigation"
        className={`flex-1 overflow-y-auto p-6 ${collapsed ? "lg:px-2" : ""}`}
      >
        <p className={`mb-3 mono-label text-[10px] text-warm/35 ${collapsed ? "lg:hidden" : ""}`}>
          {isAdmin ? "Admin workspace" : isAgent ? "HR workspace" : "Employee workspace"}
        </p>
        <NavItems
          items={isAdmin ? ADMIN_NAV : isAgent ? AGENT_NAV : EMPLOYEE_NAV}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>

      <div className={`border-t border-surface-2 p-4 ${collapsed ? "lg:px-2" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "lg:flex-col lg:gap-2" : ""}`}>
          <span className="soft-bl flex h-9 w-9 shrink-0 items-center justify-center bg-surface-2 font-mono text-[10px] text-teal-light">
            {user?.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-body font-medium text-warm">{user?.name}</p>
            <p className="mono-label text-[10px] text-warm/40">
              {isAgent ? "HR agent" : "Employee"}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className={`border border-warm/15 p-1.5 text-warm/50 hover:border-teal hover:text-teal ${collapsed ? "lg:self-center" : ""}`}
          >
            <IconLogout size={16} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
