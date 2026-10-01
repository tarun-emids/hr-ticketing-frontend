import { useState } from "react";
import { addReply } from "../data/store";
import { formatDateTime } from "../utils";

function Turn({ turn, author, isAgentAuthor }) {
  return (
    <li className={`flex gap-3 ${isAgentAuthor ? "" : "flex-row-reverse"}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isAgentAuthor ? "bg-slate-900 text-white" : "bg-accent-100 text-accent-700"
        }`}
        title={author?.name}
      >
        {author?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </span>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isAgentAuthor ? "items-start" : "items-end"}`}>
        <div className={`mb-1 flex flex-wrap items-baseline gap-x-2 ${isAgentAuthor ? "" : "justify-end"}`}>
          <span className="text-xs font-semibold text-slate-800">{author?.name}</span>
          <span className="text-[11px] text-slate-400">
            {isAgentAuthor ? "HR" : "Employee"} · {formatDateTime(turn.at)}
          </span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isAgentAuthor
              ? "rounded-tl-md bg-white ring-1 ring-slate-200 text-slate-800"
              : "rounded-tr-md bg-accent-50 text-slate-800 ring-1 ring-accent-100"
          }`}
        >
          <p className="whitespace-pre-wrap">{turn.text}</p>
        </div>
      </div>
    </li>
  );
}

const SUGGESTED = {
  Payroll: "Thanks for flagging this. I've checked the payroll run and can confirm the correction has been queued — it will appear with the next payout, backdated to the original date.",
  Leave: "Thanks for reaching out about your leave. I've reviewed the policy and posted the updated balance to your profile; let me know if the numbers still look off after a refresh.",
  Benefits: "Thanks for waiting. The provider has confirmed your enrolment change is now active on their side. If you still see an issue, send a screenshot here and I'll escalate the same day.",
  Onboarding: "Thanks for the heads-up. Facilities has been nudged and the missing items are scheduled for delivery before the start date. I'll keep an eye on progress and confirm here.",
  Policy: "Good question — under the current policy the rule is: [explain rule]. I've also asked the policy owner to clarify this wording on the intranet page so it's easier next time.",
  Other: "Thanks for getting in touch. I've taken note of your request and checked the options on our side — the best next step is: [describe next step].",
};

export default function Thread({ ticket, users, viewer }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const isEmployee = viewer.role === "employee";

  const authorOf = (turn) => users.find((u) => u.id === turn.authorId);
  const isAgentTurn = (turn) => turn.role === "agent";

  const send = (ev) => {
    ev.preventDefault();
    const body = text.trim();
    if (body.length < 2) return;
    setSending(true);
    setTimeout(() => {
      addReply(ticket.id, {
        authorId: viewer.id,
        role: viewer.role === "agent" ? "agent" : "employee",
        text: body,
      });
      setText("");
      setSending(false);
    }, 350);
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-5">
        <Turn
          turn={{ at: ticket.createdAt, text: ticket.description, authorId: ticket.employeeId, role: "employee_first" }}
          author={users.find((u) => u.id === ticket.employeeId)}
          isAgentAuthor={false}
          isOriginal
        />
        {ticket.turns.map((turn, i) => (
          <Turn key={i} turn={turn} author={authorOf(turn)} isAgentAuthor={isAgentTurn(turn)} />
        ))}
      </ol>

      <form onSubmit={send} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isEmployee ? "bg-accent-100 text-accent-700" : "bg-slate-900 text-white"
            }`}
          >
            {viewer.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="flex-1">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isEmployee
                  ? "Reply to HR… add any extra detail that helps."
                  : "Write a reply… (starts the response clock / status updates automatically)"
              }
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {viewer.role === "agent" && (
                  <button
                    type="button"
                    onClick={() => setText(SUGGESTED[ticket.category] ?? SUGGESTED.Other)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-accent-300 hover:text-accent-700"
                    title="Insert a ready-made reply based on the ticket category (mock AI assist)"
                  >
                    Suggested reply
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={sending || text.trim().length < 2}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending…" : isEmployee ? "Send reply" : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
