"""Render C4 diagram images for docs/c4-architecture.docx.

Element colours follow the C4 convention:
person #08427B - system #1168BD - external #999999 - container #438DD5.
Canvas coordinates are inches; PNGs are saved at 200 dpi.
"""
import textwrap
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

OUT = Path(__file__).resolve().parent / "img"
OUT.mkdir(exist_ok=True)

STYLE = {
    "person": ("#08427b", "white"),
    "system": ("#1168bd", "white"),
    "ext": ("#999999", "white"),
    "container": ("#438dd5", "white"),
    "container_ext": ("#7f9fca", "white"),
}
FS = dict(title=10.5, tech=7.6, desc=8.0, arrow=7.4)
EDGE = "#4a6785"


def wrap(t, width=42):
    return "\n".join(textwrap.wrap(t, width=width)) if t else ""


def box(ax, x, y, w, h, kind, label, tech=None, desc=None):
    fc, tc = STYLE[kind]
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.10",
        linewidth=1.1, edgecolor="none", facecolor=fc, zorder=4,
    ))
    cx = x + w / 2
    if kind == "person":
        ax.text(cx, y + h * 0.62, label, ha="center", va="center",
                fontsize=FS["title"], fontweight="bold", color=tc, zorder=5)
        if desc:
            ax.text(cx, y + h * 0.28, wrap(desc, 30), ha="center", va="center",
                    fontsize=FS["desc"] - 0.8, color=tc, zorder=5)
        return
    ty = y + h - 0.17
    ax.text(cx, ty, label, ha="center", va="center", fontsize=FS["title"],
            fontweight="bold", color=tc, zorder=5)
    dc = max(10, int((w - 0.12) * 19))
    if tech:
        ax.text(cx, ty - 0.18, tech, ha="center", va="center",
                fontsize=FS["tech"], style="italic", color=tc, zorder=5)
        if desc and y + 0.30 < ty - 0.30:
            ax.text(cx, ty - 0.32, wrap(desc, dc), ha="center", va="top",
                    fontsize=FS["desc"] - 0.6, color=tc, zorder=5)
    elif desc and ty - 0.24 > y + 0.22:
        ax.text(cx, ty - 0.20, wrap(desc, dc), ha="center", va="top",
                fontsize=FS["desc"] - 0.6, color=tc, zorder=5)


def boundary(ax, x, y, w, h, title_):
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.03,rounding_size=0.14",
        linewidth=1.3, edgecolor="#5a6b7b", facecolor="none",
        linestyle=(0, (5, 4)), zorder=1,
    ))
    ax.text(x + 0.14, y + h, title_, ha="left", va="top", fontsize=9.3,
            fontweight="bold", color="#41566b", zorder=2)


def arrow(ax, x1, y1, x2, y2, label=None, bend=0.0, dashed=False):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1), zorder=2, arrowprops=dict(
        arrowstyle="-|>", mutation_scale=13, linewidth=1.5, color=EDGE,
        shrinkA=1, shrinkB=2,
        connectionstyle=f"arc3,rad={bend}",
        linestyle=(0, (4, 3)) if dashed else "solid",
    ))
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + 0.06, label, ha="center", va="bottom",
                fontsize=FS["arrow"], color="#33475b", zorder=6,
                bbox=dict(boxstyle="round,pad=0.16", fc="white",
                          ec="#cdd8e2", alpha=0.92))


def elbow(ax, pts, label=None, dashed=False):
    """Polyline with an arrow head on the final segment; label under the
    midpoint of the longest segment."""
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color=EDGE, lw=1.5,
            ls=(0, (4, 3)) if dashed else "solid", zorder=2,
            solid_capstyle="round")
    arrow(ax, pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1], label=None,
          dashed=dashed)
    if label:
        segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
        (a, b) = max(segs, key=lambda s: (s[1][0] - s[0][0]) ** 2 +
                                            (s[1][1] - s[0][1]) ** 2)
        ax.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.08, label,
                ha="center", va="top", fontsize=FS["arrow"], color="#33475b",
                zorder=6,
                bbox=dict(boxstyle="round,pad=0.16", fc="white",
                          ec="#cdd8e2", alpha=0.92))


def canvas(w, h):
    fig, ax = plt.subplots(figsize=(w, h), dpi=200)
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_facecolor("white")
    ax.set_axis_off()
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
    return fig, ax


def title(ax, w, h, t):
    ax.text(w / 2, h - 0.06, t, ha="center", va="top", fontsize=12.5,
            fontweight="bold", color="#1a2333", zorder=7)


def save(fig, name):
    fig.savefig(OUT / name, bbox_inches="tight", pad_inches=0.12,
                facecolor="white", dpi=200)
    plt.close(fig)
    print("wrote", name)


# --------------------------------------------------------------------------- C1
def c1():
    fig, ax = canvas(8.4, 3.7)
    title(ax, 8.4, 3.7, "Level 1 — System Context: HR Desk Ticketing System")

    box(ax, 0.45, 2.30, 1.75, 1.00, "person", "Employee", None,
        "Raises HR tickets, replies, uploads attachments")
    box(ax, 0.45, 0.75, 1.75, 1.00, "person", "HR Agent", None,
        "Assigns, replies, resolves / closes, sets priority & category")
    box(ax, 3.05, 1.05, 2.55, 1.95, "system",
        "HR Desk\nTicketing System", "React SPA + FastAPI",
        "Employee ticketing for HR: create, thread replies,\nassign, resolve, attachments")
    box(ax, 6.40, 1.35, 1.75, 1.35, "ext", "Supabase Project", "Managed service",
        "Postgres + Storage SaaS")

    arrow(ax, 2.20, 2.80, 3.05, 2.60, "raises / replies  [HTTPS]")
    arrow(ax, 2.20, 1.25, 3.05, 1.65, "triage & actions  [HTTPS]")
    arrow(ax, 5.60, 1.75, 6.40, 1.75, "CRUD + attachments  [HTTPS / PostgREST]")
    save(fig, "c1-context.png")


# --------------------------------------------------------------------------- C2
def c2():
    fig, ax = canvas(8.4, 5.1)
    title(ax, 8.4, 5.1, "Level 2 — Containers")

    box(ax, 0.25, 3.35, 1.55, 1.00, "person", "Employee", None, "writes tickets")
    box(ax, 0.25, 1.85, 1.55, 1.00, "person", "HR Agent", None, "triages tickets")

    boundary(ax, 2.00, 0.55, 4.15, 4.30, "HR Desk  (repo: hr-ticketing)")
    box(ax, 2.35, 3.20, 3.50, 1.40, "container", "HR Desk SPA",
        "React 18 - Vite 6 - Tailwind 4 - react-router",
        "Login; employee + HR dashboards; NewTicket; TicketDetail; pages talk to the store cache, never the API directly")
    box(ax, 2.35, 0.95, 3.50, 1.40, "container", "HR Desk API",
        "Python 3.11 - FastAPI - uvicorn",
        "REST /api mirroring store.js; owns business rules; validation; PostgREST error mapping")

    boundary(ax, 6.45, 0.75, 1.85, 3.95, "Supabase Project")
    box(ax, 6.62, 2.80, 1.50, 1.45, "container", "Postgres",
        "Supabase Postgres",
        "users - tickets - replies; TKT-n refs; RLS on (service-role bypasses)")
    box(ax, 6.62, 1.05, 1.50, 1.30, "container", "Storage",
        "Supabase Storage",
        "private bucket ticket-attachments; signed URLs (1h)")

    arrow(ax, 1.80, 3.85, 2.35, 3.85, "uses  [HTTPS]")
    arrow(ax, 1.80, 2.35, 2.35, 3.30, "uses  [HTTPS]", bend=-0.25)
    arrow(ax, 4.10, 3.20, 4.10, 2.35,
          "JSON REST + multipart (VITE_API_URL)  [HTTPS :8000]")
    arrow(ax, 5.85, 1.95, 6.62, 3.15,
          "chained queries via supabase-py  [HTTPS / PostgREST]", bend=-0.18)
    arrow(ax, 5.85, 1.42, 6.60, 1.55, None, bend=0.06)
    ax.text(6.05, 1.10, "upload + create_signed_url  [HTTPS]",
            fontsize=FS["arrow"], color="#33475b", zorder=6,
            bbox=dict(boxstyle="round,pad=0.16", fc="white",
                      ec="#cdd8e2", alpha=0.92))
    save(fig, "c2-containers.png")


# ------------------------------------------------------------------ C3 frontend
def c3_frontend():
    fig, ax = canvas(8.4, 5.35)
    title(ax, 8.4, 5.35, "Level 3 — Frontend components (zoom: HR Desk SPA)")

    boundary(ax, 0.30, 0.45, 6.75, 4.65, "HR Desk SPA  (src/)")
    box(ax, 0.55, 3.75, 3.35, 1.05, "container", "pages/", "React JSX",
        "Login; EmployeeDashboard; NewTicket; TicketDetail; HRInbox; HRDashboard (RequireAuth)")
    box(ax, 4.10, 3.75, 2.80, 1.05, "container", "components/", "React JSX",
        "Layout, Sidebar, TicketTable, Thread, TicketForm, Badge, primitives, sorting")
    box(ax, 0.55, 2.40, 1.95, 1.15, "container", "hooks.js", "React hooks",
        "useTickets(pollMs): subscribe + refresh + optional polling")
    box(ax, 2.70, 2.40, 2.30, 1.15, "container", "data/store.js", "Cache + pub/sub",
        "Cache-first reads; writes merge authoritative response + notify")
    box(ax, 0.55, 0.80, 3.15, 1.15, "container", "api/client.js", "fetch wrapper",
        "Typed REST calls; JSON + FormData; FastAPI error details")
    box(ax, 4.10, 0.80, 2.80, 1.15, "container", "context/AuthContext",
        "Session state", "localStorage hrdesk.user; isAgent; login / logout; loads roster once")

    box(ax, 7.35, 2.40, 0.85, 1.30, "container_ext", "HR Desk\nAPI", "FastAPI", None)

    arrow(ax, 1.40, 3.75, 1.40, 3.55, "useTickets")
    arrow(ax, 3.30, 3.75, 3.30, 3.55, "creates / updates")
    arrow(ax, 3.90, 4.25, 4.10, 4.25, "compose")
    arrow(ax, 2.50, 2.95, 2.70, 2.95, "subscribe")
    arrow(ax, 3.85, 2.40, 2.30, 1.95, "all writes + refreshers")
    arrow(ax, 4.85, 1.95, 3.70, 1.40, "listUsers()")
    arrow(ax, 5.00, 3.05, 7.35, 3.05, "HTTPS fetch /api")
    save(fig, "c3-frontend.png")


# ------------------------------------------------------------------ C3 backend
def c3_backend():
    fig, ax = canvas(8.4, 6.8)
    title(ax, 8.4, 6.8, "Level 3 — Backend components (zoom: HR Desk API)")

    boundary(ax, 0.30, 0.50, 6.75, 5.70, "HR Desk API  (backend/app/)")
    box(ax, 2.20, 5.30, 3.20, 0.75, "container", "main.py", "FastAPI app",
        "CORS (CORS_ORIGINS); /health; JSON-500 handler; mounts routers under /api")
    box(ax, 0.55, 4.05, 3.15, 1.10, "container", "routers/tickets_core.py",
        "CRUD + replies",
        "POST/GET /tickets; GET by ref|uuid|nn; filters; POST /replies (firstReplyAt; Open to In Progress)")
    box(ax, 3.85, 4.05, 3.05, 1.10, "container", "routers/tickets_actions.py",
        "lifecycle patches",
        "PATCH status (resolvedAt / closedBy / reopen clears); assignee (auto pickup reply); priority; category")
    box(ax, 0.55, 2.65, 3.15, 1.10, "container", "routers/attachments.py",
        "Supabase Storage",
        "multipart upload max 5 MB; GET signed URL; TTL clamped 60s-86400s")
    box(ax, 3.85, 2.65, 3.05, 1.10, "container", "models.py", "Pydantic v2",
        "CamelModel DTOs (camelCase aliases); Literal enums; ticket_out / user_out / turn_out")
    box(ax, 0.55, 1.30, 3.15, 1.05, "container", "routers/users_meta.py",
        "lookups", "GET /users (employees then agents); /users/agents; /meta")
    box(ax, 3.85, 1.30, 3.05, 1.05, "container", "config.py", "dotenv + singleton",
        "SUPABASE_URL / SERVICE_ROLE_KEY / CORS_ORIGINS; get_client() service-role client")

    box(ax, 7.30, 3.55, 1.00, 1.65, "container", "Postgres", "Supabase",
        "users; tickets; replies")
    box(ax, 7.30, 1.40, 1.00, 1.55, "container", "Storage", "Supabase bucket",
        "ticket-attachments")

    arrow(ax, 3.10, 5.30, 2.10, 5.15, "include_router", bend=0.10)
    arrow(ax, 4.60, 5.30, 5.40, 5.15, "prefix /api", bend=-0.06)
    arrow(ax, 2.10, 3.75, 2.10, 4.05, "fetch_row / _update_and_return")
    arrow(ax, 4.55, 4.05, 5.40, 3.75, "DTO validation")
    elbow(ax, [(2.00, 1.30), (2.00, 1.00), (4.80, 1.00), (4.80, 1.30)],
          "routers use db() / get_client()")
    elbow(ax, [(3.40, 4.05), (3.40, 3.90), (7.00, 3.90), (7.00, 4.35), (7.30, 4.35)],
          "tickets / replies / users  [PostgREST]")
    elbow(ax, [(2.55, 2.65), (2.55, 2.50), (7.10, 2.50), (7.10, 2.10), (7.30, 2.10)],
          "upload + create_signed_url  [HTTPS]")
    save(fig, "c3-backend.png")


# --------------------------------------------------------------------- C4 code
def c4_code():
    fig, ax = canvas(8.4, 4.9)
    title(ax, 8.4, 4.9, "Level 4 — Code: backend module dependency graph")

    box(ax, 0.35, 2.35, 1.45, 1.00, "container", "main.py", "FastAPI", None)
    for name, y in [("tickets_core", 3.85), ("tickets_actions", 3.05),
                    ("attachments", 2.25), ("users_meta", 1.45)]:
        box(ax, 2.45, y, 2.25, 0.72, "container", "routers/" + name, None, None)
    box(ax, 5.30, 3.55, 2.10, 1.05, "container", "models.py",
        "Pydantic DTOs + serializers", None)
    box(ax, 5.30, 2.05, 2.10, 1.05, "container", "config.py",
        "dotenv + Supabase singleton", None)
    box(ax, 7.55, 2.55, 0.80, 1.30, "ext", "supabase-\npy", "external pkg", None)

    arrow(ax, 1.80, 3.05, 2.45, 4.20, "include prefix /api", bend=-0.10)
    arrow(ax, 1.80, 2.90, 2.45, 3.40, "", bend=-0.05)
    arrow(ax, 1.80, 2.75, 2.45, 2.60, "", bend=0.0)
    arrow(ax, 1.80, 2.55, 2.45, 1.80, "", bend=0.05)
    arrow(ax, 4.70, 4.20, 5.30, 4.10, "DTO + serializers", bend=-0.05)
    arrow(ax, 4.70, 3.40, 5.30, 3.75, "DTO validation", bend=-0.05)
    arrow(ax, 4.70, 3.95, 5.30, 2.75, "db() / get_client()", bend=-0.15)
    arrow(ax, 4.70, 2.60, 5.30, 2.60, "env + client", bend=0.0)
    arrow(ax, 4.70, 1.80, 5.30, 2.20, "get_client()", bend=0.05)
    arrow(ax, 7.40, 2.70, 7.55, 2.90, "create_client", bend=0.0)

    ax.text(3.55, 0.95,
            "tickets_actions / attachments / users_meta import\n"
            "fetch_row, get_user, run, rows_of from tickets_core",
            ha="center", va="center", fontsize=7.6, color="#33475b",
            bbox=dict(boxstyle="round,pad=0.3", fc="#eef2f7",
                      ec="#cdd8e2"), zorder=6)
    save(fig, "c4-code.png")


# -------------------------------------------------------------------- sequence
def runtime():
    fig, ax = canvas(8.4, 5.2)
    title(ax, 8.4, 5.2, "Runtime view — agent replies to a ticket")

    cols = [("Browser (SPA)", "agent reply", 0.95),
            ("store.js", "cache + pub/sub", 3.05),
            ("HR Desk API", "FastAPI /api", 5.35),
            ("Supabase Postgres", "service-role", 7.55)]
    for head, sub, x in cols:
        ax.add_patch(FancyBboxPatch((x - 0.82, 4.30), 1.64, 0.66,
                     boxstyle="round,pad=0.02,rounding_size=0.10",
                     facecolor="#1168bd", edgecolor="none", zorder=4))
        ax.text(x, 4.75, head, ha="center", va="center", fontsize=8.8,
                fontweight="bold", color="white", zorder=5)
        ax.text(x, 4.50, sub, ha="center", va="center", fontsize=7.2,
                color="#dbe9ff", zorder=5)
        ax.plot([x, x], [0.50, 4.30], ls=(0, (4, 4)), color="#93a4b3",
                lw=1.1, zorder=1)

    steps = [
        (4.00, 1, 0.95, 3.05, "addReply(TKT-101, authorId, text)", False),
        (3.78, 2, 3.05, 5.35, "POST /api/tickets/TKT-101/replies", False),
        (3.56, 3, 5.35, 7.55, "SELECT ticket WHERE ref / uuid", False),
        (3.34, 4, 5.35, 7.55, "SELECT user -> role (server-side)", False),
        (3.12, 5, 5.35, 7.55, "INSERT reply (author_id, author_role, body)", False),
        (2.90, 6, 5.35, 7.55, "UPDATE ticket: first_reply_at once; Open -> In Progress", False),
        (2.68, 7, 3.05, 5.35, "200 full ticket (ticket_out, camelCase)", True),
        (1.95, 9, 3.05, 0.95, "hooks re-render", True),
    ]
    for y, n, x1, x2, label, dashed in steps:
        arrow(ax, x1, y, x2, y, f"{n}.  {label}", dashed=dashed,
              bend=0.10 if dashed else 0.0)

    ax.plot([3.05, 3.50, 3.50, 3.08], [2.42, 2.40, 2.22, 2.20], color=EDGE,
            lw=1.3, zorder=2)
    ax.text(3.58, 2.31, "8.  upsert into cache + notify subscribers",
            ha="left", va="center", fontsize=FS["arrow"], color="#33475b",
            zorder=6, bbox=dict(boxstyle="round,pad=0.16", fc="white",
                                ec="#cdd8e2", alpha=0.92))
    ax.text(0.40, 0.58, "solid = request          dashed = response",
            fontsize=7.4, color="#5a6b7b")
    save(fig, "runtime-reply.png")


if __name__ == "__main__":
    c1()
    c2()
    c3_frontend()
    c3_backend()
    c4_code()
    runtime()
