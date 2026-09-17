import {
  questions,
  topics,
  retiredQuestionIds,
  activeQuestionIds,
} from "../../shared/questions.js";
import { normalizeAnswer, fail } from "../validation.js";
export function questionnaireRoutes({
  app,
  saveAnswer,
  markSkipped,
  removeSkipped,
  removeAnswer,
  required,
  profile,
  getAnswers,
  getSkipped,
}) {
  app.get("/api/questions", (req, res) =>
    res.json({ questions, topics, retiredQuestionIds, activeQuestionIds }),
  );
  app.get("/api/me", (req, res) =>
    res.json(
      req.member
        ? {
            ...profile(req.member),
            mutationContext: req.memberContext,
            email: req.member.email,
            answers: getAnswers(req.member.id),
            skipped: getSkipped(req.member.id),
          }
        : null,
    ),
  );
  app.put("/api/answers/:id", required, (req, res) => {
    const question = questions.find(
        (question) => String(question.id) === req.params.id,
      ),
      answer = req.body;
    const value = normalizeAnswer(question, answer);
    saveAnswer(req.member.id, question.id, value);
    res.json({ ok: true });
  });
  app.put("/api/skipped/:id", required, (req, res) => {
    if (!questions.some((question) => String(question.id) === req.params.id))
      throw fail(404, "Question not found.");
    markSkipped(req.member.id, Number(req.params.id));
    res.json({ ok: true });
  });
  app.delete("/api/skipped/:id", required, (req, res) => {
    removeSkipped(req.member.id, req.params.id);
    res.json({ ok: true });
  });
  app.delete("/api/answers/:id", required, (req, res) => {
    removeAnswer(req.member.id, req.params.id);
    res.json({ ok: true });
  });
}
