import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
  selectUnreadCount,
} from "../state/notificationsSlice";
import NotificationRow from "./NotificationRow";
import { IconBell } from "@tabler/icons-react";

const BADGE_CAP = 9;
const POLL_MS = 20000;

export default function NotificationBell() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const items = useAppSelector(selectNotifications);
  const unread = useAppSelector(selectUnreadCount);
  const userId = user?.id;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const itemRefs = useRef([]);

  // One initial pull + a 20s refresh, as before — the badge stays
  // authoritative via the slice's mark-read-then-refetch behaviour.
  useEffect(() => {
    if (!userId) return undefined;
    const refresh = () => dispatch(fetchNotifications({ userId, limit: 50 })).catch(() => {});
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [userId, dispatch]);

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
      if (!n.read) dispatch(markNotificationRead({ id: n.id, userId: user.id })).catch(() => {});
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
        className="relative rounded-lg border border-warm/15 p-2 text-ink-3 transition-colors hover:border-warm/30 hover:text-warm focus:outline-none"
      >
        <IconBell size={15} aria-hidden />
        {unread > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-teal px-1 text-center text-[10px] font-medium leading-4 text-teal-ink"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          aria-live="polite"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-surface-2 bg-surface shadow-lg"
        >
          <p className="border-b border-surface-2 px-4 py-3 text-caption font-medium text-ink-3">
            Recent notifications
          </p>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-body text-ink-3">Nothing yet — you're all caught up.</p>
          ) : (
            <ul
              role="menu"
              aria-label="Recent notifications"
              className="max-h-[26rem] overflow-y-auto"
            >
              {items.map((n, i) => (
                <li key={n.id} role="none">
                  <NotificationRow
                    notification={n}
                    role="menuitem"
                    itemRef={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    tabIndex={i === 0 ? 0 : -1}
                    onKeyDown={(e) => onItemKey(e, i, n)}
                    onOpen={openItem}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between bg-surface-2/60 px-4 py-2.5">
            <button
              onClick={() => {
                if (user?.id)
                  dispatch(markAllNotificationsRead({ userId: user.id })).catch(() => {});
              }}
              className="text-caption font-medium text-ink-3 transition-colors hover:text-teal-deep focus:outline-none"
            >
              Mark all read
            </button>
            <button
              onClick={() => {
                navigate("/notifications");
                closeAndRefocus();
              }}
              className="text-caption font-medium text-teal-deep transition-colors hover:underline focus:outline-none"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
