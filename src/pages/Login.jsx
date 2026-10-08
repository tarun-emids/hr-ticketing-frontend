import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const FIELD =
  "w-full border border-surface-2 bg-surface px-3 py-2.5 text-body-lg text-warm focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block mono-label text-[10px] text-warm/50";

export default function Login() {
  const { login, users, usersReady } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("employee");
  const [userId, setUserId] = useState("");

  const people = users.filter((u) => u.role === role);

  // Keep the selected user valid as the API list loads / role flips
  useEffect(() => {
    if (!people.length) return;
    if (!people.some((p) => p.id === userId)) setUserId(people[0].id);
  }, [people, userId]);

  const pickRole = (r) => {
    setRole(r);
    const first = users.find((u) => u.role === r);
    setUserId(first ? first.id : "");
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    const found = users.find((u) => u.id === userId);
    if (!found) return;
    login(found);
    navigate(role === "agent" ? "/inbox" : "/my-tickets");
  };

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <div
        aria-hidden
        className="teal-gradient pointer-events-none absolute inset-x-0 top-0 h-1"
      />
      {/* Brand plate */}
      <section className="relative hidden flex-1 flex-col overflow-hidden p-12 lg:flex">
        {/* Frame mid-bar: x 7-28 · y 21-28 of the 60×48 modular grid */}
        <div
          aria-hidden
          className="absolute bg-teal"
          style={{ left: "11.67%", top: "43.75%", width: "35%", height: "14.58%" }}
        >
          <span className="mono-label absolute bottom-0 right-0 px-4 pb-3 text-[10px] text-warm">
            0 1 / H R  D E S K
          </span>
        </div>
        <Logo size="lg" />

        <div className="relative z-10 mt-16 max-w-xl">
          <span className="mono-label mb-4 flex items-center gap-2 text-[10px] text-teal-deep">
            <IconArrowDownRight size={16} aria-hidden />
            HR DESK / INTERNAL
          </span>
          <div className="rule-teal mb-6" />
          <h1 className="text-display text-warm">
            Outcomes you can <span className="text-teal-deep">track.</span>
          </h1>
          <p className="mt-6 text-body-lg text-warm">
            Raise requests, follow the thread, know exactly where each ticket stands —
            without chasing anyone down.
          </p>
        </div>

        <p className="mono-label mt-auto text-[10px] text-warm/35">
          EMIDS / HR DESK / DEMO AUTH · NO CREDENTIALS CHECKED
        </p>
      </section>

      {/* Sign-in card */}
      <section className="flex w-full items-center justify-center px-6 lg:w-[38rem]">
        <form onSubmit={onSubmit} noValidate className="soft-bl w-full max-w-md border border-surface-2 bg-surface p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="nav" />
          </div>

          <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal">
            <IconArrowDownRight size={16} aria-hidden />
            01 / SIGN IN
          </span>
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
                    ? "border-teal bg-teal/10 text-teal-deep"
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
            {people.length === 0 && <option value="">{usersReady ? "No users" : "Loading users…"}</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!userId}
            className="mono-label flex w-full items-center justify-center gap-2 border border-teal bg-teal py-3.5 text-[10px] text-warm transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
            <IconArrowDownRight size={16} aria-hidden />
          </button>
          <p className="mt-5 text-center text-caption text-warm/35">
            Mock auth for demo purposes only — real users come from the backend.
          </p>
        </form>
      </section>
    </div>
  );
}
