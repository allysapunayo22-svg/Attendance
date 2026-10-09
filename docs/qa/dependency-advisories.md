# Final dependency advisory review — 2026-10-06

> **2026-10-07 recheck:** After installing the approved Mobile lint tooling, `npm audit` reports 40 affected packages (14 moderate, 23 high, 3 critical), and `npm audit --omit=dev` reports 32 (12 moderate, 17 high, 3 critical). The additional critical entry is `shell-quote` 1.10.0 through React Native's `react-devtools-core`; that locked version predates this remediation and is outside the Admin web runtime. The production-relevant Next.js, jsPDF, and xlsx conclusions below are unchanged. No safe patch/minor solution was available, so no forced, breaking, or unrelated dependency update was applied. See the [targeted remediation report](targeted-remediation-report.md).

Fresh registry audit: **45 affected packages (2 critical, 28 high, 15 moderate)** before compatible updates; **39 affected packages (2 critical, 23 high, 14 moderate)** afterward. These are affected package counts, not unique CVEs. This supersedes the earlier 19-advisory baseline. No `audit fix --force`, major upgrade or Expo downgrade was used.

Audit sources: npm advisory JSON fetched this session, linked advisories below; maintainer [Next security advisories](https://github.com/vercel/next.js/security/advisories) and [jsPDF security advisories](https://github.com/parallax/jsPDF/security/advisories). Severity is registry severity, not a claim of a demonstrated exploit here. Dependency versions and relevant source usage were inspected locally. This npm audit does not cover Deno URL imports or all bundled/vendor code.

## Applied compatible updates

| Package | Before → after | Validation |
|---|---|---|
| source-map-js | 1.2.1 → 1.2.2 | Web suite after patch; mobile auth and all final type/build checks afterward |
| baseline-browser-mapping | 2.10.42 → 2.11.27 | Web + mobile auth suites after this individual update |
| browserslist | 4.28.5 → 4.29.3 | Web + mobile auth suites after this individual update |
| brace-expansion | 5.0.9 → 5.0.12; 2.1.2 → 2.1.7 | Web + mobile auth suites after this individual update |
| compression | 1.8.1 → 1.8.2 | Web + mobile auth suites after this individual update |
| @xmldom/xmldom | 0.9.10 → 0.9.12 | Web + mobile auth suites after this individual update |

Browserslist also updated its caniuse-lite, electron-to-chromium, node-releases and update-browserslist-db data dependencies. Only package-lock.json changed; manifests and mobile source were preserved. Native hardware/build acceptance remains outstanding for transitive tooling changes.

## @expo/cli

- Installed baseline: **57.0.21**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/code-signing-certificates`, `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/metro`, `@expo/metro-config`, `@expo/metro-file-map`, `@expo/prebuild-config`, `node-forge`.

## @expo/code-signing-certificates

- Installed baseline: **0.0.6**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo signing/dev tooling; not web Supabase authentication runtime.
- App-specific exposure: Certificate/signature verification issue affects signing tooling on supplied keys/certificates. No browser/server auth usage found.
- Remediation: No compatible fixed 1.x resolution offered by current audit; obtain upstream patch/review Expo signing dependencies. Reject npm suggestion to downgrade Expo to 44.
- Safety / regression: Native toolchain review required; do not downgrade/reconfigure Expo.
- Inherited findings: `node-forge`.

## @expo/config

- Installed baseline: **57.0.9**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config-plugins`.

## @expo/config-plugins

- Installed baseline: **57.0.9**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `xcode`.

## @expo/inline-modules

- Installed baseline: **0.1.7**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config-plugins`.

## @expo/local-build-cache-provider

- Installed baseline: **57.0.8**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config`.

## @expo/metro

- Installed baseline: **56.0.2**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `metro`, `metro-config`, `metro-file-map`, `metro-transform-worker`.

## @expo/metro-config

- Installed baseline: **57.0.12**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config`, `@expo/metro`.

## @expo/metro-file-map

- Installed baseline: **57.0.2**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `micromatch`.

## @expo/prebuild-config

- Installed baseline: **57.0.15**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config`, `@expo/config-plugins`.

## @next/eslint-plugin-next

- Installed baseline: **14.2.35**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `glob`.

## @react-native/community-cli-plugin

- Installed baseline: **0.86.3**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `metro`, `metro-config`.

## @xmldom/xmldom

- Installed baseline: **0.9.10**; transitive dependency; maximum severity **high**.
- Final status: **cleared in final audit**.
- Production impact: Native plist/build XML tooling; not web request runtime.
- App-specific exposure: Malformed XML/name input affects build parsing/serialization. No public application XML import found.
- Remediation: Compatible 0.9.12 patch applied.
- Safety / regression: Patch within parent range; native auth/type and build-tool validation required (native hardware build not run).

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [xmldom: XML fragment injection via invalid EntityReference.nodeName during requireWellFormed serialization ](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6) | moderate | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: HTML raw-text closing-tag case mismatch causes output amplification ](https://github.com/advisories/GHSA-6mj3-qw4j-hgrw) | high | `>=0.9.0-beta.1 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom PI grammar regex ReDoS: quadratic backtracking on unterminated processing instructions ](https://github.com/advisories/GHSA-g53g-w8rj-fmg7) | high | `>=0.9.0-beta.9 <=0.9.10` | As assessed above; no exploit attempted. |
| [xmldom: Element name injection via createElement() bypasses requireWellFormed ](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) | high | `>=0.9.0 <=0.9.10` | As assessed above; no exploit attempted. |
| [xmldom: Attribute name injection via setAttribute() bypasses requireWellFormed ](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) | high | `>=0.9.0 <=0.9.10` | As assessed above; no exploit attempted. |
| [xmldom: Processing Instruction Target Injection Bypasses requireWellFormed ](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: DocType `name` Injection Bypasses requireWellFormed ](https://github.com/advisories/GHSA-27p8-2357-5qqv) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: Creation-time XML Name/QName validation is bypassable via an embedded line terminator, allowing injection on the default serialization path ](https://github.com/advisories/GHSA-3px3-54cx-rmw9) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: requireWellFormed DocType publicId/systemId validation is bypassable via an embedded line terminator ](https://github.com/advisories/GHSA-vr34-hp96-76pp) | high | `>=0.9.10 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: Parser silently accepts a not-well-formed end tag whose name is followed by a line break and trailing content ](https://github.com/advisories/GHSA-6h8r-xr42-gp59) | moderate | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: Quadratic-time attribute deduplication ](https://github.com/advisories/GHSA-8344-3jmq-59r6) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: Quadratic-memory consumption ](https://github.com/advisories/GHSA-965w-775f-mr7g) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |
| [xmldom: Quadratic-time parsing via the malformed-input recovery path — `parseElementStartPart` re-scan and `normalize()` adjacent-text merge ](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) | high | `>=0.9.0 <=0.9.11` | As assessed above; no exploit attempted. |

## baseline-browser-mapping

- Installed baseline: **2.10.42**; transitive dependency; maximum severity **moderate**.
- Final status: **cleared in final audit**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [baseline-browser-mapping process termination on invalid input causes denial of service ](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | `>=2.0.0 <2.11.0` | As assessed above; no exploit attempted. |

## brace-expansion

- Installed baseline: **5.0.9, 2.1.2**; transitive dependency; maximum severity **high**.
- Final status: **cleared in final audit**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash ](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | `>=2.0.0 <2.1.3` | As assessed above; no exploit attempted. |
| [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation ](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | `>=2.0.0 <2.1.4` | As assessed above; no exploit attempted. |
| [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service ](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `>=2.0.0 <2.1.7` | As assessed above; no exploit attempted. |
| [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service ](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `>=4.0.0 <5.0.12` | As assessed above; no exploit attempted. |
| [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion ](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | `>=2.0.0 <2.1.6` | As assessed above; no exploit attempted. |
| [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion ](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | `>=4.0.0 <5.0.11` | As assessed above; no exploit attempted. |
| [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion ](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | `>=2.0.0 <2.1.5` | As assessed above; no exploit attempted. |
| [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion ](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | `>=4.0.0 <5.0.10` | As assessed above; no exploit attempted. |

## braces

- Installed baseline: **3.0.3**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [braces vulnerable to stack-exhaustion denial of service through deeply nested patterns ](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | high | `<=3.0.3` | As assessed above; no exploit attempted. |

## browserslist

- Installed baseline: **4.28.5**; transitive dependency; maximum severity **high**.
- Final status: **cleared in final audit**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM ](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | high | `<=4.28.6` | As assessed above; no exploit attempted. |
| [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) ](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | high | `<=4.28.6` | As assessed above; no exploit attempted. |

## chokidar

- Installed baseline: **3.6.0**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `braces`.

## compression

- Installed baseline: **1.8.1**; transitive dependency; maximum severity **high**.
- Final status: **cleared in final audit**.
- Production impact: Expo development HTTP server; not deployed Next handler.
- App-specific exposure: Premature response-close memory leak could affect an exposed development server.
- Remediation: Compatible 1.8.2 patch applied.
- Safety / regression: Nonbreaking patch; regression run.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [compression vulnerable to Denial of Service via memory leak on premature response close ](https://github.com/advisories/GHSA-vc2v-76pw-4v95) | high | `<1.8.2` | As assessed above; no exploit attempted. |

## decode-uri-component

- Installed baseline: **0.2.2**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Mobile/navigation runtime; not unified web runtime.
- App-specific exposure: Malformed attacker-controlled deep-link parameters can reach mobile navigation parsing. Keep native behavior unchanged during this QA.
- Remediation: Review Expo-compatible router/query parser upgrade; current parser constraint excludes patched line.
- Safety / regression: Breaking/dependency constraint review; mobile deep-link/auth regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input ](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | moderate | `<=0.4.2` | As assessed above; no exploit attempted. |

## dompurify

- Installed baseline: **2.5.9**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: YES: administrator browser PDF export bundle.
- App-specific exposure: lib/export.ts uses text(), save(), not html(), addJS(), AcroForm, image decoders, fonts or server filesystem input. Specific vulnerable APIs are not called by current exports; not evidence the whole library is safe.
- Remediation: Review jsPDF 4.2.1+ and resulting sanitizer version; test PDF exports and CSP.
- Safety / regression: Major upgrade; approval and export/browser regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [DOMPurify allows Cross-site Scripting (XSS) ](https://github.com/advisories/GHSA-vhxf-7vqr-mrjg) | moderate | `<3.2.4` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: FORBID_TAGS bypassed by function-based ADD_TAGS predicate (asymmetry with FORBID_ATTR fix) ](https://github.com/advisories/GHSA-h7mw-gpvr-xq4m) | moderate | `<3.4.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify has a SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode ](https://github.com/advisories/GHSA-crv5-9vww-q3g8) | moderate | `>=1.0.10 <3.4.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: Cross-realm IN_PLACE sanitization leaves executable markup intact via realm-bound `instanceof` checks ](https://github.com/advisories/GHSA-hpcv-96wg-7vj8) | moderate | `<=3.4.5` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: IN_PLACE mode preserves attributes of a clobbered root element, allowing XSS via attacker-controlled root DOM ](https://github.com/advisories/GHSA-r47g-fvhr-h676) | moderate | `<=3.4.5` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify IN_PLACE Sanitization Bypass via Attached Shadow Root Inside <template>.content ](https://github.com/advisories/GHSA-rp9w-3fw7-7cwq) | moderate | `<=3.4.6` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of the 3.4.7 hook-pollution patch) ](https://github.com/advisories/GHSA-cmwh-pvxp-8882) | moderate | `<=3.4.10` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: Trusted Types policy survives `clearConfig()` and can poison later `RETURN_TRUSTED_TYPE` output ](https://github.com/advisories/GHSA-vxr8-fq34-vvx9) | low | `<3.4.9` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: `IN_PLACE` mode trusts attacker-controlled `nodeName` on live non-form nodes, allowing script retention and XSS via attacker-supplied DOM objects ](https://github.com/advisories/GHSA-x4vx-rjvf-j5p4) | low | `<=3.4.6` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: Hook mutation of `data.allowedTags` / `data.allowedAttributes` permanently pollutes `DEFAULT_ALLOWED_TAGS` / `DEFAULT_ALLOWED_ATTR` ](https://github.com/advisories/GHSA-76mc-f452-cxcm) | moderate | `<3.4.7` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify's ADD_TAGS function form bypasses FORBID_TAGS due to short-circuit evaluation ](https://github.com/advisories/GHSA-39q2-94rc-95cp) | moderate | `<=3.3.3` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify ADD_ATTR predicate skips URI validation ](https://github.com/advisories/GHSA-cjmm-f4jc-qw8r) | moderate | `<=3.3.1` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify USE_PROFILES prototype pollution allows event handlers ](https://github.com/advisories/GHSA-cj63-jhhr-wcxv) | moderate | `<=3.3.1` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify is vulnerable to mutation-XSS via Re-Contextualization  ](https://github.com/advisories/GHSA-h8r8-wccr-v5f2) | moderate | `<3.3.2` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS ](https://github.com/advisories/GHSA-55q2-fjhq-7xh7) | moderate | `<=3.4.12` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. ](https://github.com/advisories/GHSA-c2j3-45gr-mqc4) | low | `<=3.4.11` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [DOMPurify: IN_PLACE returns a force-removed rawtext root whose text carries attacker markup — pure HTML reparse executes ](https://github.com/advisories/GHSA-6688-9rhm-gjv2) | low | `<=3.4.15` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |

## eslint-config-next

- Installed baseline: **14.2.35**; direct workspace dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `@next/eslint-plugin-next`.

## expo

- Installed baseline: **57.0.19**; direct workspace dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/local-build-cache-provider`, `@expo/metro`, `@expo/metro-config`.

## expo-router

- Installed baseline: **57.0.18**; direct workspace dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Mobile/navigation runtime; not unified web runtime.
- App-specific exposure: Malformed attacker-controlled deep-link parameters can reach mobile navigation parsing. Keep native behavior unchanged during this QA.
- Remediation: Review Expo-compatible router/query parser upgrade; current parser constraint excludes patched line.
- Safety / regression: Breaking/dependency constraint review; mobile deep-link/auth regression required.
- Inherited findings: `query-string`.

## expo-splash-screen

- Installed baseline: **57.0.8**; direct workspace dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@expo/config-plugins`.

## fast-glob

- Installed baseline: **3.3.3**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `micromatch`.

## glob

- Installed baseline: **10.3.10**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [glob CLI: Command injection via -c/--cmd executes matches with shell:true ](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) | high | `>=10.2.0 <10.5.0` | As assessed above; no exploit attempted. |

## jspdf

- Installed baseline: **2.5.2**; direct workspace dependency; maximum severity **critical**.
- Final status: **still reported**.
- Production impact: YES: administrator browser PDF export bundle.
- App-specific exposure: lib/export.ts uses text(), save(), not html(), addJS(), AcroForm, image decoders, fonts or server filesystem input. Specific vulnerable APIs are not called by current exports; not evidence the whole library is safe.
- Remediation: Review jsPDF 4.2.1+ and resulting sanitizer version; test PDF exports and CSP.
- Safety / regression: Major upgrade; approval and export/browser regression required.
- Inherited findings: `dompurify`.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [jsPDF Bypass Regular Expression Denial of Service (ReDoS) ](https://github.com/advisories/GHSA-w532-jxjh-hjhj) | high | `<3.0.1` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF Denial of Service (DoS) ](https://github.com/advisories/GHSA-8mvj-3j78-4qmw) | high | `<=3.0.1` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has Local File Inclusion/Path Traversal vulnerability ](https://github.com/advisories/GHSA-f8cm-6447-x5h2) | critical | `<=3.0.4` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has PDF Injection in AcroFormChoiceField that allows Arbitrary JavaScript Execution ](https://github.com/advisories/GHSA-pqxr-3g65-p328) | high | `<=4.0.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF Vulnerable to Denial of Service (DoS) via Unvalidated BMP Dimensions in BMPDecoder ](https://github.com/advisories/GHSA-95fx-jjr5-f39c) | high | `<=4.0.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF Vulnerable to Stored XMP Metadata Injection (Spoofing & Integrity Violation) ](https://github.com/advisories/GHSA-vm32-vv63-w422) | moderate | `<=4.0.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has Shared State Race Condition in addJS Plugin ](https://github.com/advisories/GHSA-cjw8-79x6-5cj4) | moderate | `<=4.0.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has a PDF Object Injection via Unsanitized Input in addJS Method ](https://github.com/advisories/GHSA-9vjf-qc39-jprp) | high | `<4.2.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF Affected by Client-Side/Server-Side Denial of Service via Malicious GIF Dimensions ](https://github.com/advisories/GHSA-67pg-wm7f-q7fj) | high | `<4.2.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has a PDF Injection in AcroForm module allows Arbitrary JavaScript Execution (RadioButton.createOption and "AS" property) ](https://github.com/advisories/GHSA-p5xg-68wr-hm3m) | high | `<4.2.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has a PDF Object Injection via FreeText color ](https://github.com/advisories/GHSA-7x6v-j9x4-qf24) | high | `<=4.2.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |
| [jsPDF has HTML Injection in New Window paths ](https://github.com/advisories/GHSA-wfv2-pwc8-crg5) | critical | `<=4.2.0` | Current export calls text/save only; affected APIs not used. Upgrade still requires export regression. |

## metro

- Installed baseline: **0.84.5, 0.84.6**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `metro-config`, `metro-file-map`, `metro-transform-worker`.

## metro-config

- Installed baseline: **0.84.5, 0.84.6**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `metro`.

## metro-file-map

- Installed baseline: **0.84.5, 0.84.6**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `micromatch`.

## metro-transform-worker

- Installed baseline: **0.84.5, 0.84.6**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `metro`.

## micromatch

- Installed baseline: **4.0.8**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `braces`.

## next

- Installed baseline: **14.2.35**; direct workspace dependency; maximum severity **critical**.
- Final status: **still reported**.
- Production impact: YES: public Next App Router server, middleware and image optimizer.
- App-specific exposure: Public server exposure; App Router DoS remains relevant. Wildcard HTTPS image remotePatterns increases optimizer exposure. Server-side DB role checks help RBAC but do not fix framework vulnerabilities.
- Remediation: Review a supported patched Next major and matching React/eslint migration; the 2026-10-07 audit now suggests 16.4.0. No forced upgrade.
- Safety / regression: Breaking; approval and full web/PWA/auth/build regression required.
- Inherited findings: `postcss`.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration ](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | moderate | `>=10.0.0 <15.5.10` | Image optimizer configured with wildcard HTTPS host pattern; treat as exposed until fixed/reviewed. |
| [Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components ](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | high | `>=13.0.0 <15.0.8` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: HTTP request smuggling in rewrites ](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | moderate | `>=9.5.0 <15.5.13` | No custom server, WebSocket upgrade handler or external rewrite configuration found; redirects are present. |
| [Next.js: Unbounded next/image disk cache growth can exhaust storage ](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | moderate | `>=10.0.0 <15.5.14` | Image optimizer configured with wildcard HTTPS host pattern; treat as exposed until fixed/reviewed. |
| [Next.js has a Denial of Service with Server Components ](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | high | `>=13.0.0 <15.5.15` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js Vulnerable to Denial of Service with Server Components ](https://github.com/advisories/GHSA-8h8q-6873-q5fj) | high | `>=13.0.0 <15.5.16` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js's Middleware / Proxy redirects can be cache-poisoned ](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) | low | `>=12.2.0 <15.5.16` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces ](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) | moderate | `>=13.4.0 <15.5.16` | No matching nonce/untrusted beforeInteractive use found in source. |
| [Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting ](https://github.com/advisories/GHSA-vfv6-92ff-j949) | low | `>=13.4.6 <15.5.16` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js has cross-site scripting in beforeInteractive scripts with untrusted input ](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) | moderate | `>=13.0.0 <15.5.16` | No matching nonce/untrusted beforeInteractive use found in source. |
| [Next.js has a Denial of Service in the Image Optimization API ](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) | moderate | `>=10.0.0 <15.5.16` | Image optimizer configured with wildcard HTTPS host pattern; treat as exposed until fixed/reviewed. |
| [Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades ](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) | high | `>=13.4.13 <15.5.16` | No custom server, WebSocket upgrade handler or external rewrite configuration found; redirects are present. |
| [Next.js vulnerable to cache poisoning in React Server Component responses ](https://github.com/advisories/GHSA-wfc6-r584-vfw7) | moderate | `>=14.2.0 <15.5.16` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n ](https://github.com/advisories/GHSA-36qx-fr4f-26g5) | high | `>=12.2.0 <15.5.16` | App Router application; no Pages Router i18n configuration found. |
| [Next.js: Denial of Service in App Router using Server Actions ](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | high | `>=13.0.0 <15.5.21` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: Server-Side Request Forgery in Server Actions on custom servers ](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | high | `>=14.1.1 <15.5.21` | No custom server, WebSocket upgrade handler or external rewrite configuration found; redirects are present. |
| [Next.js: Cache confusion of response bodies for requests with bodies ](https://github.com/advisories/GHSA-68g3-v927-f742) | moderate | `>=13.0.0 <15.5.21` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences ](https://github.com/advisories/GHSA-4633-3j49-mh5q) | moderate | `>=13.0.0 <15.5.21` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: Unbounded Server Action payload in Edge runtime ](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | moderate | `>=13.0.0 <15.5.21` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname ](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | high | `>=12.0.0 <15.5.21` | No custom server, WebSocket upgrade handler or external rewrite configuration found; redirects are present. |
| [Next.js: Unauthenticated disclosure of internal Server Function endpoints ](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | moderate | `>=13.0.0 <15.5.21` | App Router/server/cache surface exists; applicability not excluded. Blocks unqualified security clearance. |
| [Next.js: Unauthenticated Remote Code Execution on windows-hosted servers ](https://github.com/advisories/GHSA-p293-qw3h-jr36) | critical | `>=13.4.0 <15.5.24` | Windows-only hosting condition does not match intended Vercel/Linux; no production host inspection performed. |
| [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used ](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) | critical | `>=10.0.0 <15.5.24` | Image optimizer configured with wildcard HTTPS host pattern; treat as exposed until fixed/reviewed. |

## node-forge

- Installed baseline: **1.4.0**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo signing/dev tooling; not web Supabase authentication runtime.
- App-specific exposure: Certificate/signature verification issue affects signing tooling on supplied keys/certificates. No browser/server auth usage found.
- Remediation: No compatible fixed 1.x resolution offered by current audit; obtain upstream patch/review Expo signing dependencies. Reject npm suggestion to downgrade Expo to 44.
- Safety / regression: Native toolchain review required; do not downgrade/reconfigure Expo.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements ](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | high | `<=1.4.0` | As assessed above; no exploit attempted. |

## postcss

- Installed baseline: **8.4.31**; transitive dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output ](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | moderate | `<8.5.10` | As assessed above; no exploit attempted. |
| [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments ](https://github.com/advisories/GHSA-6g55-p6wh-862q) | high | `<=8.5.11` | As assessed above; no exploit attempted. |
| [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset ](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | `<=8.5.22` | As assessed above; no exploit attempted. |
| [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure ](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | `<=8.5.17` | As assessed above; no exploit attempted. |

## postcss-nested

- Installed baseline: **6.2.0**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `postcss-selector-parser`.

## postcss-selector-parser

- Installed baseline: **6.1.4**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion ](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | moderate | `<7.1.6` | As assessed above; no exploit attempted. |

## query-string

- Installed baseline: **7.1.3**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Mobile/navigation runtime; not unified web runtime.
- App-specific exposure: Malformed attacker-controlled deep-link parameters can reach mobile navigation parsing. Keep native behavior unchanged during this QA.
- Remediation: Review Expo-compatible router/query parser upgrade; current parser constraint excludes patched line.
- Safety / regression: Breaking/dependency constraint review; mobile deep-link/auth regression required.
- Inherited findings: `decode-uri-component`.

## react-native

- Installed baseline: **0.86.3**; direct workspace dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Expo/Metro/native build or development dependency; not unified Next web runtime.
- App-specific exposure: Aggregate finding inherited from listed vulnerable children. No distinct advisory on this package; inspect descendant entries, including parser/deep-link runtime exceptions.
- Remediation: Upgrade compatible leaves first; review supported parent release for remaining descendants. Never use suggested Expo/React Native downgrades automatically.
- Safety / regression: Preserve mobile source/API behavior; native build/runtime regression required for parent or major changes.
- Inherited findings: `@react-native/community-cli-plugin`.

## source-map-js

- Installed baseline: **1.2.1**; transitive dependency; maximum severity **high**.
- Final status: **cleared in final audit**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [source-map-js allows event-loop denial of service through indexed source-map section offsets ](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | high | `>=1.0.0 <1.2.2` | As assessed above; no exploit attempted. |

## tailwindcss

- Installed baseline: **3.4.19**; direct workspace dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: Build/lint/development tooling; not identified in web request handlers.
- App-specific exposure: Attacker-controlled glob/CSS/source-map/config input is not accepted by this app. CI installs and PR builds remain an exposure; do not execute untrusted build inputs.
- Remediation: Use compatible fixed leaf version when allowed; pinned Next PostCSS/glob and Tailwind parser constraints require parent/override review.
- Safety / regression: Compatible leaf patches applied where available; pinned/major changes deferred. Build/lint and web/mobile regression required.
- Inherited findings: `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser`.

## uuid

- Installed baseline: **7.0.3**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Native Xcode project/build tooling; not unified web runtime.
- App-specific exposure: Affected UUID buffer-writing API is a transitive Xcode dependency; no untrusted buffer arguments found in app.
- Remediation: Review maintained Xcode/Expo parent dependency; patched uuid >=11.1.1 exceeds current ^7 range.
- Safety / regression: Breaking transitive API change; native generation/build regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided ](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | moderate | `<11.1.1` | As assessed above; no exploit attempted. |

## xcode

- Installed baseline: **3.0.1**; transitive dependency; maximum severity **moderate**.
- Final status: **still reported**.
- Production impact: Native Xcode project/build tooling; not unified web runtime.
- App-specific exposure: Affected UUID buffer-writing API is a transitive Xcode dependency; no untrusted buffer arguments found in app.
- Remediation: Review maintained Xcode/Expo parent dependency; patched uuid >=11.1.1 exceeds current ^7 range.
- Safety / regression: Breaking transitive API change; native generation/build regression required.
- Inherited findings: `uuid`.

## xlsx

- Installed baseline: **0.18.5**; direct workspace dependency; maximum severity **high**.
- Final status: **still reported**.
- Production impact: YES: administrator browser Excel export.
- App-specific exposure: Export-only json_to_sheet/writeFile; no untrusted workbook parsing found. Report rows can contain user-controlled strings; review export/formula safety separately.
- Remediation: No npm fix reported. Review maintained vendor distribution/replacement and integrity/provenance; do not silently swap sources.
- Safety / regression: Distribution/API change; approval and import/export regression required.

| Advisory | Severity | Vulnerable range | Specific applicability |
|---|---|---|---|
| [Prototype Pollution in sheetJS ](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) | high | `<0.19.3` | As assessed above; no exploit attempted. |
| [SheetJS Regular Expression Denial of Service (ReDoS) ](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | high | `<0.20.2` | As assessed above; no exploit attempted. |

## Outstanding decisions

Next.js major upgrade is a production blocker; review it separately, including React compatibility, async request APIs, middleware, auth cookies, image optimization and SW release behavior. Review jsPDF and SheetJS remediation explicitly; the export-only usage lowers demonstrated exposure but is not a blanket waiver. Pinned transitive PostCSS 8.4.31 and glob 10.3.10 remain inside Next dependencies; do not silently override a vendor pin without validating that integration. Mobile parser/toolchain majors remain deferred to preserve native compatibility.
