# Matching in okaycupid

okaycupid is an independent reconstruction of the publicly explained question-based matching idea associated with early OkCupid. It does not use proprietary code, a bulk copied questionnaire bank, member profiles, or OkCupid branding. A match score describes stated preferences, not safety, attraction, relationship success, or a recommendation to date someone.

## Historical sources and limits

1. **[OkCupid, “Match Percentages,” archived official help](https://web.archive.org/web/20140101022839/https://www.okcupid.com/help/match-percentages).** Archived January 1, 2014; retrieved September 17, 2026. This technical primary source specifies the three inputs, weights, directional fractions, square root, published-score subtraction of 1/N, and all-or-none acceptable choices becoming irrelevant. It resolves the less precise TED wording and is the basis of the implemented historical calculation.
2. **Christian Rudder, “Inside OKCupid: The math of online dating,” TED-Ed (2013).** [Lesson and creator credits](https://ed.ted.com/lessons/inside-okcupid-the-math-of-online-dating-christian-rudder), [TED transcript](https://www.ted.com/talks/christian_rudder_inside_okcupid_the_math_of_online_dating/transcript), [video](https://www.youtube.com/watch?v=m9PiPlRuy6E). Retrieved September 17, 2026. Rudder identifies himself as an OkCupid founder. The transcript explicitly describes the three answer inputs, common answered questions, weights 0/1/10/50/250, two satisfaction fractions, and combining them using a geometric mean. Its example gives 50/51 and 10/11 satisfaction, approximately 94% combined. This corroborates the core model.
3. **[OkCupid, “Matching,” Wikipedia](https://en.wikipedia.org/wiki/OkCupid#Matching).** Retrieved September 17, 2026. This secondary description corroborates own answers, acceptable partner answers, importance, and hidden versus visible answers. It is context, not evidence for an exact historical implementation.
4. **[Public recollection by @itsaboutawhale](https://x.com/itsaboutawhale/status/2100317804750569735), September 16, 2026.** The project’s reference describes answering over 100 questions about values, interests, fears, philosophy, and lifestyle, and meeting a spouse with a displayed 98% match. This is a personal recollection and the product motivation. It does not establish the underlying formula or an outcome guarantee.

The TED transcript has an imprecise “nth root” passage and mentions a small-sample correction without specifying it. The archived official help explicitly specifies the square root and subtraction of 1/N. okaycupid follows that technical explanation. The source calls this a “margin of error” and makes statistical-validity claims; okaycupid treats it as an **uncalibrated historical heuristic**, not a validated confidence interval or relationship-success probability. The retrieved sources do not establish every ranking policy or the chronology of algorithm changes.

## Inputs and calculation

The 160 app-written questions have four options; historical questions have two to four sourced or explicitly adapted options. A member saves:

- Their own answer, exactly one option.
- Zero or more acceptable partner options, which need not include their own answer.
- Importance: irrelevant **0**, a little **1**, somewhat **10**, very **50**, essential **250**.
- Whether the answer is private.
- An explicit no-preference flag. okaycupid normalizes this to all partner options accepted and zero importance.

Selecting all or none of the acceptable options gives zero effective weight in that direction, just like explicit no preference. The own answer remains available to satisfy or disappoint the other member. The API stores zero importance for these choices; the matcher also applies the rule to previously saved answers.

Let S be the question IDs answered by both A and B. For each q in S, let wA(q) be A’s importance weight and acceptA(Bq) be 1 when B’s answer is in A’s acceptable options, otherwise 0.

```text
satisfaction(A ← B) = sum(wA(q) × acceptA(Bq)) / sum(wA(q))
satisfaction(B ← A) = sum(wB(q) × acceptB(Aq)) / sum(wB(q))
raw compatibility = sqrt(satisfaction(A ← B) × satisfaction(B ← A))
N = size of S
published percentage = round(100 × max(0, raw compatibility - 1/N))
```

The fractions use each member’s own weights and preferences. A disagreement can matter greatly in one direction and barely matter in the other. Only common questions enter either denominator. An unanswered or removed question contributes nothing.

For an original example, suppose B meets a 250-point preference from A but misses a 50-point preference. A’s satisfaction is 250/300. A meets B’s 1-point preference but misses B’s 10-point preference, making B’s satisfaction 1/11. Their raw compatibility is approximately **28%**. With only two common questions, subtracting 50 percentage points gives a published score of **0%**. Averaging would overstate the weaker direction.

If either denominator is zero, the score is **unknown**, including no overlap, only irrelevant questions, or one member expressing no preferences. A known zero appears when both denominators exist and either one direction has no satisfied weight or the historical adjustment reduces the score to zero. Unknown matches sort after known scores. Rounded percentages can hide small differences; they are not probabilities.

Perfect raw compatibility with 1, 2, 50, or 100 common answers gives published scores of **0%, 50%, 98%, and 99%**, respectively. N includes every common answered question, including private and irrelevant answers; it is distinct from meaningful overlap. Directory sorting and filters use the published score. Comparisons also label the raw compatibility separately. Rounding happens only after subtraction and clamping.

## Overlap, topics, and conflict

okaycupid reports both total common questions and meaningful common questions (at least one member gives nonzero weight). Descriptive overlap labels are original design choices:

| Meaningful common questions | Label |
| --- | --- |
| 0–9 | Early signal |
| 10–39 | Taking shape |
| 40 or more | More context |

These are not calibrated statistical confidence. Many redundant answers can give less useful information than a few varied ones. One perfect shared answer still produces a published 0%; the display retains the actual count and raw compatibility. “More context” does not imply sufficient knowledge to assess a person.

Public shared ground means both members accept the other’s answer or assign zero weight to that question. Answers may differ while still being acceptable. Public differences are questions where a nonzero preference is unmet. An unmet 50- or 250-point preference is marked **Important difference**. This flag affects explanation, not an extra hidden score penalty. Topic counts summarize only public common questions; irrelevant public questions can appear as aligned.

## Eligibility and privacy

Real profiles require authentication and mutual gender preference eligibility. A member never appears in their own directory. Eligibility is separate from compatibility; an ineligible profile cannot be retrieved by guessing its ID. The current explicit gender categories are Woman, Man, and Nonbinary, with any nonempty combination accepted as partner preferences. This limited taxonomy is an implementation choice, not a claim of universal coverage.

Private answers participate in the two fractions but never appear in another member’s comparison. If either member marks a question private, its ID, answer labels, explanations, prompt, topic contribution, and individual conflict flag are omitted from that comparison. The aggregate overlap and count of private common questions remain visible. Other members’ answer maps, email addresses, password hashes, and sessions are never returned. Self-export includes the member’s own private answers.

Aggregate scores are **not inference-proof**. Changes to a score, especially with little overlap, may indirectly suggest a private preference. okaycupid discloses this before saving private answers. Database operators also control the underlying data; this is not end-to-end encryption.

The demo uses one fictional viewer (Alex) and eight fictional candidates. All are adults with invented profiles and answers. The demo is read-only, available without an account, and isolated from the persistent real-member directory. Real users start with no answers and no manufactured real matches.

## Deliberate scope choices

The 160 baseline questions were written by an AI implementation agent for this app. They were not recovered from historical OkCupid. Earlier “original questions” wording meant newly authored, but was ambiguous; the interface now labels them “Written for okaycupid · AI-authored.” Biographies, typographic avatars, topic assignments, thresholds, and interface copy were also created for this app. No photos or profiles are scraped. The UI offers lists and comparisons, not swiping. No hidden engagement ranking, message system, identity verification, or moderation service is implemented. Age 18+ is self-attested and validated on the server; it is not verified against identity documents. These choices keep the app inspectable and self-hostable without suggesting production moderation readiness.


## Recovered questions and evidence dates

The first implementation authored 160 new questions. The next pass located three 2011 prompts but missed the much larger question array embedded in the article's JavaScript. The deeper search inspected that array, a contemporaneous listing, an original screenshot, and a later question-only CSV. All sources below were retrieved September 17, 2026.

| Source | What it establishes | Limits |
| --- | --- | --- |
| [Christian Rudder, “The Best Questions For A First Date,” official OkTrends, February 8, 2011](https://web.archive.org/web/20110209230710/http://blog.okcupid.com/index.php/the-best-questions-for-first-dates/) | Its embedded `var questions` chart array contains **162 prompt entries**. The article describes OkCupid match questions and private answers. | The chart does not contain the answer-option sets. It is a sample, not the whole bank: the article reports 275,294 questions in the database at the time, many submitted by users. |
| [Infochimps public listing, archived October 31, 2011](https://web.archive.org/web/20111031212852/http://www.infochimps.com/datasets/personality-insights-okcupid-questions-and-answers-by-gender-age) | Prints **28 questions with choices**. Its source numbering runs 0–28, skipping 14. | A contemporaneous third-party listing, not an official full-bank export. Only the publicly printed questions were used; no response dataset was purchased or downloaded. |
| [Original OkTrends question screenshot, February 2011 archive](https://web.archive.org/web/20110209230710im_/http://cdn.okccdn.com/blog/first_date_questions/PrivateQuestion2.png) | “Are you looking for a partner to have children with?” with **Yes / No**, and an answer-privacy checkbox. | The chart's “someone” wording differs from the screenshot's “a partner”; these were not conflated. |
| [Mathias Gatti's question-only CSV, fixed January 21, 2022 revision](https://github.com/mathigatti/okCupidScraper/blob/47967ab9745e13300b46a7ead2e5c0d1b02fe216/questions.csv) | **3,330 question records** with choice arrays. 53 prompts match the official 2011 chart after case/punctuation/spacing normalization. | Establishes choices in this later file, not in 2011. We did not run the scraper or download member/profile/response datasets. The repository carries MIT terms; see [third-party notices](../THIRD_PARTY_NOTICES.md). Those terms do not establish ownership of every historical question. |

The app now contains **81 historical prompts** and the 160 separately labeled app-written questions. It opens the historical collection by default and offers a stricter “Prompt + choices from 2011” collection. Search operates within the selected collection, across topics. The per-question provenance in `shared/historical.js` and `shared/questions.js` includes prompt and choice sources and distinguishes:

- **28 questions with contemporary choices**, IDs 164–191: the 2011 listing, with the original screenshot supplying the child-partner question's exact Yes/No display.
- **51 questions with later choices**, ID 162 and IDs 192–241: prompts witnessed in the 2011 article, choices from the 2022 file. Two of the 53 overlapping prompts (“Are you happy with your life?” and the dice question) instead use their earlier listing choices. ID 162 already had the same Yes/No ordering and did not need an answer change.
- **Two questions with adapted choices**, IDs 161 and 163: horror movies (Yes / No / Sometimes) and living on a sailboat (Yes / No / Maybe for a while). Their existing answer meanings are retained and their choices remain explicitly marked as adapted.

The distinctions are substantive: the 2011 listing gives “Are you happy with your life?” three options, including “Most of the time.”, whereas the 2022 file has only Yes/No. We do not infer original options merely because a prompt looks binary. The unpaired chart prompts are research findings, not silently converted into invented historical questions. Dated wording, including the listing's “descent yard” typo, is preserved. Topic grouping is an okaycupid choice.

IDs 1–163, all existing prompt/option orderings, and stored answers are unchanged. New IDs are appended. The 162 chart entries and the later 3,330-row file are **not a recovered complete original questionnaire**. The app uses only this attributed, cross-checked subset; raw research remains outside Git. No matching weights are inferred from the article's correlation claims.

The archived 2014 official help and Rudder's 2013 explanation independently corroborate the three-part answering model; the 2011 article supports answer privacy. They do not verify every old navigation control. Search, answered/unanswered/skipped views, durable revisit markers, unrestricted answer editing, save-and-next, and optional 1000-character explanations are explicitly **okaycupid usability choices**, not claims of exact historical UI reproduction. Explanations are plain text and follow the answer's privacy setting. They do not affect scoring; a comparison shows them only when both answers are public. Skip markers have no matching weight, survive restart, and never erase an existing saved answer. Saving removes that question's skip marker.

## Identity documentation sources

Google's official [OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) and [OAuth 2.0 web-server guide](https://developers.google.com/identity/protocols/oauth2/web-server), retrieved September 17, 2026, document server-side code exchange, anti-forgery state, nonce, exact redirect URI registration, ID-token signature/issuer/audience/expiry validation, `email_verified`, and use of `sub` as the stable identity rather than email. These are the basis for Google integration; PKCE and explicit linking provide additional protections. See [deployment documentation](deployment.md) for configuration and the boundary between mocked verification and a future real Google login.
