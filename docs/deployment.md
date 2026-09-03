# Deployment

## Supabase

1. Create a Supabase project.
2. Enable PostGIS.
3. Run migrations with `supabase db push`.
4. Deploy Edge Functions:

```bash
supabase functions deploy submit-attendance
supabase functions deploy review-attendance
supabase functions deploy generate-qr
supabase functions deploy send-notification
supabase functions deploy verify-student-registration
supabase functions deploy resolve-student-login
```

5. Set function secrets:

```bash
supabase secrets set EXPO_ACCESS_TOKEN=your-token
supabase secrets set DEFAULT_PHOTO_RETENTION_DAYS=180
```

## Admin Dashboard

Deploy `apps/admin-web` to Vercel or another Next.js host.

Required env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not configure the service-role key in the admin web host unless it is used only by server-only code.

## Mobile App

Use EAS Build for production Expo builds:

```bash
cd apps/mobile
npx eas build --platform android
npx eas build --platform ios
```

Required env:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Configure iOS and Android permissions for location, camera, and notifications before store submission.

## Storage Retention

Attendance photo retention is configured per event in `events.photo_retention_days`. Use a scheduled job or Supabase cron to remove expired files from `attendance-evidence` after the retention window.
