import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getKbDoc, getKbDocUrl } from "../api/client";
import { Spinner, EmptyState } from "../components/primitives";
import { Icon, PATHS } from "../components/icons";
import { effectiveFormatter, formatBytes } from "../utils";

export default function KbViewer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { slug } = useParams();
  const [doc, setDoc] = useState(null); // null until loaded; false = 403/404
  const [docError, setDocError] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [urlError, setUrlError] = useState("");
  // Download does a real navigate: the HTML `download` attribute is ignored
  // for cross-origin links (the signed URL lives on the Supabase domain), so
  // a link with attachment disposition must be minted and then navigated to.
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let alive = true;
    setDoc(null);
    setFileUrl(null);
    setUrlError("");
    getKbDoc(slug, user.id)
      .then((d) => {
        if (alive) setDoc(d);
      })
      .catch((e) => {
        if (!alive) return;
        setDoc(false);
        setDocError(e.message || "This document could not be opened.");
      });
    return () => {
      alive = false;
    };
  }, [slug, user.id]);

  const loadUrl = useCallback(() => {
    setUrlError("");
    setFileUrl(null);
    getKbDocUrl(slug, user.id)
      .then((r) => setFileUrl(r.url))
      .catch((e) => setUrlError(e.message || "Could not prepare the document viewer."));
  }, [slug, user.id]);

  // Navigates to the download-flavoured signed URL; Content-Disposition:
  // attachment makes the browser save the file (naming it after the policy).
  const startDownload = useCallback(() => {
    setDownloadError("");
    setDownloading(true);
    getKbDocUrl(slug, user.id, true)
      .then((r) => {
        window.location.assign(r.url);
      })
      .catch((e) => setDownloadError(e.message || "The download could not be started."))
      .finally(() => setDownloading(false));
  }, [slug, user.id]);

  useEffect(() => {
    if (doc) loadUrl();
  }, [doc, loadUrl]);

  useEffect(() => {
    document.title = doc?.title ? `${doc.title} / HR Desk` : "Knowledge base / HR Desk";
  }, [doc]);

  const allowed = Boolean(doc);

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() =>
          window.history.length > 1 && window.history.state?.idx > 0
            ? navigate(-1)
            : navigate("/dashboard")
        }
        title="Go back"
        className="mono-label mb-6 inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal"
      >
        <Icon d={PATHS.arrowLeft} className="h-3.5 w-3.5" />
        Back
      </button>

      {doc === null ? (
        <Spinner label="Opening document" />
      ) : !allowed ? (
        <EmptyState
          icon={<Icon d={PATHS.lock} className="h-6 w-6" />}
          title={
            (docError || "").toLowerCase().includes("permission")
              ? "Restricted document"
              : "Document not found"
          }
          body={
            (docError || "").toLowerCase().includes("permission")
              ? "This document belongs to another team's library. You can search the full catalogue — documents outside your workspace stay unreachable by design."
              : docError || "The link may be outdated — try the knowledge base search."
          }
        />
      ) : (
        <>
          <header className="mb-6">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="mono-label text-[10px] text-teal">{doc.ref}</span>
              <span className="mono-label text-[10px] text-warm/35">{doc.category}</span>
              <span className="mono-label text-[9px] text-warm/30">
                {doc.audience === "hr" ? "HR ONLY" : "ALL EMPLOYEES"}
              </span>
            </div>
            <h1 className="text-h3 text-warm">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-warm/40">
              <span>Version {doc.version}</span>
              <span>Effective {effectiveFormatter(doc.effectiveDate)}</span>
              {doc.pages ? <span>{doc.pages} pages</span> : null}
              {doc.fileSize ? <span>{formatBytes(doc.fileSize)}</span> : null}
            </div>
            {doc.summary && (
              <p className="mt-3 max-w-3xl text-caption leading-relaxed text-warm/55">
                {doc.summary}
              </p>
            )}
          </header>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <a
              href={fileUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`mono-label inline-flex items-center gap-2 border border-teal bg-teal px-4 py-2.5 text-[10px] text-canvas transition-colors hover:bg-teal-light ${
                fileUrl ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <Icon d={PATHS.external} className="h-3.5 w-3.5" />
              Open in new tab
            </a>
            <button
              type="button"
              onClick={startDownload}
              disabled={!doc || downloading}
              className={`mono-label inline-flex items-center gap-2 border border-warm/20 px-4 py-2.5 text-[10px] text-warm transition-colors hover:border-teal hover:text-teal ${
                doc && !downloading ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <Icon d={PATHS.download} className="h-3.5 w-3.5" />
              {downloading ? "Preparing…" : "Download"}
            </button>
            <button
              type="button"
              onClick={loadUrl}
              className="mono-label inline-flex items-center gap-2 border border-transparent px-3 text-[10px] text-warm/45 hover:text-warm"
              title="Signed links expire — refresh if the viewer went blank"
            >
              <Icon d={PATHS.refresh} className="h-3.5 w-3.5" />
              Refresh link
            </button>
          </div>
          {downloadError && (
            <p className="mb-2 text-caption text-error" role="alert">
              {downloadError}
            </p>
          )}

          <div className="soft-bl border border-surface-2 bg-surface">
            {urlError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <p className="text-caption text-error">{urlError}</p>
                <button
                  type="button"
                  onClick={loadUrl}
                  className="mono-label border border-teal px-4 py-2 text-[10px] text-teal hover:bg-teal/10"
                >
                  Try again
                </button>
              </div>
            ) : fileUrl ? (
              <iframe
                key={fileUrl}
                src={fileUrl}
                title={doc.title}
                className="block h-[75vh] w-full bg-canvas"
              />
            ) : (
              <div className="flex h-[40vh] items-center justify-center">
                <Spinner label="Preparing secure link" />
              </div>
            )}
          </div>

          <p className="mt-3 text-caption text-warm/30">
            Link is signed and short-lived — regenerate it any time with “Refresh link”.
          </p>
        </>
      )}
    </div>
  );
}
