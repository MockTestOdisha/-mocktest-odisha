import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Login required.",
        },
        {
          status: 401,
        }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Profile not found.",
        },
        {
          status: 403,
        }
      );
    }

    // Admins are not restricted to one device.
    if (profile.role === "admin") {
      return NextResponse.json({
        success: true,
        restricted: false,
      });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid account role.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Generate a unique session token for this browser/device.
     *
     * The raw token is stored only in an HTTP-only cookie.
     * The database receives only its SHA-256 hash.
     */
    const sessionToken = crypto.randomUUID();

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const { data: claimed, error: claimError } =
      await supabase.rpc(
        "claim_student_device_session",
        {
          p_user_id: user.id,
          p_session_token_hash: sessionTokenHash,
          p_expiry_minutes: 30,
        }
      );

    if (claimError) {
      console.error(
        "Device claim error:",
        claimError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not verify this device. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This student account is already logged in on another device. Please logout from the other device first.",
        },
        {
          status: 409,
        }
      );
    }

    const response = NextResponse.json({
      success: true,
      restricted: true,
    });

    response.cookies.set(
      "mocktest_student_device",
      sessionToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Claim device API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
