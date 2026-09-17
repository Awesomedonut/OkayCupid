import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { useMemberSession } from "./hooks/useMemberSession.js";
import { JoinPrompt } from "./components/JoinPrompt.jsx";
import { Home } from "./pages/Home.jsx";
import { About } from "./pages/About.jsx";
import { Auth } from "./pages/Auth.jsx";
import { GoogleOnboarding } from "./pages/GoogleOnboarding.jsx";
import { Profile } from "./pages/Profile.jsx";
import { People } from "./pages/People.jsx";
import { Comparison } from "./pages/Comparison.jsx";
import { QuestionnaireWorkspace } from "./pages/Questionnaire.jsx";
export function App() {
  const [page, setPage] = useState(
    location.hash.slice(1).split("?")[0] || "home",
  );
  const [me, setMe] = useState(null),
    [catalog, setCatalog] = useState(null),
    [demo, setDemo] = useState(null);
  const [mode, setMode] = useState(() =>
      sessionStorage.getItem("kindred-mode") === "demo" ||
      location.hash.startsWith("#person/demo-")
        ? "demo"
        : "real",
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function go(path) {
    location.hash = path;
    setNotice("");
  }
  useEffect(() => {
    const fn = () => {
      setPage(location.hash.slice(1).split("?")[0] || "home");
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    sessionStorage.setItem("kindred-mode", mode);
  }, [mode]);
  const { refresh, sessionVersion, announceSession, logout } = useMemberSession(
    { me, setMe, setNotice, setError, setMode, go },
  );
  async function boot() {
    const version = ++sessionVersion.current;
    setError("");
    setLoading(true);
    try {
      const [member, qs, sample] = await Promise.all([
        api("/me"),
        api("/questions"),
        api("/demo"),
      ]);
      if (version !== sessionVersion.current) return;
      setMe(member);
      setCatalog(qs);
      setDemo(sample);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);
  const viewer = mode === "demo" ? demo?.viewer : me;
  const explore = () => {
    setMode("demo");
    go("people");
  };
  const navigate = (p) => {
    if (p === "people" && !me && mode !== "demo") explore();
    else go(p);
  };
  return (
    <>
      <header className="header">
        <a href="#home" className="brand" aria-label="okaycupid home">
          okaycupid<span aria-hidden="true">♡</span>
        </a>
        <nav aria-label="Main navigation">
          <a
            href="#people"
            onClick={(e) => {
              e.preventDefault();
              navigate("people");
            }}
            className={
              page === "people" || page.startsWith("person/") ? "active" : ""
            }
          >
            Discover
          </a>
          <a href="#questions" className={page === "questions" ? "active" : ""}>
            Questions
          </a>
          <a href="#about" className={page === "about" ? "active" : ""}>
            How it works
          </a>
        </nav>
        <div className="account-nav">
          {me ? (
            <>
              <a href="#profile" onClick={() => setMode("real")}>
                {me.name}
                <span className="tiny-avatar">{me.name[0]}</span>
              </a>
              <button className="text-button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="#login">Log in</a>
              <button className="button small" onClick={() => go("signup")}>
                Join okaycupid
              </button>
            </>
          )}
        </div>
      </header>
      {mode === "demo" && page !== "home" && (
        <div className="demo-bar">
          <span>
            <strong>A fictional little world.</strong> Exploring as Alex, 31.
            All demo people and answers are invented.
          </span>
          <button
            onClick={() => {
              setMode("real");
              go(me ? "people" : "signup");
            }}
          >
            {me ? "Return to real members" : "Make it your own"} ↗
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="error global" role="alert">
          {error} <button onClick={boot}>Retry connection</button>
        </div>
      )}
      {loading ? (
        <main>
          <p role="status">Making room for good conversation…</p>
        </main>
      ) : (
        catalog &&
        demo && (
          <>
            {page === "home" && <Home explore={explore} go={go} />}
            {(page === "signup" || page === "login") && (
              <Auth
                signup={page === "signup"}
                onDone={async () => {
                  await refresh(null);
                  announceSession();
                  setMode("real");
                  go("questions");
                }}
                go={go}
              />
            )}
            {page === "google-onboarding" && (
              <GoogleOnboarding
                onDone={async () => {
                  await refresh(null);
                  announceSession();
                  setMode("real");
                  go("questions");
                }}
              />
            )}
            {
              <div hidden={page !== "questions"}>
                <QuestionnaireWorkspace
                  key={me?.mutationContext ?? "guest"}
                  active={page === "questions"}
                  catalog={catalog}
                  member={me}
                  demoViewer={demo.viewer}
                  demoMode={mode === "demo"}
                  refresh={refresh}
                  go={go}
                />
              </div>
            }
            {page === "people" && (
              <People
                key={`people:${mode === "demo" ? "demo" : me?.mutationContext ?? "guest"}`}
                viewer={viewer}
                demoMode={mode === "demo"}
                demo={demo}
                go={go}
              />
            )}
            {page.startsWith("person/") && (
              <Comparison
                key={`${mode === "demo" ? "demo" : me?.mutationContext ?? "guest"}:${page}`}
                id={page.slice(7)}
                demoMode={mode === "demo"}
                go={go}
              />
            )}
            {me ? (
                <Profile
                  key={me.mutationContext}
                  me={me}
                  active={page === "profile"}
                  refresh={refresh}
                  onDelete={() => {
                    sessionVersion.current++;
                    setMe(null);
                    announceSession();
                    go("home");
                    setNotice(
                      "Your account, answers, and sessions have been deleted.",
                    );
                  }}
                />
              ) : (
                page === "profile" && <JoinPrompt go={go} />
              )}
            {page === "about" && <About />}
            {![
              "home",
              "signup",
              "login",
              "questions",
              "people",
              "profile",
              "about",
              "google-onboarding",
            ].includes(page) &&
              !page.startsWith("person/") && (
                <main>
                  <h1>Let’s find your way back.</h1>
                  <a href="#home">Back to okaycupid</a>
                </main>
              )}
          </>
        )
      )}
      <footer>
        <a className="brand" href="#home">
          okaycupid<span aria-hidden="true">♡</span>
        </a>
        <p>Big questions. Little sparks.</p>
        <span>18+ · No swiping · Open source</span>
        <a href="#about">Matching & privacy</a>
      </footer>
    </>
  );
}
