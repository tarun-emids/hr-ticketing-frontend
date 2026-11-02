import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/client";
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
        await login(email.trim(), password);
        // Every persona lands on the shared home dashboard (role-aware nav
        // boxes + knowledge-base search) — the role's own workspace stays one
        // click away in the sidebar.
        navigate("/dashboard");
      } catch (err) {
        setErrors({ _form: err.message || "Could not sign in — is the API running?" });
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
      setErrors({ _form: err.message || "Could not reset your password. Please try again." });
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
      <div aria-hidden className="teal-gradient pointer-events-none absolute inset-x-0 top-0 h-1" />
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
            0 1 / H R D E S K
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
            Raise requests, follow the thread, know exactly where each ticket stands — without
            chasing anyone down.
          </p>
        </div>

        <p className="mono-label mt-auto text-[10px] text-warm/35">
          EMIDS / HR DESK / INTERNAL · CONFIDENTIAL
        </p>
      </section>

      {/* Sign-in card */}
      <section className="flex w-full items-center justify-center px-6 lg:w-[38rem]">
        <form
          onSubmit={onSubmit}
          noValidate
          className="soft-bl w-full max-w-md border border-surface-2 bg-surface p-8"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="nav" />
          </div>

          <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
            <IconArrowDownRight size={16} aria-hidden />
            {mode === "login"
              ? "01 / SIGN IN"
              : mode === "forgot-request"
                ? "02 / RESET PASSWORD"
                : "03 / VERIFY CODE"}
          </span>
          <div className="rule-teal mb-6" />

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
            className="mono-label w-full border border-teal bg-teal py-3.5 text-[10px] text-canvas transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in ↘"
                : mode === "forgot-request"
                  ? "Send reset code ↘"
                  : "Reset password ↘"}
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
            <div role="alert" className="mt-4 border border-error/40 bg-error/10 px-4 py-3">
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
