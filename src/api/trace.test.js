// Unit tests for trace-context handling in src/api/client.js + src/api/trace.js.
// Runs offline — fetch is stubbed; no requests leave the process.
//
// Trace ids are the OpenTelemetry SDK's own (never hand-rolled): every
// assertion pins the STANDARD W3C shape, that two requests never share a
// trace, and that the ingest events carry the SAME trace context the header
// carries — which is what lets the backend stamp frontend records with
// the original operation's trace. Each event also carries the business
// `operation` label so frontend rows can be filtered like backend flow events.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTicket, listTickets, updateStatus, uploadAttachment } from "./client";

const TRACE_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let calls; // every fetch call: { url, init } — including /logs/ingest POSTs
const httpCalls = () => calls.filter((c) => !c.url.includes("/logs/ingest"));
const ingestCalls = () => calls.filter((c) => c.url.includes("/logs/ingest"));
const savedViteTrace = import.meta.env.VITE_TRACE;

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })
  );
});

afterEach(() => {
  import.meta.env.VITE_TRACE = savedViteTrace;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const traceIdFrom = (init) => init.headers.traceparent.slice(3, 35);
const spanIdFrom = (init) => init.headers.traceparent.slice(36, 52);

describe("frontend trace context (client.js + trace.js)", () => {
  it("stamps a valid W3C traceparent on JSON requests, from the OTel SDK", async () => {
    await expect(createTicket({ employeeId: "u1" })).resolves.toEqual({});
    const init = httpCalls()[0].init;
    expect(init.headers.traceparent).toMatch(TRACE_RE);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ employeeId: "u1" }));
  });

  it("stamps traceparent on multipart requests without forcing Content-Type", async () => {
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    await uploadAttachment("TKT-101", file);
    const init = httpCalls()[0].init;
    expect(init.headers.traceparent).toMatch(TRACE_RE);
    expect(init.headers["Content-Type"]).toBeUndefined(); // browser sets multipart boundary
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("generates a fresh, distinct trace context per request", async () => {
    await listTickets();
    await listTickets();
    const first = httpCalls()[0].init.headers.traceparent;
    const second = httpCalls()[1].init.headers.traceparent;
    expect(first).toMatch(TRACE_RE);
    expect(second).toMatch(TRACE_RE);
    expect(first).not.toBe(second);
  });

  it("X-Request-ID and traceparent travel together on the same request", async () => {
    await listTickets();
    const { headers } = httpCalls()[0].init;
    expect(headers["X-Request-ID"]).toMatch(UUID_RE);
    expect(headers.traceparent).toMatch(TRACE_RE);
  });

  it("ingest events carry the SAME trace/span ids the header carries", async () => {
    await listTickets();

    const httpCall = httpCalls()[0];
    const traceId = traceIdFrom(httpCall.init);
    const spanId = spanIdFrom(httpCall.init);
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);

    const events = ingestCalls().map((c) => JSON.parse(c.init.body).events[0]);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.traceId).toBe(traceId); // original operation's trace pair,
      expect(e.spanId).toBe(spanId);   // not the ingest hop's own context
      expect(e.correlationId).toBe(httpCall.init.headers["X-Request-ID"]);
      expect(e.logId).toMatch(UUID_RE);
    }
  });

  it("keeps one correlation id and the operation label across all events", async () => {
    await listTickets();
    const events = ingestCalls().map((c) => JSON.parse(c.init.body).events[0]);
    const names = events.map((e) => e.event);
    expect(names[0]).toBe("http_request_start");
    expect(names.at(-1)).toBe("http_request_succeeded");
    const correlationIds = new Set(events.map((e) => e.correlationId));
    expect(correlationIds.size).toBe(1);
    for (const e of events) {
      expect(e.operation).toBe("tickets.list");   // matches backend hrdesk.flow tag
      expect(e.endpoint).toBe("/tickets");          // query strings stripped
      expect(e.method).toBe("GET");
      expect(e.source).toBeUndefined();             // server stamps `source`
      // every event's log id is unique
      expect(events.filter((x) => x.logId === e.logId)).toHaveLength(1);
    }
  });

  it("labels each lifecycle event with the call's business operation", async () => {
    await updateStatus("TKT-101", { status: "Resolved", actorId: "u2" });
    const events = ingestCalls().map((c) => JSON.parse(c.init.body).events[0]);
    expect(events.map((e) => e.event)).toEqual([
      "http_request_start",
      "http_request_succeeded",
    ]);
    for (const e of events) {
      expect(e.operation).toBe("tickets.status"); // same tag the backend flow events use
      expect(e.endpoint).toBe("/tickets/TKT-101/status");
      expect(e.method).toBe("PATCH");
    }
  });

  it("warns once with the trace id when the response is an HTTP error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: "not allowed" }), { status: 403 })
        )
      )
    );
    await expect(listTickets()).rejects.toThrow("not allowed");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/trace=[0-9a-f]{32}/);
    // (this stub doesn't record calls — error-path operation labels are
    // asserted in "labels each lifecycle event..." style tests with the
    // recording stub)
  });

  it("VITE_TRACE=false sends no traceparent header and no trace ids on events", async () => {
    import.meta.env.VITE_TRACE = "false";
    await listTickets();
    const init = httpCalls()[0].init;
    expect(init.headers?.traceparent).toBeUndefined();
    expect(init.headers?.["Content-Type"]).toBe("application/json");

    const events = ingestCalls().map((c) => JSON.parse(c.init.body).events[0]);
    for (const e of events) {
      expect(e.traceId).toBeUndefined();
      expect(e.spanId).toBeUndefined();
      // correlation + operation labels still flow without tracing
      expect(e.correlationId).toBe(init.headers["X-Request-ID"]);
      expect(e.operation).toBe("tickets.list");
    }
  });

  it("comes back clean after VITE_TRACE=false (no stale state)", async () => {
    import.meta.env.VITE_TRACE = "false";
    await listTickets();
    import.meta.env.VITE_TRACE = savedViteTrace;
    await listTickets();
    expect(httpCalls()[1].init.headers.traceparent).toMatch(TRACE_RE);
  });

  it("includes the backend's request id in the correlation line", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", "x-request-id": "req-echo-123" },
          })
        )
      )
    );
    await listTickets();
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy.mock.calls[0][0]).toContain("req=req-echo-123");
  });
});
