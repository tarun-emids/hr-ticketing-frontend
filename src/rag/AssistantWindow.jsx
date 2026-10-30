import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon, PATHS } from "../components/icons";
import { Spinner } from "../components/primitives";
import { askAssistant } from "./api";

// The assistant window application (src/rag). STATELESS BY DESIGN: the
// parent unmounts this window when the bubble closes, so the whole
// conversation dies with it — reopening the assistant is always a first
// exchange (answers stay audited server-side; they are never re-shown).
//
// Every assistant answer carries the paragraph it was built from: inline
// [REF · ¶n] markers stay in the text, and the citation chips underneath
// link straight to the PDF viewer at that policy's page.
export default function AssistantWindow({ onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant'|'error', text, citations?}
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null); // auto-scroll to the newest message

  // Close on Escape — a chat that can't be dismissed from the keyboard is a
  // broken chat.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setSending(true);
    try {
      const { answer, citations } = await askAssistant(user.id, question);
      setMessages((m) => [...m, { role: "assistant", text: answer, citations }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "error", text: err.message || "The assistant is unreachable right now." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="HR assistant"
      className="soft-bl flex w-80 flex-col border border-surface-2 bg-surface"
      style={{ maxHeight: "70vh" }}
    >
      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <span className="mono-label text-[10px] text-teal">↘ H R · A S S I S T A N T</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close HR assistant"
          className="border border-warm/15 px-1.5 text-warm/50 transition-colors hover:text-warm"
        >
          ×
        </button>
      </div>
      <div className="rule-teal mx-5 mb-3" />

      {/* Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-2">
        {messages.length === 0 && (
          <p className="py-6 text-center text-caption leading-relaxed text-warm/40">
            Ask about company policies — leave, payroll, insurance, hybrid work.
            <br />
            Answers cite the exact paragraph of the policy they use.
          </p>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {sending && (
          <div className="py-2">
            <Spinner label="Checking the policy library" />
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex border-t border-surface-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a policy…"
          aria-label="Ask the HR assistant"
          maxLength={500}
          className="w-full bg-canvas px-5 py-3.5 text-body text-warm placeholder:text-warm/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="mono-label m-2.5 border border-teal bg-teal px-3 text-[10px] text-canvas transition-colors hover:bg-teal-light disabled:pointer-events-none disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

function Message({ message }) {
  if (message.role === "user") {
    return (
      <div className="mb-3 flex justify-end">
        <p className="soft-bl max-w-[85%] border border-surface-2 bg-surface-2 px-3.5 py-2.5 text-body text-warm">
          {message.text}
        </p>
      </div>
    );
  }
  // assistant + error share the left column; errors keep the red signal.
  return (
    <div className="mb-3 flex flex-col items-start gap-1.5">
      <p
        className={`max-w-full whitespace-pre-wrap border px-3.5 py-2.5 text-body leading-relaxed ${
          message.role === "error"
            ? "border-error/40 bg-error/10 text-error"
            : "border-surface-2 bg-canvas text-warm"
        }`}
      >
        {message.text}
      </p>
      {message.citations?.length > 0 && <Citations citations={message.citations} />}
    </div>
  );
}

// One chip per cited paragraph: opens the policy PDF's viewer page.
function Citations({ citations }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {citations.map((c, i) => (
        <Link
          key={`${c.ref}-${c.blockNo}-${i}`}
          to={`/kb/${c.slug}`}
          title={`${c.ref} · ${c.title} — ${c.section}, paragraph ${c.blockNo}: “${c.snippet}”`}
          className="mono-label inline-flex items-center gap-1.5 border border-teal/40 px-2 py-1 text-[9px] text-teal-light transition-colors hover:border-teal hover:text-teal"
        >
          <Icon d={PATHS.kb} className="h-3 w-3" />
          {c.ref} · ¶{c.blockNo}
        </Link>
      ))}
    </div>
  );
}
