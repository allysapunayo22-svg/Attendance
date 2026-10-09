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
4. Generate a QR code on `/admin/live-attendance`.
5. Watch the live table update when a student submits attendance.
6. Review the submitted record on `/admin/review-queue`.
7. Export reports from `/admin/reports` as CSV, Excel, and PDF.

## Student Web Manual Test

1. Log in with an active student account and confirm the role redirect opens `/student`.
2. Open events, event details, attendance history, attendance details, announcements, notifications, and profile. Refresh each direct URL and confirm the session persists.
3. Confirm attendance history comes from `public.attendance_sessions` and remains available in another browser with the same account.
4. Change an event or attendance record identifier in the URL to one owned by another student or hidden by event targeting. The page must show an unavailable state rather than data.
5. Confirm targeted announcements are visible only to intended students and global announcements remain visible to active students.
6. Mark one notification and all notifications as read, refresh, and confirm the server-backed state persists.
7. Verify web event details explain that attendance capture remains available through the mobile app; no web check-in or check-out succeeds in Phase 2A.
8. Test at representative 375 px, 412 px, 768 px, and 1440 px widths. Check safe-area spacing, bottom navigation, keyboard focus, and horizontal overflow.
9. Confirm logout returns to `/login`, anonymous requests redirect there, students cannot open `/admin`, and admins cannot open `/student`.

## Mobile authentication

Run callback and account-feedback checks with Node 22.6+:

```bash
npm --workspace @attendance/mobile run test:auth
npm --workspace @attendance/mobile run typecheck
```

On a physical phone, with email redirects configured as described in setup:

1. Check both forms with the keyboard open, a small screen, and larger system text. Keyboard Next advances fields, password visibility toggles independently, and validation focuses the first invalid text field.
2. Enter student details, continue to security, then go back. Values should remain. Verify mismatched passwords and missing privacy acceptance prevent registration; the privacy notice is accessible before accepting.
3. Register a test roster student. Open the confirmation email on that phone, confirm the success screen, and sign in. Test resend both from the post-registration screen and from login. Repeated taps must not duplicate requests; the countdown survives navigating away and back.
4. Request a reset using a test account. Open the email with the app already running, then repeat after closing the app. Set a different password, sign in with it, and verify the old password fails. Verify recovery never takes the user directly into attendance.
5. Open an expired, incomplete, or previously invalidated link. Check that the app offers a new email request. Opening the callback route without a link must not expose a password form.
6. Disable internet before submission and while a request is in flight. Check for useful feedback and preserved entries; reconnect and retry.
7. Test unconfirmed email, pending review, inactive account, and incorrect credentials. Each should offer an appropriate next step. Campus help must be available without signing in; test it both with and without a configured support mailbox.

Automated callback tests do not exercise real SMTP delivery, hosted Supabase settings, native OS link handling, or the school's roster database. Those require the device checks above.
