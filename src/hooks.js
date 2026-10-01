import { useEffect, useState } from "react";
import * as api from "./api";

/**
 * Loads the tickets behind a screen from the backend and keeps it fresh.
 *
 * role === "employee" -> GET /api/my-tickets (backend already filters to the
 *                        signed-in user)
 * role === "agent"    -> GET /api/inbox     (agent-only screen data)
 *
 * Every mutation elsewhere in the app also returns the fresh ticket — lists
 * re-sync by polling (light, demo-friendly) so one screen sees changes made
 * in another, like the old in-memory pub/sub store did.
 */
export function useTickets(role = "employee", { pollMs = 6000 } = {}) {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const data = role === "agent" ? await api.inbox() : await api.myTickets();
      setTickets(data);
      setError(null);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    let alive = true;
    load();
    const timer = pollMs ? setInterval(load, pollMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pollMs]);

  return { tickets: tickets ?? [], loading: tickets === null, error, reload: load };
}

/**
 * Shared reference data (GET /api/meta): users, HR agents, categories,
 * priorities, statuses. Fetched once per page load and shared by every
 * screen — the live replacement for the constants in src/data/users.js
 * (which remain as instant fallbacks for first paint / backend-down).
 */
let metaPromise = null;
function metaCache() {
  metaPromise ??= api.fetchMeta();
  return metaPromise;
}

export function useMeta() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let alive = true;
    metaCache()
      .then((m) => {
        if (alive) setMeta(m);
      })
      .catch(() => {
        // backend down — screens keep using the fallback constants
        metaPromise = null; // allow a retry next mount
      });
    return () => {
      alive = false;
    };
  }, []);

  return meta;
}

/**
 * One ticket + its thread (GET /api/tickets/{id}) for TicketDetail, with a
 * quiet poll so replies/status changes from the other role appear live.
 * Mutations return the fresh ticket; screens take it via `setTicket`.
 */
export function useTicket(id, { pollMs = 6000 } = {}) {
  const [ticket, setTicket] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const data = await api.getTicket(id);
      setTicket(data);
      setNotFound(false);
      setDenied(false);
      setError(null);
    } catch (e) {
      if (e.status === 404) setNotFound(true);
      else if (e.status === 403) setDenied(true); // somebody else's ticket
      else setError(e);
    }
  };

  useEffect(() => {
    setTicket(null);
    setNotFound(false);
    setDenied(false);
    load();
    if (pollMs) {
      const timer = setInterval(load, pollMs);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pollMs]);

  return { ticket, notFound, denied, error, setTicket, reload: load };
}
