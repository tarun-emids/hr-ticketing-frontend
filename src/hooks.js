import { useEffect, useState } from "react";
import { listTickets, subscribe } from "./data/store";

export function useTickets(delayMs = 450) {
  const [tickets, setTickets] = useState(null);
  const [loading, setLoading] = useState(!tickets);

  useEffect(() => {
    // Simulate first-fetch latency so loading states are visible in the demo.
    const initial = setTimeout(() => setTickets(listTickets()), delayMs);
    const unsubscribe = subscribe((next) => setTickets(next));
    return () => {
      clearTimeout(initial);
      unsubscribe();
    };
  }, [delayMs]);

  useEffect(() => {
    if (tickets) setLoading(false);
  }, [tickets]);

  return { tickets: tickets ?? [], loading, ready: tickets !== null };
}
