import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { USERS } from "../data/users";
import { useAuth } from "../context/AuthContext";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-xl font-bold text-white">H</div>
          <h1 className="text-xl font-bold text-slate-900">HR Desk</h1>
          <p className="text-sm text-slate-500">Internal ticketing — pick a demo identity to sign in</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <fieldset className="mb-5">
            <legend className="mb-2 block text-sm font-medium text-slate-700">Sign in as</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "employee", label: "Employee" },
                { key: "agent", label: "HR agent" },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => pickRole(r.key)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    role === r.key
                      ? "border-accent-500 bg-accent-50 text-accent-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="login-user">
            Demo user
          </label>
          <select
            id="login-user"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-accent-500 focus:outline-none"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-accent-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
          >
            Continue as {role === "agent" ? "HR agent" : "employee"}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Mock auth for demo purposes only — no credentials checked.
          </p>
        </form>
      </div>
    </div>
  );
}
