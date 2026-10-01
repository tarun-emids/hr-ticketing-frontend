"""
Database model: application user.

FUNCTIONALITY:
    Stores every person that can sign in, backing two frontend screens:

      Login.jsx       - the demo sign-in lists employees and HR agents to
                        pick from (currently hard-coded in src/data/users.js).
      Thread.jsx /    - resolve names/emails for ticket authors, assignees
      TicketTable.jsx   and employees ("Dana Cole", "alicia.hr@acme.com"...).

    Only statuses that matter here; passwords are deliberately NOT stored
    because the Login screen is documented demo auth ("NO CREDENTIALS
    CHECKED"). When the time comes to secure the endpoint for real, add a
    password_hash column and verify it in services/auth_service.py.
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    # Keep the same string ids as the mock users ("u1", "h1", ...) so the
    # Login screen and seed data remain drop-in compatible.
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # employee | agent

    # relationship conveniences
    tickets_opened: Mapped[list["Ticket"]] = relationship(  # noqa: F821
        back_populates="employee",
        foreign_keys="Ticket.employee_id",
    )
    tickets_assigned: Mapped[list["Ticket"]] = relationship(  # noqa: F821
        back_populates="assignee",
        foreign_keys="Ticket.assignee_id",
    )

    def __repr__(self) -> str:  # console friendliness
        return f"<User {self.id} {self.role}>"
