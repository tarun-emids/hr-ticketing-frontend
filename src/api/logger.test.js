// Unit tests for src/api/logger.js — the frontend→backend/app.log event sink.
// Offline: fetch is stubbed; no network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logEvent, newCorrelationId, randomId } from "./logger";

let ingestCalls;
const savedViteLogs = import.meta.env.VITE_LOGS;

beforeEach(() => {
  ingestCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      ingestCalls.push({ url: String(url), init });
      return new Response(JSON.stringify({ accepted: 1 }), { status: 202 });
    })
  );
});

afterEach(() => {
  import.meta.env.VITE_LOGS = savedViteLogs;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("frontend logger (logger.js)", () => {
  it("posts one validated event batch to /logs/ingest", async () => {
    logEvent("http_request_start", { correlationId: newCorrelationId(), method: "POST", endpoint: "/tickets" });
    await vi.waitFor(() => expect(ingestCalls).toHaveLength(1));
    const { url, init } = ingestCalls[0];
    expect(url).toContain("/logs/ingest");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].event).toBe("http_request_start");
    expect(body.events[0].logId).toMatch(UUID_RE);
    expect(body.events[0].correlationId).toMatch(UUID_RE);
    expect(typeof body.events[0].occurredAt).toBe("string");
  });

  it("creates distinct log ids per event", async () => {
    logEvent("http_request_start", {});
    logEvent("http_request_succeeded", {});
    await vi.waitFor(() => expect(ingestCalls).toHaveLength(2));
    const a = JSON.parse(ingestCalls[0].init.body).events[0];
    const b = JSON.parse(ingestCalls[1].init.body).events[0];
    expect(a.logId).toMatch(UUID_RE);
    expect(b.logId).not.toBe(a.logId);
  });

  it("VITE_LOGS=false disables the remote sink entirely", async () => {
    import.meta.env.VITE_LOGS = "false";
    logEvent("http_request_start", {});
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(ingestCalls).toHaveLength(0);
  });

  it("swallows sink failures — logging must never break ticket operations", async () => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("backend down"))));
    expect(() => logEvent("http_request_start", {})).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 5)); // let the rejection land
    expect(console.debug).toHaveBeenCalled(); // quiet diagnostic only
  });

  it("newCorrelationId/randomId produce backend-acceptable uuids", () => {
    const id = newCorrelationId();
    expect(id).toMatch(UUID_RE);
    expect(randomId()).not.toBe(id);
  });
});
