import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  changeAccountRole,
  createAdminAccount,
  deleteAdminAccount,
  listAdminAccounts,
} from "./api";
import { Spinner, EmptyState } from "../components/primitives";

const ROLES = ["employee", "agent", "admin"];

// Accounts administration (route /admin/accounts): create, delete and move
// people between roles (promotion). Server-side guards surface as 409s and
// are printed verbatim: open-ticket demotions, history-preserving deletes,
// last-admin protection.
export default function AdminAccounts() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", password: "" });

  useEffect(() => {
    let alive = true;
    listAdminAccounts(user.id)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message || "Could not load accounts."));
    return () => {
      alive = false;
    };
  }, [user.id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const created = await createAdminAccount(user.id, form);
      setRows((r) => [...(r ?? []), created]);
      setNotice(`Account created for ${created.email}.`);
      setForm({ name: "", email: "", role: "employee", password: "" });
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reRole = async (row, role) => {
    setBusy(true);
    setNotice("");
    try {
      const updated = await changeAccountRole(user.id, row.id, role);
      setRows((r) => r.map((x) => (x.id === row.id ? updated : x)));
      setNotice(`${updated.name} is now ${role}.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (
      !window.confirm(
        `Delete ${row.name} (${row.email})? Deletion is blocked for accounts tied to tickets or replies.`,
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await deleteAdminAccount(user.id, row.id);
      setRows((r) => r.filter((x) => x.id !== row.id));
      setNotice(`${row.name} deleted.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="mono-label mb-2 block text-[10px] text-teal">
          ↘ A D M I N · A C C O U N T S
        </span>
        <div className="rule-teal mb-4" />
        <h1 className="text-h3 text-warm">Accounts & permissions</h1>
        <p className="mt-1 text-caption text-warm/45">
          Promotions take effect at next login · deletions are refused when history must survive.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="mb-4 border border-teal/40 bg-teal/10 px-4 py-2.5 text-caption text-teal-light"
        >
          {notice}
        </p>
      )}
      {error && <EmptyState icon="↘" title="Accounts unavailable" body={error} />}

      {/* create form */}
      <form
        onSubmit={submit}
        className="mb-8 grid grid-cols-1 gap-2 border border-surface-2 bg-surface p-4 sm:grid-cols-[1fr_1.4fr_0.7fr_1fr_auto]"
      >
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          aria-label="Full name"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <input
          required
          type="email"
          placeholder="work email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          aria-label="Work email"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          aria-label="Role"
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm focus:border-teal focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          required
          type="password"
          placeholder="initial password (8+)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          aria-label="Initial password"
          minLength={8}
          className="border border-surface-2 bg-canvas px-3 py-2 text-body text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="mono-label border border-teal bg-teal px-4 text-[10px] text-canvas transition hover:bg-teal-light disabled:opacity-40"
        >
          CREATE
        </button>
      </form>

      {/* directory */}
      {rows === null && !error ? (
        <Spinner label="Loading accounts" />
      ) : (
        <div className="flex flex-col gap-2">
          {(rows ?? []).map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 border border-surface-2 bg-surface p-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-lg text-warm">{row.name}</span>
                <span className="mono-label block text-[9px] text-warm/35">{row.email}</span>
              </span>
              <select
                value={row.role}
                onChange={(e) => reRole(row, e.target.value)}
                disabled={busy}
                aria-label={`Role for ${row.name}`}
                className="mono-label border border-warm/20 bg-canvas px-2 py-1.5 text-[10px] text-warm focus:border-teal focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(row)}
                disabled={busy}
                title={
                  row.id === user.id ? "You cannot delete your own account here." : "Delete account"
                }
                className="mono-label border border-error/40 px-2 py-1.5 text-[10px] text-error transition-colors hover:bg-error/10 disabled:opacity-40"
              >
                DELETE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
