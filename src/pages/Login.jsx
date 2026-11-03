import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../state/hooks";
import { login as loginThunk } from "../state/authSlice";
import Logo from "../components/Logo";

const FIELD =
  "w-full rounded-lg border border-surface-2 bg-surface px-3 py-2.5 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block text-caption font-medium text-warm/60";

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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();

    const e = {};
    if (!email.trim()) e.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "That doesn't look like a valid email address.";
    if (!password) e.password = "Enter your password.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await dispatch(loginThunk({ email: email.trim(), password })).unwrap();
      // Every persona lands on the shared home dashboard (role-aware nav
      // boxes + knowledge-base search) — the role's own workspace stays one
      // click away in the sidebar.
      navigate("/dashboard");
    } catch (err) {
      setErrors({ _form: err.message || "Could not sign in — is the API running?" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-canvas">
      {/* Brand plate */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-surface-2 bg-surface p-12 lg:flex">
        <Logo size="lg" />

        <div className="max-w-xl">
          <h1 className="text-display text-warm">
            Outcomes you can <span className="text-teal-deep">track.</span>
          </h1>
          <p className="mt-5 max-w-md text-body-lg text-warm/65">
            Raise requests, follow the thread, know exactly where each ticket stands — without
            chasing anyone down.
          </p>
        </div>

        <p className="text-caption text-warm/35">Emids · HR desk · confidential</p>
      </section>

      {/* Sign-in card */}
      <section className="flex w-full items-center justify-center px-6 lg:w-[38rem]">
        <form
          onSubmit={onSubmit}
          noValidate
          className="w-full max-w-md rounded-2xl border border-surface-2 bg-surface p-8 shadow-sm"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="nav" />
          </div>

          <h1 className="text-h3 text-warm">Sign in</h1>
          <p className="mt-1 text-caption text-warm/50">
            Use the account your organisation gave you.
          </p>
          <div className="mt-6" />

          <label htmlFor="login-email" className={LABEL}>
            Work email
          </label>
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
            className={`${FIELD} mb-5`}
          />
          <FieldError msg={errors.email} />

          <label htmlFor="login-password" className={LABEL}>
            Password
          </label>
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
            className="mt-2 w-full rounded-lg bg-teal py-2.5 text-body font-medium text-canvas shadow-xs transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          {errors._form && (
            <div className="mt-4 rounded-lg border border-error/35 bg-error/10 px-3 py-2.5">
              <FieldError msg={errors._form} />
            </div>
          )}

          <p className="mt-5 text-center text-caption text-warm/35">
            Accounts are provisioned by your organisation — there is no sign-up. Contact HR/IT for
            access.
          </p>
        </form>
      </section>
    </div>
  );
}
