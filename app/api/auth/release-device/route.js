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
        "LOGOUT USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not identify the logged-in user: " +
            userError.message,
        },
        {
          status: 401,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No logged-in user found.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "LOGOUT USER:",
      user.id
    );

    // --------------------------------------------------
    // 2. RELEASE DEVICE SESSION
    // --------------------------------------------------

    const {
      data: released,
      error: releaseError,
    } = await supabase.rpc(
      "logout_student_device_session",
      {
        p_user_id: user.id,
      }
    );

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
          details: {
            code:
              releaseError.code || null,
            hint:
              releaseError.hint || null,
            details:
              releaseError.details || null,
          },
        },
        {
          status: 500,
        }
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
        {
          status: 500,
        }
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
        "LOGOUT SUPABASE SIGNOUT ERROR:",
        signOutError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Device session was released, but logout failed: " +
            signOutError.message,
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 4. CLEAR DEVICE COOKIE
    // --------------------------------------------------

    const response = NextResponse.json({
      success: true,
      released: true,
    });

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

    // --------------------------------------------------
    // 5. SUCCESS
    // --------------------------------------------------

    return response;

  } catch (error) {
    console.error(
      "LOGOUT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Logout error: " +
          (
            error?.message ||
            "Unknown server error."
          ),
      },
      {
        status: 500,
      }
    );
  }
}
