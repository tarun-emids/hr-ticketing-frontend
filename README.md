# HR Desk — internal HR ticketing (frontend POC)

React + Vite + Tailwind CSS + React Router. **Frontend only** — all data is mock data
in `src/data/`; there is no backend yet.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Demo flow

The login screen has a **role switcher** (mock auth — no credentials):

1. **Employee** (e.g. Priya Sharma) — see *My tickets*, open one, reply in the thread,
   submit a *New ticket* (validation: subject ≥ 5 chars, description ≥ 20 chars,
   optional attachment ≤ 5 MB).
2. Sign out, sign in as **HR agent** (e.g. Alicia Gomez) — browse *Inbox* (search,
   filters, column sorting), open a ticket, try the **Suggested reply** button,
   change status / assignee / priority / category, then set status to *Closed*
   (the ticket records **who closed it**).
3. Check *HR dashboard* — counts by status, open tickets by category, average
   first-response time.

State lives in a small in-memory pub/sub store (`src/data/store.js`), so actions in
one view reflect everywhere. Reassigning an unanswered ticket automatically creates
the first agent reply; employee replies flip status to *Waiting on Employee*.

## Swapping mock data for an API

Everything the UI reads/writes goes through `src/data/store.js`
(`listTickets`, `getTicket`, `createTicket`, `addReply`, `updateStatus`,
`assignTicket`, `setPriority`, `setCategory`) and the static lookups in
`src/data/users.js`. Replace those function bodies with `fetch` calls to a REST/
GraphQL endpoint — signatures are 1:1 with sensible REST routes. `src/data/tickets.js`
is only the seed fixture.

## Structure

```
src/
  components/   Badge (status/priority), TicketTable, TicketForm, Thread,
                Sidebar, Layout, primitives (Spinner/Skeleton/EmptyState/StatCard)
  pages/        Login, EmployeeDashboard, NewTicket, TicketDetail, HRInbox, HRDashboard
  data/         users.js, tickets.js (mock), store.js (swap point for API)
  context/      AuthContext (mock session, persisted in localStorage)
```

Tailwind v4 (via `@tailwindcss/vite`). Accent color is `accent-*` (indigo-ish),
configured in `src/index.css`.
