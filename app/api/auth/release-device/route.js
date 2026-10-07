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
        "DEVICE RELEASE USER ERROR:",
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
          message:
            "No logged-in user found.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------
    // 2. RELEASE DEVICE SESSION
    // --------------------------------------------------

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
      "DEVICE SESSION RELEASE RESULT:",
      released
    );

    // --------------------------------------------------
    // 3. MAKE SURE A SESSION WAS ACTUALLY RELEASED
    // --------------------------------------------------

    if (released !== true) {
      console.error(
        "DEVICE SESSION WAS NOT RELEASED.",
        {
          userId: user.id,
          released,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The device session could not be released. Please try again.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // 4. SIGN OUT FROM SUPABASE
    // --------------------------------------------------

    const {
      error: signOutError,
    } = await supabase.auth.signOut();

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
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 5. RETURN SUCCESS
    // --------------------------------------------------

    const response =
      NextResponse.json({
        success: true,
        released: true,
      });

    // --------------------------------------------------
    // 6. CLEAR DEVICE COOKIE
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

    return NextResponse.json(
      {
        success: false,
        message:
          "Logout error: " +
          (error?.message ||
            "Unknown server error."),
      },
      {
        status: 500,
      }
    );
  }
}
