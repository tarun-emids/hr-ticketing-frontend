// Unit tests for trace-context handling in src/api/client.js.
// Runs offline — fetch is stubbed; no requests leave the process.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTicket, listTickets, uploadAttachment } from "./client";

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

describe("frontend trace context (client.js)", () => {
  it("stamps a valid W3C traceparent on JSON requests", async () => {
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

  it("generates a fresh trace context per request", async () => {
    await listTickets();
    await listTickets();
    const first = httpCalls()[0].init.headers.traceparent;
    const second = httpCalls()[1].init.headers.traceparent;
    expect(first).toMatch(TRACE_RE);
    expect(second).toMatch(TRACE_RE);
    expect(first).not.toBe(second);
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
  });

  it("VITE_TRACE=false sends no traceparent header (request contract unchanged)", async () => {
    import.meta.env.VITE_TRACE = "false";
    await listTickets();
    const init = httpCalls()[0].init;
    expect(init.headers?.traceparent).toBeUndefined();
    expect(init.headers?.["Content-Type"]).toBe("application/json");
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

  it("sends the correlation id via X-Request-ID and stamps frontend events with it", async () => {
    await listTickets();

    const httpCall = httpCalls()[0];
    const correlationId = httpCall.init.headers["X-Request-ID"];
    expect(correlationId).toMatch(UUID_RE);
    expect(httpCall.init.headers.traceparent).toMatch(TRACE_RE);

    const events = ingestCalls().map((c) => JSON.parse(c.init.body).events[0]);
    const names = events.map((e) => e.event);
    expect(names[0]).toBe("http_request_start");
    expect(names.at(-1)).toBe("http_request_succeeded");
    for (const e of events) {
      expect(e.correlationId).toBe(correlationId); // same id as the X-Request-ID
      expect(e.logId).toMatch(UUID_RE);             // unique per event
      expect(events.filter((x) => x.logId === e.logId)).toHaveLength(1);
      expect(e.source).toBeUndefined();             // server stamps `source`
      expect(e.endpoint).toBe("/tickets");          // query strings stripped
      expect(e.method).toBe("GET");
    }
  });
});
