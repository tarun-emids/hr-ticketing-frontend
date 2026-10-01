import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, PRIORITIES } from "../data/users";
import { createTicket } from "../data/store";
import { useAuth } from "../context/AuthContext";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB demo cap

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 flex items-center gap-1 text-xs text-red-600">{msg}</p>;
}

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-300 focus:border-accent-500"
  }`;

export default function TicketForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (subject.trim().length < 5)
      e.subject = "Subject needs at least 5 characters.";
    if (description.trim().length < 20)
      e.description = "Add a little more detail so HR can help faster (min 20 characters).";
    if (!category) e.category = "Choose a category.";
    if (!priority) e.priority = "Choose a priority.";
    if (file && file.size > MAX_FILE_BYTES)
      e.attachment = `File is larger than 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    const fileMeta = file ? { name: file.name, size: file.size } : null;
    const created = await new Promise((resolve) =>
      setTimeout(
        () =>
          resolve(
            createTicket({
              employeeId: user.id,
              category,
              subject: subject.trim(),
              description: description.trim(),
              priority,
              attachment: fileMeta,
            })
          ),
        500
      )
    );
    navigate(`/tickets/${created.id}?created=1`);
  };

  const onPickFile = (ev) => {
    const picked = ev.target.files?.[0] ?? null;
    setFile(picked);
    setErrors((prev) => ({ ...prev, attachment: undefined }));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="tf-category" className="mb-1.5 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="tf-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass(errors.category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError msg={errors.category} />
          <p className="mt-1 text-xs text-slate-400">Pick the area your question belongs to.</p>
        </div>

        <div>
          <label htmlFor="tf-priority" className="mb-1.5 block text-sm font-medium text-slate-700">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            id="tf-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputClass(errors.priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError msg={errors.priority} />
          <p className="mt-1 text-xs text-slate-400">How urgent is it for you?</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-subject" className="mb-1.5 block text-sm font-medium text-slate-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="tf-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. May payslip is missing the shift allowance"
            className={inputClass(errors.subject)}
          />
          <FieldError msg={errors.subject} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="tf-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, when, and anything HR should know."
            className={`${inputClass(errors.description)} resize-y`}
          />
          <FieldError msg={errors.description} />
          <p className="mt-1 text-xs text-slate-400">{description.trim().length} characters</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tf-file" className="mb-1.5 block text-sm font-medium text-slate-700">
            Attachment <span className="text-slate-400">(optional)</span>
          </label>
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
              <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.4 9.7-6.7 6.7a4 4 0 0 1-5.7-5.7l7.1-7.1a2.6 2.6 0 1 1 3.8 3.6l-6.5 6.5a1.4 1.4 0 0 1-2-2l5.9-6" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              htmlFor="tf-file"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500 hover:border-accent-400 hover:bg-accent-50/40"
            >
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v10m0 0 4-4m-4 4-4-4M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20h10.5a2.25 2.25 0 0 0 2.25-2.25V16.5" />
              </svg>
              Click to attach a file (screenshots, documents)
            </label>
          )}
          <input
            id="tf-file"
            type="file"
            className="hidden"
            onChange={onPickFile}
          />
          <FieldError msg={errors.attachment} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => navigate("/my-tickets")}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path fill="currentColor" className="opacity-90" d="M4 12a8 8 0 0 1 8-8V2A10 10 0 1 0 22 12h-2a8 8 0 0 0-8-8z" />
            </svg>
          )}
          {submitting ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
