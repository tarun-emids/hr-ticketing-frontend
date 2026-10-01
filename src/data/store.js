// In-memory mock store with a pub/sub so views stay in sync.
// Replace the bodies of these functions with API calls later —
// the signatures are designed to map 1:1 onto REST endpoints.
import { TICKETS } from "./tickets";

let tickets = [...TICKETS];
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(tickets));
const sortDesc = (list) =>
  [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listTickets() {
  return sortDesc(tickets);
}

export function getTicket(id) {
  return tickets.find((t) => t.id === id) ?? null;
}

let nextSeq = 119;
export function createTicket({ employeeId, category, subject, description, priority, attachment = null }) {
  const nowISO = new Date().toISOString();
  const ticket = {
    id: `TKT-${nextSeq++}`,
    employeeId,
    category,
    subject,
    description,
    priority,
    status: "Open",
    assigneeId: null,
    createdAt: nowISO,
    updatedAt: nowISO,
    firstReplyAt: null,
    resolvedAt: null,
    closedBy: null,
    turns: [],
    attachment,
  };
  tickets = [ticket, ...tickets];
  notify();
  return ticket;
}

export function addReply(ticketId, { authorId, role, text }) {
  const ticket = getTicket(ticketId);
  if (!ticket) return;
  const at = new Date().toISOString();
  const turn = { authorId, role, text, at };
  ticket.turns = [...ticket.turns, turn];
  ticket.updatedAt = at;
  if (role === "agent") {
    if (!ticket.firstReplyAt) ticket.firstReplyAt = at;
    if (ticket.employeeId && ticket.turns.at(-1)?.role === "agent") {
      ticket.status = ticket.status === "Open" ? "In Progress" : ticket.status;
    }
  }
  if (role === "employee" && !["Resolved", "Closed"].includes(ticket.status)) {
    ticket.status = "Waiting on Employee";
  }
  notify();
  return ticket;
}

export function updateStatus(ticketId, status, actorId) {
  const ticket = getTicket(ticketId);
  if (!ticket) return;
  ticket.status = status;
  if (status === "Resolved") ticket.resolvedAt = new Date().toISOString();
  if (status === "Closed") {
    ticket.resolvedAt = ticket.resolvedAt ?? new Date().toISOString();
    ticket.closedBy = actorId;
  }
  if (["Open", "In Progress"].includes(status)) {
    ticket.resolvedAt = null;
    ticket.closedBy = null;
  }
  ticket.updatedAt = new Date().toISOString();
  notify();
  return ticket;
}

export function assignTicket(ticketId, assigneeId) {
  const ticket = getTicket(ticketId);
  if (!ticket) return;
  ticket.assigneeId = assigneeId;
  if (!assigneeId) {
    ticket.assigneeId = null;
    ticket.updatedAt = new Date().toISOString();
    notify();
    return ticket;
  }
  const hasAgentTurn = ticket.turns.some((t) => t.role === "agent");
  if (!ticket.firstReplyAt && !hasAgentTurn) {
    const at = new Date().toISOString();
    ticket.firstReplyAt = at;
    ticket.turns = [
      ...ticket.turns,
      {
        authorId: assigneeId,
        role: "agent",
        text: "Thanks for raising this — I've picked it up and will get back to you shortly.",
        at,
      },
    ];
    if (ticket.status === "Open") ticket.status = "In Progress";
  }
  ticket.updatedAt = new Date().toISOString();
  notify();
  return ticket;
}

export function setPriority(ticketId, priority) {
  const ticket = getTicket(ticketId);
  if (!ticket) return;
  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  notify();
  return ticket;
}

export function setCategory(ticketId, category) {
  const ticket = getTicket(ticketId);
  if (!ticket) return;
  ticket.category = category;
  ticket.updatedAt = new Date().toISOString();
  notify();
  return ticket;
}
