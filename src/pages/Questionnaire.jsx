import React from "react";
import { useQuestionnaire } from "../questions/useQuestionnaire.js";
import { Question } from "../questions/Question.jsx";
export function QuestionnaireWorkspace({ catalog, member, demoViewer, demoMode, refresh, go }) {
  const memberState = useQuestionnaire(catalog, member);
  const demoState = useQuestionnaire(catalog, demoViewer);
  return <Questionnaire key={demoMode ? "demo" : "member"} catalog={catalog}
    viewer={demoMode ? demoViewer : member} demoMode={demoMode}
    state={demoMode ? demoState : memberState} refresh={refresh} go={go} />;
}
function Questionnaire({ catalog, viewer, demoMode, refresh, go, state }) {
  const {
    drafts,
    topic,
    setTopic,
    index,
    setIndex,
    filter,
    setFilter,
    search,
    setSearch,
    source,
    setSource,
    bank,
    answers,
    list,
    question,
    total,
  } = state;
  return (
    <main>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE QUESTION CLUB</p>
          <h1>Your point of view.</h1>
          <p>There’s no right answer. Just your honest one.</p>
        </div>
        <div className="progress-box">
          <strong>
            {total}
            <span> / {catalog.questions.length}</span>
          </strong>
          <span>questions answered{demoMode ? " by fictional Alex" : ""}</span>
          <progress
            max={catalog.questions.length}
            value={total}
            aria-label="Answer progress"
          />
        </div>
      </div>
      <div className="question-layout">
        <aside>
          <p className="eyebrow">EXPLORE A TOPIC</p>
          <nav aria-label="Question topics" className="topics">
            {catalog.topics.map((t, i) => (
              <button
                key={t}
                className={topic === t ? "selected" : ""}
                onClick={() => {
                  setTopic(t);
                  setSearch("");
                  setIndex(0);
                }}
              >
                <span className="topic-icon">
                  {["◇", "♡", "☼", "◎", "⌂", "↔", "✳", "↗"][i]}
                </span>
                {t}
                <span>
                  {
                    bank.filter(
                      (question) =>
                        question.topic === t && answers[question.id],
                    ).length
                  }
                  /{bank.filter((question) => question.topic === t).length}
                </span>
              </button>
            ))}
          </nav>
          <div className="aside-note">
            <h3>You can change your mind.</h3>
            <p>
              Edit any answer, skip a question, or keep an answer private. You
              set the pace.
            </p>
          </div>
        </aside>
        <section>
          <div className="question-sources">
            <label>
              Question collection
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setIndex(0);
                }}
              >
                <option value="historical">Historical OkCupid · 79</option>
                <option value="contemporary">
                  Prompt + choices from 2011 · 28
                </option>
              </select>
            </label>
            <p className="micro">
              Recovered from public sources. Each question shows when its prompt
              and choices were documented.{" "}
              <a href="#about">Where they came from ↗</a>
            </p>
          </div>
          <label className="question-search">
            Search questions
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIndex(0);
              }}
              placeholder="Try travel, politics, or dinosaurs…"
            />
          </label>
          <div className="question-toolbar">
            <span>
              {search ? "Search results" : topic}{" "}
              <span className="muted">
                / {question ? Math.min(index + 1, list.length) : 0} of{" "}
                {list.length}
              </span>
            </span>
            <label>
              Show
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setIndex(0);
                }}
              >
                <option value="all">All questions</option>
                <option value="unanswered">Unanswered</option>
                <option value="answered">Answered</option>
                <option value="skipped">Skipped / revisit</option>
              </select>
            </label>
          </div>
          {question ? (
            <Question
              key={`${question.id}-${demoMode}`}
              question={question}
              drafts={drafts.current}
              memberContext={viewer?.mutationContext}
              saved={answers[question.id]}
              canSave={!!viewer && !demoMode}
              demoMode={demoMode}
              refresh={refresh}
              go={go}
              next={(saved = false) =>
                setIndex((i) =>
                  (saved &&
                    (filter === "unanswered" || filter === "skipped")) ||
                  (!saved && filter === "unanswered")
                    ? i
                    : (i + 1) % Math.max(1, list.length),
                )
              }
              previous={() => setIndex((i) => Math.max(0, i - 1))}
            />
          ) : (
            <div className="panel empty">
              <h2>
                {filter === "unanswered"
                  ? "A whole topic, explored."
                  : "A fresh page."}
              </h2>
              <p>
                {filter === "unanswered"
                  ? "Choose another topic, or revisit your answers."
                  : "No answers here yet. Switch to all questions to begin."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
