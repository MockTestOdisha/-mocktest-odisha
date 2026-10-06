import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Never run device protection on the login page.
  if (pathname === "/login") {
    return NextResponse.next();
  }

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

  // Public visitor.
  if (!user) {
    return response;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Admins are not restricted to one device.
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
   * Convert the device token into the same
   * SHA-256 hash stored in Supabase.
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

  if (
    verifyError ||
    verified !== true
  ) {
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
