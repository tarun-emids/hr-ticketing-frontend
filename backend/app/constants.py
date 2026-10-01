"""
Domain constants shared by all backend files.

FUNCTIONALITY:
    Single source of truth for the dropdown/reference values that the
    frontend currently hard-codes in src/data/users.js:

        CATEGORIES  -> TicketForm.jsx dropdown + ticket detail "Re-categorise"
        PRIORITIES  -> TicketForm.jsx dropdown + ticket detail priority control
        STATUSES    -> ticket detail status control + HR dashboard FIG.01
        PRIO_ORDER  -> required by the HR inbox sort on the priority column
                       (mirrors src/components/sorting.js)

    These are also exposed to the frontend through GET /api/meta so the
    React pages can stop importing the mock users module one day. Keeping
    them in sync matters because frontend filtering/sorting compares against
    exactly these strings.
"""

CATEGORIES = ["Payroll", "Leave", "Benefits", "Onboarding", "Policy", "Other"]
PRIORITIES = ["Low", "Medium", "High", "Urgent"]
STATUSES = ["Open", "In Progress", "Waiting on Employee", "Resolved", "Closed"]

# Sort weight used by the HR inbox when the user sorts the priority column.
# mirrors src/components/sorting.js (Urgent first on descending sort).
PRIO_ORDER = {"Urgent": 4, "High": 3, "Medium": 2, "Low": 1}

# Roles used in the users table and mirrored in the Login screen's role picker.
ROLE_EMPLOYEE = "employee"
ROLE_AGENT = "agent"
ROLES = [ROLE_EMPLOYEE, ROLE_AGENT]

# Attachment cap mirrored from TicketForm.jsx (MAX_FILE_BYTES = 5 MB). The
# backend enforces it again so the rule is not bypassable via raw API calls.
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

# Prefix + starting point for generated ticket ids ("TKT-101", "TKT-102", ...).
TICKET_ID_PREFIX = "TKT"
