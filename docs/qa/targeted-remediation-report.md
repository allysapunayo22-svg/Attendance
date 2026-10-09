# Targeted final QA remediation

Date: 2026-10-07. Final classification: **NOT READY FOR PRODUCTION**.

> **Authenticated staging follow-up:** The credentials were subsequently restored and the approved two-tab browser matrix passed 32/32 checks. Cache/IndexedDB worker replacement passed, while a true two-build deployed-PWA transition remains outstanding. See the [final blocker analysis](final-blocker-analysis.md).

This remediation addressed the approved offline ownership, expired-session, retry, orphan-reporting, and Mobile lint-tooling defects. It did not deploy or connect to production, change any migration, Edge Function, Storage policy, or Mobile runtime source, or begin another migration phase. The locally linked project ref remained the approved staging ref `tosfspsjervmgrpncnsw`; the forbidden production ref was absent from the completed web build.

## Remediated behavior

- **Account isolation:** a queue record must match the requested owner and its owner-scoped ID. Event, attendance, queue, and visible offline state reset on auth changes. Async results are discarded when the owner changes. Sync rechecks the trusted authenticated user after device, fingerprint, and evidence work and immediately before submission. Logout cancels active requests. A Web Locks owner lock prevents a second tab from processing the same owner's queue concurrently.
- **Session expiry:** missing, expired, or replaced auth moves the record to `authentication_required`. Its Blob, logical ID, capture timestamp, idempotency key, and persisted evidence path remain available. A later manual sync by the same authenticated owner resumes the same record; another owner cannot process it.
- **Retries:** automatic retries use the existing bounded exponential backoff, now have a foreground timer, and stop after six attempts. Manual retry remains available after the cap. Terminal server rejections are final. A remotely persisted evidence path is reused instead of uploading the Blob again.
- **Orphan evidence:** staging validation had already established that students lack Storage DELETE and an error-free removal can return an empty result without deleting anything. The client now treats cleanup as successful only when Storage reports exactly one removed object and otherwise retains `evidenceOrphaned=true`. Storage/RLS was not broadened. The smallest safe privileged retention design remains documented in [the rollout plan](production-rollout-plan.md#orphan-evidence-smallest-proposed-preproduction-design) and still requires separate approval.
- **Mobile lint:** an Expo flat ESLint configuration and compatible workspace ESLint layout were added. `expo lint` now exits successfully with 0 errors and 19 warnings. No Mobile runtime file changed.

## Files changed by this remediation

- Offline ownership and sync: `apps/admin-web/lib/student/offline/{db,sync,sync-core,types}.ts`
- Attendance transport and capture ownership: `apps/admin-web/lib/student/attendance/workflow.ts`, `apps/admin-web/components/student/attendance/AttendanceWorkflow.tsx`
- Auth-aware cached data and PWA state: `apps/admin-web/lib/student/data.ts`, `apps/admin-web/components/student/pwa/{StudentPwaCoordinator,OfflineAttendanceQueue,OfflineStudentApp}.tsx`
- Regression coverage: `apps/admin-web/tests/{offline-sync,offline-indexeddb}.test.mjs`, `docs/qa/offline-readiness-probes.mjs`
- Mobile tooling only: `apps/mobile/eslint.config.js`, root `package.json`, `package-lock.json`
- QA evidence: this report and short addenda in the source reports

No file under `supabase/migrations`, `supabase/functions`, or Mobile runtime source was modified by this remediation.

## Regression evidence

| Check | Result |
|---|---|
| Exact offline readiness probes | PASS, 3/3 |
| Admin + Student Web suites (Phases 1/2A/2B/2C) | PASS, 10 suites |
| Mobile auth suite | PASS, 1 suite |
| Edge contract/security suites | PASS, 4 suites |
| Fresh local migration chain 001–013 | PASS |
| SQL migration/security suites | PASS, 8 rollback-only suites |
| Admin + Mobile TypeScript | PASS |
| Admin lint | PASS with 7 existing warnings |
| Mobile lint | PASS with 19 warnings, 0 errors |
| Admin production build | PASS using the approved staging URL and a non-secret build placeholder |
| `git diff --check` | PASS |
| Focused secret scan | PASS; no matching credentials/private keys found |
| Build project-ref scan | PASS; staging ref present, production ref absent |

The disposable SQL harness needed Supabase's normal API table/sequence grants after loading migrations. Those grants were added only to the local mock database. Migrations were not changed. The first harness attempt also used the local OS role rather than the expected `postgres` database owner; the harness was recreated correctly before the recorded passing run.

The completed build was not deployed. A read-only request to `https://tosfspsjervmgrpncnsw.supabase.co/rest/v1/` returned the expected unauthenticated 401 and confirmed staging connectivity. The ephemeral `/tmp/attendance-staging-test-accounts.json` and `/tmp/attendance-staging-api-keys.json` files were unavailable in this execution environment, so no new authenticated hosted browser matrix was run. The previously approved staging backend matrix remains the hosted baseline; no backend or database code changed in this remediation.

## Dependency result

No safe patch/minor update exists for the production-relevant blockers identified in the source review: Next.js 14.2.35 requires a supported major upgrade, jsPDF 2.5.2 remediation requires a major upgrade, and npm reports no fix for xlsx 0.18.5. None was changed.

The 2026-10-07 audit reports 40 affected packages overall (14 moderate, 23 high, 3 critical) and 32 with `--omit=dev` (12 moderate, 17 high, 3 critical). The additional critical report is `shell-quote` through React Native's `react-devtools-core` chain; it was already locked at 1.10.0 before this remediation and is not used by the Admin web runtime. No forced or breaking audit fix was applied.

`npm ls --all` remains nonzero because the shared workspace has existing React 18/19 peer-resolution conflicts and missing optional/native peers reported by Expo packages. Admin/Mobile TypeScript, both linters, and the Admin build pass, but this dependency-tree result must be rechecked as part of the native build and physical-device gate.

## Remaining release gates

- The privileged orphan-evidence retention mechanism is designed but not approved or implemented.
- Next.js, jsPDF, and xlsx production advisories require separately reviewed major/replacement work.
- Actual multi-tab/account-switch and service-worker release-transition acceptance still needs a deployed staging candidate.
- A real iPhone/Safari and a real Android/Chrome were unavailable. Every hardware row in [the physical acceptance checklist](physical-device-acceptance.md) remains **NOT TESTED**, including real GPS, front camera, optical QR, offline close/reopen, reconnect sync, device replacement, and account switching.

Production rollout remains blocked. No production deployment or production Supabase access occurred.
