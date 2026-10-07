import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. GET CURRENT USER
    // --------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Logout user lookup error:",
        userError
      );
    }

    // --------------------------------------------------
    // 2. RELEASE DEVICE SESSION
    // --------------------------------------------------

    if (user) {
      const {
        data: released,
        error: releaseError,
      } = await supabase.rpc(
        "release_student_device_session",
        {
          p_user_id: user.id,
        }
      );

      if (releaseError) {
        console.error(
          "DEVICE RELEASE RPC ERROR:",
          releaseError
        );

        /*
         * We still continue with logout, but the exact
         * RPC error is now clearly visible in Render logs.
         */
      } else {
        console.log(
          "DEVICE SESSION RELEASE RESULT:",
          released
        );
      }
    } else {
      console.log(
        "No authenticated user found during logout."
      );
    }

    // --------------------------------------------------
    // 3. SIGN OUT FROM SUPABASE
    // --------------------------------------------------

    const {
      error: signOutError,
    } = await supabase.auth.signOut();

    if (signOutError) {
      console.error(
        "SUPABASE SIGNOUT ERROR:",
        signOutError
      );
    }

    // --------------------------------------------------
    // 4. REDIRECT TO LOGIN
    // --------------------------------------------------

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mocktest-odisha-cb6w.onrender.com";

    const response =
      NextResponse.redirect(
        new URL("/login", siteUrl),
        303
      );

    // --------------------------------------------------
    // 5. CLEAR DEVICE COOKIE
    // --------------------------------------------------

    response.cookies.set(
      "mocktest_student_device",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "RELEASE DEVICE API ERROR:",
      error
    );

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://mocktest-odisha-cb6w.onrender.com";

    return NextResponse.redirect(
      new URL("/login", siteUrl),
      303
    );
  }
}
