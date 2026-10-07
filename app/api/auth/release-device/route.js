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
          message: "No logged-in user found.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "DEVICE RELEASE USER:",
      user.id
    );

    // --------------------------------------------------
    // 2. CHECK DEVICE SESSION BEFORE RELEASE
    // --------------------------------------------------

    const {
      data: sessionBefore,
      error: sessionCheckError,
    } = await supabase
      .from("student_device_sessions")
      .select(
        "user_id, session_token_hash, last_seen_at, expires_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    console.log(
      "DEVICE SESSION BEFORE RELEASE:",
      {
        userId: user.id,
        sessionBefore,
        sessionCheckError,
      }
    );

    // --------------------------------------------------
    // 3. RELEASE DEVICE SESSION
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
    // 4. MAKE SURE A SESSION WAS ACTUALLY RELEASED
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
    // 5. VERIFY THE SESSION ROW IS GONE
    // --------------------------------------------------

    const {
      data: sessionAfter,
      error: sessionAfterError,
    } = await supabase
      .from("student_device_sessions")
      .select(
        "user_id, last_seen_at, expires_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    console.log(
      "DEVICE SESSION AFTER RELEASE:",
      {
        userId: user.id,
        sessionAfter,
        sessionAfterError,
      }
    );

    if (sessionAfterError) {
      console.error(
        "DEVICE SESSION AFTER CHECK ERROR:",
        sessionAfterError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Device session was released, but verification failed: " +
            sessionAfterError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (sessionAfter !== null) {
      console.error(
        "DEVICE SESSION ROW STILL EXISTS AFTER RELEASE.",
        {
          userId: user.id,
          sessionAfter,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The device session could not be completely released. Please try again.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // 6. SIGN OUT FROM SUPABASE
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
    // 7. RETURN SUCCESS
    // --------------------------------------------------

    const response =
      NextResponse.json({
        success: true,
        released: true,
      });

    // --------------------------------------------------
    // 8. CLEAR DEVICE COOKIE
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
