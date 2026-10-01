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

## Emids brand system v1.0

The UI is themed directly from `Emids_Brand System_v1.0.pdf`. Tokens and rules live
in `src/index.css` (Tailwind v4 `@theme` + `@utility`):

| Rule | How it's applied |
| --- | --- |
| Color architecture — teal family on black | canvas `#0E0E0E`, surface `#141414`, surface-2 `#262626`, warm white `#F2F2F0`; teal light/deep `#ABC7CA`/`#47A2B0`/`#2A7682` |
| Signals confirm, never lead | links `#00B9F9` (data), success `#45BDA0`, errors `#E04F4F`; accents mauve `#B89DCB`, yellow `#F2C94C` |
| One typeface, 8 steps | Inter Variable (local via `@fontsource`) at 96/46/36/20/16/12/11/9; captions 11, micro labels 10 |
| Mono is essential | JetBrains Mono for eyebrows, table headers, badges, timestamps, metric numbers — caps, tracked 0.18em, ≤10–11px |
| The B-corner | 8px radius bottom-left only (`soft-bl` utility) on cards, plates and frames; buttons/inputs/table cells stay sharp |
| Elevation is colour, not shadow | box-shadow disabled globally; depth via surface steps + 1px `#262626` hairlines |
| 8pt baseline, 4pt snap | spacing in multiples of 4 only; 14px gutters |
| Icons | 24px grid, 1.5px stroke, rounded caps, outline only |
| Teal gradient | L→R three stops, only as login hero wash / top bar — never in buttons, charts or below small text |
| Real brand mark | logo + favicon extracted from the guidelines PDF into `src/assets/` |

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
  components/   Badge (signal chips), TicketTable, TicketForm, Thread,
                Sidebar, Layout, primitives (Button/Spinner/Skeleton/EmptyState/StatCard/Avatar)
  pages/        Login, EmployeeDashboard, NewTicket, TicketDetail, HRInbox, HRDashboard
  data/         users.js, tickets.js (mock), store.js (swap point for API)
  assets/       emids-logo.png, emids-mark.png (from the brand guidelines)
  context/      AuthContext (mock session, persisted in localStorage)
```

Tailwind v4 (via `@tailwindcss/vite`). Brand tokens configured in `src/index.css`.
