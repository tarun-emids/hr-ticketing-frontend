import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { IconArrowDownRight, IconPaperclip, IconPlus } from "@tabler/icons-react";
import { useTicketsPage } from "../hooks";
import { useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import { SkeletonList, EmptyState, PageBanner } from "../components/primitives";
import { timeAgo } from "../utils";
import { deleteDraft, listDrafts } from "../api/client";
import cityImg from "../assets/city-teal.jpg";

function TicketRow({ t, index = 0 }) {
  return (
    <Link
      to={`/tickets/${t.id}`}
      className="lift group block animate-fade-up border border-surface-2 bg-surface p-4 transition-colors hover:border-teal/50 hover:bg-surface-2/50"
      style={{ animationDelay: `${Math.min(index, 20) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <span className="mono-label text-[10px] text-ink-3">{t.id}</span>
            <span className="text-caption text-ink-3">{timeAgo(t.updatedAt)}</span>
            {t.attachment && <IconPaperclip size={16} aria-hidden className="text-ink-3" />}
          </div>
          <p className="truncate text-body-lg font-medium text-warm group-hover:text-teal-deep">
            {t.subject}
          </p>
          <p className="mono-label mt-1 text-[10px] text-ink-3">{t.category}</p>
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
  const user = useAppSelector(selectUser);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftError, setDraftError] = useState("");
  const [deletingDraft, setDeletingDraft] = useState("");
  const [searchParams] = useSearchParams();

  const view = useTicketsPage(user?.id, { page: 1, pageSize: 100 });

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

  const mine = view.items;

  return (
    <div className="mx-auto max-w-4xl">
      <PageBanner
        image={cityImg}
        position="center 45%"
        title="My tickets"
        sub={
          view.loading
            ? "Loading your requests…"
            : view.total === 1
              ? "1 request · updates appear here automatically"
              : `${view.total} requests · updates appear here automatically`
        }
      >
        <div className="mt-4 flex justify-end">
          <Link
            to="/new-ticket"
            className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-body font-medium text-canvas shadow-xs transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlus size={16} aria-hidden />
            New ticket
          </Link>
        </div>
      </PageBanner>

      {searchParams.get("draftSaved") === "1" && (
        <div
          className="mb-5 border border-ok/40 bg-ok/10 px-4 py-3 text-body-lg text-ok-deep"
          role="status"
        >
          Draft saved. You can continue it whenever you’re ready.
        </div>
      )}

      {draftError && (
        <div
          className="mb-5 border border-error/40 bg-error/10 px-4 py-3 text-caption text-error-deep"
          role="alert"
        >
          {draftError}
          <button type="button" onClick={refreshDrafts} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {(draftsLoading || view.loading) && (
        <div className="mb-6 border border-surface-2 bg-surface">
          <SkeletonList rows={2} />
        </div>
      )}

      {!draftsLoading && drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-caption font-semibold text-ink-2">
            Saved drafts · {drafts.length}
          </h2>
          <div className="flex flex-col gap-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between gap-4 border border-surface-2 bg-surface p-4"
              >
                <Link to={`/drafts/${draft.id}/edit`} className="group min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-3">
                    <span className="mono-label text-[10px] text-teal-deep">Draft</span>
                    <span className="text-caption text-ink-3">
                      Saved {timeAgo(draft.updatedAt)}
                    </span>
                    {draft.attachment && (
                      <span className="text-caption text-ink-3">Attachment included</span>
                    )}
                  </div>
                  <p className="truncate text-body-lg font-medium text-warm group-hover:text-teal-deep">
                    {draft.subject || "Untitled draft"}
                  </p>
                  <p className="mono-label mt-1 text-[10px] text-ink-3">
                    {draft.category} · {draft.priority}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Link
                    to={`/drafts/${draft.id}/edit`}
                    className="rounded-lg border border-teal/40 px-3 py-1.5 text-center text-body font-medium text-teal-deep transition-colors hover:bg-teal/10"
                  >
                    Continue
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.id)}
                    disabled={Boolean(deletingDraft)}
                    className="rounded-lg border border-warm/20 px-3 py-1.5 text-body font-medium text-ink-3 transition-colors hover:border-error/50 hover:text-error-deep disabled:opacity-40"
                  >
                    {deletingDraft === draft.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {view.loading || draftsLoading ? null : mine.length === 0 &&
        drafts.length === 0 &&
        !draftError ? (
        <EmptyState
          title="No tickets yet"
          body="When you raise a question with HR it will show up here with a live status so you never wonder where it stands."
          icon={<IconArrowDownRight size={32} />}
        />
      ) : mine.length === 0 ? null : (
        <>
          {(() => {
            const open = mine.filter((t) => !["Resolved", "Closed"].includes(t.status));
            const settled = mine.filter((t) => ["Resolved", "Closed"].includes(t.status));
            return (
              <>
                <section className="mb-8">
                  <h2 className="mb-3 text-caption font-semibold text-teal-deep">
                    Open / in progress · {open.length}
                  </h2>
                  {open.length ? (
                    <div className="flex flex-col gap-2">
                      {open.map((t, i) => (
                        <TicketRow key={t.id} t={t} index={i} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-caption text-ink-3">
                      Nothing open — all your requests are settled.
                    </p>
                  )}
                </section>
                {settled.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-caption font-semibold text-ink-2">
                      Settled · {settled.length} resolved or closed
                    </h2>
                    <div className="flex flex-col gap-2">
                      {settled.map((t, i) => (
                        <TicketRow key={t.id} t={t} index={i} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
