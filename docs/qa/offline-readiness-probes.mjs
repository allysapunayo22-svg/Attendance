// Final QA acceptance probes. These deliberately assert the required behavior,
// not the current implementation. Run separately from the existing unit suite:
// node --experimental-strip-types docs/qa/offline-readiness-probes.mjs
// No network, credentials, database writes, or real photographs are involved.
import { processOfflineRecord } from '../../apps/admin-web/lib/student/offline/sync-core.ts';
import { AttendanceTransportError } from '../../apps/admin-web/lib/student/attendance/workflow.ts';

const results = [];
function record() {
  return {
    ownerId: 'student-a', localId: 'capture', eventId: 'event',
    browserFingerprintHash: 'browser', state: 'queued',
    attemptCount: 0, automaticRetryCount: 0,
    evidenceBlob: new Blob(['synthetic'], { type: 'image/jpeg' }),
    payload: { event_id: 'event', mode: 'time_in', local_id: 'capture',
      idempotency_key: 'stable-key', is_offline_submission: true }
  };
}
function harness() {
  const updates = [], submissions = [];
  const deps = {
    now: () => Date.now(), currentFingerprint: async () => 'browser',
    authenticatedOwnerId: async () => authenticatedUser,
    isCancelled: () => false,
    resolveDevice: async () => ({ active: true, deviceId: 'device' }),
    uploadEvidence: async () => {}, removeEvidence: async () => false,
    submit: async payload => {
      submissions.push(payload);
      return { accepted: true, status: 'verified', suspicious_flags: [] };
    },
    update: async (_id, update) => updates.push(update)
  };
  let authenticatedUser = 'student-a';
  return { deps, updates, submissions, setAuthenticatedUser: value => { authenticatedUser = value; } };
}

{
  const h = harness();
  await processOfflineRecord(record(), 'student-b', false, h.deps);
  results.push({ check: 'Mismatched record owner cannot submit', pass: h.submissions.length === 0,
    observation: `${h.submissions.length} submission(s) attempted` });
}
{
  const h = harness();
  const submittedAs = [];
  h.deps.uploadEvidence = async () => { h.setAuthenticatedUser('student-b'); };
  h.deps.submit = async () => {
    submittedAs.push('student-b');
    return { accepted: false, status: 'rejected', suspicious_flags: [] };
  };
  await processOfflineRecord(record(), 'student-a', false, h.deps);
  results.push({ check: 'Account change during upload prevents submission', pass: submittedAs.length === 0,
    observation: `Submission attempted after dependency identity changed: ${submittedAs.join(', ')}` });
}
{
  const h = harness();
  h.deps.submit = async () => { throw new AttendanceTransportError('Session expired; sign in again', false); };
  await processOfflineRecord(record(), 'student-a', false, h.deps);
  const last = h.updates.at(-1);
  const cleared = Object.hasOwn(last, 'evidenceBlob') && last.evidenceBlob === undefined;
  results.push({ check: 'Session expiry preserves recoverable evidence without authoritative rejection',
    pass: last.state !== 'rejected' && !cleared,
    observation: `state=${last.state}, Blob cleared=${cleared}, server result present=${Boolean(last.authoritativeResult)}` });
}

console.log(JSON.stringify({ scope: 'isolated sync-core acceptance probes; not a hosted exploit', results }, null, 2));
process.exitCode = results.every(result => result.pass) ? 0 : 1;
