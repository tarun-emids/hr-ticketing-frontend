import { useState } from "react";
import { Icon, PATHS } from "../components/icons";
import AssistantWindow from "./AssistantWindow";

// The floating HR-assistant bubble (src/rag) — mounted app-wide from the
// shared Layout so the assistant is reachable from every signed-in screen.
// State here is ONLY open/closed: closing unmounts the window, and the
// window owns (and therefore discards) the whole conversation — reopening
// is always the employee's first exchange, with no chat history shown.
export default function AssistantBubble() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && <AssistantWindow onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close HR assistant" : "Open HR assistant"}
        title={open ? "Close HR assistant" : "HR assistant — answers cite the policy paragraph"}
        className="soft-bl flex h-12 w-12 items-center justify-center border border-teal bg-teal text-canvas transition-colors hover:bg-teal-light"
      >
        <Icon d={open ? PATHS.arrowLeft : PATHS.kb} className="h-5 w-5" />
      </button>
    </div>
  );
}
