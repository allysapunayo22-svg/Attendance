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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: "toggle" | "reset"; studentId: string; active?: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  async function toggle(studentId: string, active: boolean) {
    setActionBusy(true);
    const { error } = await supabase.from("student_profiles").update({ is_active: !active }).eq("id", studentId);
    setActionBusy(false);
    if (error) { setImportMessage(error.message); return; }
    setImportMessage(`Student account ${active ? "deactivated" : "activated"}.`);
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  }

  async function resetDevices(studentId: string) {
    setActionBusy(true);
    const { error } = await supabase.from("devices").update({ is_active: false }).eq("student_id", studentId);
    setActionBusy(false);
    if (error) { setImportMessage(error.message); return; }
    setImportMessage("Registered devices reset successfully.");
    await queryClient.invalidateQueries({ queryKey: ["students"] });
  }

  async function importRoster() {
    if (!rosterFile) {
      setImportMessage("Choose a CSV file first.");
      return;
    }

    setImporting(true);
    setImportMessage(null);
    try {
      const rows = parseRosterCsv(await rosterFile.text());
      if (!rows.length) throw new Error("CSV has no student rows.");

      const { error } = await supabase.from("approved_student_roster").upsert(rows, { onConflict: "student_id" });
      if (error) throw error;
      setImportMessage(`Imported ${rows.length} approved CBEA roster row${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Unable to import roster.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Management</h1>
          <p className="mt-1 text-sm text-slate-500">Add, import, edit, assign sections, deactivate accounts, reset devices, and review attendance records.</p>
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
          {importMessage ? <p role="status" className="mt-3 rounded-xl bg-blue-50/80 border border-blue-200 p-3 text-sm text-blue-800 font-medium">{importMessage}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
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
              {!query.isLoading && !query.data?.length ? <tr><td colSpan={6} className="px-5 py-12 text-center"><p className="font-semibold text-slate-900">No students found</p><p className="mt-1 text-sm text-slate-500">Import an approved roster to begin.</p></td></tr> : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.kind === "reset" ? "Reset registered devices?" : pendingAction?.active ? "Deactivate student account?" : "Activate student account?"} description={pendingAction?.kind === "reset" ? "The student will need to sign in and register this phone again before recording attendance." : pendingAction?.active ? "The student will not be able to use attendance features until the account is activated again." : "The student will regain access to attendance features."} confirmLabel={pendingAction?.kind === "reset" ? "Reset devices" : pendingAction?.active ? "Deactivate" : "Activate"} destructive={pendingAction?.kind === "reset" || Boolean(pendingAction?.active)} busy={actionBusy} onCancel={() => setPendingAction(null)} onConfirm={() => { if (!pendingAction) return; const action = pendingAction; void (action.kind === "reset" ? resetDevices(action.studentId) : toggle(action.studentId, Boolean(action.active))).finally(() => setPendingAction(null)); }} />
    </div>
  );
}
