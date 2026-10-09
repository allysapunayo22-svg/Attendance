# Final functional blocker remediation

Date: 2026-10-09. Target: Supabase staging project `tosfspsjervmgrpncnsw`. Production project `aeffervvqtejdmlmaoga` was not connected to, read, changed, or deployed. Production remains blocked.

## Web password recovery

The shared Web login now links to `/forgot-password`. The form validates email input, invokes Supabase recovery with a fixed same-origin `/auth/callback?type=recovery` destination, and returns the same neutral confirmation for every provider outcome. It does not expose account existence.

`/auth/callback` accepts Supabase PKCE query-code and legacy recovery-fragment formats. Fragment tokens are read only in the browser, removed from browser history immediately, and never rendered or logged. A verified Supabase user with the recovery session's `otp` authentication method is required before the server sets a 15-minute HttpOnly, SameSite recovery marker bound to that user; an ordinary password-login session cannot create the marker. `/reset-password` requires both that marker and a valid Supabase session. The reset form uses the shared minimum-eight-character rule, requires matching confirmation, clears the marker, signs out globally, and returns to `/login?reason=password_reset`.

Password recovery does not write role data. Staging login after reset confirmed the trusted database roles and destinations remained `student` → `/student` and `admin` → `/admin`.

Staging Auth received only these additional redirect URLs:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?type=recovery`
- `http://localhost:3000/reset-password`

A final configuration diff reported no pending update for the allowlist. Other remote-only Auth, database, and Storage settings were left unchanged. The staging email provider reached `over_email_send_rate_limit` during repeated validation. The application masked this with its neutral response; end-to-end callback/reset validation used a synthetic staging recovery link without displaying its token.

## Orphan evidence cleanup

`cleanup-orphan-evidence` is deployed only to staging. It has JWT gateway verification disabled so a scheduler can call it, but the function itself requires a dedicated 256-bit staging secret in `x-cleanup-secret`. Missing, anonymous, student, and incorrect credentials return 401. The request accepts only `dryRun` and `limit`; dry-run defaults to true, and the hard maximum is 100 objects.

The function hardcodes the private `attendance-evidence` bucket, recursively inventories trusted Storage state, validates `{user UUID}/{event UUID}/{local-id}.jpg`, and uses Storage `created_at` for the fixed 24-hour threshold. It checks both `attendance_sessions` photo fields and `attendance_evidence.storage_path`, then repeats the canonical reference check immediately before deletion. It does not read or trust the client `evidenceOrphaned` flag. Deletion uses the privileged Storage API and does not add a student or anonymous DELETE policy.

The existing protected `audit_logs` table was sufficient, so no migration was required. The service writes run start/completion, considered, skipped, dry-run candidate, delete-authorized, deleted, and failed records. Completion metadata includes bounded-run counts. An audit failure closes the operation rather than allowing unaudited deletion; per-object Storage failures are recorded and do not authorize broader deletion.

The proposed schedule is once daily, initially in dry-run mode. Supabase Cron/`pg_net` can call the function with the URL and secret held in Vault. No schedule was enabled in staging or production during this work.

## Hosted staging evidence

- Anonymous and wrong-secret cleanup calls: 401.
- Malformed cleanup JSON: 400.
- Authorized default request: 200, dry-run true, zero deletions.
- Controlled old referenced evidence: preserved in dry-run and explicit cleanup.
- Controlled evidence younger than 24 hours: preserved.
- Controlled old unreferenced evidence: reported as a dry-run candidate and deleted only by the explicit cleanup call.
- Run/item and completion-summary audit records: present.
- Synthetic reference row and all three synthetic Storage objects: removed after validation.
- One pre-existing staging object that independently met the same old/unreferenced criteria was also removed by the explicit bounded cleanup run.
- Valid recovery callback: accepted in headless Chrome without token output.
- Ordinary password session attempting to create a recovery marker: 401; recovery `otp` session: 200 with an HttpOnly marker.
- Reset without recovery session: denied.
- Password update: completed and redirected to login.
- Student login after reset: passed with role `student` and `/student` destination.
- Admin login after reset: passed with role `admin` and `/admin` destination.

## Regression results

| Check | Result |
|---|---|
| Admin/Student Web tests | PASS, 13/13 files |
| Password recovery and cleanup tests | PASS, included above |
| Mobile auth test | PASS, 1/1 |
| Edge security/validation contracts | PASS, 4/4 |
| Migrations 001–013 in isolated PostgreSQL | PASS |
| Rollback-only SQL security suites | PASS, 8/8 |
| Migration 010 constraints | PASS, both remain NOT VALID |
| Admin TypeScript / Mobile TypeScript | PASS / PASS |
| Admin lint | PASS, zero findings |
| Mobile lint | PASS, zero errors and 19 pre-existing warnings |
| Staging-configured Admin production build | PASS; forbidden production ref absent from 290 build files |
| `git diff --check` | PASS |
| High-confidence repository secret scan | PASS, 320 files and zero matches |
| npm audit | 34 affected packages: 1 critical, 20 high, 13 moderate |
| npm audit `--omit=dev` | 27 affected packages: 1 critical, 15 high, 11 moderate |

The audit counts match the accepted dependency-remediation baseline and remain concentrated in the preserved Mobile/Expo/toolchain tree. No forced audit fix or Mobile major upgrade was performed.

## Release status

The two functional blockers in this task are implemented and validated on staging. Production remains **BLOCKED**. Required remaining gates are the separately scoped Mobile/Expo major dependency review and native builds, plus real iPhone/Safari and Android/Chrome acceptance for camera, GPS, optical QR, offline close/reopen, reconnect synchronization, and installed-PWA behavior. No physical-device row was marked passed. No production deployment or production Supabase action occurred.
