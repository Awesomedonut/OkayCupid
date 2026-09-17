import { useEffect, useState } from "react";
import { api } from "../api.js";
export function useQuestionDraft({
  question,
  drafts,
  memberContext,
  saved,
  canSave,
  refresh,
  go,
  next,
}) {
  const initial = drafts[question.id] || saved;
  const [explanation, setExplanation] = useState(initial?.explanation || ""),
    [answer, setAnswer] = useState(initial?.answer ?? -1),
    [acceptable, setAcceptable] = useState(initial?.acceptable || []),
    [importance, setImportance] = useState(initial?.importance ?? 10),
    [isPrivate, setPrivate] = useState(initial?.private || false),
    [noPreference, setNoPreference] = useState(initial?.noPreference || false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    drafts[question.id] = {
      explanation,
      answer,
      acceptable,
      importance,
      private: isPrivate,
      noPreference,
    };
  }, [explanation, answer, acceptable, importance, isPrivate, noPreference]);
  async function save(e) {
    e.preventDefault();
    if (!canSave) return go("signup");
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api(
        `/answers/${question.id}`,
        "PUT",
        {
          answer,
          acceptable,
          importance,
          private: isPrivate,
          noPreference,
          explanation,
        },
        memberContext,
      );
      const member = await refresh(memberContext);
      const stored = member.answers[question.id];
      setImportance(stored.importance);
      setAcceptable(stored.acceptable);
      setExplanation(stored.explanation);
      drafts[question.id] = stored;
      setMessage("Answer saved. You can edit it any time.");
      if (e.nativeEvent.submitter?.value === "next") next(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function skip() {
    if (!canSave) return next();
    setBusy(true);
    setError("");
    try {
      await api(`/skipped/${question.id}`, "PUT", {}, memberContext);
      await refresh(memberContext);
      next();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setError("");
    setBusy(true);
    try {
      await api(`/answers/${question.id}`, "DELETE", {}, memberContext);
      await refresh(memberContext);
      setAnswer(-1);
      setAcceptable([]);
      setNoPreference(false);
      setImportance(10);
      setPrivate(false);
      setExplanation("");
      setMessage("Saved answer removed.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return {
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
  };
}
