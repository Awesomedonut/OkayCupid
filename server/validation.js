import { weights } from "../shared/matching.js";
import { genders } from "./demo.js";
export const clean = (value, max, min = 0) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;
export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const validateProfile = (body) => {
  if (
    !clean(body.name, 60, 1) ||
    !Number.isInteger(body.age) ||
    body.age < 18 ||
    body.age > 110 ||
    !genders.includes(body.gender) ||
    !Array.isArray(body.desired) ||
    !body.desired.length ||
    body.desired.some((v) => !genders.includes(v)) ||
    new Set(body.desired).size !== body.desired.length ||
    !clean(body.city, 80) ||
    !clean(body.bio, 1200) ||
    !clean(body.interests, 160)
  )
    throw fail(
      400,
      "Please provide a name, age 18–110, gender, partner preferences, and valid profile fields.",
    );
};

export function normalizeAnswer(question, answer) {
  if (
    !question ||
    !Number.isInteger(answer.answer) ||
    answer.answer < 0 ||
    answer.answer >= question.options.length ||
    !Array.isArray(answer.acceptable) ||
    answer.acceptable.some(
      (v) => !Number.isInteger(v) || v < 0 || v >= question.options.length,
    ) ||
    new Set(answer.acceptable).size !== answer.acceptable.length ||
    !weights.includes(answer.importance) ||
    typeof answer.private !== "boolean" ||
    typeof answer.noPreference !== "boolean"
  )
    throw fail(
      400,
      "Choose your answer, acceptable partner answers, and importance.",
    );
  if (answer.explanation !== undefined && !clean(answer.explanation, 1000))
    throw fail(400, "Explanation must be at most 1000 characters.");
  return {
    explanation: (answer.explanation || "").trim(),
    answer: answer.answer,
    acceptable: answer.noPreference
      ? question.options.map((_, i) => i)
      : answer.acceptable,
    importance:
      answer.noPreference ||
      answer.acceptable.length === 0 ||
      answer.acceptable.length === question.options.length
        ? 0
        : answer.importance,
    private: answer.private,
    noPreference: answer.noPreference,
  };
}
