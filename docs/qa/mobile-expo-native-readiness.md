# Mobile / Expo dependency and native-build readiness

> **2026-10-09 release-candidate update:** Release identity is now pinned to ClickIn `1.0.0`, Android/iOS `com.clickin.attendance`, Expo slug `clickin-attendance`, Android versionCode `1`, iOS build `1`, and scheme `attendance`. A final staging debug-signed APK/AAB build passes. See [final-release-candidate.md](final-release-candidate.md); statements below about missing identifiers describe the earlier review baseline.

Date: 2026-10-09. Scope: the preserved Expo/React Native application, its shared workspace dependencies, native configuration, and regressions caused by the dependency changes in this review.

Production remains **BLOCKED**. No production service was connected to, read, changed, or deployed. No Supabase migration, Edge Function, database data, Storage object, or Web security architecture was changed. Where configuration was required for a build, the build used the staging URL `tosfspsjervmgrpncnsw` and a non-secret placeholder public key.

## 1. Baseline and final version inventory

| Component | Final installed version | Role |
|---|---:|---|
| Expo SDK | 57.0.27 | Mobile runtime and native tooling |
| React Native | 0.86.3 | Native runtime |
| React / React DOM | 19.2.3 / 19.2.3 | Mobile and Web React runtime |
| Expo Router | 57.0.25 | Mobile routing and deep links |
| Supabase JS | 2.110.1 | Authentication, database, Storage, and Edge calls |
| Expo Camera | 57.0.6 | Live evidence photo and QR scanning |
| Expo Location | 57.0.20 | Foreground attendance location |
| Expo Device | 57.0.2 | Device metadata |
| Expo File System | 57.0.7 | Local evidence files and queued submission processing |
| Expo Secure Store | 57.0.4 | Native auth/device state storage |
| Expo SQLite | 57.0.4 | Durable native offline queue/cache |
| Expo Notifications | 57.0.22 | Native notifications |
| Expo Network / NetInfo | 57.0.2 / 12.0.1 | Connectivity state and reconnect synchronization |
| Expo Image Manipulator | 57.0.21 | Evidence preparation |
| React Native Maps | 1.27.2 | Native event map |

Mobile consumes `packages/types`, `packages/validation`, `packages/api-client`, and `packages/shared-utils`. QR scanning uses Expo Camera's QR barcode support; there is no separate Mobile QR scanner package.

## 2. Dependency changes

The review applied only Expo-compatible patch updates and targeted transitive remediation:

- Updated Expo from 57.0.19 to 57.0.27 and aligned Expo modules to the versions recommended for SDK 57. Expo Router moved from 57.0.18 to 57.0.25. React Native and React stayed at 0.86.3 and 19.2.3.
- Updated `shell-quote` from 1.10.0 to 1.12.0 through the existing React Native dependency range. This removed the Critical advisory without an override or React Native upgrade.
- Attempted targeted current-version updates for `braces` and `node-forge`; their installed versions are already the newest published versions and remain affected.
- Added the Expo splash-screen and SQLite config plugins that Expo's supported install process requires for the declared modules.
- Replaced hard-coded, nonexistent workspace-local Metro paths with package roots resolved from the Mobile workspace. Android/iOS bundling and the Android native build prove this resolution works.
- Kept a compatible root Expo/Babel tool context for the hoisted monorepo Metro configuration and removed the redundant outdated root Expo Router declaration.
- Removed an invalid notification-icon reference to a file that does not exist.
- Limited native permissions to the capabilities the app uses. Android now blocks background location, microphone, system overlay, and legacy external-storage permissions. iOS now omits always-location, motion, and microphone usage entries.

No `--force`, `--legacy-peer-deps`, `npm audit fix --force`, Expo major upgrade, React Native major change, or application architecture rewrite was used.

## 3. Remaining advisory classification

The final `npm audit` reports 32 affected packages: 19 high, 13 moderate, and **0 critical**. `npm audit --omit=dev` reports 25 affected packages: 14 high, 11 moderate, and **0 critical**. Those counts expand five underlying advisories through parent packages such as Expo, Metro, Tailwind, and Xcode.

Classification letters follow the approved definitions: A production runtime, B native build tool, C development tool, D transitive/unreachable in the shipped app, E requires Expo SDK upgrade, F requires React Native upgrade, and G no safe remediation in the current supported stack.

| Advisory | Package / installed version | Severity | Mobile path | Fix availability | Bundle and practical reachability | Classification and action |
|---|---|---:|---|---|---|---|
| GHSA-vfj7-8cjw-p6xm, deeply nested pattern stack exhaustion | `braces` 3.0.3 | High | Mobile Tailwind → chokidar/micromatch → braces; Expo/React Native → Metro → micromatch → braces | Affected through 3.0.3; 3.0.3 is the latest published version | Build-time glob matching only; absent as an invoked shipped-app feature. Exploitation would require attacker control of build glob patterns. | **B/C/D/G.** Keep build inputs trusted and update when the supported chains publish a fix. |
| GHSA-86w9-cpqp-85rv, PKCS#1 v1.5 signature parsing | `node-forge` 1.4.0 | High | Mobile Expo → Expo CLI/code-signing certificates → node-forge | Affected through 1.4.0; 1.4.0 is the latest published version | CLI/code-signing tooling; not in the Hermes application bundles. The repository has no EAS/code-signing setup invoking this path. | **B/D/G.** Do not accept untrusted signing material; adopt Expo's fixed compatible release when available. |
| GHSA-vcc3-ghjq-m6fr, malformed percent-decoding denial of service | `decode-uri-component` 0.2.2 | Moderate | Mobile Expo Router → query-string 7.1.3 → decode-uri-component | Fixed package 0.5.0 exists, but the current query-string range selects 0.2.x; npm's supported remediation points to Expo Router 58 | Part of the Router JavaScript graph. A crafted external query/deep-link is the realistic input; impact is local availability, with no demonstrated auth or attendance bypass. | **A/D/E/G.** Keep current SDK 57 for this safe pass and address in a controlled Expo SDK 58 migration with deep-link regression. |
| GHSA-rj75-hqrm-r3gf, quadratic CSS selector parsing | `postcss-selector-parser` 6.1.4 | Moderate | Mobile Tailwind 3.4.19 → postcss-nested/parser | Fixed in 7.1.6; Tailwind 3 requires parser 6 and npm proposes Tailwind 4 | CSS build/dev pipeline only. The project does not compile attacker-supplied CSS. | **C/D/G.** Upgrade only with a separately tested Tailwind 4 migration. |
| GHSA-w5hq-g745-h8pq, UUID buffer bounds | `uuid` 7.0.3 | Moderate | Mobile Expo config plugins → xcode 3.0.1 → uuid | Fixed in 11.1.1; Xcode tooling pins the older major | iOS project-generation tooling only. The vulnerable UUID APIs with caller-provided buffers are not called by application code. | **B/D/G.** Wait for the Expo config-plugin chain to update; do not override the Xcode tool's major dependency. |

Aggregate audit entries for Expo, Expo CLI/config/Metro, React Native community CLI, Metro, query-string, Xcode, Tailwind, chokidar, micromatch, and PostCSS inherit one of the five findings above. The audit suggestions to downgrade Expo to 44 or React Native to 0.72 are incompatible with the application and were rejected. The fixed decode/parser/UUID majors also cannot be inserted safely into their current parent ranges.

### `shell-quote` Critical assessment

The former Critical path was:

`apps/mobile` → `react-native@0.86.3` → `react-devtools-core@6.1.5` → `shell-quote`.

The installed package is now `shell-quote@1.12.0`, and the current registry audit no longer reports the advisory. The application never imports `shell-quote`; the path belongs to React Native developer tooling. Final Android and iOS exports contain zero `shell-quote` or `react-devtools-core` string matches. Its vulnerable behavior required untrusted input to the shell quoting API, which the app does not invoke. It was not a shipped attendance/authentication exploit path, and it is now remediated without a forced upgrade.

## 4. Expo, React, and dependency-tree compatibility

- `expo-doctor` passes **21/21** checks from `apps/mobile`, including required peer dependencies, SDK versions, config schema/plugins, Metro configuration, duplicate native modules, and React Native Directory metadata.
- `npm ls react react-dom react-native --all` exits successfully. React and React DOM resolve to 19.2.3, and React Native resolves to 0.86.3; no second React runtime or React version conflict is present.
- Full `npm ls --all` remains nonzero for workspace/tool placement warnings: optional platform artifacts, `react-native-drawer-layout` peers for gesture-handler/reanimated, `react-native-worklets`' Metro-config peer, and a `ws` 7/8 peer placement report. Expo Router marks gesture-handler/reanimated integration optional, the app does not use a Drawer route, Expo Doctor passes, both Metro exports pass, and Android autolinking/native compilation passes. These warnings are therefore recorded rather than hidden with forced installation flags.
- The current Expo CLI has its own compatible `ws@8.22.0`; Metro/React Native use `ws@7.5.13`. npm's hoisted peer report does not represent a failed bundle or native build.

## 5. Shared-package compatibility

The four shared packages remain platform-neutral:

- `types` and `shared-utils` have no runtime dependency.
- `validation` depends only on Zod.
- `api-client` depends on shared types and Supabase JS and invokes the hardened `submit-attendance` Edge endpoint.
- A source scan found no Node core, `next/*`, React DOM, `window`, `document`, local-storage, or navigator imports in these packages.

Both Mobile TypeScript/Metro and Next.js TypeScript/production compilation consume the same packages successfully. No shared package was changed during this review.

## 6. Android native readiness

Android validation completed successfully:

- Expo prebuild resolved the SDK 57 native modules and deep link `attendance://auth-callback`.
- A full local `assembleRelease` completed on Linux with Gradle 9.3.1: **598 tasks, BUILD SUCCESSFUL**.
- The validation APK was generated at 137,477,032 bytes with SHA-256 `2e3fd66caa70c2b31f5401ad8c4b588d30cb0a45d80e74ea7ee87e18a6cdca96` and then moved with the temporary native project outside the repository.
- The merged release manifest contains camera, coarse/fine foreground location, Internet/network, notifications, and library-required background-service/biometric declarations. It contains none of the blocked background-location, microphone, overlay, read-external-storage, or write-external-storage permissions.
- The Android Hermes export passes: 2,082 modules and a 6.1 MB bundle.
- The release validation APK uses the generated Android Debug certificate. It proves compilation only and is not Play Store signing evidence.

The source config does not yet pin `android.package` or `android.versionCode`; prebuild inferred `com.yandaveeee.campusattendance` and version code 1. There is no `eas.json`, release keystore, Play signing configuration, or approved production environment profile. Explicit release identity and signing are required before distribution.

## 7. iOS native readiness

iOS validation reached the safe limit of the Linux environment:

- Expo iOS prebuild succeeds and the iOS Hermes export passes: 1,998 modules and a 5.9 MB bundle.
- Generated configuration contains the `attendance` URL scheme, camera usage text for evidence/QR, and foreground-only location usage text.
- Generated configuration contains no always-location, motion, or microphone usage description after the final permission correction.
- App Transport Security does not allow arbitrary loads.

The source config does not pin `ios.bundleIdentifier` or `ios.buildNumber`; prebuild inferred `com.yandaveeee.campus-attendance` and build number 1. Linux has no Xcode, EAS CLI/configuration, Apple signing identity, or provisioning profile, so no iOS archive was built. A signed iOS build remains required and must not be reported as complete from this prebuild/export result.

## 8. Mobile, Web, and security regression

| Check | Result |
|---|---|
| Mobile TypeScript | PASS |
| Mobile lint | PASS, 0 errors and 19 existing React/compiler/exhaustive-dependency warnings |
| Mobile auth tests | PASS, 1/1 |
| Android Hermes export | PASS |
| iOS Hermes export | PASS |
| Android native release compile | PASS |
| Admin/Student Web tests | PASS, 13/13 |
| Admin TypeScript | PASS |
| Admin lint | PASS, zero findings |
| Admin staging-configured production build | PASS; all `/admin/*`, `/student/*`, auth, offline, and manifest routes emitted |
| Edge security/validation tests | PASS, 4/4 |
| Offline ownership/session probes | PASS, 3/3 |
| `git diff --check` | PASS |

The Mobile client still reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. It stores native sessions in Secure Store, uses the shared secure attendance Edge path, uploads private evidence through Supabase Storage, and retains the existing device-registration behavior. Server-side device ownership, role, freshness, state-machine, GPS/QR, evidence, review, and legacy-RPC enforcement remain in migrations 009–013 and the deployed staging services; no client dependency change bypasses them.

Existing approved staging evidence remains applicable: the hosted security matrix passed its hardened auth/RBAC, attendance, device ownership, GPS/geofence, QR, Storage/evidence, review, RLS, audit, and legacy-lockdown cases, and its four timing/state observations passed the 10/10 follow-up retest. The later hosted Web run passed 38/38. This review could not repeat account-driven Mobile flows because the temporary staging credential maps were no longer present. No physical device or simulator was attached. Login/profile/event/device/attendance/GPS/QR/photo/offline/reconnect behavior therefore still requires final native-device acceptance; this report does not convert compile and backend evidence into a hardware pass.

## 9. Repository and environment safety

- High-confidence scan: 309 tracked/nonignored source files; zero private-key, JWT-shaped token, credential-bearing database URL, or Supabase secret-key matches.
- Final Android/iOS exports contain zero forbidden production-reference and zero JWT-like matches.
- The production Next output contains zero forbidden production-reference and zero JWT-like matches. Old ignored `.next/dev` cache files may contain a public development token from prior local sessions; they are not source-controlled or part of the production output.
- No generated `android/` or `ios/` directory, APK, native log, credential map, or API-key file remains in the repository.
- Root package and lockfile contain no accidental application `dependencies` block.
- Migrations 001–013 were not edited by this review. The previously created 008–013 files remain untracked in the current long-running working tree and must be included intentionally with the rest of the approved work.
- Production project `aeffervvqtejdmlmaoga` was not contacted.

## 10. Remaining release tasks and decision

Mobile dependency remediation for the current Expo SDK is **complete**: the Critical advisory is gone, Expo-compatible patches are applied, remaining findings have no safe current-stack fix, Expo Doctor is clean, and Android native compilation succeeds.

Production acceptance remains **BLOCKED** by release and hardware evidence rather than a demonstrated dependency compile failure:

1. Pin approved Android application ID/version code and iOS bundle ID/build number in source.
2. Configure reviewed production/staging build profiles and secrets without embedding service credentials.
3. Produce a store-signed Android AAB and a signed iOS archive with the real release identities.
4. Confirm the Supabase redirect allowlist for the final native callback identifiers.
5. Complete every row in `docs/qa/physical-device-acceptance.md` on a real iPhone/Safari and Android/Chrome/native build: login/profile/events, foreground GPS and denial/accuracy cases, front-camera evidence, optical QR, check-in/out, offline capture, force-close/reopen, reconnect synchronization, device replacement, logout/account switching, notification permission/delivery, and update behavior.
6. Plan the Expo SDK 58 upgrade separately to remove the Router decode advisory, then repeat native builds and deep-link/hardware regression. It is not required to prove the current SDK 57 build compiles, but it remains a tracked release-security follow-up.

No production deployment was performed or authorized.
