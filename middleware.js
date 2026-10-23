import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Completely bypass static assets, API routes, and public auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/contact"
  ) {
    return NextResponse.next();
  }

  // 2. Build Supabase SSR client for middleware
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Get currently authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to login without any device error query
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verify device session token
  const deviceToken = request.cookies.get("mocktest_student_device")?.value;

  // If user is logged in but the device cookie is missing or invalid
  if (!deviceToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "device");
    
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Explicitly delete any stale cookies so the browser doesn't loop
    redirectResponse.cookies.delete("mocktest_student_device");
    return redirectResponse;
  }

  // 5. Check active session via Supabase RPC
  try {
    const { data: isValid, error } = await supabase.rpc(
      "verify_student_device_session",
      {
        p_user_id: user.id,
        p_session_token_hash: deviceToken,
      }
    );

    // If RPC fails or returns false, clear cookie and redirect
    if (error || !isValid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "device");

      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete("mocktest_student_device");
      return redirectResponse;
    }
  } catch (err) {
    // Fail gracefully on unexpected exceptions to prevent hard lockout
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
