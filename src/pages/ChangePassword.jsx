import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { logout as logoutThunk, selectUser } from "../state/authSlice";
import * as api from "../api/client";

const FIELD =
  "w-full border border-surface-2 bg-surface px-3 py-2.5 text-body-lg text-warm placeholder:text-ink-3 focus:border-teal focus:outline-none";
const LABEL = "mb-1.5 block mono-label text-[10px] text-ink-3";

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-caption text-error-deep">{msg}</p>;
}

export default function ChangePassword() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!currentPassword) nextErrors.currentPassword = "Enter your current password.";
    const passwordBytes = new TextEncoder().encode(newPassword).length;
    if (Array.from(newPassword).length < 8) nextErrors.newPassword = "Use at least 8 characters.";
    else if (passwordBytes > 72)
      nextErrors.newPassword = "Your new password must be at most 72 UTF-8 bytes.";
    if (newPassword && newPassword === currentPassword)
      nextErrors.newPassword = "Choose a password different from your current one.";
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = "The passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await api.changePassword(user.email, currentPassword, newPassword);
      await dispatch(logoutThunk()).unwrap();
      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (error) {
      setErrors({ _form: error.message || "Could not change your password. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl">
      <span className="mono-label mb-3 block text-[10px] text-teal-deep">ACCOUNT / SECURITY</span>
      <div className="rule-teal mb-6" />
      <h1 className="text-h2 text-warm">Change password</h1>
      <p className="mt-4 text-body text-ink-2">
        Use at least 8 characters and no more than 72 UTF-8 bytes. You’ll be asked to sign in again
        after changing it.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="soft-bl mt-8 border border-surface-2 bg-surface p-6"
      >
        <label htmlFor="current-password" className={LABEL}>
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            setErrors((previous) => ({
              ...previous,
              currentPassword: undefined,
              _form: undefined,
            }));
          }}
          className={`${FIELD} mb-5`}
        />
        <FieldError msg={errors.currentPassword} />

        <label htmlFor="new-password" className={LABEL}>
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setErrors((previous) => ({ ...previous, newPassword: undefined, _form: undefined }));
          }}
          className={`${FIELD} mb-5`}
        />
        <FieldError msg={errors.newPassword} />

        <label htmlFor="confirm-password" className={LABEL}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrors((previous) => ({
              ...previous,
              confirmPassword: undefined,
              _form: undefined,
            }));
          }}
          className={`${FIELD} mb-6`}
        />
        <FieldError msg={errors.confirmPassword} />

        <button
          type="submit"
          disabled={submitting}
          className="mono-label w-full border border-teal bg-teal py-3.5 text-[10px] text-teal-ink transition-colors hover:bg-teal-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Updating…" : "Change password ↘"}
        </button>
        {errors._form && (
          <div role="alert" className="mt-4 border border-error/40 bg-error/10 px-4 py-3">
            <FieldError msg={errors._form} />
          </div>
        )}
      </form>
    </section>
  );
}
