import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE_MAX_AGE_SECONDS, RECOVERY_COOKIE_NAME } from "@/lib/auth/recovery";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { userId?: unknown } | null;
  if (!body || typeof body.userId !== "string") {
    return NextResponse.json({ error: "Invalid recovery request." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      }
    }
  );
  const [{ data, error }, { data: claimData, error: claimError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims()
  ]);
  const authenticationMethods = claimData?.claims?.amr;
  const recoveryMethod = Array.isArray(authenticationMethods)
    && authenticationMethods.some((entry) => typeof entry === "object" && entry !== null && "method" in entry && entry.method === "otp");
  if (error || claimError || !data.user || data.user.id !== body.userId || !recoveryMethod) {
    return NextResponse.json({ error: "Recovery session could not be verified." }, { status: 401 });
  }

  response.cookies.set(RECOVERY_COOKIE_NAME, data.user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS
  });
  return response;
}
