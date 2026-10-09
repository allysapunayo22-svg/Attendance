# ClickIn final QA and production readiness

> **2026-10-09 release-candidate update:** Web password recovery routes, the v4 PWA transition, explicit native identifiers, and staging Android artifacts are now complete. The authoritative current status is [final-release-candidate.md](final-release-candidate.md). Physical hardware, signed iOS, hosted callback, store ownership, and production-signing gates remain open.

> **2026-10-09 dependency-remediation update:** The approved Next/React/jsPDF/SheetJS work is complete and passed a 38/38 hosted staging browser matrix. The current dependency, test, cleanup, and blocker classification is in [dependency-remediation-report.md](dependency-remediation-report.md). Production remains blocked; no production deployment or backend change occurred.

Date: 2026-10-06. Decision: **NOT READY FOR PRODUCTION**.

> **2026-10-07 remediation update:** The approved offline ownership, session-expiry, retry scheduling, orphan-reporting, and Mobile lint-tooling corrections are complete. The formerly failing offline probes now pass 3/3 and Mobile lint exits with no errors. Production remains blocked by the gates recorded in the [targeted remediation report](targeted-remediation-report.md). The remainder of this document preserves the original Final QA evidence and findings for audit history.

> **2026-10-07 staging release-validation update:** The subsequent authenticated two-tab browser matrix passed 32/32 checks and closed the earlier automated account/session/multi-tab gaps. The cache/IndexedDB worker transition passed, but a genuine two-build deployed-PWA transition and physical hardware remain outstanding. See the [final blocker analysis](final-blocker-analysis.md) for the current release decision.

Production rollout is **not safe to authorize yet**. Final QA found recoverable-data loss and account-isolation gaps in offline synchronization, unresolved dependency advisories, unproven multi-tab/release-transition behavior, and outstanding physical-device acceptance. Existing passing tests do not cover these failures sufficiently.

## Scope and safety

Remote application testing used only staging **`tosfspsjervmgrpncnsw`**. Credential inputs were checked for project identity and 0600 permissions; Node test requests were restricted to that staging origin and the local web server. The production project was not connected to, queried, modified or deployed. The local build explicitly overrode ambient `.env.local` with guarded staging configuration; generated JS contained zero occurrences of the forbidden production ref. No Supabase migrations or Edge Functions were deployed during final QA.

Migrations 001–013 and 128 files under `apps/mobile` matched their start-of-QA hashes. Mobile lint generated a new ESLint config automatically; that generated file was removed, preserving the existing mobile source. No historical production diagnostics were executed or rows repaired; no 010 constraint was validated. Existing synthetic staging schedules/attendance/reviews were exercised by the approved regression harness. The old synthetic device ID had been replaced during earlier browser tests; the harness was adapted to resolve the **existing current active device**, without reactivating old devices.

Changes made during QA: compatible dependency resolutions in `package-lock.json`, this `docs/qa` evidence/planning bundle and isolated failure probes. No new application feature, auth flow, backend migration, Storage policy or retention job was implemented. Earlier phase changes already present in the working tree were preserved. TypeScript also regenerates the already-modified admin `tsconfig.tsbuildinfo` build artifact.

## Dependency/security review

[Complete package-by-package and advisory-by-advisory review](dependency-advisories.md) includes installed versions, direct/transitive status, vulnerable ranges, severity, runtime exposure, app-specific exploitability, remediation and regression requirements.

The fresh npm audit supersedes the old 19-advisory count: **45 affected packages initially → 39 afterward**; remaining totals are **2 critical, 23 high, 14 moderate**. These are affected-package counts, not unique vulnerabilities. Critical findings include installed Next.js 14.2.35 and jsPDF 2.5.2. Next's public App Router/image surface needs a supported patched-major review. Current PDF/Excel use is export-only, reducing applicability of several specific advisories without justifying a blanket security waiver. SheetJS has no npm-distributed fix reported. Expo/Metro build-tool findings and mobile URL parser exposure are separated in the advisory report.

Applied individually within existing dependency ranges: source-map-js 1.2.2, baseline-browser-mapping 2.11.27, browserslist 4.29.3, brace-expansion 5.0.12/2.1.7, compression 1.8.2 and xmldom 0.9.12, plus Browserslist data dependencies. Regression checks ran after each update. No manifest, major version, forced audit fix or suggested Expo downgrade was applied. Shared lockfile changes can affect native build tooling; native build/hardware validation remains necessary.

## Automated validation results

| Check | Result | Evidence / qualification |
|---|---|---|
| Admin + Student Web suite (Phases 1/2A/2B/2C) | PASS | 10 test files, 0 failures; workflow, geolocation, media, device, IndexedDB, sync, PWA and RBAC coverage |
| Mobile authentication suite | PASS | 1 test file, 0 failures |
| Edge contracts/security validation | PASS | 4 test files, 0 failures; Node validation contracts, not a full Deno dependency audit |
| SQL migration/security suites | PASS | 8 rollback-only suites: 008, 009, 010, 011 review, 011 hosted Storage ownership, 012, 013 and Phase 2A access |
| Local migration chain | PASS | Unchanged 001–013 loaded in isolated PostgreSQL 18.6/PostGIS with Supabase auth/Storage mocks; not a claim of PostgreSQL-version parity with hosting |
| Admin TypeScript | PASS | `npm run typecheck` after dependency updates |
| Mobile TypeScript | PASS | Same workspace command |
| Admin production build | PASS | Next.js optimized build with guarded staging configuration; no deployment |
| Admin lint | PASS with warnings | 7 existing React Hook warnings; no errors |
| Mobile lint | FAIL / pre-existing toolchain problem | Expo auto-configures then `ERR_PACKAGE_PATH_NOT_EXPORTED`: `eslint/config` resolves to the root ESLint 8 package while Expo uses ESLint 9. No native tooling refactor performed |
| Hosted role/route regression | PASS | 21/21, including admin/super-admin/student/anonymous/inactive handling |
| Hosted full backend matrix | 128 PASS / 4 initial failed assertions | See retest analysis below; raw results preserved, not relabeled as a perfect run |
| Targeted hosted retests | PASS | 10/10, including 2 logins, fresh-key event-state tests, freshness margins and review/audit deltas |
| Headless browser smoke | 20 PASS / 1 initially inconclusive offline probe | Chrome 151.0.7922.173. Student/Admin login, page rendering, student logout, cache inventory. Corrected origin-down test and admin-dropdown logout also passed |
| New offline acceptance probes | **FAIL: 3/3 requirements** | Reproducible sync-core boundary failures; see below |
| `git diff --check` | PASS | No whitespace errors |
| Secret/Git scan | PASS within scope | Tracked + nonignored files scanned for known staging passwords/keys and high-confidence token/private-key/credential URI patterns; no matches. This is not a complete Git-history or entropy audit |
| Protected-source hash verification | PASS | 13 migrations and 128 mobile files unchanged during QA |
| Fresh dependency audit | **FAIL / unresolved advisories** | 39 affected packages remain; see advisory review |

The first isolated SQL run exposed a missing Supabase-default table grant in the mock harness at migration 013. Adding those normal grants **only in the local test database**, without altering migrations or function grants, allowed all eight suites to pass. Both 010 constraints remain NOT VALID; tests roll back their fixtures. Exact two-hour/five-minute freshness boundaries, null/malformed timestamps and online/offline equivalence are tested using the same transaction clock in SQL, independently of event eligibility.

Existing unit files include source-text assertions and mock dependencies. Their passing result is not equivalent to physical camera/GPS coverage, actual multi-tab cancellation, a cold offline capture, or end-to-end UI action coverage.

## Hosted backend matrix and retest analysis

The detailed, sanitized checklist is retained in [hosted-validation-summary.json](hosted-validation-summary.json).

| Area | Initial pass / failed assertions |
|---|---:|
| Auth / RBAC | 12 / 0 |
| PostgREST grants | 9 / 0 |
| Legacy RPC lockdown | 15 / 0 |
| Audit security | 3 / 0 |
| Restricted / unrestricted attendance | 4 / 0 |
| Inactive account submission | 1 / 0 |
| Draft / deleted event attendance | 0 / 2 |
| Device ownership | 2 / 0 |
| Request validation | 3 / 0 |
| Freshness | 7 / 1 |
| GPS / geofence | 7 / 0 |
| Attendance state machine | 7 / 0 |
| Idempotency | 5 / 0 |
| QR | 16 / 0 |
| Storage / evidence | 14 / 0 |
| Admin review | 10 / 1 |
| Student visibility / RLS | 8 / 0 |
| Admin data regression | 3 / 0 |
| Historical-shape diagnostics | 1 / 0 |
| Edge runtime | 1 / 0 |

- Draft/deleted submissions were safely rejected, but the reused keys hit a previous idempotency binding before the expected event-state reason. Fresh-key targeted retests returned the intended event-specific rejections. No idempotency rows were manually repaired to hide the result.
- The reject-review assertion expected one total review/audit despite previous synthetic review corrections. It observed trusted rejection with 2 reviews/3 audits. A targeted retest verified **one new review and one new audit**, followed by an identical replay producing neither. Historical synthetic reviews were preserved.
- A hosted “5 minutes + 1 second” case was accepted. Its timestamp was derived from a whole-second HTTP Date header before transit, so it does **not** establish a +301-second offset against the RPC's captured clock. This exact hosted-boundary assertion is inconclusive. Both flags rejected stale/future inputs with a 30-second margin in followup; SQL same-clock tests prove the exact inclusive/exclusive boundaries. Do not describe the margin test as exact hosted-boundary proof.

All six staging historical-shape counts were **0**: timeout-before-timein, completed timestamp incoherence, exact duplicate evidence, nonhashed/plaintext-shaped QR values, duplicate idempotency rows and rows violating the 010 assumptions. These counts describe synthetic staging, **not production**.

Hosted Edge results: submit 49 successful HTTP responses / 7 controlled HTTP failures / 0 unexpected 5xx; review 6 / 5 / 0; generate-QR 3 / 5 / 0. HTTP 200 may contain an authoritative business rejection; it is not counted as accepted attendance merely because transport succeeded. No new hosted-only runtime incompatibility was established.

## Web regression coverage and limits

Student browser login, dashboard, event list/detail, announcements, notifications, profile, history and logout rendered successfully. Admin browser login, dashboard, events/new-event form, live attendance, review queue, students, announcements, reports, profile and top-right dropdown logout passed render/navigation smoke checks. The 21 HTTP route tests additionally verified both student accounts, active admin/super-admin, inactive accounts and anonymous redirects.

Backend/API tests cover check-in/out, QR generation/requirements, required photos, review, evidence permissions, state transitions and audit. They do **not** prove every interactive admin form, evidence modal, browser attendance detail, PDF/Excel export or every mutation through the UI. Real optical QR, GPS, camera, offline capture after force-close, replaced-browser UI and multi-tab logout/account-switch acceptance remain **NOT TESTED on hardware**. The approved prior Phase 2B/2C reports were not silently counted as fresh execution of those workflows. Close these coverage gaps on the remediated candidate before rollout.

## Offline queue findings — release blockers

Run `node --experimental-strip-types docs/qa/offline-readiness-probes.mjs`. It exits nonzero because all three required safety properties currently fail. These probes use synthetic in-memory dependencies; they demonstrate missing boundaries, **not an exploited hosted account**.

1. **Owner changes can cross an asynchronous sync boundary.** `lib/student/offline/sync.ts` checks the session once, captures a generation, and checks cancellation only between records. `processOfflineRecord` does not validate `record.ownerId === ownerId`; it awaits fingerprint/device/upload work and submits through the shared Supabase client without a final owner/cancellation check. A mismatched-owner core invocation still submits; a simulated identity change during upload still proceeds to submission. The coordinator's auth listener refreshes state without cancelling an in-flight record. Server authorization still protects the currently authenticated account, but cannot establish whose earlier browser capture the client intended to use. Bind capture/queue/transport to a stable owner, check cancellation after awaits, and prove cross-tab/session-switch behavior before release.
2. **Session expiry discards recoverable evidence.** `AttendanceTransportError(..., false)` on expired auth becomes `state=rejected` and clears the Blob without an authoritative attendance rejection. The queue then labels it “Rejected by server.” The acceptance probe reproduces this. Auth recovery must pause the attempt, preserve evidence/identity and resume only for the same authenticated owner; terminal server rejection must remain distinct.
3. **Backoff is stored but not scheduled.** The coordinator listens for mount, reconnect, foreground and manual sync. Queue-change events refresh display only; no timer wakes at `nextAttemptAt`. A transient failure can remain pending indefinitely while the page stays online/foreground. Retry cap 6 and bounded backoff calculations exist, but do not constitute an automatic retry scheduler.
4. **Single-flight is per JavaScript context.** `activeSync` only deduplicates calls inside one module instance. Two tabs can process a record concurrently. The existing helper test exercises `createSingleFlightSync`, not the actual orchestration, and does not prove cross-tab exclusion. Backend idempotency is valuable but does not prevent upload/auth/cleanup races. Define a cross-tab claim/lock and crash recovery before certification.
5. **Stale mounted content and broad local cache.** `OfflineStudentApp` loads its owner/event only once and has no auth-change reset; the queue view also does not subscribe to auth changes. Event/attendance cache fetchers fall back on **any** error, not only connectivity errors. Attendance caching stores `select('*')` data, including locations, evidence paths and other fields beyond minimal offline display. Pending QR material is needed for replay, but terminal records retain full payloads with no expiry/pruning policy. Minimize cache fields, distinguish authorization from connectivity failure, clear/reset visible state on identity changes, and define terminal/local retention. IndexedDB owner indexes are application-level partitioning, not encryption against same-origin scripts or device access.

Positive findings: queue IDs include owner/local ID; normal IndexedDB getters filter by owner; Blobs survive serialization in tests; stable logical/idempotency IDs are reused; inactive/replaced devices block before submission; server freshness/event rules remain authoritative; accepted and controlled-rejected paths clear local Blobs. Logout prompts when records are pending and preserves the queue. These properties do not remedy the race and session-loss failures above.

## PWA / cache review

Current shell cache is `clickin-student-shell-v2`; activation deletes older `clickin-student-shell-*` caches. Browser inventory showed **33** generic shell/static entries. SW caches `/offline`, manifest/icons/logo and `/_next/static/*`; authenticated navigation is network-only and is not added to Cache Storage. Cross-origin Supabase, attendance APIs, evidence and non-GET requests are not cached by this worker. No tokens or user HTML were found in the inspected cache inventory. Supabase auth session persistence is separate from SW caching.

An initial DevTools offline probe was inconclusive: target emulation did not consistently make the reloaded document offline, and a case-sensitive “Saved event data” assertion misses the rendered uppercase heading. Followup **stopped the local Next server and blocked Supabase requests**; the cached event shell rendered its saved event and attendance boundary. Thus origin-down shell fallback is demonstrated; complete offline capture/sync across PWA closure and OS storage lifecycle is not.

The outage UI can display both the shell's “Offline” header and coordinator's “Online” based on `navigator.onLine`; connectivity is not equivalent to API reachability. Global root scope also falls back to the student shell on `/admin` or `/login` navigation failure. Most importantly, automatic `skipWaiting`/`clients.claim` with immediate old-cache deletion has not been validated against open old documents, lazy chunks and an actual new release. Cache-version bump process and a proposed build-ID/update handshake are documented in the rollout plan; no automatic versioning change was introduced.

## Orphan evidence — confirmed defect and approval boundary

Migration policies do not grant student Storage DELETE. A fresh synthetic staging object was uploaded, student `.remove()` returned **no error and an empty result**, and privileged read confirmed the object still existed. `sync.ts` currently returns `!error` from removal, so it would falsely mark cleanup successful. The synthetic test object was removed using staging service credentials afterward; no accepted evidence was deleted.

Server orphans can arise after upload followed by stale/invalid rejection, expiry, interrupted submission, abandonment or local-data loss. They are private, but privacy/cost/retention remains unresolved. **Do not broaden student DELETE permissions.** Before general production rollout, approve the bounded, privileged, dry-run-first retention design in the [rollout plan](production-rollout-plan.md#orphan-evidence-smallest-proposed-preproduction-design), including reference checks, safe grace period and race handling. No cleanup job or new backend migration was implemented; this honors the requested stop/propose boundary.

## Physical and production readiness gates

| Gate | Status |
|---|---|
| Physical iPhone / Safari / installed PWA | NOT TESTED |
| Physical Android / Chrome / installed PWA | NOT TESTED |
| Real GPS / accuracy / permission handling | NOT TESTED |
| Front camera / retake / real optical QR | NOT TESTED |
| App termination, offline reopen, reconnect and account switching on hardware | NOT TESTED |
| Production data compatibility | UNKNOWN — production not queried |
| Production Vercel root/env/domain settings | UNVERIFIED — production not accessed |
| Production backup/restore checkpoint and compatible rollback artifacts | PLANNED, not taken or validated |
| Web auth callback / password reset | Routes absent; password-only login works. Do not configure nonexistent recovery URLs as working endpoints |

Use [the full physical checklist](physical-device-acceptance.md), recording model, OS/browser version and actual PASS/FAIL evidence. Use [the rollout/rollback plan](production-rollout-plan.md) for migration order 008–013, hosted 011/012 compatibility, grants/RLS/Storage checks, exact Edge bundle, Vercel monorepo configuration, conditional domain/Auth URLs and rollback limits. The exact [read-only production diagnostics](production-readonly-diagnostics.sql) are prepared **but not executed**.

## Required next decisions

Authorize a bounded remediation task for offline owner/session isolation, auth-expiry preservation, retry scheduling, reliable orphan reporting and cache/account-change handling; then rerun the failure probes and cross-tab browser tests. Separately review the supported Next.js upgrade and export-library remediation, approve a retention policy/design and complete real-device/release-transition acceptance. Repair the native lint toolchain without changing mobile behavior in its own reviewed scope. Confirm domain/root/Auth recovery requirements before production configuration.

Final QA stops here. **No production rollout, new backend migration, retention process or new application phase has started.**
