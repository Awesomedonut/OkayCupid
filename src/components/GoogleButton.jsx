import React, { useEffect, useState } from "react";
import { api } from "../api.js";
export function GoogleButton({ linking = false, mutationContext }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api("/auth/google")
      .then(setStatus)
      .catch(() => setStatus({ enabled: false }));
  }, []);
  const code = new URLSearchParams(location.hash.split("?")[1] || "").get(
    "google",
  );
  const messages = {
    unconfigured:
      "Google sign-in is not configured on this server. You can use email and password.",
    signin: "Sign in to your existing account before linking Google.",
    expired:
      "That sign-in expired or could not be verified. Please start again.",
    collision:
      "This email or Google identity already belongs to an account. Sign in to that account, then link Google from your profile. Accounts are never merged by email.",
    failed:
      "Google sign-in could not be verified. Please try again or use your password.",
  };
  return (
    <section className="google-signin">
      {code && (
        <p className="error" role="alert">
          {messages[code] || messages.failed}
        </p>
      )}
      {status?.linked ? (
        <p>✓ Google is linked to your account.</p>
      ) : status?.enabled ? (
        <a
          className="button secondary"
          href={`/api/auth/google/start${linking ? `?link=1&member=${mutationContext}` : ""}`}
        >
          {linking ? "Link Google to this account" : "Continue with Google"}
        </a>
      ) : (
        <p className="micro">
          {status
            ? "Google sign-in is not configured on this server. Email and password are available."
            : "Checking sign-in options…"}
        </p>
      )}
      {linking && (
        <p className="micro">
          Link only a Google account you own. Your existing password continues
          to work.
        </p>
      )}
    </section>
  );
}
