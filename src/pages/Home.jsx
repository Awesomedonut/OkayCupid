import React from "react";
export function Home({ explore, go }) {
  return (
    <main className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">THE QUESTION-FIRST DATING CLUB · 18+</p>
          <h1>
            Big questions.
            <br />
            <em>Your kind</em>
            <br />
            of people.
          </h1>
          <p className="lede">
            How do you love? What do you stand for? Start with your answers.
            Find people you’d like to ask a little more.
          </p>
          <div className="actions">
            <button className="button" onClick={() => go("signup")}>
              Let’s find my people <span>↗</span>
            </button>
            <button className="text-button" onClick={explore}>
              Explore the demo →
            </button>
          </div>
          <p className="micro">
            79 historical OkCupid prompts. Pick a question. Find your people.
          </p>
        </div>
        <div className="hero-art">
          <span className="orbit one">a little heart. a lot of questions.</span>
          <div className="art-flower" aria-hidden="true">
            ♡
          </div>
          <div className="sample-note">
            <p className="eyebrow">FROM THE 2011 QUESTIONNAIRE</p>
            <h2>Do you own any dice with more than six sides?</h2>
            <div className="sample-answer">○ Yes.</div>
            <div className="sample-answer">○ No.</div>
            <button className="text-button" onClick={() => go("questions")}>
              Hmm. Let me think →
            </button>
          </div>
          <span className="orbit two">
            Your “why” is the interesting bit. ✳
          </span>
        </div>
      </section>
      <section className="intro-row">
        <p className="eyebrow">
          HELLO, FELLOW
          <br />
          QUESTION PERSON.
        </p>
        <h2>
          A crush is fun.
          <br />
          Common ground helps.
        </h2>
        <p>
          Compare the things that matter to you, from everyday habits to the big
          life stuff. See where you agree, where you differ, and what’s still a
          question mark.
        </p>
      </section>
      <section className="steps">
        {[
          [
            "01",
            "You go first.",
            "Pick your answer, the answers you’d accept in a partner, and how much it matters. Change your mind whenever.",
          ],
          [
            "02",
            "Meet the maybes.",
            "Browse people by shared values. Every match comes with the questions behind the number.",
          ],
          [
            "03",
            "Get curious.",
            "Same answer? Great. Different answer? Interesting. A percentage can’t tell the whole story.",
          ],
        ].map(([n, title, body]) => (
          <article key={n}>
            <span>{n}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="bottom-call">
        <div>
          <p className="eyebrow">TAKE A LOOK AROUND</p>
          <h2>
            Eight imaginary people.
            <br />A very real test drive.
          </h2>
        </div>
        <button className="button" onClick={explore}>
          Meet the fictional community →
        </button>
      </section>
    </main>
  );
}
