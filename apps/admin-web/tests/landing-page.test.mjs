import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

test("landing page uses the supplied hero and existing authentication routes", async () => {
  const [home, landing] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/landing/ClickInLandingPage.tsx", import.meta.url), "utf8")
  ]);

  await stat(new URL("../public/BG.jpeg", import.meta.url));
  assert.match(home, /resolveAuthenticatedAccount/);
  assert.match(home, /redirect\(homeForRole\(result\.account\.role\)\)/);
  assert.match(home, /<ClickInLandingPage \/>/);
  assert.match(landing, /src="\/BG\.jpeg"/);
  assert.match(landing, /aspect-\[3\/2\]/);
  assert.match(landing, /object-cover object-center/);
  assert.match(landing, /href="\/login"/);
  assert.match(landing, /href="\/privacy"/);
});

test("landing content stays student-focused and contains no demo action", async () => {
  const landing = await readFile(new URL("../components/landing/ClickInLandingPage.tsx", import.meta.url), "utf8");

  for (const section of ["Assigned Events", "QR Attendance", "GPS / Geofencing", "Offline Support / Sync", "How ClickIn Works"]) {
    assert.match(landing, new RegExp(section.replace("/", "\\/")));
  }
  assert.doesNotMatch(landing, /Watch Demo|demo section/i);
  assert.doesNotMatch(landing, /Manage users|Admin settings|User management/i);
});
