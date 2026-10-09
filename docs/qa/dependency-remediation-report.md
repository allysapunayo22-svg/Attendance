# Dependency remediation report

Date: 2026-10-09. Targeted dependency remediation: **COMPLETE**. Production rollout: **BLOCKED**.

This work used the repository locally and Supabase staging project `tosfspsjervmgrpncnsw`. The production project `aeffervvqtejdmlmaoga` was not connected to, read, modified, or deployed. No Supabase migration, Edge Function, Storage policy, production setting, orphan-retention process, or Mobile runtime behavior was changed.

## Version changes

| Package | Before | After | Result |
|---|---:|---:|---|
| Next.js | 14.2.35 | 16.4.0 | Exact supported target; optimized build passes with the supported webpack build flag. |
| React / React DOM (Web) | 18.3.1 | 19.2.3 | Aligned with Next 16 and the existing Mobile declarations. One deduplicated Web React runtime. |
| React Leaflet | 4.2.1 | 5.0.0 | Required peer-compatible release for React 19. |
| jsPDF | 2.5.2 | 4.2.1 | Existing browser text/save flow preserved and covered by a representative generated-PDF test. |
| `xlsx` | 0.18.5 | removed | Excel-only code/menu removed. CSV and PDF remain available with the same report filters/data. |
| ESLint / `eslint-config-next` (Web) | ESLint 8 / Next 14 config | ESLint 9.39.5 / Next 16.4.0 config | Next 16 flat-config/CLI workflow; Admin lint has zero warnings and zero errors. |

The lockfile was regenerated without `--force`, `--legacy-peer-deps`, or `npm audit fix --force`. A clean `npm ci` completed successfully.

## Next.js 16 compatibility work

- Converted server cookie access and dynamic route parameters to the asynchronous Next 16 request APIs.
- Migrated `middleware.ts` to `proxy.ts` while preserving Supabase cookie refresh and unauthenticated route redirects.
- Kept all existing `/admin/*`, `/student/*`, `/login`, and `/offline` routes and server-side role guards.
- Replaced the wildcard image host with the configured Supabase hostname.
- Switched `next lint` to the ESLint CLI and official Next flat configurations. Newly surfaced React rules were fixed at their call sites rather than broadly disabled.
- The production build explicitly uses `next build --webpack`. Turbopack attempted an internal port bind in the managed validation environment and could not complete there; webpack is a supported Next 16 build mode and produced the complete route/proxy output.
- Build-time TypeScript remains enabled through Next's compiler API. The external CLI runner was disabled because its detached process produced no diagnostics in this managed environment; direct `tsc --noEmit` and the Next build both pass.
- Updated service-worker cache identity to `clickin-student-shell-v3`. The worker still caches only the offline shell, manifest/icons, and versioned `/_next/static/*` assets; authenticated pages, Supabase traffic, attendance APIs, evidence, and non-GET requests are not cached.

Hosted validation exposed and closed three timing defects relevant to React 19/Next 16 browser behavior:

1. IndexedDB completion listeners are now attached when a transaction is created, preventing a fast transaction from completing before its promise can observe it.
2. The connectivity hook uses a server-matching initial value and reconciles `navigator.onLine` after hydration, preventing offline-start hydration mismatch.
3. The first Supabase `INITIAL_SESSION` event no longer clears React Query while initial Student requests are in flight. Cache clearing still occurs for a real transition away from a known account, and both Student/Admin logout clear their query cache.

## Export remediation

`lib/export.ts` now contains CSV and PDF export only. The vulnerable SheetJS dependency, `downloadExcel`, and the Excel menu action are absent. The PDF path continues to use `new jsPDF()`, `setFontSize`, `text`, and `save`; a 40-row representative test verifies a nonempty PDF ArrayBuffer and page creation with jsPDF 4.2.1. This preserves reporting data and export filters without introducing another spreadsheet dependency.

## Dependency tree

The Admin Web subtree resolves Next 16.4.0, React/React DOM 19.2.3, jsPDF 4.2.1, and React Leaflet 5.0.0. All Admin React consumers resolve the same React 19.2.3 instance. `xlsx` is absent.

The repository-wide `npm ls --all` remains nonzero for known paths outside the targeted Admin runtime:

- `@img/sharp-wasm32` and its nested `@emnapi/runtime` are extraneous optional-platform artifacts produced again by clean install.
- React Native reports peer placement for `@react-native/metro-config`, `react-native-gesture-handler`, and `react-native-reanimated`. The latter packages are declared by Mobile, but npm's workspace peer placement still reports them at nested consumers.

No Admin React peer incompatibility remains. The approved scope prohibited changing Mobile solely to suppress these peer reports.

## Security audit

Affected-package counts from `npm audit`:

| Scope | Before | After | Change |
|---|---:|---:|---:|
| All dependencies | 40 total: 3 critical, 23 high, 14 moderate, 0 low | 34 total: 1 critical, 20 high, 13 moderate, 0 low | -6 affected packages; -2 critical, -3 high, -1 moderate |
| `--omit=dev` | 32 total: 3 critical, 17 high, 12 moderate, 0 low | 27 total: 1 critical, 15 high, 11 moderate, 0 low | -5 affected packages; -2 critical, -2 high, -1 moderate |

Targeted result: the former Next.js, jsPDF, and SheetJS findings are absent. No vulnerable `xlsx` package remains.

Remaining findings are classified as follows:

- **`shell-quote` critical:** reached only through `react-native` → `react-devtools-core`; it is not part of Admin request handling or the built Web route runtime. It remains a Mobile/debug-toolchain dependency and requires an Expo/React Native-supported remediation rather than an unreviewed root override.
- **Expo/Metro/React Native high and moderate findings:** `expo`, Metro packages, `node-forge`, `braces`/`micromatch`, `query-string`, `xcode`/`uuid`, and related packages are in the preserved Mobile/build ecosystem. Many paths are CLI, bundler, code-signing, or native development tooling. They are not reachable from an unauthenticated Admin Web request, but they remain relevant to Mobile build integrity and must be handled in a separate Expo-supported upgrade with native builds and hardware regression.
- **`eslint-config-next`/`fast-glob` and Tailwind/PostCSS findings in the all-dependency audit:** development/build-time only and absent from the `--omit=dev` set. They do not execute in the deployed Next server/browser runtime. Available audit suggestions would downgrade Next or require a Tailwind major migration, so they were not applied in this focused task.

The remaining Mobile/toolchain advisories are not silently waived. They remain a release-security work item, but they do not reopen the four targeted Admin dependency blockers completed here.

## Automated validation

| Check | Result |
|---|---|
| Clean install | PASS — `npm ci`, no forced/legacy peer mode |
| Admin/Student Web tests | PASS — 11/11 files, including PDF, RBAC, device, geolocation, media, workflow, IndexedDB, offline sync, and PWA safety |
| Admin TypeScript | PASS |
| Mobile TypeScript | PASS |
| Admin lint | PASS — 0 errors, 0 warnings |
| Mobile lint | PASS — 0 errors, 19 documented pre-existing warnings; Mobile source was not changed for them |
| Mobile auth | PASS — 1/1 |
| Edge security/validation contracts | PASS — 4/4 |
| Local migration/security harness | PASS — migrations 001–013 plus 8 rollback-only SQL suites |
| Migration 010 constraints | PASS — both targeted constraints remain `NOT VALID` |
| Next 16 staging-configured production build | PASS — all Admin/Student/offline/manifest routes and Proxy emitted |
| Build identity scan | PASS — 357 `.next` files scanned; 0 occurrences of the forbidden production ref |
| `git diff --check` | PASS |
| High-confidence repository secret scan | PASS — no private keys, JWT-shaped tokens, service-role literals, credential-bearing PostgreSQL URLs, or local staging key files found |

## Hosted staging validation

The final isolated Chrome 151 run passed **38/38** assertions against `tosfspsjervmgrpncnsw`:

- Student login and automatic `/student` redirect.
- Student dashboard routes: events, event detail, attendance/history/detail, announcements, notifications, and profile.
- Student RLS visibility and denial of `/admin`.
- Online secure attendance already accepted through hosted QR generation, private evidence upload, device resolution, and the hardened submit path.
- Offline attendance persisted in IndexedDB, displayed as waiting, synchronized after reconnect through the real hosted device/Edge path, became authoritative server history, and rendered as successful.
- Service-worker v3 installation, exclusion of authenticated routes from cache, and origin-down offline shell fallback.
- Student logout, anonymous redirects, and inactive Student rejection.
- Admin login, every `/admin/*` route, review-queue fixture visibility, hosted review approval, denial of `/student`, top-right profile dropdown Logout, and anonymous redirects.

Temporary staging cleanup removed 2 events, their attendance/review/QR rows by cascade, 1 evidence object, and 1 temporary browser device; it restored the previous synthetic device and verified zero matching temporary events/devices remained. No staging schema was changed.

QR, evidence upload, and camera/GPS library behavior are covered by hosted fixtures and automated browser/unit checks. Real optical QR, physical camera, and hardware GPS remain outside this run.

## Auth compatibility and remaining limits

Protected-route RBAC, session cookies, login, inactive handling, and logout pass under Next 16. Mobile callback/password-recovery tests pass. The Web application still has no dedicated auth callback or password-reset route; this was a documented baseline gap, not removed by the upgrade. It must be implemented and validated if Web password recovery is required for production.

Targeted dependency remediation is complete. Production remains blocked pending:

1. Approved privileged orphan-evidence retention and its dry-run/audit validation.
2. A genuine two-build staging service-worker/PWA transition with an old open document and installed PWA.
3. Physical iPhone/Safari and Android/Chrome camera, GPS, optical QR, offline-close/reopen, reconnect, and update acceptance.
4. A separately approved Expo/React Native dependency and native-build review for the remaining Mobile/toolchain advisories and peer-placement warnings.
5. Web auth callback/password recovery if it is a production requirement.

No production deployment was performed or authorized.
