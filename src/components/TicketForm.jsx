import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconArrowDownRight, IconPaperclip, IconUpload } from "@tabler/icons-react";
import { CATEGORIES, PRIORITIES } from "../data/users";
import {
  createDraft,
  createTicket,
  deleteDraftAttachment,
  getDraft,
  submitDraft,
  updateDraft,
  uploadAttachment,
  uploadDraftAttachment,
} from "../data/store";
import { useAuth } from "../context/AuthContext";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — same cap the backend enforces

const FIELD =
  "w-full border bg-canvas px-3 py-3 text-body-lg text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block mono-label text-[10px] text-warm/50";

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-caption text-error-deep">
      <span aria-hidden className="mt-0.5 block h-2 w-2 shrink-0 bg-error" />
      {msg}
    </p>
  );
}

export default function TicketForm() {
  const navigate = useNavigate();
  const { id: draftId } = useParams();
  const { user } = useAuth();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftId));
  const [savedAttachment, setSavedAttachment] = useState(null);
  const [draftLoadError, setDraftLoadError] = useState("");
  const [activeDraftId, setActiveDraftId] = useState(draftId ?? null);

  useEffect(() => {
    setActiveDraftId(draftId ?? null);
    if (!draftId) {
      setCategory(CATEGORIES[0]);
      setSubject("");
      setDescription("");
      setPriority("Medium");
      setFile(null);
      setSavedAttachment(null);
      setDraftLoadError("");
      setErrors({});
      setLoadingDraft(false);
      return undefined;
    }
    let active = true;
    setLoadingDraft(true);
    getDraft(draftId, user.id)
      .then((draft) => {
        if (!active) return;
        setCategory(draft.category);
        setSubject(draft.subject);
        setDescription(draft.description);
        setPriority(draft.priority);
        setSavedAttachment(draft.attachment);
      })
      .catch((err) => {
        if (active) setDraftLoadError(err.message || "Could not load this draft.");
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [draftId, user.id]);

  const validate = () => {
    const e = {};
    if (subject.trim().length < 5) e.subject = "Subject needs at least 5 characters.";
    if (description.trim().length < 20) e.description = "Add a little more detail so HR can help faster (min 20 characters).";
    if (!category) e.category = "Choose a category.";
    if (!priority) e.priority = "Choose a priority.";
    if (file && file.size > MAX_FILE_BYTES) e.attachment = `File is larger than 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    try {
      if (activeDraftId) {
        await updateDraft(activeDraftId, user.id, {
          category,
          subject: subject.trim(),
          description: description.trim(),
          priority,
        });
        if (file) await uploadDraftAttachment(activeDraftId, user.id, file);
        const saved = await submitDraft(activeDraftId, { employeeId: user.id });
        navigate(`/tickets/${saved.id}?created=1`);
        return;
      }
      const saved = await createTicket({
        employeeId: user.id,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      if (file) {
        await uploadAttachment(saved.id, file);
      }
      navigate(`/tickets/${saved.id}?created=1`);
    } catch (err) {
      setErrors({ _form: err.message || "Could not submit the ticket — is the API running?" });
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveDraft = async () => {
    if (file && file.size > MAX_FILE_BYTES) {
      setErrors({ attachment: `File is larger than 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).` });
      return;
    }
    setSavingDraft(true);
    setErrors({});
    try {
      const payload = {
        employeeId: user.id,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      };
      const saved = activeDraftId
        ? await updateDraft(activeDraftId, user.id, payload)
        : await createDraft(payload);
      if (!activeDraftId) setActiveDraftId(saved.id);
      if (file) await uploadDraftAttachment(saved.id, user.id, file);
      navigate("/my-tickets?draftSaved=1");
    } catch (err) {
      setErrors({ _form: err.message || "Could not save this draft." });
    } finally {
      setSavingDraft(false);
    }
  };

  const onRemoveSavedAttachment = async () => {
    try {
      await deleteDraftAttachment(activeDraftId, user.id);
      setSavedAttachment(null);
    } catch (err) {
      setErrors((current) => ({ ...current, attachment: err.message || "Could not remove attachment." }));
    }
  };

  const onPickFile = (ev) => {
    const picked = ev.target.files?.[0] ?? null;
    setFile(picked);
    setErrors((prev) => ({ ...prev, attachment: undefined }));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="soft-bl border border-surface-2 bg-surface p-6 sm:p-8">
      {loadingDraft ? (
        <p className="text-body text-warm/55" role="status">Loading draft…</p>
      ) : draftLoadError ? (
        <div className="border border-error/40 bg-error/10 px-4 py-3">
          <FieldError msg={draftLoadError} />
        </div>
      ) : (
      <>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="tf-category" className={LABEL}>Category</label>
          <select id="tf-category" value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError msg={errors.category} />
        </div>

        <div>
          <label htmlFor="tf-priority" className={LABEL}>Priority</label>
          <select id="tf-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError msg={errors.priority} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-subject" className={LABEL}>Subject</label>
          <input
            id="tf-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. May payslip is missing the shift allowance"
            className={FIELD}
          />
          <FieldError msg={errors.subject} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-description" className={LABEL}>Description</label>
          <textarea
            id="tf-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, when, and anything HR should know."
            className={`${FIELD} resize-y`}
          />
          <FieldError msg={errors.description} />
          <p className="mt-1.5 mono-label text-[10px] text-warm/30">{description.trim().length} CHARS</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-file" className={LABEL}>Attachment · Optional</label>
          {file ? (
            <div className="flex items-center gap-3 border border-teal/40 bg-teal/5 px-3 py-3">
              <IconPaperclip size={16} aria-hidden className="shrink-0 text-teal-deep" />
              <span className="min-w-0 flex-1 truncate text-body-lg text-warm">{file.name}</span>
              <span className="mono-label shrink-0 text-[10px] text-warm/40">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mono-label shrink-0 text-[10px] text-error-deep hover:underline"
              >
                Remove
              </button>
            </div>
          ) : savedAttachment ? (
            <div className="flex items-center gap-3 border border-teal/40 bg-teal/5 px-3 py-3">
              <span className="min-w-0 flex-1 truncate text-body-lg text-warm">{savedAttachment.name}</span>
              <span className="mono-label shrink-0 text-[10px] text-warm/40">{(savedAttachment.size / 1024).toFixed(0)} KB</span>
              <label htmlFor="tf-file" className="mono-label shrink-0 cursor-pointer text-[10px] text-teal-deep hover:underline">
                Replace
              </label>
              <button
                type="button"
                onClick={onRemoveSavedAttachment}
                className="mono-label shrink-0 text-[10px] text-error-deep hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              htmlFor="tf-file"
              className="flex cursor-pointer items-center gap-3 border border-dashed border-warm/30 bg-canvas px-3 py-5 text-body text-warm/50 transition-colors hover:border-teal/50 hover:text-warm"
            >
              <IconUpload size={16} aria-hidden className="text-teal-deep/80" />
              Click to attach a screenshot or document
            </label>
          )}
          <input id="tf-file" type="file" className="hidden" onChange={onPickFile} />
          <FieldError msg={errors.attachment} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-4 border-t border-surface-2 pt-6">
        <button
          type="button"
          onClick={() => navigate("/my-tickets")}
          className="mono-label px-2 py-2 text-[10px] text-warm/50 hover:text-warm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={submitting || savingDraft}
          className="mono-label border border-warm/35 px-4 py-3 text-[10px] text-warm/65 transition-colors hover:border-teal hover:text-teal-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {savingDraft ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={submitting || savingDraft}
          className="mono-label inline-flex items-center gap-2 border border-teal bg-teal px-5 py-3 text-[10px] text-warm transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit ticket"}
          <IconArrowDownRight size={16} aria-hidden />
        </button>
      </div>

      {errors._form && (
        <div className="mt-4 border border-error/40 bg-error/10 px-4 py-3">
          <FieldError msg={errors._form} />
        </div>
      )}
      </>
      )}
    </form>
  );
}
