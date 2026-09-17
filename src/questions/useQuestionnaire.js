import { useEffect, useState, useRef } from "react";
import { useUnsavedWarning } from "../hooks/useUnsavedWarning.js";
import { normalizeDraft } from "./normalizeDraft.js";
export function useQuestionnaire(catalog, viewer) {
  const drafts = useRef({});
  useUnsavedWarning(() => Object.entries(drafts.current).some(([id, draft]) =>
    JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(viewer?.answers?.[id]))
  ));
  const [topic, setTopic] = useState(catalog.topics[0]),
    [index, setIndex] = useState(0),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [source, setSource] = useState(() =>
    sessionStorage.getItem("okaycupid-question-source") === "contemporary"
      ? "contemporary"
      : "historical",
  );
  useEffect(() => {
    sessionStorage.setItem("okaycupid-question-source", source);
  }, [source]);
  const bank = catalog.questions.filter(
    (question) =>
      source !== "contemporary" ||
      question.provenance?.optionsStatus === "contemporary",
  );
  const answers = viewer?.answers || {};
  const list = bank.filter(
    (question) =>
      (search
        ? `${question.prompt} ${question.options.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : question.topic === topic) &&
      (filter === "all" ||
        (filter === "skipped"
          ? viewer?.skipped?.includes(question.id)
          : filter === "answered"
            ? !!answers[question.id]
            : !answers[question.id] &&
              !viewer?.skipped?.includes(question.id))),
  );
  const question = list[Math.min(index, Math.max(0, list.length - 1))];
  const total = catalog.questions.filter(
    (question) => answers[question.id],
  ).length;
  return {
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
  };
}
