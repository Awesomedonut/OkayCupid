# Matching in Kindred

Kindred is an independent reconstruction of the publicly explained question-based matching idea associated with early OkCupid. It does not use proprietary code, copied questionnaires, member profiles, or OkCupid branding. A match score describes stated preferences, not safety, attraction, relationship success, or a recommendation to date someone.

## Historical sources and limits

1. **Christian Rudder, “Inside OKCupid: The math of online dating,” TED-Ed (2013).** [Lesson and creator credits](https://ed.ted.com/lessons/inside-okcupid-the-math-of-online-dating-christian-rudder), [TED transcript](https://www.ted.com/talks/christian_rudder_inside_okcupid_the_math_of_online_dating/transcript), [video](https://www.youtube.com/watch?v=m9PiPlRuy6E). Retrieved September 17, 2026. Rudder identifies himself as an OkCupid founder. The transcript explicitly describes the three answer inputs, common answered questions, weights 0/1/10/50/250, two satisfaction fractions, and combining them using a geometric mean. Its example gives 50/51 and 10/11 satisfaction, approximately 94% combined. This is the primary source for the core implemented model.
2. **[OkCupid, “Matching,” Wikipedia](https://en.wikipedia.org/wiki/OkCupid#Matching).** Retrieved September 17, 2026. This secondary description corroborates own answers, acceptable partner answers, importance, and hidden versus visible answers. It is context, not evidence for an exact historical implementation.
3. **[Public recollection by @itsaboutawhale](https://x.com/itsaboutawhale/status/2100317804750569735), September 16, 2026.** The project’s reference describes answering over 100 questions about values, interests, fears, philosophy, and lifestyle, and meeting a spouse with a displayed 98% match. This is a personal recollection and the product motivation. It does not establish the underlying formula or an outcome guarantee.

The primary transcript has an imprecise passage calling the final operation an “nth root” with n described as the number of questions, while also naming the geometric mean and demonstrating the square root of two directional scores. Kindred consistently uses the square root of the two fractions, regardless of question count. We disclose the ambiguity rather than presenting the transcript as an unambiguous technical specification.

Rudder also mentions “a little correction for margin of error” with few questions, but the retrieved explanation does not specify that correction. Kindred does **not** invent or reproduce an exact historical correction, confidence interval, ranking policy, or chronology of algorithm changes. Historical matching had versions; this app is not a claim of feature-for-feature historical fidelity.

## Inputs and calculation

Each original question has four options. A member saves:

- Their own answer, exactly one option.
- One or more acceptable partner options, which need not include their own answer.
- Importance: irrelevant **0**, a little **1**, somewhat **10**, very **50**, essential **250**.
- Whether the answer is private.
- An explicit no-preference flag. Kindred normalizes this to all partner options accepted and zero importance.

Let S be the question IDs answered by both A and B. For each q in S, let wA(q) be A’s importance weight and acceptA(Bq) be 1 when B’s answer is in A’s acceptable options, otherwise 0.

```text
satisfaction(A ← B) = sum(wA(q) × acceptA(Bq)) / sum(wA(q))
satisfaction(B ← A) = sum(wB(q) × acceptB(Aq)) / sum(wB(q))
mutual percentage = round(100 × sqrt(satisfaction(A ← B) × satisfaction(B ← A)))
```

The fractions use each member’s own weights and preferences. A disagreement can matter greatly in one direction and barely matter in the other. Only common questions enter either denominator. An unanswered or removed question contributes nothing.

For an original example, suppose B meets a 250-point preference from A but misses a 50-point preference. A’s satisfaction is 250/300. A meets B’s 1-point preference but misses B’s 10-point preference, making B’s satisfaction 1/11. Their mutual percentage is approximately **28%**. Averaging would overstate the weaker direction.

If either denominator is zero, the score is **unknown**, including no overlap, only irrelevant questions, or one member expressing no preferences. A genuine zero appears only when both denominators exist and at least one direction has no satisfied weight. Unknown matches sort after known scores. Rounded percentages can hide small differences; they are not probabilities.

## Overlap, topics, and conflict

Kindred reports both total common questions and meaningful common questions (at least one member gives nonzero weight). Descriptive overlap labels are original design choices:

| Meaningful common questions | Label |
| --- | --- |
| 0–9 | Early signal |
| 10–39 | Taking shape |
| 40 or more | More context |

These are not calibrated statistical confidence. Many redundant answers can give less useful information than a few varied ones. A high score on one question is weak evidence; the display retains the actual count. “More context” does not imply sufficient knowledge to assess a person.

Public shared ground means both members accept the other’s answer or assign zero weight to that question. Answers may differ while still being acceptable. Public differences are questions where a nonzero preference is unmet. An unmet 50- or 250-point preference is marked **Important difference**. This flag affects explanation, not an extra hidden score penalty. Topic counts summarize only public common questions; irrelevant public questions can appear as aligned.

## Eligibility and privacy

Real profiles require authentication and mutual gender preference eligibility. A member never appears in their own directory. Eligibility is separate from compatibility; an ineligible profile cannot be retrieved by guessing its ID. The current explicit gender categories are Woman, Man, and Nonbinary, with any nonempty combination accepted as partner preferences. This limited taxonomy is an implementation choice, not a claim of universal coverage.

Private answers participate in the two fractions but never appear in another member’s comparison. If either member marks a question private, its ID, answer labels, prompt, topic contribution, and individual conflict flag are omitted from that comparison. The aggregate overlap and count of private common questions remain visible. Other members’ answer maps, email addresses, password hashes, and sessions are never returned. Self-export includes the member’s own private answers.

Aggregate scores are **not inference-proof**. Changes to a score, especially with little overlap, may indirectly suggest a private preference. Kindred discloses this before saving private answers. Database operators also control the underlying data; this is not end-to-end encryption.

The demo uses one fictional viewer (Alex) and eight fictional candidates. All are adults with invented profiles and answers. The demo is read-only, available without an account, and isolated from the persistent real-member directory. Real users start with no answers and no manufactured real matches.

## Deliberate scope choices

All 160 questions, biographies, typographic avatars, topic labels, thresholds, and interface copy are original. No photos or profiles are scraped. The UI offers lists and comparisons, not swiping. No hidden engagement ranking, message system, identity verification, or moderation service is implemented. Age 18+ is self-attested and validated on the server; it is not verified against identity documents. These choices keep the app inspectable and self-hostable without suggesting production moderation readiness.
