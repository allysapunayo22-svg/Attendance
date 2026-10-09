import { useEffect, useState } from "react";

export function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useBrowserOnline() {
  // Match the server-rendered state during hydration. The effect immediately
  // reconciles the real browser signal and then tracks connectivity changes.
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
