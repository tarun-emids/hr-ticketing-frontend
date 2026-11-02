// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTicketsPage } from "./hooks";

const envelope = {
  items: [{ id: "TKT-104" }],
  page: 2,
  pageSize: 25,
  total: 26,
  hasNext: true,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(envelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTicketsPage", () => {
  it("fetches the requested page and exposes the envelope", async () => {
    const { result } = renderHook(() => useTicketsPage("u1", { page: 2, pageSize: 25 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.page).toBe(2);
    expect(result.current.total).toBe(26);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("reports backend errors without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ detail: "pageSize must be…" }), { status: 422 }),
      ),
    );
    const { result } = renderHook(() => useTicketsPage("u1", { pageSize: 101 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("pageSize");
    expect(result.current.items).toEqual([]);
  });

  it("holds its fetch when there is no viewer identity", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() => useTicketsPage(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });
});
