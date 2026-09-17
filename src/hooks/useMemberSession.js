import { useEffect, useRef } from "react";
import { api } from "../api.js";
const sessionTab = crypto.randomUUID();
export function useMemberSession({
  me,
  setMe,
  setNotice,
  setError,
  setMode,
  go,
}) {
  const sessionVersion = useRef(0);
  const currentContext = useRef(me?.mutationContext);
  currentContext.current = me?.mutationContext;
  async function refresh(expected = me?.mutationContext) {
    if (expected != null && expected !== currentContext.current)
      throw new Error("Your session changed. Please try again.");
    const version = ++sessionVersion.current;
    const value = await api("/me");
    if (
      version !== sessionVersion.current ||
      (expected != null && expected !== currentContext.current)
    )
      throw new Error("Your session changed. Please try again.");
    if (expected != null && value?.mutationContext !== expected) {
      setMe(null);
      window.dispatchEvent(new Event("sessionchange"));
      throw new Error(
        "Your signed-in account changed. Your previous drafts were cleared.",
      );
    }
    setMe(value);
    return value;
  }
  useEffect(() => {
    const invalidate = () => {
      sessionVersion.current++;
      setMe(null);
      setNotice("Your session changed. Previous drafts were cleared.");
      refresh(null).catch((e) => setError(e.message));
    };
    const channel = new BroadcastChannel("okaycupid-session");
    channel.onmessage = (event) => {
      if (event.data !== sessionTab) invalidate();
    };
    window.addEventListener("sessionchange", invalidate);
    const check = () => {
      refresh().catch((e) => setError(e.message));
    };
    window.addEventListener("focus", check);
    return () => {
      channel.close();
      window.removeEventListener("sessionchange", invalidate);
      window.removeEventListener("focus", check);
    };
  }, [me?.mutationContext]);
  function announceSession() {
    const channel = new BroadcastChannel("okaycupid-session");
    channel.postMessage(sessionTab);
    channel.close();
  }

  async function logout() {
    try {
      await api("/logout", "POST", {}, me?.mutationContext);
      sessionVersion.current++;
      setMe(null);
      announceSession();
      setMode("real");
      go("home");
    } catch (e) {
      setError(e.message);
    }
  }

  return { refresh, sessionVersion, announceSession, logout };
}
