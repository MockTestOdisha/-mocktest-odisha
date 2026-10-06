import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              request.cookies.set(
                name,
                value
              );

              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in.
  if (!user) {
    return response;
  }

  // Get the user's role.
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // If the profile cannot be verified,
  // don't allow the authenticated request.
  if (profileError || !profile) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Admins can use multiple devices.
  if (profile.role === "admin") {
    return response;
  }

  // Only students are restricted.
  if (profile.role !== "student") {
    return response;
  }

  const deviceCookie = request.cookies.get(
    "mocktest_student_device"
  );

  // Student has no device session.
  if (!deviceCookie?.value) {
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "error",
      "device"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * The database stores only the SHA-256
   * hash of the device token.
   */
  const encoder = new TextEncoder();

  const tokenData = encoder.encode(
    deviceCookie.value
  );

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      tokenData
    );

  const hashArray =
    Array.from(
      new Uint8Array(hashBuffer)
    );

  const sessionTokenHash =
    hashArray
      .map((byte) =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");

  const {
    data: verified,
    error: verifyError,
  } = await supabase.rpc(
    "verify_student_device_session",
    {
      p_user_id: user.id,
      p_session_token_hash:
        sessionTokenHash,
    }
  );

  if (verifyError || verified !== true) {
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "error",
      "device"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on normal pages, but not API routes,
     * Next.js internals, or static files.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
