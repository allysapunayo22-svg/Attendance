"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Megaphone, Paperclip, Search } from "lucide-react";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { StudentRefreshButton } from "@/components/student/StudentRefreshButton";
import { StudentEmpty, StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAnnouncements } from "@/components/student/hooks";
import { formatDateTime } from "@/lib/student/format";

const filters = ["all", "urgent", "important", "normal"] as const;
type AnnouncementFilter = (typeof filters)[number];

export default function StudentAnnouncementsPage() {
  const query = useStudentAnnouncements();
  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return rows.filter((row) => (filter === "all" || row.importance === filter) && (!value || `${row.title} ${row.description}`.toLowerCase().includes(value)));
  }, [filter, rows, search]);

  if (query.isLoading) return <StudentLoading label="Loading announcements" />;
  if (query.isError) return <StudentError message="Published announcements could not be loaded." retry={() => void query.refetch()} />;

  return (
    <div className="space-y-5">
      <StudentPageHeader title="Announcements" description="Global and targeted notices available to your account" action={<StudentRefreshButton refreshing={query.isFetching} onRefresh={() => void query.refetch()} />} />
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search announcements</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements" className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" /></label><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold capitalize ${filter === item ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}</div></div>
      {filtered.length ? <div className="grid gap-4 lg:grid-cols-2">{filtered.map((row) => <article key={row.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><StudentStatusBadge value={row.importance} /><time className="text-xs text-slate-400">{formatDateTime(row.publish_at)}</time></div><h2 className="mt-4 text-lg font-extrabold text-slate-950">{row.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{row.description}</p><div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">{row.event ? <Link href={`/student/events/${row.event.id}`} className="text-xs font-bold text-teal-700 hover:underline">Event: {row.event.title}</Link> : <span className="text-xs text-slate-400">General announcement</span>}{row.attachment_paths.length ? <span className="ml-auto flex items-center gap-1 text-xs text-slate-500"><Paperclip size={13} /> {row.attachment_paths.length} attachment{row.attachment_paths.length === 1 ? "" : "s"}</span> : null}</div></article>)}</div> : <StudentEmpty icon={Megaphone} title="No announcements" description={search || filter !== "all" ? "Try another search or importance filter." : "Published notices for your account will appear here."} />}
    </div>
  );
}
