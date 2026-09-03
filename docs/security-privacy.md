# Security And Privacy Notes

## Anti-Cheating

Implemented controls:

- Dynamic QR codes with short expiry and server-side hash validation
- In-app live camera capture only
- No gallery upload path for attendance evidence
- Registered-device verification
- One active device per student enforced by a partial unique index
- Duplicate attendance prevention by `(event_id, student_id)`
- GPS accuracy validation
- PostGIS server-side circle/polygon checks
- Server-generated timestamps
- Suspicious flags for administrator review
- Idempotency keys for offline retry protection

Recommended production additions:

- Native mock-location and rooted-device detection modules
- Duplicate photo perceptual hashing
- impossible travel checks against prior verified submissions
- SSO integration for school accounts
- signed QR payloads or short-lived token rows with cleanup jobs

## Privacy

The mobile app includes a privacy notice. Operationally:

- Location is requested only for distance checks and attendance actions.
- The app does not continuously track students.
- Photos are used as attendance evidence.
- Only authorized administrators can review evidence.
- Photo retention is event-configurable.
- Students can submit absence, late, and correction requests.
