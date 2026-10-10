import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

test("landing page uses the supplied hero and existing authentication routes", async () => {
  const [home, landing] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/landing/ClickInLandingPage.tsx", import.meta.url), "utf8")
  ]);

  await stat(new URL("../public/homepage.png", import.meta.url));
  assert.match(home, /resolveAuthenticatedAccount/);
  assert.match(home, /redirect\(homeForRole\(result\.account\.role\)\)/);
  assert.match(home, /<ClickInLandingPage \/>/);
  assert.match(landing, /src="\/homepage\.png"/);
  assert.match(landing, /aspect-\[3\/2\]/);
  assert.match(landing, /relative h-dvh overflow-hidden bg-blue-50 md:hidden/);
  assert.match(landing, /object-cover object-center/);
  assert.match(landing, /pt-\[calc\(5rem\+env\(safe-area-inset-top\)\)\]/);
  assert.match(landing, /QR Attendance/);
  assert.match(landing, /Camera Evidence/);
  assert.match(landing, /Student Essentials/);
  assert.match(landing, /backdrop-blur-xl/);
  assert.match(landing, /h-dvh overflow-hidden/);
  assert.match(landing, /hidden scroll-mt-24 bg-white py-16 md:block/);
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
