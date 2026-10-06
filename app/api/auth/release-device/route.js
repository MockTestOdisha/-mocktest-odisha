import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();

    const deviceCookie = cookieStore.get(
      "mocktest_student_device"
    );

    /*
     * If there is no logged-in user or no device
     * cookie, simply clear the cookie and finish.
     */
    if (!user || !deviceCookie?.value) {
      const response = NextResponse.json({
        success: true,
      });

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
    }

    const sessionTokenHash =
      crypto
        .createHash("sha256")
        .update(deviceCookie.value)
        .digest("hex");

    const {
      error: releaseError,
    } = await supabase.rpc(
      "release_student_device_session",
      {
        p_user_id: user.id,
        p_session_token_hash:
          sessionTokenHash,
      }
    );

    if (releaseError) {
      console.error(
        "Device release error:",
        releaseError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not release the device session.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Clear the browser's device cookie.
     */
    const response = NextResponse.json({
      success: true,
    });

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
      "Release device API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while logging out.",
      },
      {
        status: 500,
      }
    );
  }
}
