"""
HR Ticketing System — FastAPI backend package.

This package is the server-side implementation for every screen of the React
frontend that lives in ../src/pages/:

    Login.jsx            -> routers/auth_router.py
    NewTicket.jsx        -> routers/ticket_router.py  (POST /api/tickets)
    EmployeeDashboard.jsx-> routers/ticket_router.py  (GET  /api/my-tickets)
    TicketDetail.jsx     -> routers/ticket_router.py  (GET/PATCH/POST ticket endpoints)
    HRInbox.jsx          -> routers/inbox_router.py   (GET  /api/inbox)
    HRDashboard.jsx      -> routers/analytics_router.py (GET /api/analytics)

The fully wired frontend talks to this backend through src/api.js (a thin
fetch layer + bearer token). The original mock store documented its functions
as "designed to map 1:1 onto REST endpoints" — every endpoint in this backend
implements exactly that mapping.
"""
