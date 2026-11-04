import { Link, useParams } from "react-router-dom";
import { IconArrowDownRight, IconArrowLeft } from "@tabler/icons-react";
import TicketForm from "../components/TicketForm";

export default function NewTicket() {
  const { id: draftId } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/my-tickets"
        className="inline-flex items-center gap-2 text-body text-warm/50 transition-colors hover:text-teal-deep"
      >
        <IconArrowLeft size={16} aria-hidden />
        Back to my tickets
      </Link>

      <header className="mb-8">
        <h1 className="text-h3 text-warm">{draftId ? "Continue draft" : "New ticket"}</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Describe your request and HR will pick it up — most tickets get a first reply within a
          day.
        </p>
      </header>

      <TicketForm />
    </div>
  );
}
