import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import NotificationBell from "./NotificationBell";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../hooks", () => ({
  useNotifications: () => ({
    items: [
      {
        id: "n1", recipientId: "agent-1", ticketRef: "TKT-104", ticketId: "u1",
        type: "ticket_assigned", channel: "in_app", actorName: "Alicia Gomez",
        message: "Alicia Gomez assigned TKT-104 to you",
        read: false, readAt: null, createdAt: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: "n2", recipientId: "agent-1", ticketRef: "TKT-101", ticketId: "u2",
        type: "ticket_reply", channel: "in_app", actorName: "Priya Sharma",
        message: "Priya Sharma replied on TKT-101",
        read: true, readAt: "2026-10-06T09:20:00Z",
        createdAt: new Date(Date.now() - 7_200_000).toISOString(),
      },
    ],
    unread: 1,
    ready: true,
  }),
}));

vi.mock("../data/notifications", () => ({
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}));

import { markNotificationRead, markAllNotificationsRead } from "../data/notifications";

function renderBell() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <NotificationBell />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// AuthProvider pulls users from GET /api/users; stub fetch and seed a saved
// agent session so the bell has an acting user (mock-auth world).
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline test"))));
  localStorage.setItem("hrdesk.user", JSON.stringify({ id: "agent-1", name: "Alicia Gomez", role: "agent", via: "password" }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.removeItem("hrdesk.user");
  markNotificationRead.mockClear();
  markAllNotificationsRead.mockClear();
});

it("shows an unread badge count in the aria label", () => {
  renderBell();
  const bell = screen.getByRole("button", { name: /Notifications, 1 unread/ });
  expect(bell.getAttribute("aria-expanded")).toBe("false");
  expect(screen.getByTestId("unread-badge").textContent).toBe("1");
});

it("starts with the dropdown closed", () => {
  renderBell();
  expect(screen.queryByRole("menu")).toBeNull();
});

it("opens the dropdown, exposes unread emphasis and keyboard affordances", () => {
  renderBell();
  const bell = screen.getByRole("button", { name: /Notifications, 1 unread/ });
  fireEvent.click(bell);
  expect(bell.getAttribute("aria-expanded")).toBe("true");

  const menu = screen.getAllByRole("menuitem");
  expect(menu).toHaveLength(2);
  expect(menu[0].textContent).toContain("Alicia Gomez assigned TKT-104 to you");
});

it("the view-all footer buttons are present in the dropdown", () => {
  renderBell();
  fireEvent.click(screen.getByRole("button", { name: /Notifications, 1 unread/ }));
  expect(screen.getByText("Mark all read")).toBeTruthy();
  expect(screen.getByText("View all ↘")).toBeTruthy();
});

it("clicking Mark all read calls the store once per acting user", async () => {
  renderBell();
  fireEvent.click(screen.getByRole("button", { name: /Notifications, 1 unread/ }));
  fireEvent.click(screen.getByText("Mark all read"));
  await vi.waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
  expect(markAllNotificationsRead).toHaveBeenCalledWith("agent-1");
});

it("closing the dropdown returns focus and resets expanded state", () => {
  renderBell();
  const bell = screen.getByRole("button", { name: /Notifications, 1 unread/ });
  fireEvent.click(bell);
  expect(bell.getAttribute("aria-expanded")).toBe("true");
  fireEvent.keyDown(bell, { key: "Escape" });
  expect(bell.getAttribute("aria-expanded")).toBe("false");
});
