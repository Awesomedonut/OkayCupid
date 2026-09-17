import React, { useState } from "react";
import { useUnsavedWarning } from "../hooks/useUnsavedWarning.js";
import { api } from "../api.js";
import { ProfileFields } from "../components/ProfileFields.jsx";
import { GoogleButton } from "../components/GoogleButton.jsx";
export function Profile({ me, refresh, onDelete, active }) {
  const [value, setValue] = useState(me),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false);
  const [savedValue, setSavedValue] = useState(me);
  useUnsavedWarning(() => JSON.stringify(value) !== JSON.stringify(savedValue));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/profile", "PUT", value, me.mutationContext);
      await refresh(me.mutationContext);
      setSavedValue(value);
      setMessage("Profile saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/account", "DELETE", { confirm }, me.mutationContext);
      onDelete();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!active) return null;
  return (
    <main className="narrow">
      <p className="eyebrow">YOUR OWN LITTLE CORNER</p>
      <h1>Make yourself known.</h1>
      <GoogleButton linking mutationContext={me.mutationContext} />
      <form className="panel" onSubmit={save}>
        <ProfileFields value={value} setValue={setValue} />
        <button className="button" disabled={busy}>
          Save profile
        </button>
        {message && (
          <p role="status" className="success">
            {message}
          </p>
        )}
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="panel data-controls">
        <h2>Your data belongs to you.</h2>
        <p>
          Export your profile and all your answers, including private answers,
          as JSON. Keep that file somewhere private.
        </p>
        <a href="/api/export" className="button secondary" download>
          Export my data ↓
        </a>
        <hr />
        <h3>Delete your account</h3>
        <p>
          Permanently remove your profile, answers, and sessions from the active
          database. This cannot be undone. Operator backups may retain older
          copies until their retention period ends.
        </p>
        <form onSubmit={remove}>
          <label>
            Type DELETE to confirm
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              pattern="DELETE"
              required
            />
          </label>
          <button
            className="button danger-button"
            disabled={busy || confirm !== "DELETE"}
          >
            Delete my account
          </button>
        </form>
      </section>
    </main>
  );
}
