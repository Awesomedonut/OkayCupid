import { useEffect } from "react";
export function useUnsavedWarning(hasUnsavedChanges) {
  useEffect(() => {
    const warn = event => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);
}
