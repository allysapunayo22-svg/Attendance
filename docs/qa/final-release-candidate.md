# ClickIn 1.0.0 release candidate

Date: 2026-10-09. Candidate: `clickin-1.0.0-rc1`. Final classification: **NOT READY FOR PRODUCTION**.

This candidate is prepared for acceptance testing against Supabase staging project `tosfspsjervmgrpncnsw`. No production project connection, Supabase change, Vercel deployment, store publication, migration, Edge deployment, or test-data mutation was performed. Production project `aeffervvqtejdmlmaoga` was not accessed.

## Release identity and versions

| Item | Candidate value | Verification |
|---|---|---|
| Product / native display name | ClickIn | Expo public config and generated Android/iOS config |
| Web/PWA name / short name | ClickIn Student Attendance / ClickIn | Next manifest and Expo Web config |
| Android package | `com.clickin.attendance` | Expo config, Gradle namespace/application ID and merged manifest |
| iOS bundle identifier | `com.clickin.attendance` | Expo config and generated Xcode project |
| Expo slug | `clickin-attendance` | Expo public config |
| Native URL scheme | `attendance` | Expo config and generated Android/iOS config |
| Semantic version | `1.0.0` | root, Admin Web and Mobile packages plus native config |
| Android versionCode | `1` | Expo config and merged release manifest |
| iOS buildNumber | `1` | Expo config and generated Info.plist |
| Web service-worker cache | `clickin-student-shell-v4` | `apps/admin-web/public/sw.js` |
| Next.js / React | 16.4.0 / 19.2.3 | installed candidate dependency tree |
| Expo / React Native | 57.0.27 / 0.86.3 | installed candidate dependency tree |

`com.clickin.attendance` is syntactically valid for Android and iOS and has no conflicting use in this repository. Global ownership/availability cannot be established from source or public search: the identifier must still be registered or verified in the Google Play Console and Apple Developer account before production signing. No substitute identifier was chosen.

The previous inferred identifiers `com.yandaveeee.campusattendance` and `com.yandaveeee.campus-attendance` are absent from release configuration and generated native projects. One non-user-facing Secure Store key retains the old `campus-attendance-email-link` string to preserve existing email-link state.

## Authentication callback plan

Password login starts at `/login` and does not require a callback. Web recovery generates a same-origin exact callback at `/auth/callback?type=recovery`, exchanges the recovery code, creates a short-lived verified recovery session, and then routes to `/reset-password`.

The exact staging callback cannot be finalized because this repository has no confirmed HTTPS staging Web origin or linked Vercel preview. Before physical Web/PWA testing, configure the selected staging origin as:

- `https://<confirmed-staging-origin>/login`
- `https://<confirmed-staging-origin>/forgot-password`
- `https://<confirmed-staging-origin>/auth/callback?type=recovery`
- `https://<confirmed-staging-origin>/reset-password`

The prepared production values, conditional on confirming the previously referenced domain, are:

- `https://clickin-admin.vercel.app/login`
- `https://clickin-admin.vercel.app/forgot-password`
- `https://clickin-admin.vercel.app/auth/callback?type=recovery`
- `https://clickin-admin.vercel.app/reset-password`

Do not apply those values until the domain and production project are explicitly approved. Native release callbacks are `attendance://auth-callback` on Android and iOS. Expo development callbacks are environment-generated and must not be used as production allowlist substitutes. No Supabase Auth setting was changed in this work.

## Android candidate

The staging-configured Gradle release build completed successfully: 607 tasks, `assembleRelease` and `bundleRelease`. Both artifacts contain the final ClickIn JavaScript bundle and `com.clickin.attendance` version `1.0.0` / versionCode `1`.

| Artifact | Size | SHA-256 |
|---|---:|---|
| `dist/release-candidate/clickin-1.0.0-rc1-staging-debug-signed.apk` | 137,476,900 bytes | `4ec67a6969db22eec6f895368ec6c78ae194c19a78620187dde1f2b935dc894e` |
| `dist/release-candidate/clickin-1.0.0-rc1-staging-debug-signed.aab` | 90,968,757 bytes | `27532b87191643581e5bf2f71188013eb64a42e2ff386615f019e73166390c2b` |

The APK verifies under Android Signature Scheme v2 and is signed by the generated Android Debug certificate. It is safe for staging acceptance and **not acceptable for Play Store publication**. No keystore or signing credential was added to the repository.

Generated Android validation confirmed foreground location, camera and notification permissions and absence of the explicitly blocked background-location, microphone, overlay and legacy external-storage permissions. Temporary native projects were moved outside the repository after validation.

## iOS candidate path

Expo iOS prebuild/config validation succeeded. Generated configuration confirmed display name ClickIn, bundle ID `com.clickin.attendance`, version `1.0.0`, build `1`, `attendance` callback scheme, foreground location and camera usage descriptions, and no always-location, motion or microphone permission declaration.

No signed iOS artifact exists. The Linux runner has no Xcode; the repository has no EAS configuration, Apple signing identity or provisioning profile. A signed internal build requires an Apple Developer account, registration of `com.clickin.attendance`, reviewed signing/provisioning, and either EAS build configuration or macOS/Xcode. Native iOS acceptance remains NOT TESTED.

## Immutable Web/PWA candidate and transition

Final Build B is staging-configured and was not deployed:

- Next build ID: `O4g-VwCuwUnBnjhg1QXIx`
- static-tree SHA-256: `db7e3ba18972fb821c7af3ed47e19611deac1dbefadc21f988ad0e13db10a0ae`
- service-worker SHA-256: `3daac25bc5b8e842854abb2e12bbe4bcfd41f615e8164ee7e1479a35b875e9a4`
- service-worker cache: `clickin-student-shell-v4`
- deployable-output production-ref matches: 0
- deployable-output JWT-shaped matches: 0

The equivalent immutable source archive and its checksum are stored under `dist/release-candidate`; it captures all tracked and nonignored candidate source while excluding Git metadata, ignored environment files, build caches and credentials. `SHA256SUMS` is the verification authority. Current Git HEAD `db52caf5af451be9fa128c2056f686b3a2a3257b` predates the long-running approved migration, so it is not an accurate candidate reference by itself.

The true local same-origin transition used:

| Step | Build ID | Static-tree SHA-256 | Cache |
|---|---|---|---|
| Build A | `S_SXMUkyJO0za6V4pNzGs` | `02efa5cc304fbb17a3b99832e8f0b5f5ce184d11ef4fedfb824df030af9cff6b` | v3 |
| Build B | `O4g-VwCuwUnBnjhg1QXIx` | `db7e3ba18972fb821c7af3ed47e19611deac1dbefadc21f988ad0e13db10a0ae` | v4 |

Build A registered v3 and stored a synthetic queued record with an owner, stable idempotency key and Blob evidence. Build B was then served on the same origin while the browser remained open. The browser discovered v4, changed controller once, removed v3, retained one navigation entry, cached no `/student`, `/admin` or `/login` URL, and preserved the queued record unchanged with zero attempts. After fully closing and reopening the same Chrome profile, v4 and all queue fields/evidence remained intact with no reload loop. Because the fixture never contacted attendance services, no duplicate server submission occurred.

This is a valid local browser release-transition result. It is not an installed-PWA or physical-device result. Repeat it on the deployed HTTPS staging origin in Safari/Add to Home Screen and Chrome/installed PWA.

## Automated release validation

| Check | Result |
|---|---|
| Expo Doctor | PASS, 21/21 |
| Android config/prebuild | PASS |
| Android APK + AAB release build | PASS |
| iOS config/prebuild | PASS; signed build unavailable |
| Mobile TypeScript | PASS |
| Mobile lint | PASS, 0 errors / 19 warnings |
| Mobile auth tests | PASS, 1/1 |
| Admin + Student Web tests (Phases 1, 2A, 2B, 2C) | PASS, 13/13 |
| Offline safety probes | PASS, 3/3 |
| Admin TypeScript | PASS |
| Admin lint | PASS, zero findings |
| Admin staging production build | PASS |
| Edge security/validation tests | PASS, 4/4 |
| Local migrations 001–013 | PASS on disposable PostgreSQL 18.6/PostGIS harness |
| SQL security suites | PASS, 8/8 rollback-only suites |
| Migration 010 constraint state | PASS; both constraints remain NOT VALID |
| React / React DOM / React Native resolution | PASS |
| Full `npm ls --all` | Recorded nonzero: known optional platform packages and peer-placement warnings; Expo Doctor/native build pass |
| `git diff --check` | PASS |
| Source/diff secret scan | PASS; no private key, JWT, Supabase secret key or credential-bearing DB URL matches |

The current `npm audit` has 0 critical, 19 high and 13 moderate affected packages. `npm audit --omit=dev` has 0 critical, 14 high and 11 moderate. These are the previously reviewed Expo/Metro/native toolchain, Router query parsing, Tailwind/PostCSS and Xcode tooling advisories; safe current-SDK remediation is not available without incompatible or separately scoped major changes. The package-level analysis and compensating conditions remain in `dependency-advisories.md` and `mobile-expo-native-readiness.md`. There are zero Critical production Web findings.

Migration baseline 001–013 has aggregate manifest SHA-256 `d3d3665095e0736ec9b30de40b708cbc4789b80b57e15f6ff7aa8a3c5c4a0d28`. The 16 Edge TypeScript/JSON source files have aggregate manifest SHA-256 `9e7675c7804e47fbde7abd34bc882782f8f33a6a3fbcb28864e907777730386c`. Neither migration nor Edge source was modified during release-candidate preparation.

## Physical acceptance status

No real iPhone or Android device was attached. Every physical result remains **NOT TESTED** and is recorded row-by-row in `physical-device-acceptance.md`:

- iPhone Safari and installed PWA: NOT TESTED.
- Android Chrome and installed PWA: NOT TESTED.
- Native Android APK: built, installation and functional acceptance NOT TESTED.
- Native iOS: no signed build; NOT TESTED.
- Real GPS permission/accuracy/geofence acceptance and rejection: NOT TESTED.
- Front-camera selfie/retake/upload and real rear-camera optical QR: NOT TESTED.
- Check-in, checkout and evidence on physical hardware: NOT TESTED.
- Force-close/offline reopen/reconnect synchronization and stale handling: NOT TESTED.
- Logout, account switching, cross-account queue isolation and device replacement on hardware: NOT TESTED.
- Native notification permission/delivery: NOT TESTED. Web Push remains deferred and was not added.

## Remaining production blockers

1. Confirm an HTTPS staging Web origin, configure only its exact staging Auth callback, and rerun hosted recovery plus installed-PWA transition tests.
2. Complete every physical iPhone/Safari and Android/Chrome row in `physical-device-acceptance.md`, including real GPS, camera, optical QR, offline persistence/reconnect, account isolation and device replacement.
3. Install and exercise the debug-signed Android APK on a real device; replace it with a production-signed AAB only after release approval and secure keystore configuration.
4. Verify/register `com.clickin.attendance` in both store-owner consoles and produce a signed internal iOS build.
5. Complete native Android and iOS functional acceptance. Compile/prebuild evidence does not replace hardware behavior.
6. Retain the documented Mobile advisories as an explicit release-risk decision and plan the separately tested Expo SDK 58/related major upgrade.
7. Review and commit the complete long-running working tree before any production tag. The immutable source archive is an acceptance reference, not a substitute for code review and repository history.

The acceptance candidate is stable and ready to hand to device testers. It is **NOT READY FOR PRODUCTION** until the physical, hosted callback, store-identity and production-signing gates above are closed. Do not deploy it to production.
