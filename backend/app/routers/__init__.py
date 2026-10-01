"""
Routers package — one router module per frontend screen.

FUNCTIONALITY:
    Forward-declares the API routers so app/main.py can attach them in one
    import block. Each module's docstring states which screen(s) it serves:

      auth_router.py      Login.jsx
      meta_router.py      shared dropdown/reference data (all screens)
      ticket_router.py    EmployeeDashboard.jsx, NewTicket.jsx, TicketDetail.jsx
      inbox_router.py     HRInbox.jsx
      analytics_router.py HRDashboard.jsx
"""
