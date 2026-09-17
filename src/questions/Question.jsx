import React from "react";
import { useQuestionDraft } from "./useQuestionDraft.js";
const importanceLabels = [
  "Irrelevant",
  "A little",
  "Somewhat",
  "Very",
  "Essential",
];
const weights = [0, 1, 10, 50, 250];
export function Question({
  question,
  drafts,
  memberContext,
  saved,
  canSave,
  demoMode,
  refresh,
  go,
  next,
  previous,
}) {
  const {
    explanation,
    setExplanation,
    answer,
    setAnswer,
    acceptable,
    setAcceptable,
    importance,
    setImportance,
    isPrivate,
    setPrivate,
    noPreference,
    setNoPreference,
    message,
    error,
    busy,
    save,
    skip,
    remove,
  } = useQuestionDraft({
    question,
    drafts,
    memberContext,
    saved,
    canSave,
    refresh,
    go,
    next,
  });
  return (
    <form className="question-card" onSubmit={save}>
      <p className="eyebrow">
        QUESTION {String(question.id).padStart(3, "0")}
        {saved && <span className="saved-badge">✓ Answered</span>}
      </p>
      <h2>{question.prompt}</h2>
      {question.provenance && (
        <p className="source-note">
          <a href={question.provenance.url} target="_blank" rel="noreferrer">
            {question.provenance.label} ↗
          </a>
          <br />
          {question.provenance.options}
          {question.provenance.optionsUrl && (
            <>
              {" "}
              <a
                href={question.provenance.optionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Choice source ↗
              </a>
            </>
          )}
        </p>
      )}
      <fieldset disabled={demoMode || busy}>
        <legend>My answer</legend>
        <div className="answer-grid">
          {question.options.map((option, i) => (
            <label
              key={i}
              className={answer === i ? "chosen option" : "option"}
            >
              <input
                type="radio"
                name={`answer-${question.id}`}
                value={i}
                checked={answer === i}
                onChange={() => setAnswer(i)}
                required
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={demoMode || busy}>
        <legend>
          Answers I’d accept from a partner{" "}
          <span className="muted">Select all that work for you</span>
        </legend>
        <div className="answer-grid">
          {question.options.map((option, i) => (
            <label
              key={i}
              className={
                (noPreference || acceptable.includes(i) ? "chosen " : "") +
                "option"
              }
            >
              <input
                type="checkbox"
                disabled={noPreference}
                checked={noPreference || acceptable.includes(i)}
                onChange={(e) =>
                  setAcceptable(
                    e.target.checked
                      ? [...acceptable, i]
                      : acceptable.filter((v) => v !== i),
                  )
                }
              />
              {option}
            </label>
          ))}
        </div>
        <label className="check no-pref">
          <input
            type="checkbox"
            checked={noPreference}
            onChange={(e) => setNoPreference(e.target.checked)}
          />
          No preference — any answer works for me
        </label>
        <p className="micro">
          Selecting all or none also gives this question zero weight for your
          preferences. Your own answer still counts for the other person.
        </p>
      </fieldset>
      <fieldset disabled={demoMode || noPreference || busy}>
        <legend>How much does this matter to me?</legend>
        <div className="importance">
          {weights.map((w, i) => (
            <label
              key={w}
              className={importance === w && !noPreference ? "selected" : ""}
            >
              <input
                type="radio"
                name={`importance-${question.id}`}
                checked={importance === w && !noPreference}
                onChange={() => setImportance(w)}
              />
              {importanceLabels[i]}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Why this answer?{" "}
        <span className="muted">Optional · 1000 characters</span>
        <textarea
          rows="3"
          maxLength={1000}
          disabled={demoMode || busy}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </label>
      <div className="privacy">
        <label className="check">
          <input
            type="checkbox"
            disabled={demoMode || busy}
            checked={isPrivate}
            onChange={(e) => setPrivate(e.target.checked)}
          />
          Keep this answer private
        </label>
        <p>
          Private answers inform your score, but the answer, explanation, and
          its disagreement details are hidden from other members. Scores can
          still offer indirect clues.
        </p>
      </div>
      {demoMode && (
        <p className="demo-note">
          These are Alex’s fictional answers.{" "}
          <a href="#signup">Create an account</a> to answer for yourself.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="question-actions">
        <button
          type="button"
          className="text-button"
          onClick={previous}
          disabled={busy}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="text-button"
          onClick={skip}
          disabled={busy}
        >
          Skip / next →
        </button>
        {!demoMode && (
          <button className="button" disabled={busy}>
            {busy
              ? "Saving…"
              : canSave
                ? "Save answer"
                : "Join to save answers"}
          </button>
        )}
      </div>
      {canSave && (
        <button
          className="button secondary"
          name="action"
          value="next"
          disabled={busy}
        >
          Save & next →
        </button>
      )}
      {saved && canSave && (
        <button
          className="text-button danger"
          type="button"
          disabled={busy}
          onClick={remove}
        >
          Remove saved answer
        </button>
      )}
      <p className="micro">
        Skipping marks a question for revisit and leaves a saved answer
        unchanged. Use “Remove saved answer” to clear it.
      </p>
    </form>
  );
}
