"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchStudents } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseRosterCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = splitCsvLine(lines[0] ?? "").map(normalizeHeader);
  const required = ["student_id", "school_email", "full_name"];
  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}`);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
    return {
      student_id: (row.student_id ?? "").trim().replace(/\s+/g, "").toUpperCase(),
      school_email: (row.school_email ?? "").trim().toLowerCase(),
      full_name: (row.full_name ?? "").trim(),
      year_level: row.year_level ? Number(row.year_level) : null,
      department_code: "CBEA",
      status: row.status?.trim() || "eligible"
    };
  });
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["students"], queryFn: fetchStudents });
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: "toggle" | "reset"; studentId: string; active?: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  async function toggle(studentId: string, active: boolean) {
    setActionBusy(true);
    const { error } = await supabase.from("student_profiles").update({ is_active: !active }).eq("id", studentId);
    setActionBusy(false);
    if (error) { setNotice({ tone: "error", text: error.message }); return; }
    setNotice({ tone: "success", text: `Student account ${active ? "deactivated" : "activated"}.` });
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  }

  async function resetDevices(studentId: string) {
    setActionBusy(true);
    const { error } = await supabase.from("devices").update({ is_active: false }).eq("student_id", studentId);
    setActionBusy(false);
    if (error) { setNotice({ tone: "error", text: error.message }); return; }
    setNotice({ tone: "success", text: "Registered devices reset successfully." });
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  }

  async function importRoster() {
    if (!rosterFile) {
      setNotice({ tone: "error", text: "Choose a CSV file first." });
      return;
    }

    setImporting(true);
    setNotice(null);
    try {
      const rows = parseRosterCsv(await rosterFile.text());
      if (!rows.length) throw new Error("CSV has no student rows.");

      const { error } = await supabase.from("approved_student_roster").upsert(rows, { onConflict: "student_id" });
      if (error) throw error;
      setNotice({ tone: "success", text: `Imported ${rows.length} approved CBEA roster row${rows.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Unable to import roster." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Management</h1>
          <p className="mt-1 text-sm text-slate-500">Import approved roster entries, manage account access, and reset registered devices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input aria-label="Choose student roster CSV" type="file" accept=".csv" className="max-w-64 text-xs" onChange={(event) => setRosterFile(event.target.files?.[0] ?? null)} />
          <Button onClick={() => void importRoster()} disabled={importing} className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-xs font-semibold text-white shadow-xs">
            <Upload size={15} />
            <span>{importing ? "Importing…" : "Import CSV"}</span>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardContent className="p-5">
          <h2 className="font-bold text-slate-900">Approved CBEA Registration Roster</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registering students must match this roster by student_id and school_email. Required CSV columns: student_id, school_email, full_name, year_level, status.
          </p>
          {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm font-medium ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {query.isError ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Student records could not be loaded. <button className="font-bold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}
          {query.isLoading ? <div role="status" className="p-12 text-center text-sm text-slate-500">Loading student records…</div> : null}
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Course</th>
                <th className="px-5 py-3.5">Section</th>
                <th className="px-5 py-3.5">Year</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(query.data ?? []).map((student) => (
                <tr key={student.id} className="transition hover:bg-blue-50/25">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 text-sm">{student.full_name}</div>
                    <div className="text-xs font-medium text-slate-500">{student.student_id}</div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">{student.course?.code ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">{student.section?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">{student.year_level ?? "-"}</td>
                  <td className="px-5 py-3.5"><Badge tone={student.is_active ? "verified" : "rejected"}>{student.is_active ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" className="h-8 rounded-lg px-2.5 text-xs font-semibold" onClick={() => setPendingAction({ kind: "toggle", studentId: student.id, active: student.is_active })}>{student.is_active ? "Deactivate" : "Activate"}</Button>
                      <Button variant="outline" className="h-8 rounded-lg px-2.5 text-xs font-semibold" onClick={() => setPendingAction({ kind: "reset", studentId: student.id })}>Reset Device</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!query.isLoading && !query.isError && !query.data?.length ? <tr><td colSpan={6} className="px-5 py-12 text-center"><p className="font-semibold text-slate-900">No students found</p><p className="mt-1 text-sm text-slate-500">Registered student accounts will appear here.</p></td></tr> : null}
            </tbody>
          </table>
          </div>
          {!query.isLoading && !query.isError ? <div className="divide-y divide-slate-100 md:hidden">{(query.data ?? []).map((student) => <article key={student.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{student.full_name}</h3><p className="text-xs text-slate-500">{student.student_id}</p></div><Badge tone={student.is_active ? "verified" : "rejected"}>{student.is_active ? "Active" : "Inactive"}</Badge></div><dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-slate-500">Course</dt><dd className="font-semibold">{student.course?.code ?? "—"}</dd></div><div><dt className="text-slate-500">Section</dt><dd className="font-semibold">{student.section?.name ?? "—"}</dd></div><div><dt className="text-slate-500">Year</dt><dd className="font-semibold">{student.year_level ?? "—"}</dd></div></dl><div className="flex gap-2"><Button variant="outline" className="flex-1 text-xs" onClick={() => setPendingAction({ kind: "toggle", studentId: student.id, active: student.is_active })}>{student.is_active ? "Deactivate" : "Activate"}</Button><Button variant="outline" className="flex-1 text-xs" onClick={() => setPendingAction({ kind: "reset", studentId: student.id })}>Reset Device</Button></div></article>)}{!query.data?.length ? <div className="p-10 text-center text-sm text-slate-500">No registered student accounts found.</div> : null}</div> : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.kind === "reset" ? "Reset registered devices?" : pendingAction?.active ? "Deactivate student account?" : "Activate student account?"} description={pendingAction?.kind === "reset" ? "The student will need to sign in and register this phone again before recording attendance." : pendingAction?.active ? "The student will not be able to use attendance features until the account is activated again." : "The student will regain access to attendance features."} confirmLabel={pendingAction?.kind === "reset" ? "Reset devices" : pendingAction?.active ? "Deactivate" : "Activate"} destructive={pendingAction?.kind === "reset" || Boolean(pendingAction?.active)} busy={actionBusy} onCancel={() => setPendingAction(null)} onConfirm={() => { if (!pendingAction) return; const action = pendingAction; void (action.kind === "reset" ? resetDevices(action.studentId) : toggle(action.studentId, Boolean(action.active))).finally(() => setPendingAction(null)); }} />
    </div>
  );
}
