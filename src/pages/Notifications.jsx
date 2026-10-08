import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowDownRight, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  subscribe,
} from "../data/notifications";
import NotificationRow from "../components/NotificationRow";
import { EmptyState, Spinner } from "../components/primitives";

const PAGE = 50;

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState(() => listNotifications());
  const [unread, setUnread] = useState(() => getUnreadCount());
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const unsub = subscribe(() => {
      setRows(listNotifications());
      setUnread(getUnreadCount());
    });
    refreshNotifications(user?.id, PAGE)
      .catch(() => {})
      .finally(() => { if (alive.current) setLoading(false); });
    return () => {
      alive.current = false;
      unsub();
    };
  }, [user?.id]);

  const loadMore = () => {
    const next = limit + PAGE;
    setLimit(next);
    setLoadingMore(true);
    refreshNotifications(user?.id, next)
      .catch(() => {})
      .finally(() => { if (alive.current) setLoadingMore(false); });
  };

  const openItem = (n) => {
    if (n.ticketRef) {
      navigate(`/tickets/${n.ticketRef}`);
      if (!n.read) markNotificationRead(n.id, user.id).catch(() => {});
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal">
            <IconArrowDownRight size={16} aria-hidden />
            NOTIFICATIONS
          </span>
          <h1 className="text-h3 text-warm">
            All notifications
            {unread > 0 && <span className="mono-label ml-3 align-middle text-[10px] text-teal">{unread} unread</span>}
          </h1>
          <p className="mt-2 text-caption text-warm/50">
            Your own ticket updates. Notification text stays generic on purpose — open the ticket for detail.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => { if (user?.id) markAllNotificationsRead(user.id).catch(() => {}); }}
            className="mono-label border border-warm/20 px-3 py-1.5 text-[10px] text-warm/60 transition-colors hover:border-teal hover:text-teal"
          >
            Mark all read
          </button>
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          body="Nothing has happened on your tickets yet. You'll hear about replies, assignment and status changes here."
          icon={<IconCircleCheck size={32} />}
        />
      ) : (
        <ol className="soft-bl border border-surface-2 bg-surface-2/20">
          {rows.map((n) => (
            <li key={n.id}>
              <NotificationRow notification={n} onOpen={openItem} />
            </li>
          ))}
        </ol>
      )}

      {rows.length > 0 && rows.length >= limit && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="mono-label inline-flex items-center gap-2 border border-warm/20 px-4 py-2.5 text-[10px] text-warm/60 transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
          >
            {loadingMore ? "Loading…" : "Load older"}
            <IconArrowDownRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
