import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Avatar } from "../components/Avatar.jsx";
import { JoinPrompt } from "../components/JoinPrompt.jsx";
export function People({ viewer, demoMode, demo, go }) {
  const [people, setPeople] = useState([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [age, setAge] = useState("all"),
    [minimum, setMinimum] = useState(0),
    [sort, setSort] = useState("match"),
    [topic, setTopic] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setPeople(demoMode ? demo.people : viewer ? await api("/people") : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [demoMode, viewer?.id]);
  if (!viewer) return <JoinPrompt go={go} />;
  const visible = people
    .filter(
      (p) =>
        `${p.name} ${p.bio} ${p.interests}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        p.city.toLowerCase().includes(city.toLowerCase()) &&
        (age === "all" ||
          (age === "18-29"
            ? p.age < 30
            : age === "30-39"
              ? p.age >= 30 && p.age < 40
              : p.age >= 40)) &&
        (!minimum || (p.match.score !== null && p.match.score >= minimum)) &&
        (!topic || p.match.topics[topic]?.aligned > 0),
    )
    .sort((a, b) =>
      sort === "overlap"
        ? b.match.overlap - a.match.overlap
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : (b.match.score ?? -1) - (a.match.score ?? -1),
    );
  return (
    <main>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {demoMode ? "MEET THE FICTIONAL CLUB" : "MEET YOUR MAYBES"}
          </p>
          <h1>People, meet possibilities.</h1>
          <p>
            People are more than a percentage. Find a starting point, then look
            closer.
          </p>
        </div>
        <a className="question-link" href="#questions">
          {Object.keys(viewer.answers).length} answers shaping your matches{" "}
          <span>↗</span>
        </a>
      </div>
      <div className="discovery-layout">
        <aside className="filters">
          <div className="filter-heading">
            <h2>Find your people</h2>
            <button
              className="text-button"
              onClick={() => {
                setSearch("");
                setCity("");
                setAge("all");
                setMinimum(0);
                setTopic("");
                setSort("match");
              }}
            >
              Reset
            </button>
          </div>
          <label>
            Search people
            <input
              type="search"
              value={search}
              placeholder="Name, interest, a word…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            City or region
            <input
              value={city}
              placeholder="Anywhere"
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label>
            Age range
            <select value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="all">All adults</option>
              <option>18-29</option>
              <option>30-39</option>
              <option value="40+">40+</option>
            </select>
          </label>
          <label>
            Compatibility
            <select
              value={minimum}
              onChange={(e) => setMinimum(Number(e.target.value))}
            >
              <option value="0">All, including unknown</option>
              <option value="60">60% or higher</option>
              <option value="80">80% or higher</option>
              <option value="90">90% or higher</option>
            </select>
          </label>
          <label>
            Shared ground in
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Any topic</option>
              {[
                "Values",
                "Relationships",
                "Lifestyle",
                "Philosophy",
                "Community",
                "Communication",
                "Interests",
                "Future",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="aside-note">
            <span className="big-symbol">◎</span>
            <h3>A signal, not a verdict.</h3>
            <p>
              More shared questions give a fuller picture. A high score isn’t a
              promise of chemistry.
            </p>
            <a href="#about">How matching works ↗</a>
          </div>
        </aside>
        <section>
          <div className="results-toolbar">
            <span>
              {visible.length} {demoMode ? "fictional people" : "people"} to get
              to know
            </span>
            <label>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="match">Compatibility</option>
                <option value="overlap">Most overlap</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {busy ? (
            <p role="status">Finding shared ground…</p>
          ) : error ? (
            <div className="error" role="alert">
              {error}
              <button onClick={load}>Try again</button>
            </div>
          ) : visible.length ? (
            <div className="people-list">
              {visible.map((p) => (
                <article className="person-card" key={p.id}>
                  <Avatar person={p} />
                  <div className="person-content">
                    <div className="person-title">
                      <div>
                        <a href={`#person/${p.id}`}>
                          <h2>
                            {p.name}
                            <span>, {p.age}</span>
                          </h2>
                        </a>
                        <p>
                          {p.gender} · {p.city || "Location not shared"}
                          {demoMode && (
                            <span className="fictional-label">Fictional</span>
                          )}
                        </p>
                      </div>
                      <div className="score">
                        <strong>
                          {p.match.score === null ? "—" : `${p.match.score}%`}
                        </strong>
                        <span>
                          {p.match.score === null
                            ? "Unknown match"
                            : "compatibility"}
                        </span>
                      </div>
                    </div>
                    <p className="bio">
                      {p.bio || "A story still taking shape."}
                    </p>
                    <div className="tags">
                      {Object.entries(p.match.topics)
                        .filter(([, v]) => v.aligned > 0)
                        .sort((a, b) => b[1].aligned - a[1].aligned)
                        .slice(0, 3)
                        .map(([t]) => (
                          <span key={t}>{t}</span>
                        ))}
                    </div>
                    <div className="card-bottom">
                      <span>
                        {p.match.overlap} shared questions ·{" "}
                        {p.match.confidence}
                      </span>
                      <a href={`#person/${p.id}`}>
                        Look closer <span>↗</span>
                      </a>
                    </div>
                    {p.match.strongConflicts > 0 && (
                      <p className="conflict-small">
                        ◇ {p.match.strongConflicts} important{" "}
                        {p.match.strongConflicts === 1
                          ? "difference"
                          : "differences"}{" "}
                        to explore
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel empty">
              <span className="big-symbol">✳</span>
              <h2>
                {people.length
                  ? "No one in this little corner yet."
                  : "A community begins somewhere."}
              </h2>
              <p>
                {people.length
                  ? "Try a wider age range, another city, or fewer filters."
                  : "No mutually eligible members yet. Your saved answers are ready for future connections. You can explore fictional people from the home page."}
              </p>
              <a href="#questions">Keep exploring your answers →</a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
