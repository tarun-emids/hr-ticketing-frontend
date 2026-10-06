// Build docs/c4-architecture.docx from the rendered C4 diagram PNGs.
const fs = require("fs");
const path = require("path");
const {
  AlignmentType, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, WidthType,
} = require("docx");

const ROOT = __dirname;
const IMG = path.join(ROOT, "img");
const OUT = path.join(ROOT, "c4-architecture.docx");

// US Letter content width with 0.8" margins: 8.5 - 1.6 = 6.9in = 663px @96dpi
const CONTENT_W = 660;

const IMGS = {
  c1: ["c1-context.png", 788],
  c2: ["c2-containers.png", 1068],
  c3f: ["c3-frontend.png", 1118],
  c3b: ["c3-backend.png", 1408],
  c4: ["c4-code.png", 1028],
  seq: ["runtime-reply.png", 1088],
};

function image(key) {
  const [file, h] = IMGS[key];
  const width = CONTENT_W;
  const height = Math.round((h * CONTENT_W) / 1728);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(path.join(IMG, file)),
      transformation: { width, height },
    })],
  });
}

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, font: "Calibri", size: 22, ...opts })],
  ...opts.papa,
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, font: "Calibri" })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 220, after: 110 },
  children: [new TextRun({ text, font: "Calibri" })],
});

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: "Calibri", size: 22 })],
});

const numbered = (text) => new Paragraph({
  numbering: { reference: "steps", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: "Calibri", size: 22 })],
});

const MONO_COLS = [1300, 1700, 3800, 3130];
const NARROW_COLS = [1200, 2100, 6630];

function cell(text, opts = {}) {
  const { header = false, width = 1600, mono = false } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header
      ? { type: ShadingType.CLEAR, fill: "1f4e79", color: "auto" }
      : { type: ShadingType.CLEAR, fill: "ffffff", color: "auto" },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: header,
        color: header ? "ffffff" : "1a2333",
        size: 20,
        font: mono ? "Consolas" : "Calibri",
      })],
    })],
  });
}

function table(widths, rows) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      children: r.map((c, j) => cell(c, {
        header: i === 0,
        width: widths[j],
        mono: i > 0 && j === 0,
      })),
    })),
  });
}

const spacer = () => new Paragraph({ spacing: { after: 160 }, children: [] });

// ---------------------------------------------------------------------------
const children = [];

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 300, after: 60 },
  children: [new TextRun({
    text: "HR Desk Ticketing System — C4 Architecture",
    bold: true, size: 44, font: "Calibri", color: "1f4e79",
  })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 260 },
  children: [new TextRun({
    text: "C4 model: System Context · Containers · Components · Code + runtime view",
    italics: true, size: 24, font: "Calibri", color: "5a6b7b",
  })],
}));

children.push(table([1500, 8430], [
  ["Attribute", "Value"],
  ["Repository", "tarun-emids/hr-ticketing-system"],
  ["Branch / commit", "initial-frontend @ 8b035a4"],
  ["Generated", "2026-10-05 by the automated test & documentation pass (Claude Code)"],
  ["Frontend", "React 18 · Vite 6 · Tailwind 4 · react-router 6"],
  ["Backend", "Python 3.11 · FastAPI · Supabase-py · Pydantic v2"],
  ["Data platform", "Supabase (managed Postgres + Storage)"],
  ["Verification", "95 automated tests: 24 unit + 60 API + 11 live integration (all passing)"],
]));

children.push(spacer());
children.push(P(
  "How to read this document: each C4 level zooms in one step — who uses the system (Level 1), " +
  "the deployable pieces that make it up (Level 2), the internals of each piece (Level 3) and how " +
  "the backend modules depend on each other (Level 4). A runtime sequence view shows one real " +
  "request flowing through every layer.",
));
children.push(P(
  "Diagram colour convention (C4 standard): dark blue = people · blue = in-scope software system · " +
  "light blue = containers/components inside the scope · grey = external SaaS.",
));

// ------------------------------------------------------------------ Level 1
children.push(H1("Level 1 — System Context"));
children.push(P(
  "Two kinds of people use the app. Employees raise HR tickets and answer questions; " +
  "HR agents triage them. The system itself is one deployable scope (SPA + API). Data lives in an external "
  + "Supabase project — the only external service in this picture.",
));
children.push(image("c1"));
children.push(table(NARROW_COLS, [
  ["Type", "Name", "Description"],
  ["Person", "Employee", "Raises HR tickets, replies in threads, uploads attachments (max 5 MB)"],
  ["Person", "HR Agent", "Triages: assigns to an agent, replies, resolves / closes, sets priority & category"],
  ["Software System", "HR Desk Ticketing System", "React SPA + FastAPI backend for HR ticketing; this repository"],
  ["External System", "Supabase Project", "Managed Postgres (users/tickets/replies) + Storage (attachment bucket) SaaS"],
]));
children.push(spacer());
children.push(table(MONO_COLS, [
  ["Source", "Destination", "Relationship", "Technology"],
  ["Employee", "HR Desk", "Raises / replies to tickets in web UI", "HTTPS"],
  ["HR Agent", "HR Desk", "Triage, assignment, resolution in web UI", "HTTPS"],
  ["HR Desk", "Supabase", "CRUD on users/tickets/replies; upload + signed URLs (service_role key, bypasses RLS)", "HTTPS / PostgREST"],
]));

// ------------------------------------------------------------------ Level 2
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Level 2 — Containers"));
children.push(P(
  "The repo deploys two containers. The browser runs the SPA and calls the API directly (no SSR/proxy): " +
  "the base URL comes from VITE_API_URL (default http://localhost:8000/api). Only the FastAPI process talks " +
  "to Supabase — the SPA never holds credentials. Supabase enforces RLS; the backend uses the service_role key",
));
children.push(image("c2"));
children.push(table(NARROW_COLS, [
  ["Type", "Name", "Description"],
  ["Container", "HR Desk SPA", "React 18 + Vite 6 + Tailwind 4 + react-router; pages: Login, EmployeeDashboard (/my-tickets), NewTicket, TicketDetail (/tickets/:id), HRInbox (/inbox), HRDashboard (/hr-dashboard); keeps a local cache, pages never call the API directly"],
  ["Container", "HR Desk API", "Python 3.11 + FastAPI on uvicorn; REST under /api mirroring src/data/store.js 1:1 (camelCase); owns all business rules; maps PostgREST errors to 4xx/5xx"],
  ["Data store", "Supabase Postgres", "users / tickets / replies tables; generated TKT-<n> references (identity starts at 101); updated_at trigger; RLS enabled, only service_role bypasses"],
  ["Data store", "Supabase Storage", "Private bucket ticket-attachments; one attachment per ticket at <TKT-n>/<uuid>.<ext>; read back as 1-hour signed URLs"],
]));
children.push(spacer());
children.push(table(MONO_COLS, [
  ["Source", "Destination", "Relationship", "Technology"],
  ["Employee", "HR Desk SPA", "Writes & tracks own tickets", "HTTPS"],
  ["HR Agent", "HR Desk SPA", "Triages and manages tickets", "HTTPS"],
  ["HR Desk SPA", "HR Desk API", "JSON REST calls + multipart upload (VITE_API_URL)", "HTTPS :8000"],
  ["HR Desk API", "Supabase Postgres", "Chained queries via supabase-py table builders (eq / is_ / ilike / order / limit)", "HTTPS / PostgREST"],
  ["HR Desk API", "Supabase Storage", "upload() + create_signed_url()", "HTTPS"],
]));

// ------------------------------------------------------------------ Level 3 SPA
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Level 3 — Frontend components (zoom on the SPA)"));
children.push(P(
  "Inside the SPA, pages read from a tiny local store with pub/sub and send every mutation to the API through a " +
  "typed fetch wrapper. AuthContext holds only the acting user (id + role); there is no server auth yet.",
));
children.push(image("c3f"));
children.push(table(NARROW_COLS, [
  ["Type", "Name", "Description"],
  ["Component", "pages/", "Route components: Login; EmployeeDashboard; NewTicket; TicketDetail; HRInbox; HRDashboard — gated by RequireAuth (role-aware redirect)"],
  ["Component", "components/", "Layout, Sidebar, TicketTable, Thread, TicketForm, Badge, primitives, sorting; utils.js"],
  ["Component", "hooks.js", "useTickets(pollMs): subscribes to the store, shows cached data immediately, refreshes from API on mount, optional polling"],
  ["Component", "data/store.js", "Cache + pub/sub. listTickets()/getTicket() are synchronous cache reads; every write sends to the API, merges the authoritative returned ticket (server stamps statuses) then notifies subscribers"],
  ["Component", "api/client.js", "fetch wrapper for every endpoint; JSON bodies camelCase + multipart FormData; converts FastAPI {detail} to readable error strings"],
  ["Component", "context/AuthContext", "Loads user roster from GET /api/users at startup; session persisted in localStorage 'hrdesk.user'; exposes user, isAgent, login, logout"],
  ["Component", "data/tickets.js, data/users.js", "Legacy mock data from the pre-API demo (kept for reference)"],
]));

// ------------------------------------------------------------------ Level 3 API
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Level 3 — Backend components (zoom on the API)"));
children.push(P(
  "main.py mounts four routers under /api. Each write endpoint validates input with a Pydantic CamelModel DTO " +
  "(camelCase aliases = the frontend shape), executes a chained supabase-py query, and returns the full ticket — " +
  "including its thread — serialized by models.py, so the SPA updates its cache in one round-trip.",
));
children.push(image("c3b"));
children.push(table(NARROW_COLS, [
  ["Type", "Name", "Description"],
  ["Component", "main.py", "FastAPI app; CORS from CORS_ORIGINS (default localhost:5173); GET /health; catch-all handler that converts uncaught errors to readable JSON 500"],
  ["Component", "routers/tickets_core.py", "POST /tickets (employee-role guard); GET /tickets with filters status/category/priority/employeeId/assigneeId/q/ilike/unassigned/limit; GET /tickets/{TKT-n | uuid | n}; POST /{id}/replies (agent reply stamps first_reply_at once + Open→In Progress; employee reply flips active tickets to Waiting on Employee)"],
  ["Component", "routers/tickets_actions.py", "PATCH status (Resolved stamps resolved_at; Closed also records closed_by; reopening clears both); PATCH assignee (assigning an unanswered ticket auto-posts the agent pickup reply); PATCH priority; PATCH category"],
  ["Component", "routers/attachments.py", "POST /{id}/attachment (multipart, cap 5 MB → 413, storage failure → 502); GET /{id}/attachment returns a signed URL, TTL clamped 60s–86400s"],
  ["Component", "routers/users_meta.py", "GET /users (employees then agents), GET /users/agents, GET /meta (allowed categories / priorities / statuses)"],
  ["Component", "models.py", "CamelModel DTOs with alias_generator=to_camel; Literal enums; serializers ticket_out / user_out / turn_out / attachment_out (snake_case rows → camelCase API)"],
  ["Component", "config.py", "dotenv settings (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGINS, ATTACHMENT_SIGNED_URL_TTL); lazily-created service-role Supabase client singleton"],
]));

// ------------------------------------------------------------------ Level 4
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Level 4 — Code (backend module dependency graph)"));
children.push(P(
  "Dependency direction is strictly downward: routers depend on models and config; never the reverse. Three routers " +
  "reuse shared helpers from tickets_core (fetch_row, get_user, run, rows_of, _update_and_return) — their PostgREST " +
  "error mapping is the single place Error → HTTP translation happens (constraint codes 23xxx → 400, everything else → 502).",
));
children.push(image("c4"));
children.push(table(MONO_COLS, [
  ["Module", "Depends on", "Reason"],
  ["main.py", "4 routers", "include_router under /api prefix"],
  ["tickets_actions", "tickets_core", "fetch_row / get_user / run / _update_and_return reuse"],
  ["attachments", "tickets_core", "fetch_row + _update_and_return"],
  ["users_meta", "tickets_core", "rows_of shared execution helper"],
  ["tickets_core / tickets_actions", "models.py", "DTO validation + ticket_out serialization"],
  ["all routers", "config.py", "db() on the tickets table + get_client() singleton"],
  ["config.py", "supabase-py", "create_client(SUPABASE_URL, SERVICE_KEY)"],
]));

// ------------------------------------------------------------------ Runtime
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Runtime view — agent replies to a ticket"));
children.push(P(
  "One round-trip: the caller merges the server response straight into the local cache; every other subscriber " +
  "re-renders with authoritative data (stamps computed by the API, not duplicated in the UI).",
));
children.push(image("seq"));
children.push(numbered("Agent clicks reply — UI calls store.addReply(TKT-101, {authorId, text})"));
children.push(numbered("store relay → POST /api/tickets/TKT-101/replies"));
children.push(numbered("API resolves the ticket by TKT-<n> reference or Postgres uuid"));
children.push(numbered("API looks the author up and derives their role server-side (never trusts client role)"));
children.push(numbered("API inserts the reply row (author_id, author_role, body)"));
children.push(numbered("API updates the ticket: first_reply_at stamped once; Open → In Progress"));
children.push(numbered("API responds 200 with the full ticket (turns included) in camelCase"));
children.push(numbered("store upserts into the cache (kept sorted by updatedAt) and notifies subscribers"));
children.push(numbered("Subscribed hooks re-render with the merged state"));

// ------------------------------------------------------------------ rules
children.push(H1("Architecture rules worth remembering"));
children.push(bullet("Contract: endpoint shapes mirror src/data/store.js 1:1 (camelCase) — the SPA layer swap from mock to real API touched no UI code."));
children.push(bullet("Single writer to the datastore: only the backend talks to Supabase, with the service_role key (RLS bypass by design). Never put that key in frontend code."));
children.push(bullet("Business rules live in the API: pickup reply on assignment, first_reply_at stamping, Waiting on Employee flips, resolved_at / closed_by semantics, reopen clearing both."));
children.push(bullet("Identity: the UI address of a ticket is its generated reference TKT-<n> (starts at TKT-101); the Postgres uuid travels alongside for admin/debug."));
children.push(bullet("All writes return the full ticket incl. thread turns — one round-trip per mutation for cache coherence."));
children.push(bullet("Attachments: one per ticket, ≤ 5 MB (413 over), replaced on re-upload, private bucket + 1h signed URLs (TTL clamp 60s–86400s)."));
children.push(bullet("Errors: 404 unknown ticket · 413 too large · 422 validation / unknown user · 400 vs 502 mapped from PostgREST codes (23xxx constraint → 400)."));
children.push(bullet("Health: GET /health is liveness only — deliberately does not touch Supabase, safe for probes."));

children.push(H2("Verification"));
children.push(P(
  "Sources: docs/c4-architecture.docx (this file) — diagram images from docs/img/*.png, " +
  "produced by docs/c4_diagrams.py. Interactive HTML version with the same diagrams: docs/c4-architecture.html.",
));

// ---------------------------------------------------------------------------
const doc = new Document({
  creator: "Claude Code",
  title: "HR Desk Ticketing System — C4 Architecture",
  description: "C4 architecture model for tarun-emids/hr-ticketing-system",
  styles: {
    default: {
      heading1: { run: { size: 32, bold: true, color: "1f4e79" } },
      heading2: { run: { size: 26, bold: true, color: "2e6da4" } },
    },
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } },
        }],
      },
      {
        reference: "steps",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1152, bottom: 1152, left: 1152, right: 1152 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: "hr-ticketing-system · initial-frontend", size: 16, color: "94a3b8",
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
            size: 16, color: "94a3b8",
          })],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("wrote", OUT, buf.length, "bytes");
});
