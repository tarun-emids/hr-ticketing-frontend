import { NavLink } from "react-router-dom";
import { IconChartBar, IconClipboardList, IconInbox, IconLogout, IconPlus, IconX } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const EMPLOYEE_NAV = [
  { to: "/my-tickets", label: "My tickets", Icon: IconClipboardList },
  { to: "/new-ticket", label: "New ticket", Icon: IconPlus },
];

const AGENT_NAV = [
  { to: "/inbox", label: "Inbox", Icon: IconInbox },
  { to: "/hr-dashboard", label: "HR dashboard", Icon: IconChartBar },
];

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 border-b py-3 text-[10px] transition-colors mono-label ${
              isActive
                ? "border-b-warm/20 text-teal-deep"
                : "border-b-warm/20 text-warm/50 hover:text-warm"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.Icon size={16} className={`shrink-0 ${isActive ? "text-teal-deep" : "text-warm/40"}`} />
              {item.label}
              {isActive && <span className="ml-auto h-[2px] w-6 bg-teal" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, onNavigate, onHide }) {
  const { user, isAgent, logout } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-42 flex-col border-r border-surface-2 bg-canvas transition-transform lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <button
        onClick={onHide}
        className="absolute right-3 top-3 border border-warm/25 p-1 text-warm/50 hover:text-warm lg:hidden"
        aria-label="Close menu"
      >
        <IconX size={16} aria-hidden />
      </button>

      <div className="flex flex-col gap-4 border-b border-surface-2 px-6 pb-5 pt-6">
        <Logo size="nav" />
        <p className="mono-label text-[10px] text-warm/40">HR Desk / Internal ticketing</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-3 mono-label text-[10px] text-warm/35">
          {isAgent ? "HR workspace" : "Employee workspace"}
        </p>
        <NavItems items={isAgent ? AGENT_NAV : EMPLOYEE_NAV} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-surface-2 p-4">
        <div className="flex items-center gap-3">
          <span className="soft-bl flex h-9 w-9 shrink-0 items-center justify-center bg-surface-2 font-mono text-[10px] text-teal-deep">
            {user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-warm">{user?.name}</p>
            <p className="mono-label text-[10px] text-warm/40">{isAgent ? "HR agent" : "Employee"}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="border border-warm/25 p-1.5 text-warm/50 hover:border-teal hover:text-teal-deep"
          >
            <IconLogout size={16} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
