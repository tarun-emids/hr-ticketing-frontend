import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const FIELD =
  "w-full border border-surface-2 bg-surface px-3 py-2.5 text-body-lg text-warm placeholder:text-warm/25 focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block mono-label text-[10px] text-warm/50";

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-caption text-error">
      <span aria-hidden className="mt-0.5 block h-2 w-2 shrink-0 bg-error" />
      {msg}
    </p>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();

    const e = {};
    if (!email.trim()) e.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "That doesn't look like a valid email address.";
    if (!password) e.password = "Enter your password.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const appUser = await login(email.trim(), password);
      navigate(appUser.role === "agent" ? "/inbox" : "/my-tickets");
    } catch (err) {
      setErrors({ _form: err.message || "Could not sign in — is the API running?" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <div
        aria-hidden
        className="teal-gradient pointer-events-none absolute inset-x-0 top-0 h-1"
      />
      {/* Brand plate */}
      <section className="relative hidden flex-1 flex-col overflow-hidden p-12 lg:flex">
        {/* Frame mid-bar: x 7-28 of the 60×48 modular grid, parked in the
            empty lower band of the plate so it never collides with copy. */}
        <div
          aria-hidden
          className="absolute z-0 bg-teal"
          style={{ left: "11.67%", top: "70%", width: "35%", height: "14.58%" }}
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
          EMIDS / HR DESK / INTERNAL · CONFIDENTIAL
        </p>
      </section>

      {/* Sign-in card */}
      <section className="flex w-full items-center justify-center px-6 lg:w-[38rem]">
        <form onSubmit={onSubmit} noValidate className="soft-bl w-full max-w-md border border-surface-2 bg-surface p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="nav" />
          </div>

          <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
            <IconArrowDownRight size={16} aria-hidden />
            01 / SIGN IN
          </span>
          <div className="rule-teal mb-6" />

          <label htmlFor="login-email" className={LABEL}>Work email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined, _form: undefined }));
            }}
            placeholder="e.g. priya@acme.com"
            className={`${FIELD} mb-5`}
          />
          <FieldError msg={errors.email} />

          <label htmlFor="login-password" className={LABEL}>Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: undefined, _form: undefined }));
            }}
            placeholder="Your HR Desk password"
            className={`${FIELD} mb-6`}
          />
          <FieldError msg={errors.password} />

          <button
            type="submit"
            disabled={submitting}
            className="mono-label w-full border border-teal bg-teal py-3.5 text-[10px] text-canvas transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Signing in…" : "Sign in ↘"}
          </button>

          {errors._form && (
            <div className="mt-4 border border-error/40 bg-error/10 px-4 py-3">
              <FieldError msg={errors._form} />
            </div>
          )}

          <p className="mt-5 text-center text-caption text-warm/35">
            Accounts are provisioned by your organisation — there is no sign-up.
            Contact HR/IT for access.
          </p>
        </form>
      </section>
    </div>
  );
}
