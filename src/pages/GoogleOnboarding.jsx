import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { ProfileFields, blankProfile } from "../components/ProfileFields.jsx";
export function GoogleOnboarding({ onDone }) {
  const [pending, setPending] = useState(undefined),
    [value, setValue] = useState(blankProfile),
    [adult, setAdult] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/auth/google/pending")
      .then(setPending)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/google/complete", "POST", { ...value, adult });
      await onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow">
      <p className="eyebrow">ONE MORE INTRODUCTION</p>
      <h1>Make it your own.</h1>
      {pending ? (
        <>
          <p>
            Google verified {pending.email}. Complete your adult profile to join
            the directory.
          </p>
          <form className="panel" onSubmit={submit}>
            <ProfileFields value={value} setValue={setValue} />
            <label className="check">
              <input
                type="checkbox"
                required
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
              />
              I confirm I am at least 18 years old.
            </label>
            <p className="micro">
              Your profile will be visible to eligible members. Answers can be
              marked private.
            </p>
            <button className="button" disabled={busy}>
              Finish joining
            </button>
          </form>
        </>
      ) : (
        <p>
          {pending === undefined
            ? "Checking your sign-in…"
            : "Your sign-in expired. Start again from the login page."}{" "}
          <a href="#login">Log in</a>
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </main>
  );
}
