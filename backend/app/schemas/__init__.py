"""
Schemas package — request/response contracts for the JSON API.

FUNCTIONALITY:
    Every schema here derives from CamelModel (schemas/base.py) which makes
    the JSON keys match the frontend's mock-data objects byte-for-byte
    (camelCase: employeeId, firstReplyAt, attachment.size...). That parity is
    what allows src/data/store.js to be replaced with fetch() calls without
    rewriting any screen components.
"""

from app.schemas.base import CamelModel  # noqa: F401
