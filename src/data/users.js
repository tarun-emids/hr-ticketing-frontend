// Mock users. Swap this module for an API layer later.
export const USERS = [
  { id: "u1", name: "Priya Sharma", email: "priya@acme.com", role: "employee" },
  { id: "u2", name: "Marcus Webb", email: "marcus@acme.com", role: "employee" },
  { id: "u3", name: "Dana Cole", email: "dana@acme.com", role: "employee" },
  { id: "u4", name: "Tomas Nowak", email: "tomas@acme.com", role: "employee" },
  { id: "h1", name: "Alicia Gomez", email: "alicia.hr@acme.com", role: "agent" },
  { id: "h2", name: "Ben Osei", email: "ben.hr@acme.com", role: "agent" },
  { id: "h3", name: "Ruth Meyer", email: "ruth.hr@acme.com", role: "agent" },
];

export const HR_AGENTS = USERS.filter((u) => u.role === "agent");

export const CATEGORIES = [
  "Payroll",
  "Leave",
  "Benefits",
  "Onboarding",
  "Policy",
  "Other",
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const STATUSES = [
  "Open",
  "In Progress",
  "Waiting on Employee",
  "Resolved",
  "Closed",
];
