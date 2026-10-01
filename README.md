# HR Desk — internal HR ticketing

React (Vite + Tailwind) frontend + FastAPI backend. Signed-in demo users raise
HR tickets, HR agents answer them, everyone follows status — all data lives in
a real database (SQLite by default, MySQL optional) instead of the old
in-browser mock.

## Run it (WSL / Linux)

Two terminals from the project root. Nothing else to install — no database
server, no credentials.

**Terminal 1 — backend** (auto-creates + demo-seeds `backend/hr_ticketing.db`):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows (non-WSL): .venv\Scripts\activate
which python                       # sanity: must point inside backend/.venv/bin
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

First boot prints `[startup] database -> SQLite file: …` and creates+seeds the
DB automatically. The API answers on http://localhost:8000 — open
http://localhost:8000/docs for a clickable endpoint manual, and
`POST /api/auth/login` with body `{"userId": "u1"}` is a 30-second smoke test.

**Terminal 2 — frontend:**

```bash
cd ..                              # project root
npm install        # run inside WSL: node_modules are platform-specific, don't copy from Windows
npm run dev
```

Then open **http://localhost:5173** (the URL Vite prints as `Local:`).
Keep terminal 1 running — the frontend talks to it live.

## How the app works

### Sign in (Login screen)

Two role tabs — **Employee** and **HR agent** — each listing demo users
(priya, marcus, dana, tomas / alicia, ben, ruth) straight from the database.
No passwords (demo auth): submitting issues a session token stored in
`localStorage["hrdesk.token"]`, so a page refresh keeps you signed in until
you press the sign-out arrow in the sidebar. Employees land on *My tickets*,
agents on *Inbox*.

### Employee view

| Screen | What happens |
| --- | --- |
| **My tickets** | Your own tickets only, most-recent-activity first, with status + priority badges and a paperclip when an attachment was named. Refreshes live (polls every ~6 s). |
| **New ticket** | Category + priority + subject + description (+ optional file). Validation runs in the browser *and* again on the server: subject ≥ 5 chars, description ≥ 20 chars, attachment ≤ 5 MB. Submitting jumps to the ticket with a green "submitted" confirmation banner. |
| **Ticket detail** (own tickets only) | Full conversation: the description as the first turn, then every reply. Replying as the employee flips the ticket to **Waiting on Employee** (HR is holding the ball) until an agent answers again. |

### HR agent view

| Screen | What happens |
| --- | --- |
| **Inbox** | Every ticket from every employee — free-text search (subject, description, ticket id, employee name), filters for status / category / priority / assignee, clickable column sorting, plus a "reset filters" chip. |
| **Ticket detail** | Full thread **plus the agent control panel** under the meta grid: **Status**, **Assignee**, **Priority**, **Re-categorise** dropdowns. The **Suggested reply** button inserts a category-appropriate reply frame. |

### The ticket lifecycle (assignment model)

- A **new ticket is born `Open` and unassigned** — there is no auto-routing
  and no manager dispatch. It waits in the shared Inbox.
- **Claiming a ticket = the Assignee dropdown** in the ticket detail page:
  pick any HR agent (usually yourself). The first claim on an unanswered
  ticket automatically posts the *"Thanks for raising this — I've picked it
  up…"* greeting, stamps the response clock, and moves `Open → In Progress`.
  Choosing "Unassigned" there releases the ticket.
- Status flow: `Open → In Progress → Waiting on Employee` (when the employee
  replies) → **Resolved** (stamps the resolution time) → **Closed** (also
  records *who* closed it). Reopening to `Open` / `In Progress` clears those
  stamps.
- **All three HR agents have identical permissions** — it's a flat demo team;
  any agent can view, claim, and manage every ticket. There is no manager
  hierarchy in the demo.

### HR dashboard (agent-only figures)

FIG. 01 counts by status · FIG. 02 open (non-resolved) tickets by category,
sorted desc · FIG. 03 response performance: average first-response time, the
"NO REPLY YET" alert count, and the replied/total ratio. Numbers come from
`GET /api/analytics` and re-render as tickets change. Figures are driven by
`firstReplyAt` stamps — which is why claiming or replying to a fresh ticket
matters for them.

### Roles at a glance

| Capability | Employee | HR agent |
| --- | --- | --- |
| My tickets / new ticket | ✓ | ✗ |
| View any ticket | own only | ✓ all |
| Reply in a thread | own tickets | ✓ any ticket |
| Assign / status / priority / category | ✗ | ✓ |
| Inbox / HR dashboard | ✗ | ✓ |

**Attachments are demo-level:** the file's *name and size* are stored and
shown, the bytes themselves are not uploaded.

## Demo data & resetting

First boot seeds: 4 employees (`u1`–`u4`), 3 HR agents (`h1`–`h3`) and 18
tickets (`TKT-101`–`TKT-118`) covering every status — so all screens look
lived-in immediately. The next created ticket continues at `TKT-119`.

Reset the demo database anytime:

```bash
rm backend/hr_ticketing.db        # then restart uvicorn — reseeded on boot
```

## Using your own MySQL instead of SQLite

In `backend/.env`:

```ini
DATABASE_URL=mysql+pymysql://root:YourPassword@localhost:3306/hr_ticketing?charset=utf8mb4
```

…then uncomment the two MySQL lines in `backend/requirements.txt` and
`pip install -r requirements.txt` again. The app creates the database and
demo-seeds it on first boot (same schema, same endpoints). No `.env` at all?
It runs on SQLite and needs zero setup.

## Configuration (`backend/.env`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./hr_ticketing.db` | SQLAlchemy URL (SQLite file anchored to backend/, or any MySQL URL) |
| `CORS_ORIGINS` | localhost + 127.0.0.1 :5173/5174 | Browser origins allowed to call the API |
| `BACKEND_PORT` | `8000` | Port when run via `python -m app.main` |

## Troubleshooting

| Symptom | Cause + fix |
| --- | --- |
| `error: externally-managed-environment` from pip | You skipped the venv. Run `python3 -m venv .venv && source .venv/bin/activate` first (Ubuntu 23.04+/24.04 blocks pip outside venvs). |
| `Unable to symlink '/usr/bin/python3' to …/.venv/bin/python3` and later `bash: …/.venv/bin/python: Permission denied` | The venv folder is stale/created midway (typically an old `.venv` copied along with the project, or an earlier half-built run). Delete and rebuild: `rm -rf .venv && python3 -m venv .venv`. If the warning repeats, copy the interpreter instead: `python3 -m venv --copies .venv`. Verify with `source .venv/bin/activate && which python` before installing anything. |
| Browser shows "Can't reach the backend" | Backend isn't running (`uvicorn … --port 8000`) or is on another port. Start terminal 1 first. |
| `ModuleNotFoundError: fastapi` | `pip install` ran in a different shell/virtualenv. Re-activate `.venv`. |
| Python < 3.10 `TypeError` at boot | The backend needs Python 3.10+ (`sudo apt install python3.11` or distro ≥ 22.04 default). |
| `vite: not found` | You skipped `npm install` — run it before `npm run dev`. |
| `npm ERR!` / parts of the app look mock | Old `node_modules` copied from Windows → run a fresh `npm install` **inside** WSL. |
| Frontend opens but the browser blocks calls from a `Network:` host URL | The API is reachable by default at `http://localhost:8000`. If you open the app via a WSL IP/hostname instead of `localhost:5173`, create a `.env` next to `package.json` with `VITE_API_URL=http://localhost:8000` (or the backend's reachable address) and restart Vite. |

## Architecture

```
backend/                 FastAPI app (Python 3.10+)
  app/main.py            - startup: create tables + seed demo data, CORS, routers
  app/core/              - config.py (env), database.py (SQLite default / MySQL optional)
  app/models/            - User, Ticket, TicketTurn, AuthSession, TicketCounter (SQLAlchemy 2.0)
  app/schemas/           - camelCase wire format matching the React mock shapes
  app/services/          - business rules (creation, replies, assignment, status)
  app/routers/           - one router group per screen
  requirements.txt       - 5 packages; MySQL driver optional

src/                     React (Vite + Tailwind v4, Node 18+)
  api.js                 - the ONLY place that talks to the API (fetch + token)
  hooks.js               - useTickets / useTicket / useMeta (polling keeps screens in sync)
  context/AuthContext.jsx- login/logout via POST /api/auth, token persisted
  pages/                 - Login, EmployeeDashboard, NewTicket, TicketDetail, HRInbox, HRDashboard
  components/            - Badge, TicketTable, TicketForm, Thread, Sidebar, Layout, primitives
  data/users.js          - static fallback constants (live values come from GET /api/meta)
```

**API surface** (all under http://localhost:8000, camelCase JSON):

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `GET /api/auth/users?role=` · `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout` | Login + sessions | Issued token drives every protected call |
| `GET /api/meta` | Dropdowns everywhere | users, agents, categories, priorities, statuses |
| `GET /api/my-tickets` | My tickets | Employee's own tickets, agent gets 403 |
| `POST /api/tickets` | New ticket | Returns the created ticket |
| `GET /api/tickets/{id}` | Ticket detail | 404 unknown, 403 someone else's |
| `POST /api/tickets/{id}/replies` | Thread reply box | Role from the token drives status rules |
| `PATCH /api/tickets/{id}/status · /assignee · /priority · /category` | Agent controls | Agent-only (403 otherwise) |
| `GET /api/inbox` | HR Inbox | Agent-only, whole-ticket-table data |
| `GET /api/analytics` | HR Dashboard | Agent-only aggregate figures |

Mutation endpoints return the refreshed ticket, so screens update from the
response; list screens poll every few seconds so the two roles follow each
other's activity without a websocket.

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