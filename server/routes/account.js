import { questions, retiredQuestionIds } from "../../shared/questions.js";
import { fail, validateProfile } from "../validation.js";
export function accountRoutes({
  app,
  db,
  required,
  profile,
  getAnswers,
  getSkipped,
  getIdentities,
  cookieOptions,
}) {
  app.put("/api/profile", required, (req, res) => {
    validateProfile(req.body);
    const body = req.body;
    db.prepare(
      "UPDATE users SET name = ?, age = ?, gender = ?, desired = ?, city = ?, bio = ?, interests = ? WHERE id = ?",
    ).run(
      body.name.trim(),
      body.age,
      body.gender,
      JSON.stringify(body.desired),
      body.city.trim(),
      body.bio.trim(),
      body.interests.trim(),
      req.member.id,
    );
    res.json({ ok: true });
  });
  app.get("/api/export", required, (req, res) =>
    res.attachment("okaycupid-your-data.json").json({
      profile: { ...profile(req.member), email: req.member.email },
      answers: getAnswers(req.member.id, true),
      skipped: getSkipped(req.member.id, true),
      retiredQuestions: {
        ids: retiredQuestionIds,
        reason:
          "Excluded from the historical catalog; saved values are preserved but do not affect matching or progress.",
      },
      identities: getIdentities(req.member.id),
      questions,
      exportedAt: new Date().toISOString(),
    }),
  );
  app.delete("/api/account", required, (req, res) => {
    if (req.body.confirm !== "DELETE")
      throw fail(400, "Type DELETE to confirm.");
    db.prepare("DELETE FROM oidc_transactions WHERE user_id = ?").run(req.member.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.member.id);
    res.clearCookie("kindred", cookieOptions).json({ ok: true });
  });
}
