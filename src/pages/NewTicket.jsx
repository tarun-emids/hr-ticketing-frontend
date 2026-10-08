import { Link, useParams } from "react-router-dom";
import { IconArrowDownRight, IconArrowLeft } from "@tabler/icons-react";
import TicketForm from "../components/TicketForm";

export default function NewTicket() {
  const { id: draftId } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/my-tickets" className="mono-label inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal">
        <IconArrowLeft size={16} aria-hidden />
        Back to my tickets
      </Link>

      <header className="mb-8">
        <span className="mono-label mb-3 flex items-center gap-2 pt-4 text-[10px] text-teal">
          <IconArrowDownRight size={16} aria-hidden />
          {draftId ? "02 / EDIT DRAFT" : "02 / NEW REQUEST"}
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
