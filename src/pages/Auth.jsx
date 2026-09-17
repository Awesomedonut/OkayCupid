import React, { useState } from "react";
import { api } from "../api.js";
import { ProfileFields, blankProfile } from "../components/ProfileFields.jsx";
import { GoogleButton } from "../components/GoogleButton.jsx";
export function Auth({ signup, onDone, go }) {
  const [value, setValue] = useState(blankProfile),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [adult, setAdult] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(
        signup ? "/register" : "/login",
        "POST",
        signup ? { ...value, email, password, adult } : { email, password },
      );
      await onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow">
      <p className="eyebrow">
        {signup ? "HELLO, NEW QUESTION PERSON" : "GOOD TO SEE YOU AGAIN"}
      </p>
      <h1>{signup ? "Come as you are." : "Welcome back."}</h1>
      <p>
        {signup
          ? "A few details, then the questions that matter. Your email stays private."
          : "Your answers are right where you left them."}
      </p>
      <GoogleButton />
      <form onSubmit={submit} className="panel">
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 12 : undefined}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {signup && (
          <>
            <p className="micro">
              Use 12–128 characters. Choose a password you don’t use elsewhere.
            </p>
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
              Your profile is visible to eligible members. Answers are shared in
              comparisons unless marked private. Private answers still affect
              scores. This self-hosted community has no messaging or moderation
              service.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? "One moment…" : signup ? "Create my account" : "Log in"}
        </button>
      </form>
      <p>
        {signup ? "Already have an account?" : "New to okaycupid?"}{" "}
        <button
          className="text-button"
          onClick={() => {
            setError("");
            go(signup ? "login" : "signup");
          }}
        >
          {signup ? "Log in" : "Join us"}
        </button>
      </p>
    </main>
  );
}
