import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("LOGOUT USER ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not identify the logged-in user: " +
            userError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No logged-in user found.",
        },
        { status: 401 }
      );
    }

    console.log("LOGOUT USER:", user.id);

    const { data: released, error: releaseError } =
      await supabase.rpc("logout_student_device_session", {
        p_user_id: user.id,
      });

    if (releaseError) {
      console.error(
        "LOGOUT DEVICE RELEASE ERROR:",
        releaseError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not release the device session: " +
            releaseError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "LOGOUT DEVICE RELEASE RESULT:",
      released
    );

    if (released !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The device session could not be released.",
        },
        { status: 500 }
      );
    }

    const { error: signOutError } =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (signOutError) {
      console.error(
        "SUPABASE SIGNOUT ERROR:",
        signOutError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Device session was released, but logout failed: " +
            signOutError.message,
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     * Do not use request.url here because on Render
     * it can contain the internal localhost:10000 URL.
     *
     * Use the public host/protocol forwarded by Render.
     */

    const forwardedHost =
      request.headers.get("x-forwarded-host");

    const forwardedProto =
      request.headers.get("x-forwarded-proto") || "https";

    const host =
      forwardedHost ||
      request.headers.get("host");

    const loginUrl = `${forwardedProto}://${host}/login`;

    console.log("LOGOUT REDIRECT:", loginUrl);

    const response = NextResponse.redirect(
      loginUrl,
      303
    );

    response.cookies.set(
      "mocktest_student_device",
      "",
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error("LOGOUT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Logout error: " +
          (error?.message ||
            "Unknown server error."),
      },
      { status: 500 }
    );
  }
}
