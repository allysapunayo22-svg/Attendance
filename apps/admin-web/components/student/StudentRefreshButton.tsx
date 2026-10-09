import { RefreshCw } from "lucide-react";

export function StudentRefreshButton({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh page data" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60">
      <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
    </button>
  );
}
