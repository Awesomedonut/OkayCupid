import { useEffect, useRef } from "react";
import { api } from "../api.js";
const sessionTab = crypto.randomUUID();
function obsoleteSessionError() {
  const error = new Error("Your session changed. Please try again.");
  error.name = "AbortError";
  return error;
}
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
  function beginSessionAction(expected = currentContext.current) {
    return () => expected === currentContext.current;
  }
  async function refresh(expected = currentContext.current) {
    const isCurrent = beginSessionAction(expected ?? currentContext.current);
    if (expected != null && !isCurrent())
      throw obsoleteSessionError();
    const version = ++sessionVersion.current;
    let value;
    try {
      value = await api("/me");
    } catch (error) {
      if (version !== sessionVersion.current || !isCurrent())
        throw obsoleteSessionError();
      throw error;
    }
    if (version !== sessionVersion.current || !isCurrent())
      throw obsoleteSessionError();
    currentContext.current = value?.mutationContext;
    setMe(value);
    if (expected != null && value?.mutationContext !== expected) {
      setNotice("Your session changed. Previous drafts were cleared.");
      throw new Error(
        "Your signed-in account changed. Your previous drafts were cleared.",
      );
    }
    return value;
  }
  useEffect(() => {
    const check = async (event) => {
      const expected = event?.detail?.mutationContext;
      if (expected != null && expected !== currentContext.current) return;
      const isCurrent = beginSessionAction();
      try {
        await refresh(null);
      } catch (error) {
        if (isCurrent() && error.name !== "AbortError") setError(error.message);
      }
    };
    const channel = new BroadcastChannel("okaycupid-session");
    channel.onmessage = (event) => {
      if (event.data !== sessionTab) check();
    };
    window.addEventListener("sessionchange", check);
    window.addEventListener("focus", check);
    return () => {
      channel.close();
      window.removeEventListener("sessionchange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  function announceSession() {
    const channel = new BroadcastChannel("okaycupid-session");
    channel.postMessage(sessionTab);
    channel.close();
  }
  async function endSession(path, method, body, expected) {
    const isCurrent = beginSessionAction(expected);
    await api(path, method, body, expected);
    if (!isCurrent()) return;
    const member = await refresh(null);
    if (member || currentContext.current != null) return;
    announceSession();
    setMode("real");
    go("home");
    if (path === "/account")
      setNotice("Your account, answers, and sessions have been deleted.");
  }
  async function logout() {
    const expected = currentContext.current;
    const isCurrent = beginSessionAction(expected);
    try {
      await endSession("/logout", "POST", {}, expected);
    } catch (error) {
      if (isCurrent() && error.name !== "AbortError") setError(error.message);
    }
  }
  return { refresh, sessionVersion, announceSession, logout, beginSessionAction, endSession };
}
