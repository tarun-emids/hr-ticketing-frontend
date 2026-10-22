import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks";
import { markAllNotificationsRead, markNotificationRead } from "../data/notifications";
import NotificationRow from "./NotificationRow";
import { IconArrowDownRight, IconBell } from "@tabler/icons-react";

const BADGE_CAP = 9;

export default function NotificationBell() {
  const { user } = useAuth();
  const { items, unread } = useNotifications(user?.id, 20000);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open && itemRefs.current[0]) itemRefs.current[0].focus();
  }, [open]);

  if (!user) return null;

  const badge = unread > BADGE_CAP ? "9+" : unread;
  const ariaLabel = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  const closeAndRefocus = () => {
    setOpen(false);
    if (bellRef.current) bellRef.current.focus();
  };

  const openItem = (n) => {
    if (n.ticketRef) {
      navigate(`/tickets/${n.ticketRef}`);
      closeAndRefocus();
      if (!n.read) markNotificationRead(n.id, user.id).catch(() => {});
    }
  };

  const onItemKey = (e, i, n) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAndRefocus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[i + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (itemRefs.current[i - 1] ?? bellRef.current)?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      openItem(n);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={bellRef}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            closeAndRefocus();
          } else if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            itemRefs.current[0]?.focus();
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        className="relative border border-warm/25 p-1.5 text-warm/50 transition-colors hover:border-teal hover:text-teal-deep focus:border-teal focus:outline-none"
      >
        <IconBell size={16} aria-hidden />
        {unread > 0 && (
          <span
            data-testid="unread-badge"
            className="mono-label absolute -right-1.5 -top-1.5 min-w-[14px] bg-teal px-[3px] text-center text-[9px] leading-[14px] text-warm"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="soft-bl absolute right-0 top-full z-50 mt-2 w-80 border border-surface-2 bg-surface"
        >
          <p className="mono-label border-b border-surface-2 px-4 py-3 text-[10px] text-warm/40">
            REPLIES / RECENT
          </p>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-body text-warm/40">Nothing yet — quiet is fine.</p>
          ) : (
            <ul role="menu" aria-label="Recent notifications" className="max-h-[26rem] overflow-y-auto">
              {items.map((n, i) => (
                <li key={n.id} role="none">
                  <NotificationRow
                    notification={n}
                    role="menuitem"
                    itemRef={(el) => { itemRefs.current[i] = el; }}
                    tabIndex={i === 0 ? 0 : -1}
                    onKeyDown={(e) => onItemKey(e, i, n)}
                    onOpen={openItem}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-surface-2 px-4 py-3">
            <button
              onClick={() => { if (user?.id) markAllNotificationsRead(user.id).catch(() => {}); }}
              className="mono-label text-[10px] text-warm/45 transition-colors hover:text-teal-deep focus:outline-none focus-visible:text-teal-deep"
            >
              Mark all read
            </button>
            <button
              onClick={() => { navigate("/notifications"); closeAndRefocus(); }}
              className="mono-label inline-flex items-center gap-1.5 text-[10px] text-teal-deep transition-colors hover:text-teal-deep focus:outline-none focus-visible:text-teal-deep"
            >
              View all
              <IconArrowDownRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
