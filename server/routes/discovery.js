import { compare, eligible } from "../../shared/matching.js";
import { questions } from "../../shared/questions.js";
import { demo } from "../demo.js";
import { fail } from "../validation.js";
export function discoveryRoutes({ app, db, required, profile, getAnswers }) {
  const summaries = (viewer, people) =>
    people
      .filter((p) => eligible(viewer, p))
      .map((person) => {
        const { answers, ...publicProfile } = person;
        const match = compare(viewer.answers, answers, questions);
        return {
          ...publicProfile,
          match: {
            score: match.score,
            overlap: match.overlap,
            meaningful: match.meaningful,
            confidence: match.confidence,
            strongConflicts: match.conflicts.filter((c) => c.strong).length,
            topics: match.topics,
          },
        };
      })
      .sort(
        (a, b) =>
          (b.match.score ?? -1) - (a.match.score ?? -1) ||
          b.match.overlap - a.match.overlap,
      );
  app.get("/api/demo", (req, res) =>
    res.json({ viewer: demo[0], people: summaries(demo[0], demo) }),
  );
  app.get("/api/demo/people/:id", (req, res) => {
    const person = demo.find(
      (p) => p.id === req.params.id && p.id !== demo[0].id,
    );
    if (!person) throw fail(404, "Person not found.");
    const { answers, ...publicProfile } = person;
    res.json({
      person: publicProfile,
      match: compare(demo[0].answers, answers, questions),
    });
  });
  app.get("/api/people", required, (req, res) => {
    const viewer = {
      ...profile(req.member),
      answers: getAnswers(req.member.id),
    };
    const people = db
      .prepare("SELECT * FROM users WHERE id != ?")
      .all(req.member.id)
      .map((row) => ({ ...profile(row), answers: getAnswers(row.id) }));
    res.json(summaries(viewer, people));
  });
  app.get("/api/people/:id", required, (req, res) => {
    const row = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.params.id);
    const viewer = profile(req.member);
    if (!row || !eligible(viewer, profile(row)))
      throw fail(404, "Person not found or preferences do not align.");
    res.json({
      person: profile(row),
      match: compare(getAnswers(req.member.id), getAnswers(row.id), questions),
    });
  });
}
