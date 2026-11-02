import { listTicketsPage } from "./api/client";
import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  getUnreadCount,
  refreshNotifications,
  subscribe as subscribeNotifications,
} from "./data/notifications";

export function useNotifications(userId, pollMs = 20000) {
  const [state, setState] = useState({
    items: listNotifications(),
    unread: getUnreadCount(),
    ready: false,
  });
  const alive = useRef(true);

  useEffect(() => {
    if (!userId) return undefined;
    alive.current = true;
    let interval;

    const unsub = subscribeNotifications(() => {
      setState({ items: listNotifications(), unread: getUnreadCount(), ready: true });
    });

    const snapshot = () =>
      setState({ items: listNotifications(), unread: getUnreadCount(), ready: true });
    refreshNotifications(userId)
      .catch(() => {})
      .finally(() => {
        if (alive.current) snapshot();
      });

    if (pollMs > 0) {
      interval = setInterval(() => refreshNotifications(userId).catch(() => {}), pollMs);
    }

    return () => {
      alive.current = false;
      clearInterval(interval);
      unsub();
    };
  }, [userId, pollMs]);

  return state; // { items, unread, ready }
}

export function useTicketsPage(viewerId, query = {}, pollMs = 0) {
  const [state, setState] = useState({
    items: [],
    page: 1,
    pageSize: 25,
    total: 0,
    hasNext: false,
    loading: true,
    error: null,
  });
  const queryRef = useRef(query);
  queryRef.current = query;
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!viewerId) {
      setState((cur) => ({ ...cur, loading: false }));
      return undefined;
    }
    let alive = true;
    let interval;
    const load = () =>
      listTicketsPage({ viewerId, ...queryRef.current })
        .then((res) => {
          if (alive) setState({ ...res, loading: false, error: null });
        })
        .catch((e) => {
          if (alive) {
            setState((cur) => ({ ...cur, loading: false, error: e.message ?? String(e) }));
          }
        });
    load();
    if (pollMs > 0) {
      interval = setInterval(load, pollMs);
    }
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [viewerId, queryKey, pollMs]);

  return state;
}
