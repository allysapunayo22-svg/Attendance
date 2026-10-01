import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [intervalMs]);

  return now;
}
