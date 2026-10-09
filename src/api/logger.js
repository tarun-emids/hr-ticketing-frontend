// Structured frontend logger → the backend's EXISTING logs/app.log.
//
// Events are POSTed (fire-and-forget, batch of one) to /api/logs/ingest,
// where they're validated and written through the backend's standard
// logging configuration — same file backend records use. Every event
// carries its own log_id plus the correlation_id of the HTTP operation it
// belongs to (which the backend already stamps on its own records via the
// X-Request-ID header), so one correlation id finds start → backend receipt
// → DB ops → response → frontend outcome in one file.
//
// Safety rules (observability spec §4/§5):
// - never logged: the ingest POST itself (recursion guard), anything to
//   /logs (recursion/DoS), values of sensitive params (backend redacts),
//   tokens/cookies/urls beyond endpoint path, or any ticket content;
// - failures are swallowed (and console.debug'd) — logging can never
//   break a ticket operation; no retries, so no amplification;
// - VITE_LOGS=false disables the remote sink entirely (backend keeps its
//   logs either way; correlation still flows via X-Request-ID).

const endpointEnv = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const INGEST_URL = `${endpointEnv.replace(/\/+$/, "")}/logs/ingest`;
const logsEnabled = () => import.meta.env.VITE_LOGS !== "false";

function randomId() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  buffer[6] = (buffer[6] & 0x0f) | 0x40; // uuid4 version — same shape backend validates
  buffer[8] = (buffer[8] & 0x3f) | 0x80; // uuid4 variant
  const hex = Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export { randomId };

// One correlation id for the duration of one HTTP operation (request +
// backend receipt + response). Exposed so client.js can pass it as the
// X-Request-ID header and stamp related events.
export function newCorrelationId() {
  return randomId();
}

export function logEvent(event, { level = "INFO", correlationId = null, ...fields }) {
  if (!logsEnabled()) return;
  try {
    const payload = {
      logId: randomId(),
      correlationId,
      level,
      event,
      occurredAt: new Date().toISOString(),
      ...fields,
    };
    fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [payload] }),
      keepalive: true, // survives page unload for failure-path events
    }).catch(() => {
      try {
        console.debug("[frontend-logger] ingest unreachable; event dropped");
      } catch {
        /* console itself unavailable — nothing more to do */
      }
    });
  } catch {
    /* logging must never throw into application code */
  }
}
