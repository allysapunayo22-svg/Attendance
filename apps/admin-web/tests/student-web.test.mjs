import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  attendanceNeedsReview,
  getEventPhase,
  isResolvedAttendance,
  notificationDestination
} from "../lib/student/format.ts";

function event(status, startsAt, endsAt) {
  return {
    id: "event-id",
    title: "Test event",
    description: "Test event",
    banner_path: null,
    type: "school_event",
    requirement: "required",
    status,
    photo_required: true,
    time_out_photo_required: true,
    dynamic_qr_required: false,
    minimum_attendance_minutes: 0,
    max_participants: null,
    registration_deadline: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    schedule: startsAt && endsAt ? { starts_at: startsAt, ends_at: endsAt } : null
  };
}

test("student event phases follow the mobile workflow semantics", () => {
  const now = Date.parse("2026-10-05T08:00:00.000Z");
  assert.equal(getEventPhase(event("published", "2026-10-05T09:00:00.000Z", "2026-10-05T10:00:00.000Z"), now), "upcoming");
  assert.equal(getEventPhase(event("ongoing", "2026-10-05T07:00:00.000Z", "2026-10-05T09:00:00.000Z"), now), "ongoing");
  assert.equal(getEventPhase(event("completed", "2026-10-05T06:00:00.000Z", "2026-10-05T07:00:00.000Z"), now), "completed");
  assert.equal(getEventPhase(event("cancelled", "2026-10-05T09:00:00.000Z", "2026-10-05T10:00:00.000Z"), now), "cancelled");
  assert.equal(getEventPhase(event("published", null, null), now), "pending");
});

test("attendance summaries distinguish resolved and review states", () => {
  assert.equal(isResolvedAttendance("verified"), true);
  assert.equal(isResolvedAttendance("late"), true);
  assert.equal(isResolvedAttendance("pending_verification"), false);
  assert.equal(attendanceNeedsReview("pending_verification"), true);
  assert.equal(attendanceNeedsReview("rejected"), true);
  assert.equal(attendanceNeedsReview("completed"), false);
});

test("notification navigation accepts server identifiers only", () => {
  assert.equal(notificationDestination({ attendance_session_id: "attendance-id" }), "/student/attendance/attendance-id");
  assert.equal(notificationDestination({ attendance_id: "attendance/id" }), "/student/attendance/attendance%2Fid");
  assert.equal(notificationDestination({ event_id: "event-id" }), "/student/events/event-id");
  assert.equal(notificationDestination({ attendance_local_id: "device-only-id" }), null);
});

test("student navigation exposes an immediate route shell and warms route data on intent", async () => {
  const [shell, loading, hooks] = await Promise.all([
    readFile(new URL("../components/student/StudentShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/student/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/student/hooks.ts", import.meta.url), "utf8")
  ]);

  for (const section of ["events", "attendance", "announcements", "notifications", "profile"]) {
    assert.match(shell, new RegExp(`prefetchQuery\\(studentQueryOptions\\.${section}\\(\\)\\)`));
  }
  assert.match(shell, /onTouchStart=.*prepareNavigation/);
  assert.match(shell, /setPendingNavigation/);
  assert.match(loading, /StudentPageLoading/);
  assert.match(loading, /StudentDashboardLoading/);
  assert.match(hooks, /staleTime: 2 \* 60_000/);
  assert.match(hooks, /refetchOnWindowFocus: false/);
  assert.match(hooks, /getQueryData<Event\[]>\(studentQueryKeys\.events\)/);
  assert.match(hooks, /getQueryData<StudentAttendanceRecord\[]>\(studentQueryKeys\.attendance\)/);
});

test("cold student routes render their page identity before query data arrives", async () => {
  const routes = [
    ["events", "Events"],
    ["attendance", "Attendance"],
    ["announcements", "Announcements"],
    ["notifications", "Notifications"],
    ["profile", "Profile"]
  ];

  for (const [route, title] of routes) {
    const source = await readFile(new URL(`../app/student/${route}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`query\\.isLoading.*StudentPageLoading title=\\"${title}\\"`));
  }
});
