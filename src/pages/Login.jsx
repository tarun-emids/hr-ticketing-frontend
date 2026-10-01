import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { USERS } from "../data/users";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/emids-logo.png";

const FIELD =
  "w-full border border-surface-2 bg-surface px-3 py-2.5 text-body-lg text-warm focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block mono-label text-[10px] text-warm/50";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("employee");
  const [userId, setUserId] = useState("u1");

  const people = USERS.filter((u) => u.role === role);

  const pickRole = (r) => {
    setRole(r);
    const first = USERS.find((u) => u.role === r);
    setUserId(first.id);
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    login(USERS.find((u) => u.id === userId));
    navigate(role === "agent" ? "/inbox" : "/my-tickets");
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand plate */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          aria-hidden
          className="teal-gradient pointer-events-none absolute inset-x-0 top-0 h-1"
        />
        <div aria-hidden className="teal-gradient pointer-events-none absolute -top-40 -left-40 h-96 w-[40rem] rotate-90 opacity-10 blur-3xl" />
        <img src={logo} alt="Emids" className="h-8 w-fit self-start" />

        <div className="max-w-xl">
          <span className="mono-label mb-4 block text-[10px] text-teal">↘ HR DESK / INTERNAL</span>
          <div className="rule-teal mb-6" />
          <h1 className="text-display text-warm">
            Outcomes you can <span className="text-teal">track.</span>
          </h1>
          <p className="mt-6 text-body-lg text-warm/60">
            Raise requests, follow the thread, know exactly where each ticket stands —
            without chasing anyone down.
          </p>
        </div>

        <p className="mono-label text-[10px] text-warm/35">
          EMIDS / HR DESK / DEMO AUTH · NO CREDENTIALS CHECKED
        </p>
      </section>

      {/* Sign-in card */}
      <section className="flex w-full items-center justify-center px-6 lg:w-[38rem]">
        <form onSubmit={onSubmit} noValidate className="soft-bl w-full max-w-md border border-surface-2 bg-surface p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="Emids" className="h-7 w-fit" />
          </div>

          <span className="mono-label mb-3 block text-[10px] text-teal">↘ 0 1 /  S I G N  I N</span>
          <div className="rule-teal mb-6" />

          <span className={LABEL}>Sign in as</span>
          <div className="mb-6 grid grid-cols-2 gap-0">
            {[
              { key: "employee", label: "Employee" },
              { key: "agent", label: "HR agent" },
            ].map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => pickRole(r.key)}
                className={`mono-label border py-3 text-[10px] transition-colors ${
                  role === r.key
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-surface-2 text-warm/50 hover:text-warm"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <label htmlFor="login-user" className={LABEL}>Demo user</label>
          <select
            id="login-user"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={`${FIELD} mb-8`}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            type="submit"
            className="mono-label w-full border border-teal bg-teal py-3.5 text-[10px] text-canvas transition-colors hover:bg-teal-light"
          >
            Continue ↘
          </button>
          <p className="mt-5 text-center text-caption text-warm/35">
            Mock auth for demo purposes only.
          </p>
        </form>
      </section>
    </div>
  );
}
