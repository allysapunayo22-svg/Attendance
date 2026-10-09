# Orphan evidence cleanup

`cleanup-orphan-evidence` is a privileged Edge Function for the private `attendance-evidence` bucket. It inventories Storage itself and never accepts a bucket or object path from the caller. A dedicated `ORPHAN_CLEANUP_SECRET` is required in `x-cleanup-secret`; student and anonymous sessions do not authorize the function.

The request body supports only `dryRun` and `limit`. `dryRun` defaults to `true`; `limit` defaults to and may never exceed 100. An explicit cleanup request is:

```json
{ "dryRun": false, "limit": 100 }
```

An object is eligible only when its path matches `{user-uuid}/{event-uuid}/{local-id}.jpg`, its trusted Storage creation time is at least 24 hours old, and neither `attendance_sessions` nor `attendance_evidence` references it. The function repeats the reference check immediately before deletion. Each run and each considered, skipped, authorized, deleted, or failed item is appended to `audit_logs`.

## Proposed schedule

Run one bounded dry-run daily while reviewing initial audit results. After the retention behavior is accepted, schedule one explicit cleanup daily during a low-traffic period. Supabase Cron can call the Edge Function through `pg_net`, with the project URL and cleanup secret stored in Vault. Keep the secret out of the SQL command, repository, and job history. Scheduling is an environment operation and is not enabled by this repository change.

Rotate `ORPHAN_CLEANUP_SECRET` if it is exposed. Do not grant Storage DELETE to `authenticated`, students, or anonymous users.
