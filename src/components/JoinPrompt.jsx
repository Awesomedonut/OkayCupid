import React from "react";
export function JoinPrompt({ go }) {
  return (
    <main className="narrow">
      <p className="eyebrow">YOUR PEOPLE START WITH YOU</p>
      <h1>Got opinions? Come on in.</h1>
      <p>
        Create an adult account to save your answers and discover real members.
      </p>
      <button className="button" onClick={() => go("signup")}>
        Join okaycupid
      </button>
      <p>
        Already here? <a href="#login">Log in</a>
      </p>
    </main>
  );
}
