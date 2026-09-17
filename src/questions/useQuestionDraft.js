import { useEffect, useRef, useState } from "react";
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
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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
    const submittedDraft = drafts[question.id];
    const advance = e.nativeEvent.submitter?.value === "next";
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
      if (drafts[question.id] !== submittedDraft) return;
      drafts[question.id] = stored;
      if (!mounted.current) return;
      setImportance(stored.importance);
      setAcceptable(stored.acceptable);
      setExplanation(stored.explanation);
      setMessage("Answer saved. You can edit it any time.");
      if (advance) next(true);
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function skip() {
    if (!canSave) return next();
    setBusy(true);
    setError("");
    try {
      await api(`/skipped/${question.id}`, "PUT", {}, memberContext);
      await refresh(memberContext);
      if (mounted.current) next();
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function remove() {
    const submittedDraft = drafts[question.id];
    setError("");
    setBusy(true);
    try {
      await api(`/answers/${question.id}`, "DELETE", {}, memberContext);
      await refresh(memberContext);
      if (drafts[question.id] !== submittedDraft) return;
      delete drafts[question.id];
      if (!mounted.current) return;
      setAnswer(-1);
      setAcceptable([]);
      setNoPreference(false);
      setImportance(10);
      setPrivate(false);
      setExplanation("");
      setMessage("Saved answer removed.");
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
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
