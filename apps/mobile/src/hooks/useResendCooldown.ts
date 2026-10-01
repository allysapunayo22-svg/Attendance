import { useCallback, useEffect, useState } from "react";

// Shared across auth screens so navigating away does not reset the UI cooldown.
const deadlines = new Map<string, number>();

export function useResendCooldown(key: string) {
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil(((deadlines.get(key) ?? 0) - now) / 1000));
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [key]);
  const start = useCallback(() => {
    deadlines.set(key, Date.now() + 60_000);
    setNow(Date.now());
  }, [key]);
  return { remaining, start };
}
