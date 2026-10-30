// HR assistant HTTP surface (src/rag) — one application, one file.
//
// Rides the shared client pipeline so each call keeps the W3C traceparent,
// X-Request-ID correlation and the request log every other API call uses.
// The backend resolves the employee's role from its own account table, so
// the chat's knowledge-base visibility needs no extra auth surface.
import { request } from "../api/client";

// POST /api/assistant/ask — { employeeId, question }
// -> { id, answer, citations: [{ref, slug, title, section, blockNo, snippet}] }
// Every answer carries inline [REF - ¶n] markers plus a Citations list that
// the UI renders as source chips; no conversation state crosses the wire.
export function askAssistant(employeeId, question) {
  return request("/assistant/ask", {
    method: "POST",
    body: { employeeId, question },
    operation: "assistant.ask",
  });
}
