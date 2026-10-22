import { useState } from "react";
import { IconArrowDownRight } from "@tabler/icons-react";
import { addReply } from "../data/store";
import { formatDateTime } from "../utils";
import { Avatar } from "./primitives";

function Turn({ turn, author, isAgentAuthor }) {
  return (
    <li className={`flex gap-3 ${isAgentAuthor ? "" : "flex-row-reverse"}`}>
      <Avatar name={author?.name} tone={isAgentAuthor ? "dark" : "surface"} />
      <div className={`max-w-[85%] sm:max-w-[75%] ${isAgentAuthor ? "items-start" : "items-end"}`}>
        <div className={`mb-1 flex flex-wrap items-baseline gap-x-2 ${isAgentAuthor ? "" : "justify-end"}`}>
          <span className="text-body font-medium text-warm">{author?.name}</span>
          <span className="mono-label text-[10px] text-warm/35">
            {isAgentAuthor ? "HR" : "Employee"} · {formatDateTime(turn.at)}
          </span>
        </div>
        <div
          className={`border px-4 py-3 ${
            isAgentAuthor
              ? "border-surface-2 bg-surface-2/50 text-warm/90"
              : "border-teal/30 bg-teal/10 text-warm"
          }`}
        >
          <p className="whitespace-pre-wrap text-body-lg">{turn.text}</p>
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
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-5">
        <Turn
          turn={{ at: ticket.createdAt, text: ticket.description }}
          author={users.find((u) => u.id === ticket.employeeId)}
          isAgentAuthor={false}
        />
        {ticket.turns.map((turn, i) => (
          <Turn key={i} turn={turn} author={authorOf(turn)} isAgentAuthor={isAgentTurn(turn)} />
        ))}
      </ol>

      <form onSubmit={send} className="border border-surface-2 bg-surface-2 p-4">
        <div className="flex items-start gap-3">
          <Avatar name={viewer.name} tone={isEmployee ? "surface" : "teal"} />
          <div className="flex-1">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isEmployee
                  ? "Reply to HR — add any extra detail that helps."
                  : "Write a reply — the response clock and status update automatically."
              }
              className="w-full resize-y border border-surface-2 bg-canvas px-3 py-3 text-body-lg text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {viewer.role === "agent" && (
                  <button
                    type="button"
                    onClick={() => setText(SUGGESTED[ticket.category] ?? SUGGESTED.Other)}
                    className="mono-label border border-warm/30 px-3 py-1.5 text-[10px] text-warm/60 transition-colors hover:border-teal hover:text-teal-deep"
                    title="Insert a reply frame for this category (mock assist)"
                  >
                    Suggested reply
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={sending || text.trim().length < 2}
                className="mono-label inline-flex items-center gap-2 border border-teal bg-teal px-4 py-3 text-[10px] text-warm transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send reply"}
                <IconArrowDownRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
