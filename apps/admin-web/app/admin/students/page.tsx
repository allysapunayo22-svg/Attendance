"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchStudents } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

type AcademicCourse = { id: string; code: string; name: string };
type AcademicSection = { id: string; course_id: string; name: string; year_level: number };
type NewRosterStudent = {
  studentId: string;
  schoolEmail: string;
  fullName: string;
  courseId: string;
  sectionId: string;
  yearLevel: string;
};

const emptyRosterStudent: NewRosterStudent = {
  studentId: "",
  schoolEmail: "",
  fullName: "",
  courseId: "",
  sectionId: "",
  yearLevel: ""
};

async function fetchAcademicOptions() {
  const [coursesResult, sectionsResult] = await Promise.all([
    supabase.from("courses").select("id,code,name").order("code"),
    supabase.from("sections").select("id,course_id,name,year_level").order("name")
  ]);
  if (coursesResult.error) throw coursesResult.error;
  if (sectionsResult.error) throw sectionsResult.error;
  return {
    courses: (coursesResult.data ?? []) as AcademicCourse[],
    sections: (sectionsResult.data ?? []) as AcademicSection[]
  };
}

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
  const academicQuery = useQuery({ queryKey: ["academic-options"], queryFn: fetchAcademicOptions, staleTime: 5 * 60_000 });
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState<NewRosterStudent>(emptyRosterStudent);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: "toggle" | "reset"; studentId: string; active?: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const students = useMemo(() => (query.data ?? []).filter((student) => {
    const term = search.trim().toLowerCase();
    return (!term || `${student.full_name} ${student.student_id}`.toLowerCase().includes(term))
      && (courseFilter === "all" || student.course?.code === courseFilter)
      && (sectionFilter === "all" || student.section?.name === sectionFilter)
      && (statusFilter === "all" || (statusFilter === "active" ? student.is_active : !student.is_active));
  }), [query.data, search, courseFilter, sectionFilter, statusFilter]);
  const courses = useMemo(() => Array.from(new Set((query.data ?? []).map((student) => student.course?.code).filter((value): value is string => Boolean(value)))).sort(), [query.data]);
  const sections = useMemo(() => Array.from(new Set((query.data ?? []).map((student) => student.section?.name).filter((value): value is string => Boolean(value)))).sort(), [query.data]);
  const pageCount = Math.max(1, Math.ceil(students.length / pageSize));
  const pageRows = students.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const availableSections = (academicQuery.data?.sections ?? []).filter((section) => !newStudent.courseId || section.course_id === newStudent.courseId);

  function closeAddStudent() {
    if (addingStudent) return;
    setAddOpen(false);
    setAddError(null);
    setNewStudent(emptyRosterStudent);
  }

  async function addRosterStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const studentId = newStudent.studentId.trim().replace(/\s+/g, "").toUpperCase();
    const schoolEmail = newStudent.schoolEmail.trim().toLowerCase();
    const fullName = newStudent.fullName.trim();
    const yearLevel = newStudent.yearLevel ? Number(newStudent.yearLevel) : null;

    if (!/^[A-Z0-9-]{4,32}$/.test(studentId)) {
      setAddError("Enter a valid student ID using letters, numbers, or hyphens.");
      return;
    }
    if (fullName.length < 3) {
      setAddError("Enter the student's complete name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolEmail)) {
      setAddError("Enter a valid school email address.");
      return;
    }
    if (yearLevel !== null && (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6)) {
      setAddError("Year level must be between 1 and 6.");
      return;
    }

    setAddingStudent(true);
    setAddError(null);
    try {
      const { error } = await supabase.from("approved_student_roster").insert({
        student_id: studentId,
        school_email: schoolEmail,
        full_name: fullName,
        department_code: "CBEA",
        course_id: newStudent.courseId || null,
        section_id: newStudent.sectionId || null,
        year_level: yearLevel,
        status: "eligible"
      });
      if (error) {
        if (error.code === "23505") throw new Error("That student ID or school email is already on the approved roster.");
        throw error;
      }
      setAddOpen(false);
      setNewStudent(emptyRosterStudent);
      setNotice({ tone: "success", text: `${fullName} was added to the approved roster. The student can now register and verify ${schoolEmail}.` });
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Unable to add the student.");
    } finally {
      setAddingStudent(false);
    }
  }

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setAddOpen(true)} className="h-10 rounded-xl text-xs font-semibold">
            <Plus size={15} /> Add student
          </Button>
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
            Add one student directly or import a CSV. Registration must match the approved student ID and school email. Required CSV columns: student_id, school_email, full_name.
          </p>
          {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm font-medium ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardContent className="p-0">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_150px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(0); }} placeholder="Search name or student ID" /></div>
            <FilterSelect label="course" value={courseFilter} onChange={(value) => { setCourseFilter(value); setPageIndex(0); }} values={courses} />
            <FilterSelect label="section" value={sectionFilter} onChange={(value) => { setSectionFilter(value); setPageIndex(0); }} values={sections} />
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPageIndex(0); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </div>
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
              {pageRows.map((student) => (
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
                    <StudentActions student={student} onAction={setPendingAction} />
                  </td>
                </tr>
              ))}
              {!query.isLoading && !query.isError && !pageRows.length ? <tr><td colSpan={6} className="px-5 py-12 text-center"><p className="font-semibold text-slate-900">No students found</p><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p></td></tr> : null}
            </tbody>
          </table>
          </div>
          {!query.isLoading && !query.isError ? <div className="divide-y divide-slate-100 md:hidden">{pageRows.map((student) => <article key={student.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{student.full_name}</h3><p className="text-xs text-slate-500">{student.student_id}</p></div><Badge tone={student.is_active ? "verified" : "rejected"}>{student.is_active ? "Active" : "Inactive"}</Badge></div><dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-slate-500">Course</dt><dd className="font-semibold">{student.course?.code ?? "—"}</dd></div><div><dt className="text-slate-500">Section</dt><dd className="font-semibold">{student.section?.name ?? "—"}</dd></div><div><dt className="text-slate-500">Year</dt><dd className="font-semibold">{student.year_level ?? "—"}</dd></div></dl><StudentActions student={student} onAction={setPendingAction} /></article>)}{!pageRows.length ? <div className="p-10 text-center text-sm text-slate-500">No students match these filters.</div> : null}</div> : null}
          {!query.isLoading && !query.isError && students.length > 0 ? <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><span>{students.length} student{students.length === 1 ? "" : "s"} · Page {pageIndex + 1} of {pageCount}</span><div className="flex gap-2"><Button variant="outline" className="h-8 w-8 p-0" disabled={pageIndex === 0} onClick={() => setPageIndex((page) => page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></Button><Button variant="outline" className="h-8 w-8 p-0" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex((page) => page + 1)} aria-label="Next page"><ChevronRight size={15} /></Button></div></div> : null}
        </CardContent>
      </Card>
      <Dialog.Root open={addOpen} onOpenChange={(open) => { if (open) setAddOpen(true); else closeAddStudent(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black text-slate-950">Add student</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-slate-600">Approve one CBEA student for registration. The student must still confirm the school email before the account becomes active.</Dialog.Description>
              </div>
              <Dialog.Close asChild><button type="button" disabled={addingStudent} aria-label="Close add student form" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button></Dialog.Close>
            </div>
            <form className="mt-6 space-y-5" onSubmit={(event) => void addRosterStudent(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Student ID" htmlFor="new-student-id" required>
                  <Input id="new-student-id" required autoFocus autoCapitalize="characters" placeholder="e.g. 2026-00123" value={newStudent.studentId} onChange={(event) => setNewStudent((current) => ({ ...current, studentId: event.target.value }))} />
                </FormField>
                <FormField label="School email" htmlFor="new-student-email" required>
                  <Input id="new-student-email" required type="email" autoCapitalize="none" autoComplete="off" placeholder="student@carsu.edu.ph" value={newStudent.schoolEmail} onChange={(event) => setNewStudent((current) => ({ ...current, schoolEmail: event.target.value }))} />
                </FormField>
              </div>
              <FormField label="Full name" htmlFor="new-student-name" required>
                <Input id="new-student-name" required autoComplete="off" placeholder="Student's complete name" value={newStudent.fullName} onChange={(event) => setNewStudent((current) => ({ ...current, fullName: event.target.value }))} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Course (optional)" htmlFor="new-student-course">
                  <select id="new-student-course" value={newStudent.courseId} disabled={academicQuery.isLoading} onChange={(event) => setNewStudent((current) => ({ ...current, courseId: event.target.value, sectionId: "" }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
                    <option value="">Not assigned</option>
                    {(academicQuery.data?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Section (optional)" htmlFor="new-student-section">
                  <select id="new-student-section" value={newStudent.sectionId} disabled={!newStudent.courseId || academicQuery.isLoading} onChange={(event) => { const section = availableSections.find((item) => item.id === event.target.value); setNewStudent((current) => ({ ...current, sectionId: event.target.value, yearLevel: section ? String(section.year_level) : current.yearLevel })); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
                    <option value="">Not assigned</option>
                    {availableSections.map((section) => <option key={section.id} value={section.id}>{section.name} · Year {section.year_level}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Year level (optional)" htmlFor="new-student-year">
                <select id="new-student-year" value={newStudent.yearLevel} onChange={(event) => setNewStudent((current) => ({ ...current, yearLevel: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
                  <option value="">Not assigned</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
                </select>
              </FormField>
              {academicQuery.isError ? <p className="text-xs text-amber-700">Course and section options could not be loaded. You can still add the student without them.</p> : null}
              {addError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{addError}</p> : null}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">This creates an eligible roster entry. It does not set a password or bypass school-email verification.</div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" disabled={addingStudent} onClick={closeAddStudent}>Cancel</Button>
                <Button type="submit" disabled={addingStudent}>{addingStudent ? "Adding…" : "Add approved student"}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.kind === "reset" ? "Reset registered devices?" : pendingAction?.active ? "Deactivate student account?" : "Activate student account?"} description={pendingAction?.kind === "reset" ? "The student will need to sign in and register this phone again before recording attendance." : pendingAction?.active ? "The student will not be able to use attendance features until the account is activated again." : "The student will regain access to attendance features."} confirmLabel={pendingAction?.kind === "reset" ? "Reset devices" : pendingAction?.active ? "Deactivate" : "Activate"} destructive={pendingAction?.kind === "reset" || Boolean(pendingAction?.active)} busy={actionBusy} onCancel={() => setPendingAction(null)} onConfirm={() => { if (!pendingAction) return; const action = pendingAction; void (action.kind === "reset" ? resetDevices(action.studentId) : toggle(action.studentId, Boolean(action.active))).finally(() => setPendingAction(null)); }} />
    </div>
  );
}

type Student = Awaited<ReturnType<typeof fetchStudents>>[number];
type PendingAction = { kind: "toggle" | "reset"; studentId: string; active?: boolean };

function FormField({ label, htmlFor, required = false, children }: { label: string; htmlFor: string; required?: boolean; children: ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}</label>{children}</div>;
}

function FilterSelect({ label, value, onChange, values }: { label: string; value: string; onChange: (value: string) => void; values: string[] }) {
  return <select aria-label={`Filter by ${label}`} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All {label}s</option>{values.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function StudentActions({ student, onAction }: { student: Student; onAction: (action: PendingAction) => void }) {
  return <details className="relative inline-block"><summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700"><MoreHorizontal size={15} /> Actions</summary><div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50" onClick={() => onAction({ kind: "toggle", studentId: student.id, active: student.is_active })}>{student.is_active ? "Deactivate account" : "Activate account"}</button><button className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => onAction({ kind: "reset", studentId: student.id })}>Reset device</button></div></details>;
}
