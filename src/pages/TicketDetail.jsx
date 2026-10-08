import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowUpRight,
  IconCircleCheck,
  IconLock,
  IconPaperclip,
} from "@tabler/icons-react";
import { CATEGORIES, PRIORITIES, STATUSES } from "../data/users";
import { agentWorkload, autoAssignTicket } from "../api/client";
import { getTicket, subscribe, refreshTicket, updateStatus, assignTicket, setPriority, setCategory, getAttachmentUrl } from "../data/store";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import Thread from "../components/Thread";
import { Spinner, EmptyState } from "../components/primitives";
import { formatDateTime, timeAgo } from "../utils";

const SELECT =
  "w-full border border-surface-2 bg-canvas px-2.5 py-2 text-body text-warm focus:border-teal focus:outline-none";

function MetaItem({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="mono-label text-[10px] text-warm/40">{label}</p>
      <div className="mt-1.5 text-body-lg text-warm/85">{children}</div>
    </div>
  );
}

function AgentControls({ ticket, actor, users }) {
  const agents = users.filter((u) => u.role === "agent");
  const [workload, setWorkload] = useState([]);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    agentWorkload().then(setWorkload).catch(() => setWorkload([]));
  }, [ticket.assigneeId, ticket.id]);

  const openCountFor = (id) => workload.find((w) => w.id === id)?.openCount;

  const routeNow = async () => {
    setRouting(true);
    try {
      await autoAssignTicket(ticket.id);
    } catch (e) {
      window.alert(`Auto-assign failed: ${e.message}`);
    } finally {
      setRouting(false);
    }
  };

  return (
    <div className="mt-6 grid gap-5 border-t border-surface-2 pt-6 sm:grid-cols-2">
      <MetaItem label="Status">
        <select value={ticket.status} onChange={(e) => updateStatus(ticket.id, e.target.value, actor.id)} className={SELECT}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Assignee">
        <select value={ticket.assigneeId ?? ""} onChange={(e) => assignTicket(ticket.id, e.target.value || null)} className={SELECT}>
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}{typeof openCountFor(a.id) === "number" ? ` · ${openCountFor(a.id)} open` : ""}
            </option>
          ))}
        </select>
      </MetaItem>
      <MetaItem label="Priority">
        <select value={ticket.priority} onChange={(e) => setPriority(ticket.id, e.target.value)} className={SELECT}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Re-categorise">
        <select value={ticket.category} onChange={(e) => setCategory(ticket.id, e.target.value)} className={SELECT}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </MetaItem>
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={routeNow}
          disabled={routing || ["Resolved", "Closed"].includes(ticket.status)}
          className="mono-label border border-teal/50 px-3 py-2 text-[10px] text-teal-deep transition-colors hover:bg-teal/10 disabled:cursor-not-allowed disabled:opacity-40"
          title="Route to the least-loaded HR agent"
        >
          {routing ? "Routing…" : "Auto-assign"}
          <IconArrowDownRight size={16} aria-hidden />
          least-loaded agent
        </button>
      </div>
    </div>
  );
}

function AttachmentChip({ ticket }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const isImage = /\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(ticket.attachment.name);

  const fetchUrl = async () => {
    const res = await getAttachmentUrl(ticket.id);
    if (!res?.url) throw new Error("The attachment URL was not returned.");
    return res.url;
  };

  useEffect(() => {
    if (!isImage) return undefined;
    let active = true;
    setBusy(true);
    setError("");
    fetchUrl()
      .then((attachmentUrl) => {
        if (active) setUrl(attachmentUrl);
      })
      .catch((e) => {
        if (active) setError(e.message ?? String(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [ticket.id, isImage]);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  const open = async () => {
    if (isImage) {
      if (url) setPreviewOpen(true);
      return;
    }
    setBusy(true);
    try {
      const attachmentUrl = await fetchUrl();
      window.open(attachmentUrl, "_blank", "noopener");
    } catch (e) {
      window.alert(`Could not open attachment: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const retryImageLoad = async () => {
    setBusy(true);
    setError("");
    try {
      setUrl(await fetchUrl());
    } catch (e) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  if (isImage) {
    return (
      <>
        <div className="mt-5 border border-surface-2 bg-canvas p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-body text-warm/80">
            <span className="min-w-0 truncate">{ticket.attachment.name}</span>
            <span className="mono-label shrink-0 text-[10px] text-warm/35">
              {(ticket.attachment.size / 1024).toFixed(0)} KB
            </span>
          </div>
          {url ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="block max-w-full cursor-zoom-in text-left"
              aria-label={`View ${ticket.attachment.name} full size`}
            >
              <img
                src={url}
                alt={ticket.attachment.name}
                className="max-h-80 max-w-full object-contain object-left"
              />
              <span className="mono-label mt-2 block text-[10px] text-warm/35">
                Click image to enlarge
              </span>
            </button>
          ) : (
            <div className="text-caption text-warm/55" role={error ? "alert" : "status"}>
              {error ? (
                <>
                  Could not load image: {error}{" "}
                  <button type="button" onClick={retryImageLoad} disabled={busy} className="text-teal-deep underline disabled:opacity-40">
                    Retry
                  </button>
                </>
              ) : (
                "Loading image…"
              )}
            </div>
          )}
        </div>

        {previewOpen && url && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 p-4 sm:p-8"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Image preview: ${ticket.attachment.name}`}
              className="flex max-h-full max-w-full flex-col items-end gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                autoFocus
                onClick={() => setPreviewOpen(false)}
                className="mono-label border border-warm/40 px-3 py-2 text-[10px] text-warm transition-colors hover:border-teal hover:text-teal-deep"
                aria-label="Close image preview"
              >
                Close ×
              </button>
              <img
                src={url}
                alt={ticket.attachment.name}
                className="max-h-[calc(100vh-7rem)] max-w-full object-contain"
              />
              <p className="max-w-full truncate text-caption text-warm/60">{ticket.attachment.name}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border border-surface-2 bg-canvas px-3 py-3 text-body text-warm/80">
      <IconPaperclip size={16} aria-hidden className="text-teal-deep/80" />
      <button type="button" onClick={open} disabled={busy} className="underline decoration-teal/50 underline-offset-4 transition-colors hover:text-teal-deep disabled:opacity-40">
        {ticket.attachment.name}
      </button>
      <span className="mono-label text-[10px] text-warm/35">{(ticket.attachment.size / 1024).toFixed(0)} KB</span>
      {busy ? (
        <span className="mono-label text-[10px] text-warm/25">opening…</span>
      ) : (
        <span className="mono-label inline-flex items-center gap-1 text-[10px] text-warm/25">
          open <IconArrowUpRight size={12} aria-hidden />
        </span>
      )}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user, users } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
  const [, force] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(justCreated);

  useEffect(() => {
    const unsub = subscribe(() => force((n) => n + 1));
    return () => unsub();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    refreshTicket(id)
      .catch((e) => {
        if (alive) setError(e.message ?? String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(false), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl pt-8">
        <EmptyState title="Session expired" body="Your saved user no longer exists in the backend — please sign in again." icon={<IconAlertTriangle size={32} />} />
      </div>
    );
  }

  const ticket = getTicket(id);

  if (!ticket) {
    return (
      <div className="mx-auto max-w-4xl pt-8">
        <EmptyState
          title={`Ticket ${id} not available`}
          body={error ?? "It may have been removed, or the link is wrong."}
          icon={<IconArrowDownRight size={32} />}
        />
      </div>
    );
  }

  const isMine = ticket.employeeId === user.id;
  const isAgent = user.role === "agent";
  if (!isAgent && !isMine) {
    return (
      <div className="mx-auto max-w-4xl pt-8">
        <EmptyState title="No access to this ticket" body="You can only view your own tickets." icon={<IconLock size={32} />} />
      </div>
    );
  }

  const employee = users.find((u) => u.id === ticket.employeeId);
  const assignee = users.find((u) => u.id === ticket.assigneeId);
  const closedBy = users.find((u) => u.id === ticket.closedBy);

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate(isAgent ? "/inbox" : "/my-tickets")}
        className="mono-label inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal-deep"
      >
        <IconArrowLeft size={16} aria-hidden />
        Back to {isAgent ? "inbox" : "my tickets"}
      </button>

      {banner && (
        <div className="mt-4 flex items-center gap-2 border border-ok/40 bg-ok/10 px-4 py-3 text-body-lg text-ok-deep">
          <IconCircleCheck size={16} aria-hidden className="shrink-0" /> Ticket {ticket.id} submitted — HR has been notified.
        </div>
      )}

      <header className="mt-6 mb-6">
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          TICKET
        </span>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="mono-label text-[10px] text-warm/40">{ticket.id}</span>
          <StatusBadge status={ticket.status} size="md" />
          <PriorityBadge priority={ticket.priority} size="md" />
        </div>
        <h1 className="text-h3 text-warm sm:text-h2 sm:leading-[0.85]">{ticket.subject}</h1>
        <p className="mt-2 text-caption text-warm/50">
          {employee?.name} · {employee?.email} · opened {timeAgo(ticket.createdAt)}
        </p>
      </header>

      <section className="soft-bl mb-8 border border-surface-2 bg-surface-2 p-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem label="Category">{ticket.category}</MetaItem>
          <MetaItem label="Opened">{formatDateTime(ticket.createdAt)}</MetaItem>
          <MetaItem label="Last update">{timeAgo(ticket.updatedAt)}</MetaItem>
          <MetaItem label="Assignee">
            {assignee ? assignee.name : <span className="text-warm/25 italic">Unassigned</span>}
          </MetaItem>
          <MetaItem label="Resolved">
            {ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : <span className="text-warm/25">—</span>}
          </MetaItem>
          <MetaItem label="Closed by">
            {closedBy ? closedBy.name : <span className="text-warm/25">—</span>}
          </MetaItem>
        </div>

        {ticket.attachment?.path && <AttachmentChip ticket={ticket} />}

        {isAgent && <AgentControls ticket={ticket} actor={user} users={users} />}
      </section>

      <p className="mono-label mb-4 text-[10px] text-warm/40">CONVERSATION / FIG. {ticket.id.replace("-", ".")}</p>
      <Thread ticket={ticket} users={users} viewer={user} />
    </div>
  );
}