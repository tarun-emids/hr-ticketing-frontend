import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import {
  deleteAdminKbDocument,
  listAdminKbDocuments,
  updateAdminKbDocument,
  uploadAdminKbDocument,
} from "./api";
import { Spinner, EmptyState } from "../components/primitives";
import { effectiveFormatter, formatBytes } from "../utils";

// One controlled PDF picker: dashed dropzone look, selected-file chip, and a
// dustbin that clears the choice. `existing` (a current file's size) renders
// the "what is attached today" line so replacing is explicit.
function FilePicker({ value, onChange, existing = null, label = "Policy PDF" }) {
  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        id={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <label
        htmlFor={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
        className="flex cursor-pointer items-center gap-3 border border-dashed border-teal/40 bg-canvas px-4 py-3 transition-colors hover:border-teal"
      >
        <IconUpload size={18} aria-hidden className="shrink-0 text-teal" />
        <span className="min-w-0 flex-1 truncate text-caption text-warm/60">
          {value ? value.name : "Click to choose a PDF"}
        </span>
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {value ? (
          <span className="mono-label flex items-center gap-2 border border-teal/40 bg-teal/10 px-2 py-1 text-[9px] text-teal-light">
            {value.name} · {formatBytes(value.size)}
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Remove the chosen file"
              aria-label="Remove the chosen file"
              className="text-error transition-colors hover:text-warm"
            >
              <IconTrash size={13} aria-hidden />
            </button>
          </span>
        ) : existing ? (
          <span className="mono-label border border-warm/15 px-2 py-1 text-[9px] text-warm/45">
            attached today: {formatBytes(existing)} · choose a PDF above to replace it
          </span>
        ) : (
          <span className="mono-label text-[8px] text-warm/25">PDF only · max 5 MB</span>
        )}
      </div>
    </div>
  );
}

// Policy-library administration (route /admin/kb): upload, edit and delete
// knowledge-base documents. Deleting a policy also deletes its assistant
// citation paragraphs (server-side FK cascade) — the confirm dialog says so —
// and every content write refreshes the assistant's citable paragraphs when
// the embeddings key is configured. Employees never see this surface; the
// pool gates (employee / HR-only) are edited per document here.
export default function AdminKb() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // editing state: slug of the doc being edited + its draft fields + optional new file
  const [edit, setEdit] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    listAdminKbDocuments(user.id)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message || "Could not load the library."));
    return () => {
      alive = false;
    };
  }, [user.id]);

  const upload = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!newFile) {
      setNotice("Choose a PDF file first — pick one in the dashed box.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const created = await uploadAdminKbDocument(user.id, newFile, {
        title: form.elements.title.value,
        category: form.elements.category.value,
        audience: form.elements.audience.value,
        summary: form.elements.summary.value,
        keywords: form.elements.keywords.value,
        version: form.elements.version.value,
        effectiveDate: form.elements.effectiveDate.value,
      });
      setRows((r) => [...(r ?? []), created]);
      setNotice(
        `${created.ref} · ${created.title} uploaded — citations refresh once the key is configured.`,
      );
      form.reset();
      setNewFile(null);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setNotice("");
    try {
      const updated = await updateAdminKbDocument(user.id, edit.slug, {
        file: edit.file || undefined,
        title: edit.title,
        category: edit.category,
        audience: edit.audience,
        summary: edit.summary,
        keywords: edit.keywords,
        version: edit.version,
        effectiveDate: edit.effectiveDate,
      });
      setRows((r) => r.map((x) => (x.slug === updated.slug ? updated : x)));
      setEdit(null);
      setNotice(`${updated.title} saved.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    if (
      !window.confirm(
        `Delete “${doc.title}” (${doc.ref})? Its assistant citation paragraphs are removed with it — affected chat answers will lose this source.`,
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await deleteAdminKbDocument(user.id, doc.slug);
      setRows((r) => r.filter((x) => x.slug !== doc.slug));
      setNotice(`${doc.title} deleted.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="mono-label mb-2 block text-[10px] text-teal">
          ↘ A D M I N · P O L I C I E S
        </span>
        <div className="rule-teal mb-4" />
        <h1 className="text-h3 text-warm">Knowledge base documents</h1>
        <p className="mt-1 text-caption text-warm/45">
          Upload new PDFs, rewrite metadata, replace files — the assistant citations follow
          automatically.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="mb-4 border border-teal/40 bg-teal/10 px-4 py-2.5 text-caption text-teal-light"
        >
          {notice}
        </p>
      )}
      {error && <EmptyState icon="↘" title="Library unavailable" body={error} />}

      {/* library search — filters THIS admin list (title/ref/category/keywords);
          results are the same editor rows, not the employee-facing KB cards */}
      <div className="mb-6">
        <label htmlFor="kb-search" className="mono-label mb-2 block text-[10px] text-warm/45">
          SEARCH THE LIBRARY
        </label>
        <input
          id="kb-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title, ref, category or keyword…"
          aria-label="Search knowledge-base documents"
          className="w-full border-2 border-teal/40 bg-surface px-4 py-3.5 text-body-lg text-warm placeholder:text-warm/35 focus:border-teal focus:outline-none"
        />
      </div>

      {/* upload form */}
      <form
        onSubmit={upload}
        className="mb-8 grid grid-cols-1 gap-2 border border-surface-2 bg-surface p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <FilePicker value={newFile} onChange={setNewFile} label="Policy PDF" />
        </div>
        <input
          name="title"
          required
          placeholder="Policy title"
          aria-label="Policy title"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <input
          name="category"
          placeholder="Category (e.g. Leave)"
          aria-label="Category"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <select
          name="audience"
          aria-label="Audience"
          defaultValue="employee"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm focus:border-teal focus:outline-none"
        >
          <option value="employee">employee pool</option>
          <option value="hr">HR-only pool</option>
        </select>
        <input
          name="keywords"
          placeholder="keywords, comma separated"
          aria-label="Keywords"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="version"
            placeholder="v1.0"
            aria-label="Version"
            className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
          />
          <input
            name="effectiveDate"
            type="date"
            aria-label="Effective date"
            className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm focus:border-teal focus:outline-none"
          />
        </div>
        <textarea
          name="summary"
          placeholder="One-line summary shown on cards"
          rows={2}
          aria-label="Summary"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none sm:col-span-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="mono-label border border-teal bg-teal px-4 py-2 text-[10px] text-canvas transition hover:bg-teal-light disabled:opacity-40 sm:col-span-2"
        >
          UPLOAD PDF
        </button>
      </form>

      {/* library */}
      {rows === null && !error ? (
        <Spinner label="Loading the library" />
      ) : (
        <div className="flex flex-col gap-2">
          <SearchResultsBand rows={rows ?? []} query={query} />
          {filteredRows(rows, query).map((doc) => (
            <div key={doc.slug} className="border border-surface-2 bg-surface p-4">
              {edit?.slug === doc.slug ? (
                <form onSubmit={saveEdit} className="flex flex-col gap-2">
                  <input
                    value={edit.title}
                    onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                    aria-label="Title"
                    className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm focus:border-teal focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input
                      value={edit.category}
                      onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                      aria-label="Category"
                      className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                    />
                    <select
                      value={edit.audience}
                      onChange={(e) => setEdit({ ...edit, audience: e.target.value })}
                      aria-label="Audience"
                      className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                    >
                      <option value="employee">employee</option>
                      <option value="hr">hr</option>
                    </select>
                    <input
                      value={edit.version}
                      onChange={(e) => setEdit({ ...edit, version: e.target.value })}
                      aria-label="Version"
                      className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                    />
                    <input
                      value={edit.effectiveDate ?? ""}
                      onChange={(e) => setEdit({ ...edit, effectiveDate: e.target.value })}
                      type="date"
                      aria-label="Effective date"
                      className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={edit.summary}
                    onChange={(e) => setEdit({ ...edit, summary: e.target.value })}
                    aria-label="Summary"
                    rows={2}
                    className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                  />
                  <textarea
                    value={edit.keywords}
                    onChange={(e) => setEdit({ ...edit, keywords: e.target.value })}
                    rows={1}
                    placeholder="keywords, comma separated"
                    aria-label="Keywords"
                    className="border border-surface-2 bg-canvas px-3 py-2 text-caption text-warm focus:border-teal focus:outline-none"
                  />
                  <div>
                    <FilePicker
                      value={edit.file}
                      onChange={(file) => setEdit({ ...edit, file })}
                      existing={doc.fileSize}
                      label="Replace PDF"
                    />
                    <p className="mono-label mt-1 text-[8px] text-warm/25">
                      replacing the file re-cuts its citation paragraphs
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="mono-label border border-teal bg-teal px-3 py-1.5 text-[10px] text-canvas hover:bg-teal-light disabled:opacity-40"
                    >
                      SAVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdit(null)}
                      className="mono-label border border-warm/20 px-3 py-1.5 text-[10px] text-warm/60 hover:text-warm"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono-label text-[10px] text-teal">{doc.ref}</span>
                  <Link
                    to={`/kb/${doc.slug}`}
                    className="min-w-0 flex-1 truncate text-body-lg text-warm hover:text-teal-light"
                  >
                    {doc.title}
                  </Link>
                  <span className="mono-label text-[9px] text-warm/30">
                    {doc.audience === "hr" ? "HR ONLY" : "ALL EMPLOYEES"} · {doc.version || "v1.0"}{" "}
                    · {doc.effectiveDate ? effectiveFormatter(doc.effectiveDate) : "—"}
                    {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
                  </span>
                  <button
                    onClick={() =>
                      setEdit({
                        ...doc,
                        file: null,
                        keywords: Array.isArray(doc.keywords)
                          ? doc.keywords.join(", ")
                          : doc.keywords,
                      })
                    }
                    disabled={busy}
                    className="mono-label border border-warm/20 px-2 py-1.5 text-[10px] text-warm/70 transition-colors hover:border-teal hover:text-teal disabled:opacity-40"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => remove(doc)}
                    disabled={busy}
                    title={`Delete ${doc.title}`}
                    aria-label={`Delete ${doc.title}`}
                    className="border border-error/40 p-2 text-error transition-colors hover:bg-error/10 disabled:opacity-40"
                  >
                    <IconTrash size={14} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function filteredRows(rows, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (doc) =>
      (doc.title || "").toLowerCase().includes(q) ||
      (doc.ref || "").toLowerCase().includes(q) ||
      (doc.category || "").toLowerCase().includes(q) ||
      (Array.isArray(doc.keywords) ? doc.keywords : (doc.keywords || "").split(","))
        .map((k) => (k || "").toLowerCase().trim())
        .some((k) => k.includes(q)),
  );
}

function SearchResultsBand({ rows, query }) {
  const q = query.trim();
  if (!q) return null;
  return (
    <p className="mono-label -mt-1 mb-1 text-[10px] text-teal">
      SEARCH · {filteredRows(rows, q).length} DOCUMENT
      {filteredRows(rows, q).length === 1 ? "" : "S"} MATCH “{q}” (EDITOR VIEW — EDIT/DELETE ON
      EACH)
    </p>
  );
}
