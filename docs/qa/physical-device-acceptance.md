# Physical-device acceptance — release gate

**No physical iPhone or Android device was available in this QA session. Every hardware result below is NOT TESTED. Headless Chromium does not satisfy this gate.** Use the dedicated staging project only, on an HTTPS staging web origin with staging public API configuration. The local HTTP loopback test is not a deployable phone test URL.

Candidate under test: ClickIn `1.0.0`, Android `com.clickin.attendance` versionCode `1`, iOS `com.clickin.attendance` build `1`, Expo slug `clickin-attendance`, URL scheme `attendance`, Web service-worker cache `clickin-student-shell-v4`. The staging debug-signed Android APK is `dist/release-candidate/clickin-1.0.0-rc1-staging-debug-signed.apk`; verify it against `dist/release-candidate/SHA256SUMS` before installation. A signed iOS artifact and hosted HTTPS staging deployment are not available yet.

Record per run: tester, date/time/timezone, web commit/build/cache version, staging URL, phone model, OS version, Safari/Chrome version, normal/private browsing, installed/noninstalled mode, network, permission settings, and synthetic account label (never credentials). Attach redacted screenshots and server result IDs; never photo bodies, QR tokens, access tokens or passwords.

| Test and expected result | iPhone / Safari | Android / Chrome |
|---|---|---|
| Email/student-ID login; trusted student role redirects to `/student` | NOT TESTED | NOT TESTED |
| Admin and super admin redirect to `/admin`; cross-role URLs redirect; inactive and anonymous accounts blocked | NOT TESTED | NOT TESTED |
| Dashboard, events, event detail, announcements, notifications, profile, attendance history/detail render correctly | NOT TESTED | NOT TESTED |
| Install: Safari Share → Add to Home Screen / Chrome Install; correct icon and name | NOT TESTED | NOT TESTED |
| Standalone launch from Home Screen; no browser UI; correct route/session | NOT TESTED | NOT TESTED |
| Portrait, landscape, safe areas, keyboard, small screen, scrolling, accessible buttons | NOT TESTED | NOT TESTED |
| Allow geolocation; real GPS acquired with visible accuracy; deny/revoke handled without false success | NOT TESTED | NOT TESTED |
| Poor accuracy, indoor/out-of-zone location rejected; retry does not fabricate coordinates | NOT TESTED | NOT TESTED |
| Browser registration, repeat registration, replacement of existing device; replaced browser blocked at submission | NOT TESTED | NOT TESTED |
| Camera permission allow/deny/revoke; front camera selfie, retake and confirm | NOT TESTED | NOT TESTED |
| Rear-camera QR scanner; real optical decoding of valid, expired, wrong-event QR; camera stops on exit | NOT TESTED | NOT TESTED |
| Online check-in and server-confirmed status; evidence upload/viewing; double-submit idempotency | NOT TESTED | NOT TESTED |
| Checkout respects minimum attendance and schedule; completed status requires accepted check-in | NOT TESTED | NOT TESTED |
| Cache permitted event online, enable airplane mode, actually disable Wi-Fi too, open event offline | NOT TESTED | NOT TESTED |
| Capture permitted offline attendance with real GPS/selfie/QR; UI says queued, not verified | NOT TESTED | NOT TESTED |
| Force-close browser/PWA, reopen while fully offline; exact queue ID, capture time and Blob survive | NOT TESTED | NOT TESTED |
| Reconnect with no interaction; one accepted submission; unchanged idempotency and capture time | NOT TESTED | NOT TESTED |
| Transient upload/API failure retries after backoff while page remains foreground; cap and manual retry work | NOT TESTED | NOT TESTED |
| >2h stale queued attempt rejected by server; future >5min rejected; offline flag grants no exception | NOT TESTED | NOT TESTED |
| Device replaced while queue pending; blocked, never attributed to another account | NOT TESTED | NOT TESTED |
| Logout with pending queue: cancel prompt preserves session; confirm cancels in-flight work; relogin recovers only own data | NOT TESTED | NOT TESTED |
| Account switch during upload and submission; second account cannot see/use first account's data, including another open tab | NOT TESTED | NOT TESTED |
| Token expiry during sync preserves recoverable evidence and asks for login | NOT TESTED | NOT TESTED |
| New release: already open old tab, installed PWA, cold offline launch, online update; no mixed assets or lost queue | NOT TESTED | NOT TESTED |
| Quota pressure / denied storage / cleared site data produce honest recovery messages | NOT TESTED | NOT TESTED |

Use a real QR displayed on a different screen or printout. Emulated GPS, a mock camera stream, a generated QR string pasted into code, and a changed `navigator.onLine` flag are not physical acceptance. Test both Safari browser and installed iOS PWA: their storage/session lifecycle can differ. Verify suspension/relaunch explicitly; do not promise background execution while the app is closed. IndexedDB persistence is not a guarantee against OS eviction or user clearing data.

Change individual statuses to PASS or FAIL only after actual execution. Link the evidence and record browser/device versions. All critical flows and privacy/isolation cases must pass before rollout approval.

## Native Android APK acceptance

| Native APK test | Result |
|---|---|
| Student login against staging | **FAIL** — 2026-10-09: tester reported “Unable to continue” using the original RC1 APK |
| Event listing and detail | NOT TESTED |
| Device registration | NOT TESTED |
| GPS and geofence | NOT TESTED |
| Camera/selfie evidence | NOT TESTED |
| Optical QR | NOT TESTED |
| Check-in/check-out | NOT TESTED |
| Offline queue, close/reopen and reconnect | NOT TESTED |

The failed APK was built with a placeholder public API key for compile validation. The staging credential itself passed a direct authentication smoke test against `tosfspsjervmgrpncnsw`. A replacement staging-only APK built with the real staging public key is required before retesting; the failure remains recorded and is not converted to PASS by the rebuild alone.

## Recorded physical runs

- **2026-10-09 — Native Android APK login:** **FAIL** on the original RC1 artifact. The tester reported “Unable to continue.” Device model and Android version were not reported. Root cause: the compile-validation APK contained `staging-build-placeholder` rather than the staging project’s public API key.
