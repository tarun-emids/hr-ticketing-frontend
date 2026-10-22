# HR Desk — internal HR ticketing

React + Vite + Tailwind CSS + React Router frontend over a FastAPI +
Supabase (Postgres/Storage) backend in `backend/` — see
[backend/README.md](backend/README.md) for setup, endpoint map and the
notifications domain.

## Run it

Frontend:

```bash
npm install
npm run dev
```

Backend (needs `backend/.env`, see `backend/.env.example`):

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:5173 (API docs at http://localhost:8000/docs).

## Login (Supabase Auth)

Sign-in at `/login` is real: email + password verified server-side by the
backend against **Supabase Auth** (GoTrue). The response is joined with the
matching `public.users` row, which supplies the app-level identity and role
(`employee` | `agent`). Users see only their role's workspace; HR-only routes
(`/inbox`, `/hr-dashboard`) are role-gated.

Accounts are provisioned — no signup, no self-registration:

1. After adding people to `public.users` (see `backend/schema.sql`), create
   their Supabase Auth credentials once:

   ```bash
   cd backend
   python scripts/provision_auth_users.py
   ```

   It asks for an initial password (or take `--password` / the
   `HR_DESK_TEMP_PASSWORD` env var), creates a confirmed auth user per row,
   and skips accounts that already exist. It never prints the password.
2. Passwords can be changed later from the Supabase Dashboard
   (Authentication → Users) or by deleting the auth user and re-running the
   script — HR Desk stores no passwords itself.
3. If a user's auth email is ever removed from `public.users`, the next app
   start silently drops their session.

## Demo flow

1. **Employee** (e.g. Priya Sharma) — see *My tickets*, open one, reply in the thread,
   submit a *New ticket* (validation: subject ≥ 5 chars, description ≥ 20 chars,
   optional attachment ≤ 5 MB).
2. Sign out, sign in as **HR agent** (e.g. Alicia Gomez) — browse *Inbox* (search,
   filters, column sorting), open a ticket, try the **Suggested reply** button,
   change status / assignee / priority / category, then set status to *Closed*
   (the ticket records **who closed it**).
3. Check *HR dashboard* — counts by status, open tickets by category, average
   first-response time.

State is API-backed; a small in-memory cache keeps views consistent
(`src/data/store.js`). Reassigning an unanswered ticket automatically creates
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

Done — `src/data/store.js` mirrors the backend endpoints 1:1 (create/list/get,
replies, status, assignee, priority, category, drafts, auto-assign, attachments)
through `src/api/client.js`. `src/data/tickets.js` remains only a fixture.

## Logs, request IDs and tracing

Every `src/api/client.js` request carries three identifiers:

- **`X-Request-ID` (correlation id)** — one UUID per API operation, generated in
  `logger.js`. The backend validates it (strict format, regenerated if invalid),
  echoes it in the response header, and stamps every backend log record with it,
  so frontend + backend + Supabase-hop entries for one operation share one id
  in `backend/logs/app.log` (search: `grep "<request-id>" backend/logs/app.log`).
- **`traceparent` (W3C trace context)** — real OpenTelemetry, not fabricated:
  `src/api/trace.js` starts an `@opentelemetry/sdk-trace-web` span per operation
  and injects the header from that span's context; the ids ride along in the
  ingested log events so backend records show the ORIGINAL operation's trace.
  Tracing in the Jaeger UI: see `backend/README.md` §11.
- **`operation` label** — every API call additionally tags its log events with a
  business operation name (`tickets.create`, `auth.login`, `drafts.submit`,
  `attachment.upload`, …) that matches the backend's `hrdesk.flow` event naming.
  Filter either side by the same label.

Browser lifecycle events (`http_request_start/succeeded/…` from `src/api/logger.js`)
POST to `POST /api/logs/ingest` and land in the same `backend/logs/app.log` tagged
with the operation's `correlationId` (+ trace pair). Designed behavior:

- the ingest hop is its own backend request (its own `request_id`/trace) —
  the original ids live in the event payload, per backend README §11;
- `client.js` never logs `/logs` traffic (no recursion/DoS through the sink);
- the sink is fire-and-forget (no retries, failures only console.debug'd) —
  logging can never break a ticket operation.

Toggles (vite env — there is no frontend `.env.example`; document any override
in your own `.env.local`):

| Variable | Effect |
| --- | --- |
| `VITE_TRACE` (default on) | `false` → no OTel span, no `traceparent`, no trace ids on events |
| `VITE_LOGS` (default on) | `false` → no distant log sink at all (X-Request-ID correlation still flows) |
| `VITE_API_URL` | backend base URL (default `http://localhost:8000/api`) |

## In-app notifications

Ticket events (created / assigned / status change / reply / first-response SLA
breach) become `notifications` rows with generic, non-confidential text and
reach users through a bell + dropdown in every page header and a full
`/notifications` page. Python domain logic:
`backend/app/services/notification_service.py`; frontend cache/hook:
`src/data/notifications.js` + `useNotifications` in `src/hooks.js`; other
channels (email/Slack) are out of scope and would plug into the same store via
the `channel` column. How to add a new notification type: see
`backend/README.md` §10.

## Structure

```
src/
  components/   Badge (signal chips), TicketTable, TicketForm, Thread,
                Sidebar, Layout, primitives (Button/Spinner/Skeleton/EmptyState/StatCard/Avatar),
                NotificationBell + NotificationRow (+ Notifications page)
  pages/        Login, EmployeeDashboard, NewTicket, TicketDetail, HRInbox, HRDashboard, Notifications
  data/         users.js (lookups), tickets.js (fixture), store.js, notifications.js (caches)
  api/          client.js (typed REST calls, each stamped with an `operation`),
                logger.js (lifecycle events → backend log),
                trace.js (real OTel trace context: span + traceparent per operation)
  assets/       emids-logo.png, emids-mark.png (from the brand guidelines)
  context/      AuthContext (mock session, persisted in localStorage)
  hooks.js      useTickets(...) and useNotifications(userId, pollMs=20s)
```

Tailwind v4 (via `@tailwindcss/vite`). Brand tokens configured in `src/index.css`.

## Code style & commit hooks

Formatting and linting run through the commit hooks — every commit formats
and lints only what it changes (`prettier --write` + `eslint --fix` on the
staged files, configured in `package.json` → `lint-staged`; `husky`
activates the hook when `npm install` runs its `prepare` script).

```bash
npm install                 # installs prettier + eslint + husky/lint-staged, enables the hook
npm run lint                # eslint over src/
npm run format              # prettier over the repo (one-time pass / manual reformat)
npm run format:check        # CI-style check without writing
```

Style is decided by `.prettierrc.json` (100 char width) and
`eslint.config.js` (flat config, react-hooks rules). To skip the hook for a
single emergency commit explicitly: `git commit --no-verify`.
