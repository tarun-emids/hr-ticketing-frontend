import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { IconArrowDownRight, IconPaperclip, IconPlus } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import { SkeletonList, EmptyState } from "../components/primitives";
import { timeAgo } from "../utils";
import { deleteDraft, listDrafts } from "../data/store";

function TicketRow({ t }) {
  return (
    <Link
      to={`/tickets/${t.id}`}
      className="group block border border-surface-2 bg-surface p-4 transition-colors hover:border-teal/50 hover:bg-surface-2/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <span className="mono-label text-[10px] text-warm/35">{t.id}</span>
            <span className="text-caption text-warm/40">{timeAgo(t.updatedAt)}</span>
            {t.attachment && <IconPaperclip size={16} aria-hidden className="text-warm/30" />}
          </div>
          <p className="truncate text-body-lg font-medium text-warm group-hover:text-teal-deep">{t.subject}</p>
          <p className="mono-label mt-1 text-[10px] text-warm/40">{t.category}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
        </div>
      </div>
    </Link>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { tickets, loading } = useTickets();
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftError, setDraftError] = useState("");
  const [deletingDraft, setDeletingDraft] = useState("");
  const [searchParams] = useSearchParams();

  const refreshDrafts = useCallback(() => {
    setDraftsLoading(true);
    setDraftError("");
    return listDrafts(user.id)
      .then(setDrafts)
      .catch((error) => setDraftError(error.message || "Could not load drafts."))
      .finally(() => setDraftsLoading(false));
  }, [user.id]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const removeDraft = async (draftId) => {
    setDeletingDraft(draftId);
    setDraftError("");
    try {
      await deleteDraft(draftId, user.id);
      setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    } catch (error) {
      setDraftError(error.message || "Could not delete this draft.");
    } finally {
      setDeletingDraft("");
    }
  };

  const mine = tickets.filter((t) => t.employeeId === user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          01 / EMPLOYEE
        </span>
        <div className="rule-teal mb-5" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-h3 text-warm">My tickets</h1>
            <p className="mt-1.5 text-caption text-warm/45">
              {loading
                ? "Loading your requests…"
                : mine.length === 1
                  ? "1 request"
                  : `${mine.length} requests · updates appear here automatically`}
            </p>
          </div>
          <Link
            to="/new-ticket"
            className="mono-label inline-flex items-center gap-2 border border-teal bg-teal px-4 py-3 text-[10px] text-warm transition-colors hover:bg-teal-light"
          >
            <IconPlus size={16} aria-hidden />
            New ticket
          </Link>
        </div>
      </header>

      {searchParams.get("draftSaved") === "1" && (
        <div className="mb-5 border border-ok/40 bg-ok/10 px-4 py-3 text-body-lg text-ok-deep" role="status">
          Draft saved. You can continue it whenever you’re ready.
        </div>
      )}

      {draftError && (
        <div className="mb-5 border border-error/40 bg-error/10 px-4 py-3 text-caption text-error-deep" role="alert">
          {draftError}
          <button type="button" onClick={refreshDrafts} className="ml-3 underline">Retry</button>
        </div>
      )}

      {(draftsLoading || loading) && (
        <div className="mb-6 border border-surface-2 bg-surface"><SkeletonList rows={2} /></div>
      )}

      {!draftsLoading && drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="mono-label mb-3 text-[10px] text-warm/45">Saved drafts · {drafts.length}</h2>
          <div className="flex flex-col gap-2">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-4 border border-surface-2 bg-surface p-4">
                <Link to={`/drafts/${draft.id}/edit`} className="group min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-3">
                    <span className="mono-label text-[10px] text-teal-deep">Draft</span>
                    <span className="text-caption text-warm/40">Saved {timeAgo(draft.updatedAt)}</span>
                    {draft.attachment && (
                      <span className="text-caption text-warm/35">Attachment included</span>
                    )}
                  </div>
                  <p className="truncate text-body-lg font-medium text-warm group-hover:text-teal-deep">
                    {draft.subject || "Untitled draft"}
                  </p>
                  <p className="mono-label mt-1 text-[10px] text-warm/40">{draft.category} · {draft.priority}</p>
                </Link>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link
                    to={`/drafts/${draft.id}/edit`}
                    className="mono-label border border-teal px-3 py-2 text-center text-[10px] text-teal-deep hover:bg-teal/10"
                  >
                    Continue
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.id)}
                    disabled={Boolean(deletingDraft)}
                    className="mono-label border border-warm/25 px-3 py-2 text-[10px] text-warm/50 hover:border-error hover:text-error-deep disabled:opacity-40"
                  >
                    {deletingDraft === draft.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading || draftsLoading ? null : mine.length === 0 && drafts.length === 0 && !draftError ? (
        <EmptyState
          title="No tickets yet"
          body="When you raise a question with HR it will show up here with a live status so you never wonder where it stands."
          icon={<IconArrowDownRight size={32} />}
        />
      ) : mine.length === 0 ? null : (
        <section>
          <h2 className="mono-label mb-3 text-[10px] text-warm/45">Submitted tickets · {mine.length}</h2>
          <div className="flex flex-col gap-2">
            {mine.map((t) => (
              <TicketRow key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
