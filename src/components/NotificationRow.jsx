import { timeAgo } from "../utils";

const ICONS = {
  ticket_created: "M12 4.5v15m7.5-7.5h-15",
  ticket_assigned:
    "M7.5 21h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 5.25 9.75v9A2.25 2.25 0 0 0 7.5 21Zm3.75-13.5V5.25A2.25 2.25 0 0 1 13.5 3h5.25A2.25 2.25 0 0 1 21 5.25V16.5",
  ticket_status_changed:
    "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z",
  ticket_reply: "M12 20.25a8.25 8.25 0 1 0 3.166-6.41L12 20.25Zm0 0L8.5 16.5",
  sla_breached:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
};

export default function NotificationRow({
  notification: n,
  itemRef,
  role,
  tabIndex,
  onKeyDown,
  onOpen,
}) {
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
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-teal/70"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      >
        <path d={ICONS[n.type] ?? ICONS.ticket_status_changed} />
      </svg>
      <span className="min-w-0">
        <span className="block text-body text-warm/90">{n.message}</span>
        <span className="mono-label mt-1 block text-[10px] text-warm/35">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  );
}
