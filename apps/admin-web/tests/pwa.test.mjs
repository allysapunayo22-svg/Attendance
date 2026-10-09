import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import manifest from "../app/manifest.ts";

test("student manifest is installable and uses student-facing ClickIn identity", async () => {
  const value = manifest();
  assert.equal(value.name, "ClickIn Student Attendance");
  assert.equal(value.start_url, "/student");
  assert.equal(value.display, "standalone");
  assert.equal(value.icons.some((icon) => icon.sizes === "192x192"), true);
  assert.equal(value.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), true);
  await Promise.all(value.icons.map((icon) => stat(new URL(`../public${icon.src}`, import.meta.url))));
});

test("service worker caches only the safe shell and static assets", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /\/_next\/static\//);
  assert.match(source, /if \(!safeStatic\) return/);
  assert.doesNotMatch(source, /submit-attendance|attendance-evidence|supabase\.co|authorization/i);
});

test("foreground, reconnect, app-start, and manual sync triggers are present", async () => {
  const source = await readFile(new URL("../components/student/pwa/StudentPwaCoordinator.tsx", import.meta.url), "utf8");
  assert.match(source, /visibilitychange/);
  assert.match(source, /addEventListener\("online"/);
  assert.match(source, /runSync\(false\)/);
  assert.match(source, /runSync\(true\)/);
  assert.match(source, /beforeinstallprompt/);
});

test("logout retains isolated unsynced records and stops active sync", async () => {
  const source = await readFile(new URL("../components/auth/StudentLogoutButton.tsx", import.meta.url), "utf8");
  assert.match(source, /countOfflineAttendance/);
  assert.match(source, /remain isolated to this account/);
  assert.match(source, /cancelOfflineSync/);
  assert.doesNotMatch(source, /deleteDatabase|clearOffline/);
});

test("late queue and sync results are discarded after an account switch", async () => {
  const coordinator = await readFile(new URL("../components/student/pwa/StudentPwaCoordinator.tsx", import.meta.url), "utf8");
  const queue = await readFile(new URL("../components/student/pwa/OfflineAttendanceQueue.tsx", import.meta.url), "utf8");
  assert.match(coordinator, /ownerRef\.current !== requestedOwnerId/);
  assert.match(coordinator, /previousOwnerId !== null && previousOwnerId !== id/);
  assert.match(coordinator, /cancelOfflineSync\(\)/);
  assert.match(queue, /ownerRef\.current === id/);
  assert.match(queue, /refresh\(requestedOwnerId\)/);
});
