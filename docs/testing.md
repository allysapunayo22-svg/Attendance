# Testing Instructions

## Static Checks

After installing dependencies:

```bash
npm run typecheck
npm run lint
```

## Database Checks

```bash
supabase db reset
supabase functions serve
```

Then test:

- RLS denies a student reading another student profile.
- RLS denies direct student updates to attendance reviews.
- Assigned students can read published events.
- Unassigned students cannot read restricted events.
- `verify_attendance_submission` rejects outside-zone coordinates.
- `verify_attendance_submission` rejects low GPS accuracy.
- `verify_attendance_submission` accepts an unexpired dynamic QR hash.

## Mobile Manual Test

1. Log in as a student.
2. Confirm cached events render before refresh completes.
3. Disable internet.
4. Open an event and submit Time In.
5. Confirm local success message says pending offline upload.
6. Re-enable internet.
7. Confirm the sync queue uploads the photo and server verification updates the local record.
8. Submit Time Out and confirm minimum duration behavior.

## Admin Manual Test

1. Log in as an admin.
2. Create an event with a radius and dynamic QR enabled.
3. Publish the event.
4. Generate a QR code on `/attendance/live`.
5. Watch the live table update when a student submits attendance.
6. Review the submitted record on `/attendance/review`.
7. Export reports from `/reports` as CSV, Excel, and PDF.
