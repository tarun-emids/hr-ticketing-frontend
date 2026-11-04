// Static lookups. The user list itself comes from the backend
// (GET /api/users) and is held in the auth slice — see state/authSlice.js.
export const CATEGORIES = ["Payroll", "Leave", "Benefits", "Onboarding", "Policy", "Other"];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const STATUSES = ["Open", "In Progress", "Waiting on Employee", "Resolved", "Closed"];
