"""
Demo data seeding.

FUNCTIONALITY:
    On startup (see app/main.py) this fills a fresh MySQL database with
    the very same demo content the React screens show today, so the switch
    from the in-memory mock (src/data/users.js + src/data/tickets.js) to this
    backend is invisible to the user:

      - 4 employees (u1..u4) and 3 HR agents (h1..h3) — feeds the Login.jsx
        user pickers and every name/avatar across the app
      - 18 tickets TKT-101..117 with realistic status mixes, threads and
        timestamps — feeds EmployeeDashboard, NewTicket, TicketDetail,
        HRInbox and the HRDashboard charts
      - the ticket-id counter set to 118, so the next ticket created through
        POST /api/tickets becomes TKT-118 (the frontend mock starts at 119)

    Idempotent: seeding only fills tables that are empty, so restarting the
    server never duplicates rows.
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Ticket, TicketCounter, TicketTurn, User
from app.models.ticket import utcnow

# The mock uses Date.now() at import time; anchoring "now" once per seed run
# keeps relative offsets (2 days ago, 5 hours later, ...) equally consistent.
_NOW = utcnow()
HOUR = timedelta(hours=1)


def _ago(days: int, hours: int = 0) -> datetime:
    """Mirror of the frontend's ago() helper in src/data/tickets.js."""
    return _NOW - timedelta(days=days, hours=hours)


SEED_USERS = [
    # employees — selectable under "Employee" on the Login screen
    {"id": "u1", "name": "Priya Sharma", "email": "priya@acme.com", "role": "employee"},
    {"id": "u2", "name": "Marcus Webb", "email": "marcus@acme.com", "role": "employee"},
    {"id": "u3", "name": "Dana Cole", "email": "dana@acme.com", "role": "employee"},
    {"id": "u4", "name": "Tomas Nowak", "email": "tomas@acme.com", "role": "employee"},
    # HR agents — selectable under "HR agent", own the inbox + dashboard screens
    {"id": "h1", "name": "Alicia Gomez", "email": "alicia.hr@acme.com", "role": "agent"},
    {"id": "h2", "name": "Ben Osei", "email": "ben.hr@acme.com", "role": "agent"},
    {"id": "h3", "name": "Ruth Meyer", "email": "ruth.hr@acme.com", "role": "agent"},
]


def _mk_ticket(  # noqa: C901 — intentionally a verbatim mirror of the mock builder
    *,
    id: str,
    employeeId: str,
    category: str,
    subject: str,
    description: str,
    priority: str = "Medium",
    status: str = "Open",
    assigneeId: str | None = None,
    createdDaysAgo: int = 0,
    firstReplyHrs: int | None = None,
    replies: list[dict] | None = None,
    attachment: dict | None = None,
) -> tuple[Ticket, list[TicketTurn]]:
    """
    Python port of the mk() builder in src/data/tickets.js so the seeded rows
    have exactly the same threads/timestamps the current frontend demo shows.
    Returns the ticket row plus its pre-built turn rows.
    """
    created_at = _ago(createdDaysAgo)
    updated_at = created_at
    first_reply_at = None
    turns: list[TicketTurn] = []

    if firstReplyHrs is not None and assigneeId:
        at = created_at + firstReplyHrs * HOUR
        first_reply_at = at
        updated_at = at
        turns.append(
            TicketTurn(
                author_id=assigneeId,
                role="agent",
                text="Thanks for raising this — I've picked it up and will get back to you shortly.",
                created_at=at,
            )
        )

    for r in replies or []:
        at = updated_at + r["hrsAfter"] * HOUR
        author_id = (assigneeId or "h1") if r["role"] == "agent" else employeeId
        turns.append(
            TicketTurn(author_id=author_id, role=r["role"], text=r["text"], created_at=at)
        )
        updated_at = at

    resolved_at = updated_at if status in ("Resolved", "Closed") else None
    closed_by = assigneeId if status == "Closed" else None

    ticket = Ticket(
        id=id,
        employee_id=employeeId,
        category=category,
        subject=subject,
        description=description,
        priority=priority,
        status=status,
        assignee_id=assigneeId,
        created_at=created_at,
        updated_at=updated_at,
        first_reply_at=first_reply_at,
        resolved_at=resolved_at,
        closed_by=closed_by,
        attachment_name=(attachment or {}).get("name"),
        attachment_size=(attachment or {}).get("size"),
    )
    for t in turns:
        t.ticket = ticket
    return ticket, turns


# --------------------------------------------------------------------------
# Seed tickets — verbatim content of src/data/tickets.js
# --------------------------------------------------------------------------
SEED_TICKET_ARGS: list[dict] = [
    dict(
        id="TKT-101",
        employeeId="u1",
        category="Payroll",
        subject="Salary received at old rate after promotion",
        description=(
            "I was promoted on the 12th and the salary adjustment does not seem to have "
            "landed in this month's payout. Could someone check the payroll record against "
            "the new band?"
        ),
        priority="Urgent",
        status="In Progress",
        assigneeId="h1",
        createdDaysAgo=2,
        firstReplyHrs=5,
        replies=[
            {"role": "employee", "hrsAfter": 3,
             "text": "Thank you — the promotion letter is on my employee profile if you need the reference."},
            {"role": "agent", "hrsAfter": 6,
             "text": "I've located the letter and raised a payroll correction. The adjusted amount "
                     "should come with next month's run, backdated to the promotion date."},
        ],
    ),
    dict(
        id="TKT-102",
        employeeId="u1",
        category="Leave",
        subject="Carry-over of 4 unused annual-leave days",
        description=(
            "My leave balance shows the four unused days from last year as expiring. I understand "
            "there is a carry-over allowance for up to five days under the new policy."
        ),
        priority="Medium",
        status="Open",
        createdDaysAgo=1,
    ),
    dict(
        id="TKT-103",
        employeeId="u1",
        category="Benefits",
        subject="Health plan enrolment shows spouse as inactive",
        description=(
            "I enrolled my spouse during open enrolment in September, but the provider portal "
            "lists them as inactive. First GP visit got rejected on Tuesday."
        ),
        priority="High",
        status="Waiting on Employee",
        assigneeId="h2",
        createdDaysAgo=6,
        firstReplyHrs=9,
        replies=[
            {"role": "employee", "hrsAfter": 2,
             "text": "Sending you the enrolment confirmation email I received then."},
            {"role": "agent", "hrsAfter": 8,
             "text": "Thanks. The provider is asking for the marriage certificate scan — could you "
                     "attach it here so I can push the update through?"},
        ],
    ),
    dict(
        id="TKT-104",
        employeeId="u1",
        category="Onboarding",
        subject="New starter laptop not ready for day one",
        description=(
            "Our new analyst starts Monday and the laptop request placed two weeks ago has no "
            "confirmation yet. Please help expedite."
        ),
        priority="Urgent",
        status="Open",
        assigneeId="h3",
        createdDaysAgo=0,
    ),
    dict(
        id="TKT-105",
        employeeId="u1",
        category="Policy",
        subject="Clarification on remote-work allowance",
        description=(
            "Does the 60-day remote allowance reset per calendar year or per anniversary year? "
            "The policy page is ambiguous."
        ),
        priority="Low",
        status="Closed",
        assigneeId="h2",
        createdDaysAgo=21,
        firstReplyHrs=14,
        replies=[
            {"role": "agent", "hrsAfter": 6,
             "text": "It resets on your employment anniversary, not the calendar year. I've asked "
                     "the policy owner to update the page wording as well."},
            {"role": "employee", "hrsAfter": 3,
             "text": "Perfect, thanks — that answers it."},
        ],
    ),
    dict(
        id="TKT-106",
        employeeId="u1",
        category="Payroll",
        subject="Overtime hours missing from last month's payslip",
        description=(
            "I logged 14 overtime hours in August but the payslip only shows 6. Timesheet "
            "screenshots available on request."
        ),
        priority="High",
        status="Resolved",
        assigneeId="h1",
        createdDaysAgo=12,
        firstReplyHrs=7,
        replies=[
            {"role": "agent", "hrsAfter": 10,
             "text": "You were right — approval from the manager covering shifts hadn't been "
                     "recorded. It's now approved; the difference lands in the next payout."},
        ],
    ),
    dict(
        id="TKT-107",
        employeeId="u1",
        category="Other",
        subject="Request for employment verification letter",
        description=(
            "Bank needs a signed employment verification letter with role and tenure for my "
            "mortgage application. Needed ideally within two weeks."
        ),
        priority="Medium",
        status="Waiting on Employee",
        assigneeId="h3",
        createdDaysAgo=4,
        firstReplyHrs=11,
        replies=[
            {"role": "agent", "hrsAfter": 2,
             "text": "Happy to prepare this. Could you confirm the exact address of the recipient "
                     "bank and whether it needs a wet signature or scan is fine?"},
        ],
    ),
    dict(
        id="TKT-108",
        employeeId="u1",
        category="Leave",
        subject="Parental leave policy questions",
        description=(
            "Expecting in March. Could we discuss eligibility, notice requirements, and how "
            "interleaved paid/unpaid blocks work?"
        ),
        priority="Medium",
        status="Resolved",
        assigneeId="h2",
        createdDaysAgo=30,
        firstReplyHrs=4,
        replies=[
            {"role": "agent", "hrsAfter": 8,
             "text": "Congratulations! I've attached the summary deck we walk parents through. "
                     "Booked 30 minutes with you next Tuesday to cover the notice dates."},
        ],
    ),
    dict(
        id="TKT-109",
        employeeId="u1",
        category="Benefits",
        subject="Pension contribution percentage change",
        description=(
            "I want to raise my employee contribution from 5% to 8%. What form do I need and "
            "when does the change take effect?"
        ),
        priority="Low",
        status="Open",
        createdDaysAgo=3,
    ),
    dict(
        id="TKT-110",
        employeeId="u1",
        category="Onboarding",
        subject="Access rights: payroll system for new team lead",
        description=(
            "My new team lead starts on the 6th and needs payroll viewer access from day one "
            "to take over approvals."
        ),
        priority="Medium",
        status="In Progress",
        assigneeId="h2",
        createdDaysAgo=5,
        firstReplyHrs=8,
        replies=[
            {"role": "employee", "hrsAfter": 4,
             "text": "Forwarding the role-overview doc so access groups match duties."},
        ],
    ),
    dict(
        id="TKT-111",
        employeeId="u2",
        category="Payroll",
        subject="Travel reimbursement stuck since July",
        description=(
            "Submitted three expense items worth about $420 in mid July, all still 'pending'. "
            "Manager says they were approved."
        ),
        priority="High",
        status="Open",
        assigneeId="h1",
        createdDaysAgo=8,
    ),
    dict(
        id="TKT-112",
        employeeId="u3",
        category="Policy",
        subject="Code of conduct training due date",
        description=(
            "The compliance portal shows my conduct training due 'yesterday' but I completed it "
            "in April. Transcript attached."
        ),
        priority="Medium",
        status="Closed",
        assigneeId="h3",
        createdDaysAgo=15,
        firstReplyHrs=2,
        replies=[
            {"role": "agent", "hrsAfter": 5,
             "text": "The provider refreshed records and lost a batch of April completions — "
                     "I re-uploaded your certificate and status is back to compliant. Apologies "
                     "for the alert."},
        ],
    ),
    dict(
        id="TKT-113",
        employeeId="u4",
        category="Other",
        subject="Office parking spot swap request",
        description=(
            "Would like to swap my reserved spot at level B for one closer to the entrance, "
            "if any are available."
        ),
        priority="Low",
        status="Open",
        createdDaysAgo=1,
    ),
    dict(
        id="TKT-114",
        employeeId="u3",
        category="Leave",
        subject="Sick leave certificate upload refused",
        description=(
            "Portal rejects my doctor's certificate PDF every time I try to upload it. Tried "
            "three files, all under size limit."
        ),
        priority="High",
        status="In Progress",
        assigneeId="h2",
        createdDaysAgo=2,
        firstReplyHrs=3,
        replies=[
            {"role": "agent", "hrsAfter": 9,
             "text": "That's a known portal bug with certain PDF versions. Email the certificate "
                     "to hr@ for now and I'll log it manually while the fix ships."},
        ],
    ),
    dict(
        id="TKT-115",
        employeeId="u2",
        category="Benefits",
        subject="Gym reimbursement category missing",
        description=(
            "The wellbeing allowance page lists a 120 EUR gym reimbursement but it doesn't "
            "appear in the claim categories."
        ),
        priority="Medium",
        status="Closed",
        assigneeId="h1",
        createdDaysAgo=40,
        firstReplyHrs=16,
        replies=[
            {"role": "agent", "hrsAfter": 4,
             "text": "The allowance rolled into the general wellbeing budget this year — claim "
                     "under 'Wellbeing' instead. Updated the intranet page to say so."},
        ],
    ),
    dict(
        id="TKT-116",
        employeeId="u4",
        category="Onboarding",
        subject="Missing desk equipment on first week",
        description=(
            "Started yesterday; chair, monitor, and dock are missing from my desk. IT says the "
            "order was under facilities."
        ),
        priority="Medium",
        status="Open",
        createdDaysAgo=7,
    ),
    dict(
        id="TKT-117",
        employeeId="u1",
        category="Payroll",
        subject="Correct bank details on file",
        description=(
            "I changed banks. Need to confirm which account is on file so the salary lands on "
            "the right one this month."
        ),
        priority="High",
        status="Resolved",
        assigneeId="h1",
        createdDaysAgo=25,
        firstReplyHrs=10,
        replies=[
            {"role": "agent", "hrsAfter": 7,
             "text": "Updated details are verified and active from this month's run. I've marked "
                     "the old account inactive."},
        ],
    ),
    dict(
        id="TKT-118",
        employeeId="u3",
        category="Policy",
        subject="Notice period interpretation for internal move",
        description=(
            "Nine weeks policy — does an internal transfer require the full notice or can HR "
            "waive two weeks?"
        ),
        priority="Medium",
        status="Waiting on Employee",
        assigneeId="h3",
        createdDaysAgo=10,
        firstReplyHrs=12,
        replies=[
            {"role": "agent", "hrsAfter": 3,
             "text": "HR can waive up to two weeks in an internal move with your current "
                     "manager's sign-off. Which internal role are you considering?"},
        ],
    ),
]


def seed_demo_data(db: Session) -> None:
    """
    Fill empty tables with the demo users/tickets. Called once at app startup.
    Safe to run on every boot: any table that already has rows is skipped.
    """
    if db.scalar(select(User.id).limit(1)) is not None:
        return  # already seeded

    for u in SEED_USERS:
        db.add(User(**u))

    for args in SEED_TICKET_ARGS:
        ticket, turns = _mk_ticket(**args)
        db.add(ticket)
        for turn in turns:
            db.add(turn)

    # Counter sits at the last seeded id so the next created ticket is TKT-119,
    # exactly like the `nextSeq = 119` constant in src/data/store.js.
    db.add(TicketCounter(name="ticket", last_value=118))

    db.commit()

