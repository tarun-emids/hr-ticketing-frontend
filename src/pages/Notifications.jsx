import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowDownRight, IconCircleCheck } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
  selectUnreadCount,
} from "../state/notificationsSlice";
import NotificationRow from "../components/NotificationRow";
import { EmptyState, Spinner } from "../components/primitives";

const PAGE = 50;

export default function Notifications() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const rows = useAppSelector(selectNotifications);
  const unread = useAppSelector(selectUnreadCount);
  const navigate = useNavigate();
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let alive = true;
    dispatch(fetchNotifications({ userId: user?.id, limit: PAGE }))
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, dispatch]);

  const loadMore = () => {
    const next = limit + PAGE;
    setLimit(next);
    setLoadingMore(true);
    dispatch(fetchNotifications({ userId: user?.id, limit: next }))
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const openItem = (n) => {
    if (n.ticketRef) {
      navigate(`/tickets/${n.ticketRef}`);
      if (!n.read) dispatch(markNotificationRead({ id: n.id, userId: user.id })).catch(() => {});
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h3 text-warm">
            All notifications
            {unread > 0 && (
              <span className="ml-3 align-middle text-caption font-medium text-teal-deep">
                {unread} unread
              </span>
            )}
          </h1>
          <p className="mt-2 text-caption text-ink-3">
            Your own ticket updates. Notification text stays generic on purpose — open the ticket
            for detail.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => {
              if (user?.id) dispatch(markAllNotificationsRead({ userId: user.id })).catch(() => {});
            }}
            className="rounded-lg border border-warm/25 px-3 py-1.5 text-caption font-medium text-ink-3 transition-colors hover:border-teal hover:text-teal-deep"
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
        <ol className="soft-bl border border-surface-2 bg-surface">
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
            className="inline-flex items-center gap-2 rounded-lg border border-warm/25 px-4 py-2.5 text-body font-medium text-ink-2 transition-colors hover:border-teal hover:text-teal-deep disabled:opacity-40"
          >
            {loadingMore ? "Loading…" : "Load older"}
            <IconArrowDownRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
