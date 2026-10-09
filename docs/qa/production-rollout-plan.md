# Production rollout and rollback plan — NOT EXECUTED

No production connection, read, migration, environment change, Edge deployment or Vercel deployment is authorized by this report. Current release decision: **NOT READY FOR PRODUCTION**. This is an operator plan for a later, separately approved rollout.

## Identity and release gates

- Approved QA project: `tosfspsjervmgrpncnsw`. Production candidate: `aeffervvqtejdmlmaoga`. Do not infer project identity from a generic project name, database name, or an ambient CLI link.
- Resolve the offline ownership/session/retry blockers and dependency review, pass physical acceptance, and repeat final regressions on the final candidate. Review every existing uncommitted change; this workspace contains the earlier migration work as well as QA changes.
- Obtain explicit production-read approval before diagnostics; separate rollout approval before writes. Verify project ref/URL, CLI account/permissions and credential issuer without printing secrets. Stop on mismatch.
- Tag an immutable reviewed commit; record migration checksums, build ID, SW cache version, dependency lockfile, deployed Edge source/version/JWT settings and Vercel rollback deployment ID. Do not use the staging-built `.next` output for production: public environment variables are compiled into it.

## Database checkpoint and migration order

1. Under later rollout approval, establish a maintenance window covering admin writes, student web submissions **and existing mobile clients**. UI hiding alone cannot pause native writes; document an operational pause and enforce a reviewed server-side pause if one becomes necessary. No unreviewed maintenance mechanism is included here.
2. Verify backup/PITR entitlement, take a database checkpoint and export schema/grants/RLS, record migration history and verify a restore procedure in an isolated project. Database backups do not substitute for a Storage object backup/inventory. Capture existing Edge and Vercel configurations separately. Agree recovery point/time objectives before proceeding.
3. With production-read approval, run [production-readonly-diagnostics.sql](production-readonly-diagnostics.sql) through an explicit verified connection. It is repeatable-read/read-only, returns counts/metadata and ends with rollback. **It has not been executed on production.** Review every count; do not repair historical rows or validate constraints automatically. Stop on missing objects, unexpected migration history or data incompatibility.
4. Compare deployed 001–007 checksums/history with the candidate. Establish which of 008–013 are genuinely pending; never replay applied migrations or repair history to conceal drift. The expected pending chain is **008 → 009 → 010 → 011 → 012 → 013**. Review the CLI dry-run against that exact set before applying anything; never run an uninspected broad `db push`.
5. Apply immutable files through the migration runner, one migration at a time with normal transaction/history recording; stop at the first failure and capture SQLSTATE/message without secrets. 008 tightens visibility. 009 adds authoritative submission. 010 revokes legacy execution and adds two **NOT VALID** constraints; new/updated rows are still checked. 011 adds active-admin/review hardening and the hosted `storage.objects` ownership compatibility correction. 012 qualifies pgcrypto through `extensions.digest`. 013 adds authenticated browser-device enrollment/resolution. Do not edit these files or validate 010 constraints during rollout.
6. Verify required tables and RLS, visibility helpers, device functions, active-admin helpers, hardened RPC ownership/search_path/grants. Verify the hosted `extensions` pgcrypto installation and managed Storage ownership without attempting to take ownership. Re-run the read-only constraint metadata check; both 010 flags must remain false.
7. Run the grant inventory below and compare with the exact migrations. `submit_attendance_v2`, `review_attendance_v2`, `generate_event_qr_token` allow intended authenticated calls, not PUBLIC/anon; restricted helpers and `log_audit` must not allow PUBLIC/anon/authenticated. Hardened SECURITY DEFINER functions are owned by `postgres` with `search_path=pg_catalog, public`. Trigger functions may intentionally be SECURITY INVOKER: do not bulk-change them. Visibility/RLS helpers have their explicitly intended anon/authenticated grants.

```sql
-- Read-only catalog inventory, planned for the verified production connection.
select p.oid::regprocedure as signature, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.proconfig as settings,
       exists(select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
              where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute,
       p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'submit_attendance_v2','review_attendance_v2','generate_event_qr_token',
 'verify_attendance_submission','student_is_assigned_to_event',
 'event_point_is_inside_zone','validate_qr_token','log_audit',
 'student_can_access_event','student_can_access_announcement','is_active_admin',
 'register_student_device_v1','resolve_student_device_v1') order by 1;
```

Include all overloads of the migration 013 device RPCs when verifying grants. Query Storage bucket privacy, MIME/size limits and `pg_policies` as well. No student DELETE policy exists in this migration chain; do not broaden permissions for orphan cleanup.

## Edge Function deployment checklist

After database verification, deploy exactly:

- `supabase/functions/submit-attendance/index.ts` and its `validation.ts`.
- `supabase/functions/review-attendance/index.ts` and its `validation.ts`.
- `supabase/functions/generate-qr/index.ts` and its `validation.ts`.

All three import `_shared/cors.ts` and `_shared/supabase.ts`; include that reviewed shared code. The latter imports `https://esm.sh/@supabase/supabase-js@2.110.1`. npm audit does not cover this Deno URL dependency; review its provenance/version and run hosted contracts separately. Runtime configuration uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; no staging ref, URL or key was found hardcoded in these function/shared sources. Never give a service-role key to web/mobile clients.

Under later approval, each deployment command must have an explicit verified production `--project-ref`, e.g. `supabase functions deploy submit-attendance --project-ref aeffervvqtejdmlmaoga`, then the other two individually. Preserve the reviewed JWT-verification configuration; do not add `--no-verify-jwt` to bypass failures. Verify anonymous/malformed/inactive/wrong-role calls, storage access, accepted submission, idempotent replay, review audit actor and QR hashing before enabling traffic. Existing `resolve-student-login` and `verify-student-registration` are dependencies of existing login/registration flows: verify their deployed compatibility; this plan does not silently redeploy them or `send-notification`.

## Vercel configuration and domain/auth checklist

Intended paths are `/login`, `/admin/*`, `/student/*`, `/offline`; the server role/layout checks and existing legacy admin redirects must remain. `/offline` is a generic public shell, not an authentication grant.

Local repo-root `vercel.json` defines framework Next.js, build command `npm --workspace @attendance/admin-web run build`, output `apps/admin-web/.next`. Use repository root as the documented configuration with npm workspace installation (`npm ci`) and lockfile. If the existing Vercel project uses `apps/admin-web` as Root Directory, review that configuration explicitly: install must include workspace packages and the output should be `.next` relative to that root. Do not combine the root-relative build/output settings with the subdirectory root. Dashboard settings were **not inspected** because production access is prohibited; root/framework inference therefore still needs approval-time confirmation.

Production env names: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Verify the URL exactly matches the production project and the public key belongs to it; store secrets in Vercel settings, never source or report. Preview/staging envs must remain staging. Rebuild after changing public envs. Enforce HTTPS; camera, geolocation and service workers require a secure browser context. Manifest `/manifest.webmanifest`, SW `/sw.js` at root scope, icons `/pwa/*`, start URL `/student`; avoid caching personalized HTML/API responses at the CDN. Verify SW response cache headers, middleware redirects and protected pages on the eventual preview before promotion.

The earlier referenced domain is **`https://clickin-admin.vercel.app`**, treated as a candidate, not independently confirmed. If retained and confirmed by the owner, the exact Auth configuration plan is:

| Setting | Candidate URL / action |
|---|---|
| Supabase Site URL | `https://clickin-admin.vercel.app` |
| Password login entry | `https://clickin-admin.vercel.app/login` (implemented; role determines destination) |
| Redirect allowlist for current password-only web flow | No additional callback URL needed by `signInWithPassword`; do not treat allowlisting as route implementation |
| Existing mobile redirect | Preserve existing `attendance://auth-callback` and any currently required Expo/native entries; verify rather than replace the allowlist |
| Web PKCE recovery callback | `https://clickin-admin.vercel.app/auth/callback?type=recovery` — implemented; apply only after the domain is confirmed |
| Web reset form | `https://clickin-admin.vercel.app/reset-password` — implemented and protected by the verified recovery session |
| Recovery flow | The callback exchanges the recovery code, marks a short-lived same-origin recovery session, and sends the user to `/reset-password`; allowlist the exact callback URL, not a broad wildcard |

The Web routes exist and their local regression tests pass. End-to-end email delivery and the hosted callback remain unverified until the staging HTTPS origin and final production domain are confirmed and allowlisted. No Auth settings were changed. If the canonical domain differs, replace all candidate values consistently before approval.

## Service-worker release process

Current cache is explicit `clickin-student-shell-v4`. Bump the suffix in `public/sw.js` for **every release changing offline HTML/chunks/assets**, rebuild and confirm new worker bytes, install completion and old-cache deletion. The local same-origin v3-to-v4 release-transition test preserved the queued record, owner, idempotency key and Blob evidence; removed the v3 cache; retained no authenticated HTML; and showed no reload loop across a full browser restart. Repeat this transition on the deployed HTTPS staging origin in an installed PWA on real iPhone and Android hardware before rollout. Never clear IndexedDB to fix a SW asset issue.

## Orphan evidence: smallest proposed preproduction design

Client cleanup cannot be trusted: no student DELETE grant, and the current helper treats an error-free empty removal result as success. Interrupted uploads, rejected/stale attempts, abandoned captures and local data eviction can leave private server objects. The event `photo_retention_days` column alone does not schedule deletion.

Before general rollout, approve a privileged scheduled cleanup process: dry-run first, private `attendance-evidence` bucket only, stable owner/event/local-ID path shape, age grace **longer than the 2h offline freshness window plus clock-skew and operational retry margin** (propose at least 24h, confirm retention policy), and skip every path referenced by accepted sessions, evidence records or any retained sync response. Recheck references immediately before deletion; use Storage API (never raw storage table deletion), bounded batches, idempotent retries and an audit trail. Separate accepted-evidence retention/legal holds from orphan cleanup. Protect in-flight/finalization races; approval must define this invariant before implementation. No new job, migration or Storage permission was created in this QA. Until that decision is approved, orphan retention remains a release issue rather than an invisible post-launch cleanup promise.

## Smoke tests and rollback

Use only approved production smoke identities and minimal reversible actions after rollout approval, never staging passwords/fixtures. Check all three roles, anonymous/inactive blocks, visibility, registration compatibility with mobile, browser-device replacement, online and queued attendance, stale/future rejection, geofence/photo/QR rules, idempotency, review/evidence/audit and logout. Monitor controlled 4xx vs unexpected 5xx, latency, RLS denials, queue rejection and orphan growth. Stop rollout on unauthorized access, duplicate/corrupt attendance, sustained submission failure or evidence loss.

| Failure | Safe response | Reversibility limits |
|---|---|---|
| Migration fails | Stop chain, retain error and transaction/history state; compare committed state to checkpoint; approved forward correction | No assumed down migrations. Restore only after assessing post-checkpoint writes and Storage separately |
| Edge regression | Pause submissions through reviewed operational control; redeploy captured previous compatible function/shared code/config | Do not restore a legacy insecure attendance path or reopen revoked RPC grants; a secure forward fix may be required |
| Vercel regression | Promote previous verified deployment only if compatible with hardened database/Edge contract | Old bundles may call now-locked legacy RPCs. A deploy rollback does not roll back database, sessions, IndexedDB or SW |
| SW/PWA regression | Ship fixed worker under a new cache version and controlled reload; preserve queued blobs/IDs | Previously installed/offline clients cannot be instantly recalled; wait for online update and verify repair |
| Attendance regression | Halt new acceptance, retain queues/evidence/audit, diagnose with read-only counts, forward fix then idempotent replay | Never fabricate success, rewrite capture times, loosen freshness/RLS or bulk-delete historical records |

Database backup restore is a last-resort coordinated recovery, not a routine inverse of migrations. Any corrective migration, retention job or change to historical rows needs separate scope/review. Production rollout remains blocked until this plan's gates and final acceptance are satisfied.
