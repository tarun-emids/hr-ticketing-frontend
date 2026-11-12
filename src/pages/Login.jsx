import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../state/hooks";
import { login as loginThunk } from "../state/authSlice";
import * as api from "../api/client";
import Logo from "../components/Logo";
import cityImg from "../assets/city-teal.jpg";

const FIELD =
  "w-full rounded-lg border border-surface-2 bg-surface px-3 py-2.5 text-body text-warm placeholder:text-ink-3 focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block text-caption font-medium text-ink-2";

function FieldError({ id, msg, announce = true }) {
  if (!msg) return null;
  return (
    <p
      id={id}
      role={announce ? "alert" : undefined}
      className="mt-1.5 flex items-start gap-1.5 text-caption text-error-deep"
    >
      <span aria-hidden className="mt-0.5 block h-2 w-2 shrink-0 bg-error" />
      {msg}
    </p>
  );
}

// Field keys → input ids, for focusing the first invalid field on submit.
const FIELD_ID = {
  email: "login-email",
  password: "login-password",
  otp: "reset-otp",
  newPassword: "reset-new-password",
  confirmPassword: "reset-confirm-password",
};

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

  // Records validation errors and moves focus to the first invalid field, so
  // keyboard and screen-reader users land where the problem is (3.3.1/3.3.3).
  const applyErrors = (e) => {
    setErrors(e);
    const first = Object.keys(FIELD_ID).find((key) => e[key]);
    if (first) document.getElementById(FIELD_ID[first])?.focus();
    return Object.keys(e).length > 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();

    const e = {};
    if (!email.trim()) e.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "That doesn't look like a valid email address.";
    if (mode === "login") {
      if (!password) e.password = "Enter your password.";
      if (applyErrors(e)) return;

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
      if (applyErrors(e)) return;
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
    if (applyErrors(e)) return;

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
      {/* Brand plate — teal city backplate under a near-opaque surface scrim */}
      <section
        className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-surface-2 bg-surface p-12 lg:flex"
        style={{
          backgroundImage: `url(${cityImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 55%",
        }}
      >
        <div
          className="animate-fade-up absolute inset-0 bg-linear-to-b from-surface/93 via-surface/85 to-surface/95"
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between py-12">
          <Logo size="lg" />

          <div className="max-w-xl">
            <div className="rule-teal mb-6" />
            <h2 className="text-display text-warm">
              Outcomes you can <span className="text-teal-deep">track.</span>
            </h2>
            <p className="mt-5 max-w-md text-body-lg text-ink-2">
              Raise requests, follow the thread, know exactly where each ticket stands — without
              chasing anyone down.
            </p>
          </div>

          <p className="text-caption font-medium tracking-wide text-ink-3">
            Emids · HR desk · confidential
          </p>
        </div>
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
          <p className="mt-1 text-caption text-ink-3">
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
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                className={`${FIELD} mb-5`}
              />
              <FieldError id="login-email-error" msg={errors.email} />
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
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                className={`${FIELD} mb-6`}
              />
              <FieldError id="login-password-error" msg={errors.password} />
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
              <p className="mb-5 text-caption text-ink-2">
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
                aria-invalid={errors.otp ? true : undefined}
                aria-describedby={errors.otp ? "reset-otp-error" : undefined}
                className={`${FIELD} mb-5`}
              />
              <FieldError id="reset-otp-error" msg={errors.otp} />
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
                aria-invalid={errors.newPassword ? true : undefined}
                aria-describedby={errors.newPassword ? "reset-new-password-error" : undefined}
                className={`${FIELD} mb-5`}
              />
              <FieldError id="reset-new-password-error" msg={errors.newPassword} />
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
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={
                  errors.confirmPassword ? "reset-confirm-password-error" : undefined
                }
                className={`${FIELD} mb-6`}
              />
              <FieldError id="reset-confirm-password-error" msg={errors.confirmPassword} />
            </>
          )}

          {mode === "forgot-request" && (
            <p className="mb-6 text-caption text-ink-2">
              We’ll email a reset code if an account exists for this address.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-teal py-2.5 text-body font-medium text-teal-ink shadow-xs transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-4 w-full text-center text-caption text-ink-3 underline underline-offset-4 hover:text-warm"
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
              <FieldError id="login-form-error" msg={errors._form} announce={false} />
            </div>
          )}

          {mode === "login" && (
            <p className="mt-5 text-center text-caption text-ink-3">
              Accounts are provisioned by your organisation — there is no sign-up. Contact HR/IT for
              access.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
