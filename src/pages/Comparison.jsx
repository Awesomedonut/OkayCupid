import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Avatar } from "../components/Avatar.jsx";
export function Comparison({ id, demoMode, go }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("shared");
  const requestVersion = useRef(0);
  async function load() {
    const version = ++requestVersion.current;
    setError("");
    setData(null);
    try {
      const result = await api(`${demoMode ? "/demo" : ""}/people/${id}`);
      if (version === requestVersion.current) setData(result);
    } catch (e) {
      if (version === requestVersion.current) setError(e.message);
    }
  }
  useEffect(() => {
    load();
    setTab("shared");
    return () => {
      requestVersion.current++;
    };
  }, [id, demoMode]);
  if (error)
    return (
      <main>
        <div className="error" role="alert">
          {error}
        </div>
        <button onClick={load}>Try again</button>
        <p>
          <a href="#people">Back to discover</a>
        </p>
      </main>
    );
  if (!data)
    return (
      <main>
        <p role="status">Looking beneath the surface…</p>
      </main>
    );
  const { person: p, match: m } = data;
  return (
    <main className="comparison">
      <a href="#people" className="back-link">
        ← Back to discover
      </a>
      <section className="profile-hero">
        <Avatar person={p} large />
        <div>
          <p className="eyebrow">
            {p.fictional
              ? "A FICTIONAL DEMO PERSON"
              : "A PERSON, NOT A PERCENTAGE"}
          </p>
          <h1>
            {p.name}, {p.age}
          </h1>
          <p>
            {p.gender} · {p.city || "Location not shared"}
          </p>
          <p className="lede">{p.bio || "A story still taking shape."}</p>
          <p className="interest-line">{p.interests}</p>
        </div>
      </section>
      <section className="match-summary">
        <div className="match-number">
          <strong>{m.score === null ? "—" : `${m.score}%`}</strong>
          <span>
            {m.score === null ? "Compatibility unknown" : "published match"}
          </span>
        </div>
        <div>
          <h2>{m.confidence}</h2>
          <p>
            {m.overlap} shared questions · {m.meaningful} with meaningful weight
          </p>
          <p>
            {m.score === null
              ? "A score needs shared questions with nonzero importance in both directions."
              : `${m.directionalA === null ? "Unknown" : Math.round(m.directionalA * 100) + "%"} of your weighted preferences met · ${m.directionalB === null ? "Unknown" : Math.round(m.directionalB * 100) + "%"} of theirs.`}
          </p>
          <p className="micro">
            {m.rawCompatibility !== null && (
              <>
                Raw compatibility: {Math.round(m.rawCompatibility * 100)}%.
                Published score subtracts {Number((100 / m.overlap).toFixed(2))}{" "}
                percentage points for {m.overlap} shared questions, with a
                minimum of zero.{" "}
              </>
            )}
            This describes answers, not chemistry or safety. Confidence labels
            describe overlap, not statistical certainty.
          </p>
        </div>
        <a href="#about">Understand the math ↗</a>
      </section>
      {m.privateOverlap > 0 && (
        <p className="privacy-callout">
          {m.privateOverlap} shared{" "}
          {m.privateOverlap === 1 ? "question includes" : "questions include"} a
          private answer. These affect the score; answers, topics, and conflict
          details for them are hidden.
        </p>
      )}
      <section className="comparison-body">
        <aside>
          <p className="eyebrow">SHARED TOPICS</p>
          {Object.entries(m.topics).map(([t, v]) => (
            <div className="topic-summary" key={t}>
              <span>{t}</span>
              <span>
                {v.aligned}/{v.overlap} aligned
              </span>
              <progress
                value={v.aligned}
                max={v.overlap}
                aria-label={`${t} aligned`}
              />
            </div>
          ))}
          {!Object.keys(m.topics).length && (
            <p>No public shared answers yet.</p>
          )}
        </aside>
        <div>
          <div className="tabs" role="group" aria-label="Comparison view">
            <button
              aria-pressed={tab === "shared"}
              className={tab === "shared" ? "active" : ""}
              onClick={() => setTab("shared")}
            >
              Shared ground <span>{m.shared.length}</span>
            </button>
            <button
              aria-pressed={tab === "conflicts"}
              className={tab === "conflicts" ? "active" : ""}
              onClick={() => setTab("conflicts")}
            >
              Differences <span>{m.conflicts.length}</span>
            </button>
          </div>
          <p className="micro">
            Shared ground means your stated preferences accept each other’s
            answers, including irrelevant questions. It does not always mean
            identical answers.
          </p>
          {m[tab].length ? (
            m[tab].map((d) => (
              <article
                className={`comparison-question ${d.strong ? "strong-conflict" : ""}`}
                key={d.id}
              >
                <p className="eyebrow">
                  {d.topic}
                  {d.strong && (
                    <span className="conflict-label">Important difference</span>
                  )}
                </p>
                <h3>{d.prompt}</h3>
                {d.provenance && (
                  <p className="micro">
                    {d.provenance.label} · {d.provenance.options}
                  </p>
                )}
                <div className="answer-pair">
                  <div>
                    <span>You{demoMode ? " (Alex)" : ""}</span>
                    <p>{d.yours}</p>
                    {d.yourExplanation && (
                      <blockquote>{d.yourExplanation}</blockquote>
                    )}
                  </div>
                  <div>
                    <span>{p.name}</span>
                    <p>{d.theirs}</p>
                    {d.theirExplanation && (
                      <blockquote>{d.theirExplanation}</blockquote>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="panel empty">
              <h2>
                {tab === "shared"
                  ? "More to discover."
                  : "No visible differences yet."}
              </h2>
              <p>
                Only questions you have both answered publicly appear here. Keep
                answering to build a fuller picture.
              </p>
              <button className="text-button" onClick={() => go("questions")}>
                Explore questions →
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
