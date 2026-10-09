import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE_NAME } from "@/lib/auth/recovery";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
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
  const { data } = await supabase.auth.getUser();
  const recoveryUserId = request.cookies.get(RECOVERY_COOKIE_NAME)?.value;
  if (!data.user || recoveryUserId !== data.user.id) {
    return NextResponse.json({ error: "Recovery session expired." }, { status: 401 });
  }

  response.cookies.set(RECOVERY_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
