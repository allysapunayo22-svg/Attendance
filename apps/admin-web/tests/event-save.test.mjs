import assert from "node:assert/strict";
import { test } from "node:test";
import { eventFormSchema } from "../../../packages/validation/src/index.ts";
import { completeEventCreation, eventSaveErrorMessage, toEventTimestamp } from "../lib/event-form.ts";

const event = {
  title: "University Meet 2026",
  description: "University attendance event",
  type: "school_event",
  requirement: "required",
  eventDate: "2026-10-01",
  startsAt: "21:00",
  endsAt: "23:59",
  checkInOpensAt: "20:30",
  checkInClosesAt: "21:30",
  lateEndsAt: "22:00",
  checkOutOpensAt: "23:30",
  checkOutClosesAt: "23:59",
  venueName: "CSU Gonzaga Campus",
  latitude: 18.26,
  longitude: 122.0,
  radiusMeters: 100,
  requiredGpsAccuracyMeters: 40,
  zoneMode: "circle",
  minimumAttendanceMinutes: 60
};

test("late evening event produces chronologically valid schedule timestamps", () => {
  const values = eventFormSchema.parse(event);
  for (const [open, close] of [[values.startsAt, values.endsAt], [values.checkInOpensAt, values.checkInClosesAt], [values.checkOutOpensAt, values.checkOutClosesAt]]) {
    assert.ok(toEventTimestamp(values.eventDate, open) <= toEventTimestamp(values.eventDate, close));
  }
});

test("checkout cannot close at midnight before opening on the selected date", () => {
  const result = eventFormSchema.safeParse({ ...event, checkOutClosesAt: "00:00" });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some(issue => issue.path[0] === "checkOutClosesAt"));
});

test("equal checkout times and optional checkout windows retain database-compatible behavior", () => {
  for (const overrides of [
    { checkOutClosesAt: "23:30" },
    { checkOutOpensAt: "", checkOutClosesAt: "" },
    { checkOutOpensAt: null, checkOutClosesAt: null },
    { checkOutOpensAt: undefined, checkOutClosesAt: undefined }
  ]) assert.equal(eventFormSchema.safeParse({ ...event, ...overrides }).success, true);
});

test("invalid dates, malformed times, and reversed required windows fail before saving", () => {
  for (const overrides of [
    { eventDate: "2026-02-30" }, { startsAt: "9:00" }, { endsAt: "24:00" },
    { startsAt: "23:59" }, { checkInClosesAt: "20:00" }, { lateEndsAt: "invalid" }
  ]) assert.equal(eventFormSchema.safeParse({ ...event, ...overrides }).success, false);
});

test("Supabase plain-object errors keep their useful message", () => {
  assert.equal(eventSaveErrorMessage({ code: "23514", message: "Schedule violates a check constraint" }), "Schedule violates a check constraint");
  assert.equal(eventSaveErrorMessage(new Error("Network unavailable")), "Network unavailable");
  assert.match(eventSaveErrorMessage(null), /Unable to save/);
});

test("a failed dependent write removes its incomplete draft and preserves the original error", async () => {
  const failure = { code: "23514", message: "Invalid schedule" };
  let rolledBack = false;
  await assert.rejects(completeEventCreation(async () => { throw failure; }, async () => { rolledBack = true; }), error => error === failure);
  assert.equal(rolledBack, true);
});

test("successful event creation never removes the event", async () => {
  await completeEventCreation(async () => {}, async () => { assert.fail("Unexpected rollback"); });
});

test("failed cleanup warns against creating duplicate drafts", async () => {
  await assert.rejects(completeEventCreation(async () => { throw { message: "Schedule rejected" }; }, async () => { throw new Error("Network unavailable"); }), /Schedule rejected.*Check the Events list/);
});
