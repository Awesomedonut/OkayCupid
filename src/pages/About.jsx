import React from "react";
export function About() {
  return (
    <main className="narrow prose">
      <p className="eyebrow">THE METHOD BEHIND THE MAYBES</p>
      <h1>
        A little math.
        <br />A lot of humanity.
      </h1>
      <p className="lede">
        okaycupid revisits the question-based idea of early online matching:
        your answer, the answers you can accept, and what matters most to you.
      </p>
      <h2>Two perspectives. One starting point.</h2>
      <p>
        On every question, choose your answer and any acceptable partner
        answers. Importance is weighted 0, 1, 10, 50, or 250. “No preference”
        accepts every answer and assigns zero weight. Selecting all or none of
        the acceptable options also assigns zero weight in your direction; your
        own answer still matters to the other person.
      </p>
      <p>
        For questions you both answered, we add the importance weights of your
        preferences they meet and divide by your total weight. Then we do the
        same from their perspective. Raw compatibility is the geometric mean of
        those two fractions: √(your satisfaction × their satisfaction).
        Following the archived official matching rules, the published score is
        100 × max(0, raw compatibility − 1/N), where N counts all questions you
        both answered, including private and irrelevant ones. We round the
        result to a whole percentage. Discovery uses this published score.
      </p>
      <h2>A number needs context.</h2>
      <p>
        If either direction has no meaningful weight, compatibility is unknown.
        We show actual overlap and simple descriptive labels: under 10 weighted
        shared questions is an “Early signal,” 10–39 is “Taking shape,” and 40
        or more gives “More context.” These are design choices, not calibrated
        confidence intervals. Perfect raw compatibility across 1, 2, 50, and 100
        common questions gives published scores of 0%, 50%, 98%, and 99%. The
        historical 1/N adjustment is an uncalibrated heuristic, not a validated
        confidence interval or a probability of relationship success.
      </p>
      <p>
        A rejected answer with importance 50 or 250 is highlighted as an
        important difference. Private questions never show their answer or
        individual conflict, even when they influence the score.
      </p>
      <h2>Privacy with clear limits.</h2>
      <p>
        Only mutually eligible signed-in members can see real profiles and
        public shared answers. Emails are private. Demo people are invented and
        never mixed into the real directory. Private answers stay out of other
        members’ comparison responses, but an aggregate score can reveal
        indirect clues. Privacy here does not mean cryptographic secrecy from
        the server operator.
      </p>
      <p>
        You can edit, remove, export, or delete your data. Accounts are for
        adults 18 and older, based on self-attestation. okaycupid does not
        verify age or identity and has no messaging, blocking, reporting, or
        professional moderation tools. Consider these limits before opening a
        community to others.
      </p>
      <h2>Inspired by history, made independently.</h2>
      <p>
        This is an original, open-source app, not an OkCupid clone or an
        affiliation. The formula and small-sample adjustment come from the
        archived official OkCupid help page, corroborated by cofounder Christian
        Rudder’s public explanation. The questionnaire uses 79 real historical
        prompts and documented choices: 28 with choices witnessed in 2011 and 51
        with choices from a 2022 question file. No AI-written prompts or
        invented choices are used. Every question identifies its source. The
        2011 OkTrends article contains 166 chart prompts; that sample is not the
        full bank. The later file contains 3,318 questions, but does not
        establish their age. We selected questions with early evidence instead
        of treating that later file as a 2011 archive. Our interface, demo
        people, and confidence labels are original. The sources do not establish
        every historical ranking policy or the chronology of algorithm changes.
      </p>
      <p>
        <a
          href="https://web.archive.org/web/20140101022839/https://www.okcupid.com/help/match-percentages"
          target="_blank"
          rel="noreferrer"
        >
          OkCupid: Match Percentages — archived official help (2014) ↗
        </a>
      </p>
      <p>
        <a
          href="https://web.archive.org/web/20110209230710/http://blog.okcupid.com/index.php/the-best-questions-for-first-dates/"
          target="_blank"
          rel="noreferrer"
        >
          OkTrends: the 2011 prompts ↗
        </a>
      </p>
      <p>
        <a
          href="https://web.archive.org/web/20111031212852/http://www.infochimps.com/datasets/personality-insights-okcupid-questions-and-answers-by-gender-age"
          target="_blank"
          rel="noreferrer"
        >
          Infochimps: 28 questions and choices archived in 2011 ↗
        </a>
      </p>
      <p>
        <a
          href="https://github.com/mathigatti/okCupidScraper/blob/47967ab9745e13300b46a7ead2e5c0d1b02fe216/questions.csv"
          target="_blank"
          rel="noreferrer"
        >
          The 2022 question file ↗
        </a>
      </p>
      <p>
        <a
          href="https://www.ted.com/talks/christian_rudder_inside_okcupid_the_math_of_online_dating/transcript"
          target="_blank"
          rel="noreferrer"
        >
          Christian Rudder: Inside OKCupid — the math of online dating (TED-Ed,
          2013) ↗
        </a>
      </p>
    </main>
  );
}
