# Final blocker analysis and staging release validation

> **2026-10-09 dependency-remediation update:** The four approved Admin dependency blockers are closed: Next.js 16.4.0, React/React DOM 19.2.3, jsPDF 4.2.1, and removal of `xlsx`. Admin tests/typecheck/lint and the Next 16 production build pass; the final staging browser run passed 38/38 and temporary fixtures were removed. Production remains blocked by orphan retention, a genuine two-build PWA transition, physical-device acceptance, remaining Mobile/Expo toolchain advisories, and the documented absent Web recovery route. See [dependency-remediation-report.md](dependency-remediation-report.md).

Date: 2026-10-07. Decision: **NOT READY FOR PRODUCTION**.

This validation used only Supabase staging project `tosfspsjervmgrpncnsw`. The local production build was compiled with that staging project's public configuration and exercised against hosted staging authentication, database, Edge, and Storage services in isolated headless Chrome 151. The production project was not connected to, read, modified, or deployed. No migration, Edge Function, Storage policy, major dependency, retention process, or production configuration was changed.

The six existing synthetic staging identities were reused. Their local credential and API maps remained under `/tmp` with mode `0600`; no account was duplicated and no credential or token was printed or added to Git. The browser run used one temporary event, one temporary browser-device registration, and temporary evidence objects. Cleanup removed and verified absence of the event, device, and all 14 evidence objects created across the diagnostic and final runs.

## Authenticated hosted-browser regression

The final run passed **32/32** assertions.

| Area | Result | Evidence |
|---|---|---|
| Authentication and owner partition | PASS | Student A authenticated into `/student`; Student B could not see or process Student A's queue; Student A recovered the same partition after logging back in. |
| Session expiry | PASS | A forced authenticated-user 401 caused zero attendance submissions, moved the record to `authentication_required`, and retained the Blob and idempotency key. The same owner resumed and completed the same record after auth recovery. |
| Two-tab exclusion | PASS | Two tabs raced one logical item. Web Locks permitted exactly one submit and one evidence upload. |
| Retry/backoff | PASS | One transient 503 was followed by one scheduled retry; the evidence uploaded once and both attempts used the original idempotency key. |
| Retry cap/manual retry | PASS | Six automatic attempts prevented further automatic submission; manual retry submitted once and completed. |
| Terminal rejection/orphan state | PASS | A controlled terminal rejection submitted once, did not claim a zero-object Storage removal as success, persisted `evidenceOrphaned=true`, and retained the exact owner/event/local-item path. |
| Logout during active submission | PASS | Logging out from the second tab while a delayed submit was in flight changed the original record to `authentication_required`; its Blob and idempotency key remained intact. |
| Account switch during async work | PASS | Student B could neither see nor resubmit Student A's active/paused record. Only the original request was observed. |
| Closed/reopened tab | PASS | A new tab under Student A recovered the same owner-scoped record and idempotency key from IndexedDB. |

These checks use real hosted staging auth/device/Storage services. Submit responses were deliberately intercepted for deterministic timeout, transient, accepted, and rejected outcomes; authoritative backend security remains covered by the previously approved 128-case hosted matrix. No result here is a physical-device claim.

## Service-worker transition

The cache/queue portion passed:

- A seeded `clickin-student-shell-v1` cache was removed when `clickin-student-shell-v2` activated.
- The existing owner-scoped IndexedDB item and idempotency key survived worker replacement.
- Cache Storage contained only the offline shell, manifest/icons, CSS, and versioned Next static chunks. It contained zero `/student`, `/admin`, `/login`, or Supabase responses.
- Activation caused one navigation entry, with no reload loop.
- The existing queue remained readable by the new coordinator.

Classification: **PARTIAL RELEASE-TRANSITION PASS**. This was an old-cache/new-worker simulation over one compiled frontend build. It did not load two genuinely different deployed JS builds, keep an old installed PWA open across a deployment, or prove a mixed old-document/new-chunk transition. Current `skipWaiting()` plus `clients.claim()` can still replace the worker beneath an old document. A two-build staging deployment test and the physical installed-PWA cases remain release gates. No stale authenticated HTML/API response was cached, and no stale cache item submitted attendance during this test.

## Dependency blocker analysis

The 2026-10-07 audit reports 40 affected packages: 14 moderate, 23 high, and 3 critical. No `audit fix --force`, major update, or package replacement was performed.

### Next.js 14.2.35

Classification: **BLOCKING SECURITY ISSUE — REQUIRES CONTROLLED UPGRADE**.

The public application uses the App Router, server components, middleware, server-side auth cookies, and `next/image`. It also allows every HTTPS host through `images.remotePatterns`, which broadens the image-optimizer surface. The exact 23 Next advisories and affected ranges are listed in [dependency-advisories.md](dependency-advisories.md#next). The latest critical image advisory, [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), is patched in 15.5.24 and 16.3.3, but the current complete npm tree still recommends **Next 16.4.0** because the installed Next dependency chain also includes vulnerable PostCSS. Therefore 15.5.24 alone is not the recommended release target.

Repository-specific breaking work for an exact Next 16.4.0 target:

- Move Admin Web from React/React DOM 18.3.1 to a compatible React 19 line and update React type packages together.
- Convert synchronous `cookies()` in `lib/auth/server.ts` and synchronous `params` in the three dynamic pages to async request APIs.
- Review the `middleware.ts` to `proxy.ts` migration and rerun every role redirect and cookie-refresh case. The current middleware performs Supabase auth refresh and cannot be mechanically renamed without testing runtime/cookie behavior.
- Replace `next lint` with the ESLint CLI/flat configuration and align `eslint-config-next` with Next 16.
- Review or remove `experimental.webpackBuildWorker`; Next 16 defaults to Turbopack, so perform an initial compatibility build with an explicit bundler choice.
- Replace the wildcard image host with the exact Supabase project/storage host and any explicitly required image hosts.
- Revalidate Server Component caching, middleware redirects, RBAC layouts, PWA chunk precaching, worker release behavior, login/logout, and both `/admin/*` and `/student/*` navigation.

Safest sequence: create an isolated upgrade branch, pin exact versions rather than `latest`, run the official codemods in dry-run/review mode, make the async auth/route changes manually where needed, then run installation-tree checks, typecheck, lint, tests, production build, hosted browser RBAC/offline regression, and a real two-build service-worker transition. Do not combine this with export-library changes.

### jsPDF 2.5.2

Classification: **BLOCKING SECURITY ISSUE — REQUIRES CONTROLLED UPGRADE**.

`apps/admin-web/lib/export.ts` imports jsPDF into the administrator browser bundle. PDF generation is client-side and is reachable only from the Admin Reports export menu. Current code calls `new jsPDF()`, `setFontSize`, `text`, and `save`; it does not call `html`, `output(...newwindow)`, `addJS`, AcroForm, image decoders, or Node filesystem APIs. That substantially lowers demonstrated exploitability of the specific vulnerable paths, but the direct dependency still carries critical/high advisories.

The exact 12 jsPDF advisories are listed in [dependency-advisories.md](dependency-advisories.md#jspdf). The newest critical item, [GHSA-wfv2-pwc8-crg5](https://github.com/advisories/GHSA-wfv2-pwc8-crg5), affects versions through 4.2.0 and is fixed in **4.2.1**. The project releases describe v3 as dropping Internet Explorer, v4 as restricting Node filesystem access, and no other intended breaking changes; the current browser-only text/save path should need little or no source change, but that must be proven.

Upgrade in a separate change to exact jsPDF 4.2.1 or newer reviewed version. Test empty, one-row, 35-row, and over-35-row reports; long Unicode and delimiter-containing fields; filename handling; Safari/Chrome download behavior; PDF opening; CSP; bundle size; TypeScript; and Admin Reports UI. Keep all unneeded HTML/image/form/addJS APIs unused.

### xlsx 0.18.5

Classification: **REPLACE PACKAGE**. The Excel export is useful but is not attendance, authentication, review, or audit critical.

The only import is `apps/admin-web/lib/export.ts`. It runs in the administrator browser and only creates a workbook with `book_new`, `json_to_sheet`, `book_append_sheet`, and `writeFile`; no workbook import/parser exists. [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) affects versions below 0.19.3 but states export-only workflows are unaffected. [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) affects versions below 0.20.2. Neither has a patched npm release, because the npm `xlsx` distribution remains at 0.18.5.

The safest repository-compatible option is to remove the Excel menu item, `downloadExcel`, and `xlsx`, retaining the already implemented CSV export. If native XLSX output is a firm product requirement, evaluate a maintained browser writer such as ExcelJS in an isolated replacement change, audit its entire tree, and test typed values, dates, Unicode, large reports, memory, download behavior, and spreadsheet formula injection. Do not switch to an unreviewed CDN/vendor tarball. CSV and any replacement writer must neutralize cells beginning with `=`, `+`, `-`, or `@` when values can originate from users.

### React 18/19 and peer conflicts

Classification: **REQUIRES CONTROLLED UPGRADE** for the Next work; current optional/missing peer output is partly **DEV/TOOLING TREE NOISE**, with a real native-build risk that remains unproven.

Admin Web intentionally installs React/React DOM 18.3.1 and passes typecheck/build. Mobile intentionally declares React/React DOM 19.2.3 with React Native 0.86.3. The shared npm workspace hoists React 18 and `@types/react` 18 at the root, while React Native declares React 19.2.3 and React types 19 peers. `npm ls --all` therefore exits nonzero. It also reports missing peer placement for `@react-native/metro-config`, `react-native-gesture-handler`, and `react-native-reanimated`, even though Mobile declares reanimated in its own workspace.

There is no demonstrated Admin Web runtime failure: Admin tests, types, lint, build, and the 32 browser assertions pass. There is a credible Mobile native-resolution risk until a real native install/build runs. Do not use `--force`, `--legacy-peer-deps`, or global overrides to hide it. During the Next 16 migration, align Admin to the required React 19 line, keep Mobile on its Expo-supported versions, remove obsolete root overrides only after inspecting the resolved workspace tree, then run Admin and native Metro/iOS/Android builds plus hardware tests.

## Proposed orphan-evidence retention mechanism

Do not grant students Storage DELETE. Implement a scheduled, server-authoritative cleanup only after separate approval:

1. Add an append-only cleanup-run/item audit schema in a new migration. Public clients receive no write/execute grant; active admins may receive read-only visibility if required.
2. Invoke a dedicated Edge Function from a scheduled internal job with a stored server secret. The endpoint accepts only `dry_run` and a bounded batch limit; it never accepts bucket names or object paths from callers.
3. Enumerate at most 100 oldest objects from the private `attendance-evidence` bucket. Reject every name that does not exactly match the authoritative `auth-user-id/event-id/local-id.jpg` path shape.
4. Require object age of at least **24 hours**. This is well beyond the two-hour attendance freshness window plus five-minute clock skew and retry margin, so an abandoned capture can no longer become valid attendance.
5. Resolve the path owner to the expected student and event. Exclude any path referenced by `attendance_sessions.time_in_photo_path`, `attendance_sessions.time_out_photo_path`, or `attendance_evidence.storage_path`. Exclude protected/legal-hold records if such policy is added later.
6. Recheck age, path shape, ownership, and all references immediately before deletion. Delete only through the Storage API with the service role, in a bounded batch. Never delete directly from `storage.objects`.
7. Default to dry-run. Log the run ID, candidate/object identifiers, reason, object age, reference-check result, outcome, and error without storing image bodies or credentials. Retries must be idempotent.
8. Alert on repeated failures or unexpected candidate growth. Accepted-evidence retention based on `photo_retention_days` remains a separate policy and must not share this orphan job.

This design makes orphan status objective from trusted server facts: correct bucket/path/owner, older than the maximum useful retry period, and absent from every canonical evidence reference. The client-provided `evidenceOrphaned` flag is not trusted as deletion authority.

## Remaining physical-device acceptance

No hardware result changed. Every row in [physical-device-acceptance.md](physical-device-acceptance.md) remains **NOT TESTED**.

- iPhone/Safari and installed iOS PWA: installation/standalone launch, real GPS and denial/accuracy cases, front-camera selfie, optical QR, check-in/out, offline capture, force-close/reopen, reconnect sync, device replacement, logout/account switching, and real two-release update.
- Android/Chrome and installed Android PWA: installation/standalone launch, real GPS, camera, optical QR, check-in/out, offline persistence across app close, reconnect sync, device replacement, account switching, and real two-release update.

## Exact production blockers and remediation order

1. Upgrade Next.js/React/eslint in a controlled branch, narrow image hosts, and pass the entire web/PWA/RBAC matrix.
2. Upgrade jsPDF to 4.2.1+ and pass focused PDF/Admin Reports regression.
3. Remove `xlsx` and use CSV, or approve and validate a maintained XLSX writer.
4. Approve and implement the privileged orphan-evidence retention job, including dry-run and audit review.
5. Deploy a new frontend candidate to staging only and run an actual two-build service-worker transition with an old open tab and installed PWA.
6. Complete every iPhone/Safari and Android/Chrome hardware row with recorded evidence.
7. Repeat the final dependency audit, clean install/tree check, tests, typecheck, lint, production build, hosted browser matrix, and fixture cleanup on the immutable candidate.
8. Only then authorize separate production read-only diagnostics, backup/restore checkpoint verification, deployment review, and rollout approval.

Updated readiness: **staging browser remediation accepted; release transition partially validated; production remains blocked**. The frontend queue/account defects from the prior report are closed by automated staging browser evidence. Dependency remediation, privileged orphan retention, a true two-build staging transition, and physical-device acceptance remain mandatory release gates.
