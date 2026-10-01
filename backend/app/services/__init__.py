"""
Services package — business-logic layer.

FUNCTIONALITY:
    Routers (app/routers/) translate HTTP <-> Python and stay thin; this
    package holds the actual HR-domain rules so they exist in exactly one
    place:

      ticket_service.py    - create/get/reply/assign/status/priority/category
                             incl. every automatic transition the frontend
                             mock store previously encoded in JS
      inbox_service.py     - search + filter + sort behaviour of HR Inbox
      analytics_service.py - aggregations behind the HR Dashboard figures
      auth_service.py      - demo login/session issue/lookup
"""
