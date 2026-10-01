// Mock ticket data. Swap this module for an API layer later.
const now = Date.now();
const HOUR = 3_600_000;
const ago = (days, hours = 0) =>
  new Date(now - days * 24 * HOUR - hours * HOUR).toISOString();

const mk = ({
  id,
  employeeId = "u1",
  category,
  subject,
  description,
  priority = "Medium",
  status = "Open",
  assigneeId = null,
  createdDaysAgo = 0,
  firstReplyHrs = null,
  replies = [],
  attachment = null,
}) => {
  const createdAt = ago(createdDaysAgo);
  const ticket = {
    id,
    employeeId,
    category,
    subject,
    description,
    priority,
    status,
    assigneeId,
    createdAt,
    updatedAt: createdAt,
    firstReplyAt: null,
    resolvedAt: null,
    closedBy: null,
    turns: [],
    attachment,
  };
  if (firstReplyHrs != null && assigneeId) {
    const at = new Date(Date.parse(createdAt) + firstReplyHrs * HOUR).toISOString();
    ticket.firstReplyAt = at;
    ticket.updatedAt = at;
    ticket.turns.push({
      authorId: assigneeId,
      role: "agent",
      text: "Thanks for raising this — I've picked it up and will get back to you shortly.",
      at,
    });
  }
  replies.forEach((r) => {
    const at = new Date(Date.parse(ticket.updatedAt) + r.hrsAfter * HOUR).toISOString();
    ticket.turns.push({
      authorId: r.role === "agent" ? assigneeId ?? "h1" : employeeId,
      role: r.role,
      text: r.text,
      at,
    });
    ticket.updatedAt = at;
  });
  if (["Resolved", "Closed"].includes(status)) ticket.resolvedAt = ticket.updatedAt;
  if (status === "Closed") ticket.closedBy = assigneeId;
  return ticket;
};

export const TICKETS = [
  mk({
    id: "TKT-101",
    category: "Payroll",
    subject: "Salary received at old rate after promotion",
    description:
      "I was promoted on the 12th and the salary adjustment does not seem to have landed in this month's payout. Could someone check the payroll record against the new band?",
    priority: "Urgent",
    status: "In Progress",
    assigneeId: "h1",
    createdDaysAgo: 2,
    firstReplyHrs: 5,
    replies: [
      { role: "employee", hrsAfter: 3, text: "Thank you — the promotion letter is on my employee profile if you need the reference." },
      { role: "agent", hrsAfter: 6, text: "I've located the letter and raised a payroll correction. The adjusted amount should come with next month's run, backdated to the promotion date." },
    ],
  }),
  mk({
    id: "TKT-102",
    category: "Leave",
    subject: "Carry-over of 4 unused annual-leave days",
    description:
      "My leave balance shows the four unused days from last year as expiring. I understand there is a carry-over allowance for up to five days under the new policy.",
    priority: "Medium",
    status: "Open",
    createdDaysAgo: 1,
  }),
  mk({
    id: "TKT-103",
    category: "Benefits",
    subject: "Health plan enrolment shows spouse as inactive",
    description: "I enrolled my spouse during open enrolment in September, but the provider portal lists them as inactive. First GP visit got rejected on Tuesday.",
    priority: "High",
    status: "Waiting on Employee",
    assigneeId: "h2",
    createdDaysAgo: 6,
    firstReplyHrs: 9,
    replies: [
      { role: "employee", hrsAfter: 2, text: "Sending you the enrolment confirmation email I received then." },
      { role: "agent", hrsAfter: 8, text: "Thanks. The provider is asking for the marriage certificate scan — could you attach it here so I can push the update through?" },
    ],
    attachment: null,
  }),
  mk({
    id: "TKT-104",
    category: "Onboarding",
    subject: "New starter laptop not ready for day one",
    description:
      "Our new analyst starts Monday and the laptop request placed two weeks ago has no confirmation yet. Please help expedite.",
    priority: "Urgent",
    status: "Open",
    assigneeId: "h3",
    createdDaysAgo: 0,
  }),
  mk({
    id: "TKT-105",
    category: "Policy",
    subject: "Clarification on remote-work allowance",
    description: "Does the 60-day remote allowance reset per calendar year or per anniversary year? The policy page is ambiguous.",
    priority: "Low",
    status: "Closed",
    assigneeId: "h2",
    createdDaysAgo: 21,
    firstReplyHrs: 14,
    replies: [
      { role: "agent", hrsAfter: 6, text: "It resets on your employment anniversary, not the calendar year. I've asked the policy owner to update the page wording as well." },
      { role: "employee", hrsAfter: 3, text: "Perfect, thanks — that answers it." },
    ],
  }),
  mk({
    id: "TKT-106",
    category: "Payroll",
    subject: "Overtime hours missing from last month's payslip",
    description: "I logged 14 overtime hours in August but the payslip only shows 6. Timesheet screenshots available on request.",
    priority: "High",
    status: "Resolved",
    assigneeId: "h1",
    createdDaysAgo: 12,
    firstReplyHrs: 7,
    replies: [
      { role: "agent", hrsAfter: 10, text: "You were right — approval from the manager covering shifts hadn't been recorded. It's now approved; the difference lands in the next payout." },
    ],
  }),
  mk({
    id: "TKT-107",
    category: "Other",
    subject: "Request for employment verification letter",
    description: "Bank needs a signed employment verification letter with role and tenure for my mortgage application. Needed ideally within two weeks.",
    priority: "Medium",
    status: "Waiting on Employee",
    assigneeId: "h3",
    createdDaysAgo: 4,
    firstReplyHrs: 11,
    replies: [
      { role: "agent", hrsAfter: 2, text: "Happy to prepare this. Could you confirm the exact address of the recipient bank and whether it needs a wet signature or scan is fine?" },
    ],
  }),
  mk({
    id: "TKT-108",
    category: "Leave",
    subject: "Parental leave policy questions",
    description: "Expecting in March. Could we discuss eligibility, notice requirements, and how interleaved paid/unpaid blocks work?",
    priority: "Medium",
    status: "Resolved",
    assigneeId: "h2",
    createdDaysAgo: 30,
    firstReplyHrs: 4,
    replies: [
      { role: "agent", hrsAfter: 8, text: "Congratulations! I've attached the summary deck we walk parents through. Booked 30 minutes with you next Tuesday to cover the notice dates." },
    ],
  }),
  mk({
    id: "TKT-109",
    category: "Benefits",
    subject: "Pension contribution percentage change",
    description: "I want to raise my employee contribution from 5% to 8%. What form do I need and when does the change take effect?",
    priority: "Low",
    status: "Open",
    createdDaysAgo: 3,
  }),
  mk({
    id: "TKT-110",
    category: "Onboarding",
    subject: "Access rights: payroll system for new team lead",
    description: "My new team lead starts on the 6th and needs payroll viewer access from day one to take over approvals.",
    priority: "Medium",
    status: "In Progress",
    assigneeId: "h2",
    createdDaysAgo: 5,
    firstReplyHrs: 8,
    replies: [
      { role: "employee", hrsAfter: 4, text: "Forwarding the role-overview doc so access groups match duties." },
    ],
  }),
  mk({
    id: "TKT-111",
    category: "Payroll",
    subject: "Travel reimbursement stuck since July",
    description: "Submitted three expense items worth about $420 in mid July, all still 'pending'. Manager says they were approved.",
    priority: "High",
    status: "Open",
    employeeId: "u2",
    assigneeId: "h1",
    createdDaysAgo: 8,
  }),
  mk({
    id: "TKT-112",
    category: "Policy",
    subject: "Code of conduct training due date",
    description: "The compliance portal shows my conduct training due 'yesterday' but I completed it in April. Transcript attached.",
    priority: "Medium",
    status: "Closed",
    employeeId: "u3",
    assigneeId: "h3",
    createdDaysAgo: 15,
    firstReplyHrs: 2,
    replies: [
      { role: "agent", hrsAfter: 5, text: "The provider refreshed records and lost a batch of April completions — I re-uploaded your certificate and status is back to compliant. Apologies for the alert." },
    ],
    attachment: null,
  }),
  mk({
    id: "TKT-113",
    category: "Other",
    subject: "Office parking spot swap request",
    description: "Would like to swap my reserved spot at level B for one closer to the entrance, if any are available.",
    priority: "Low",
    status: "Open",
    employeeId: "u4",
    createdDaysAgo: 1,
  }),
  mk({
    id: "TKT-114",
    category: "Leave",
    subject: "Sick leave certificate upload refused",
    description: "Portal rejects my doctor's certificate PDF every time I try to upload it. Tried three files, all under size limit.",
    priority: "High",
    status: "In Progress",
    employeeId: "u3",
    assigneeId: "h2",
    createdDaysAgo: 2,
    firstReplyHrs: 3,
    replies: [
      { role: "agent", hrsAfter: 9, text: "That's a known portal bug with certain PDF versions. Email the certificate to hr@ for now and I'll log it manually while the fix ships." },
    ],
  }),
  mk({
    id: "TKT-115",
    category: "Benefits",
    subject: "Gym reimbursement category missing",
    description: "The wellbeing allowance page lists a 120 EUR gym reimbursement but it doesn't appear in the claim categories.",
    priority: "Medium",
    status: "Closed",
    employeeId: "u2",
    assigneeId: "h1",
    createdDaysAgo: 40,
    firstReplyHrs: 16,
    replies: [
      { role: "agent", hrsAfter: 4, text: "The allowance rolled into the general wellbeing budget this year — claim under 'Wellbeing' instead. Updated the intranet page to say so." },
    ],
  }),
  mk({
    id: "TKT-116",
    category: "Onboarding",
    subject: "Missing desk equipment on first week",
    description: "Started yesterday; chair, monitor, and dock are missing from my desk. IT says the order was under facilities.",
    priority: "Medium",
    status: "Open",
    employeeId: "u4",
    createdDaysAgo: 7,
  }),
  mk({
    id: "TKT-117",
    category: "Payroll",
    subject: "Correct bank details on file",
    description: "I changed banks. Need to confirm which account is on file so the salary lands on the right one this month.",
    priority: "High",
    status: "Resolved",
    employeeId: "u1",
    assigneeId: "h1",
    createdDaysAgo: 25,
    firstReplyHrs: 10,
    replies: [
      { role: "agent", hrsAfter: 7, text: "Updated details are verified and active from this month's run. I've marked the old account inactive." },
    ],
  }),
  mk({
    id: "TKT-118",
    category: "Policy",
    subject: "Notice period interpretation for internal move",
    description: "Nine weeks policy — does an internal transfer require the full notice or can HR waive two weeks?",
    priority: "Medium",
    status: "Waiting on Employee",
    employeeId: "u3",
    assigneeId: "h3",
    createdDaysAgo: 10,
    firstReplyHrs: 12,
    replies: [
      { role: "agent", hrsAfter: 3, text: "HR can waive up to two weeks in an internal move with your current manager's sign-off. Which internal role are you considering?" },
    ],
  }),
];
