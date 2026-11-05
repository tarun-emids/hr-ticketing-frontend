import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../state/hooks";
import { login as loginThunk } from "../state/authSlice";
import * as api from "../api/client";
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
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key) => {
    setErrors((prev) => ({ ...prev, [key]: undefined, _form: undefined }));
    setNotice("");
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();

    const e = {};
    if (!email.trim()) e.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "That doesn't look like a valid email address.";
    if (mode === "login") {
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
        // unwrap() rejects with the thunk's rejectWithValue payload (a string)
        setErrors({
          _form:
            (typeof err === "string" ? err : err?.message) ||
            "Could not sign in — is the API running?",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "forgot-request") {
      setErrors(e);
      if (Object.keys(e).length > 0) return;
      setSubmitting(true);
      try {
        const result = await api.requestPasswordReset(email.trim());
        setMode("forgot-reset");
        setNotice(result.message);
        setErrors({});
      } catch (err) {
        setErrors({ _form: err.message || "Could not request a reset code. Please try again." });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(otp)) e.otp = "Enter the 6-digit code from your email.";
    const passwordBytes = new TextEncoder().encode(newPassword).length;
    if (Array.from(newPassword).length < 8) e.newPassword = "Use at least 8 characters.";
    else if (passwordBytes > 72) e.newPassword = "Your password must be at most 72 UTF-8 bytes.";
    if (newPassword !== confirmPassword) e.confirmPassword = "The passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const result = await api.resetPassword(email.trim(), otp, newPassword);
      setMode("login");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.message);
      setErrors({});
    } catch (err) {
      setErrors({
        _form: err.message || "Could not reset your password. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setNotice("");
    if (nextMode !== "forgot-reset") {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    }
    if (nextMode !== "login") setPassword("");
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

          <h1 className="text-h3 text-warm">
            {mode === "login" ? "Sign in" : "Reset your password"}
          </h1>
          <p className="mt-1 text-caption text-warm/50">
            Use the account your organisation gave you.
          </p>
          <div className="mt-6" />

          {mode !== "forgot-reset" && (
            <>
              <label htmlFor="login-email" className={LABEL}>
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearError("email");
                }}
                className={`${FIELD} mb-5`}
              />
              <FieldError msg={errors.email} />
            </>
          )}

          {mode === "login" && (
            <>
              <label htmlFor="login-password" className={LABEL}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError("password");
                }}
                placeholder="Your HR Desk password"
                className={`${FIELD} mb-6`}
              />
              <FieldError msg={errors.password} />
              <button
                type="button"
                onClick={() => changeMode("forgot-request")}
                className="mb-6 text-caption text-teal-deep underline underline-offset-4 hover:text-teal"
              >
                Forgot password?
              </button>
            </>
          )}

          {mode === "forgot-reset" && (
            <>
              <p className="mb-5 text-caption text-warm/60">
                Enter the code sent to <span className="font-medium text-warm">{email}</span> and
                choose a new password.
              </p>
              <label htmlFor="reset-otp" className={LABEL}>
                6-digit reset code
              </label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value);
                  clearError("otp");
                }}
                className={`${FIELD} mb-5`}
              />
              <FieldError msg={errors.otp} />
              <label htmlFor="reset-new-password" className={LABEL}>
                New password
              </label>
              <input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  clearError("newPassword");
                }}
                className={`${FIELD} mb-5`}
              />
              <FieldError msg={errors.newPassword} />
              <label htmlFor="reset-confirm-password" className={LABEL}>
                Confirm new password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearError("confirmPassword");
                }}
                className={`${FIELD} mb-6`}
              />
              <FieldError msg={errors.confirmPassword} />
            </>
          )}

          {mode === "forgot-request" && (
            <p className="mb-6 text-caption text-warm/60">
              We’ll email a reset code if an account exists for this address.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-teal py-2.5 text-body font-medium text-canvas shadow-xs transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "forgot-request"
                  ? "Send reset code"
                  : "Reset password"}
          </button>

          {mode === "forgot-reset" && (
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setNotice("");
                try {
                  const result = await api.requestPasswordReset(email.trim());
                  setNotice(result.message);
                  setErrors({});
                } catch (err) {
                  setErrors({ _form: err.message || "Could not request another code." });
                } finally {
                  setSubmitting(false);
                }
              }}
              className="mt-4 w-full text-center text-caption text-teal-deep underline underline-offset-4 hover:text-teal disabled:opacity-40"
            >
              Resend code
            </button>
          )}

          {mode !== "login" && (
            <button
              type="button"
              onClick={() => changeMode(mode === "forgot-reset" ? "forgot-request" : "login")}
              className="mt-4 w-full text-center text-caption text-warm/55 underline underline-offset-4 hover:text-warm"
            >
              {mode === "forgot-reset" ? "Use a different email" : "Back to sign in"}
            </button>
          )}

          {mode === "login" && location.state?.passwordChanged && (
            <p
              role="status"
              className="mt-4 border border-ok/40 bg-ok/10 px-4 py-3 text-caption text-ok-deep"
            >
              Your password was changed. Please sign in with your new password.
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mt-4 border border-ok/40 bg-ok/10 px-4 py-3 text-caption text-ok-deep"
            >
              {notice}
            </p>
          )}

          {errors._form && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-error/35 bg-error/10 px-3 py-2.5"
            >
              <FieldError msg={errors._form} />
            </div>
          )}

          {mode === "login" && (
            <p className="mt-5 text-center text-caption text-warm/35">
              Accounts are provisioned by your organisation — there is no sign-up. Contact HR/IT for
              access.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
