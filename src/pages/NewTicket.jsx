import { Link, useParams } from "react-router-dom";
import TicketForm from "../components/TicketForm";

export default function NewTicket() {
  const { id: draftId } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/my-tickets" className="mono-label inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to my tickets
      </Link>

      <header className="mb-8">
        <span className="mono-label mb-3 block pt-4 text-[10px] text-teal">
          {draftId ? "↘ 0 2 /  EDIT DRAFT" : "↘ 0 2 /  N E W  R E Q U E S T"}
        </span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">{draftId ? "Continue draft" : "New ticket"}</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Describe your request and HR will pick it up — most tickets get a first reply within a day.
        </p>
      </header>

      <TicketForm />
    </div>
  );
}
