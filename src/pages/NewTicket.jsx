import { Link } from "react-router-dom";
import TicketForm from "../components/TicketForm";

export default function NewTicket() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/my-tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to my tickets
      </Link>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">New ticket</h1>
        <p className="text-sm text-slate-500">Describe your request and HR will pick it up — most tickets get a first reply within a day.</p>
      </header>
      <TicketForm />
    </div>
  );
}
