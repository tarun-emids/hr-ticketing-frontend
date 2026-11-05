import { timeAgo } from "../utils";
import {
  IconAlertTriangle,
  IconFileText,
  IconMessageReply,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";

const ICONS = {
  ticket_created: IconPlus,
  ticket_assigned: IconFileText,
  ticket_status_changed: IconPencil,
  ticket_reply: IconMessageReply,
  sla_breached: IconAlertTriangle,
};

export default function NotificationRow({
  notification: n,
  itemRef,
  role,
  tabIndex,
  onKeyDown,
  onOpen,
}) {
  const Row = ICONS[n.type] ?? ICONS.ticket_status_changed;
  return (
    <button
      role={role}
      ref={itemRef}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(n)}
      aria-disabled={!n.ticketRef}
      className={`flex w-full items-start gap-3 border-b border-surface-2 px-4 py-3.5 text-left transition-colors focus:outline-none ${
        n.read ? "" : "bg-surface-2/50"
      } ${n.ticketRef ? "hover:bg-surface-2" : "cursor-default"}`}
    >
      <span
        aria-hidden
        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-teal"}`}
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-teal-deep"
      >
        <Row size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-body text-warm">{n.message}</span>
        <span className="mt-0.5 block text-caption text-ink-3">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  );
}
