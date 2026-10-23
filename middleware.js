import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // 1. Never block login, static assets, or API endpoints
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visitor not logged in
  if (!user) {
    return response;
  }

  // 2. Fetch role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admins or non-students bypass single-device restriction
  if (profile.role === "admin" || profile.role !== "student") {
    return response;
  }

  // 3. Check student device cookie
  const deviceCookie = request.cookies.get("mocktest_student_device");

  if (!deviceCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "device");

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Delete stale cookie to break the lockout loop
    redirectResponse.cookies.delete("mocktest_student_device");
    return redirectResponse;
  }

  // 4. Hash device token
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(deviceCookie.value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
  const sessionTokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // 5. Verify against Supabase RPC
  const { data: verified, error: verifyError } = await supabase.rpc(
    "verify_student_device_session",
    {
      p_user_id: user.id,
      p_session_token_hash: sessionTokenHash,
    }
  );

  if (verifyError || verified !== true) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "device");

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Delete invalid cookie on failure
    redirectResponse.cookies.delete("mocktest_student_device");
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
