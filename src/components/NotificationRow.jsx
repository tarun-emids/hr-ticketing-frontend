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
      className={`flex w-full items-start gap-3 border-b border-surface-2 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:border-teal ${
        n.read ? "" : "bg-surface-2/40"
      } ${n.ticketRef ? "hover:bg-surface-2/60" : "cursor-default"}`}
    >
      <span aria-hidden className={`mt-1.5 w-1.5 shrink-0 ${n.read ? "" : "bg-teal h-1.5"}`} />
      <Row size={16} aria-hidden className="mt-0.5 shrink-0 text-teal/70" />
      <span className="min-w-0">
        <span className="block text-body text-warm/90">{n.message}</span>
        <span className="mono-label mt-1 block text-[10px] text-warm/35">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  );
}
