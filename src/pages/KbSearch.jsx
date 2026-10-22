import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listKbPopular, searchKb } from "../api/client";
import { Spinner, EmptyState } from "../components/primitives";
import { effectiveFormatter } from "../utils";
import { Icon, PATHS } from "../components/icons";

const goBack = (navigate) => () => {
  // browser-like: hop back when there is an in-app history to hop to;
  // on a fresh deep-link, fall back to the home dashboard
  if (window.history.length > 1 && window.history.state?.idx > 0) navigate(-1);
  else navigate("/dashboard");
};

export default function KbSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const fetcher = q ? searchKb(user.id, q) : listKbPopular(user.id);
    fetcher
      .then((rows) => {
        if (alive) setResults(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message || "Could not reach the knowledge base.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q, user.id]);

  const submit = (e) => {
    e.preventDefault();
    const next = input.trim();
    setSearchParams(next ? { q: next } : {}, { replace: true });
  };

  const heading = q ? `${results?.length ?? "—"} result${results?.length === 1 ? "" : "s"} for “${q}”` : "Latest in your library";

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={goBack(navigate)}
        title="Go back (Alt+← works too)"
        className="mono-label mb-6 inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal"
      >
        <Icon d={PATHS.arrowLeft} className="h-3.5 w-3.5" />
        Back
      </button>

      <header className="mb-8">
        <span className="mono-label mb-3 block text-[10px] text-teal">↘ 0 2 / K N O W L E D G E</span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">Knowledge base</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          {q ? heading : "Company policies — the documents your role is allowed to see"}
        </p>
      </header>

      <form onSubmit={submit} role="search" className="mb-8 flex">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search policies by title, topic or keyword…"
          aria-label="Search the knowledge base"
          className="flex-1 border border-surface-2 bg-surface px-4 py-2.5 text-body-lg text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <button
          type="submit"
          className="mono-label border border-l-0 border-teal bg-teal px-4 text-[10px] text-canvas transition-colors hover:bg-teal-light"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-5 border border-error/40 bg-error/10 px-4 py-3 text-caption text-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner label="Searching the library" />
      ) : !q && (!results || results.length === 0) ? (
        <EmptyState
          title="The library is still empty"
          body="Policy documents will appear here once HR seeds them into the knowledge base."
          icon="↘"
        />
      ) : q && results && results.length === 0 ? (
        <EmptyState
          title="No documents matched"
          body="Try fewer or simpler words — for example “leave”, “payslip”, “insurance” or “work from home”."
          icon="↘"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((doc) => (
            <Link
              key={doc.slug}
              to={`/kb/${doc.slug}`}
              className="group block border border-surface-2 bg-surface p-4 transition-colors hover:border-teal/50 hover:bg-surface-2/50 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-3">
                    <span className="mono-label text-[10px] text-teal">{doc.ref}</span>
                    <span className="mono-label text-[10px] text-warm/35">{doc.category}</span>
                    <span className="mono-label text-[9px] text-warm/30">
                      {doc.audience === "hr" ? "HR ONLY" : "ALL EMPLOYEES"}
                    </span>
                    {doc.version && (
                      <span className="mono-label text-[9px] text-warm/30">{doc.version}</span>
                    )}
                  </div>
                  <p className="text-body-lg font-medium text-warm group-hover:text-teal-light">
                    {doc.title}
                  </p>
                  <p className="mt-1 text-caption leading-relaxed text-warm/45 line-clamp-2">
                    {doc.summary}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Icon
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    className="h-4 w-4 text-warm/25 transition-all group-hover:translate-x-0.5 group-hover:text-teal"
                  />
                  <span className="mono-label text-[9px] text-warm/30">
                    {effectiveFormatter(doc.effectiveDate)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!q && !loading && results && results.length > 0 && (
        <p className="mt-6 text-caption text-warm/35">
          Looking for something specific? Search above — results are limited to the documents
          available to your role.
        </p>
      )}
      {q && (
        <p className="mt-10 text-caption text-warm/25">
          Top {results?.length ?? 0} match{results?.length === 1 ? "" : "es"} — shorter, more
          specific words rank better.
        </p>
      )}
    </div>
  );
}
