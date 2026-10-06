import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    /*
     * Release the student's device session.
     */
    if (user) {
      const { data: released, error: releaseError } =
        await supabase.rpc(
          "release_student_device_session",
          {
            p_user_id: user.id,
          }
        );

      if (releaseError) {
        console.error(
          "Device release error:",
          releaseError
        );
      } else {
        console.log(
          "Device session released:",
          released
        );
      }
    }

    /*
     * Sign out from Supabase.
     */
    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      console.error(
        "Supabase signOut error:",
        signOutError
      );
    }

    /*
     * Redirect to login.
     */
    const response = NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_SITE_URL ||
          "https://mocktest-odisha-cb6w.onrender.com"
      ),
      303
    );

    /*
     * Clear the device cookie.
     */
    response.cookies.set(
      "mocktest_student_device",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Release device logout error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_SITE_URL ||
          "https://mocktest-odisha-cb6w.onrender.com"
      ),
      303
    );
  }
}
