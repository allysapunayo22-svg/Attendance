"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, X } from "lucide-react";

/** Reports transitions only; mounting while online/offline does not show a notice. */
export function ConnectionToast() {
  const [message, setMessage] = useState<boolean | null>(null);

  useEffect(() => {
    let previous = navigator.onLine;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = () => {
      const current = navigator.onLine;
      if (current === previous) return;
      previous = current;
      clearTimeout(timer);
      setMessage(current);
      timer = setTimeout(() => setMessage(null), 4000);
    };
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] flex justify-center">
      {message !== null ? <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-student-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
        {message ? <Cloud size={18} className="text-student-700" /> : <CloudOff size={18} className="text-slate-500" />}
        <span>{message ? "You’re back online" : "You’re currently offline"}</span>
        <button type="button" aria-label="Dismiss connection notice" onClick={() => setMessage(null)} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full hover:bg-student-50"><X size={16} /></button>
      </div> : null}
    </div>
  );
}
