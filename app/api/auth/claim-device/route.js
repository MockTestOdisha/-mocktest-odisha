import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. GET CURRENT AUTHENTICATED USER
    // --------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Auth user error:", userError);

      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication error: " +
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
          message: "Login required.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------
    // 2. GET USER PROFILE
    // --------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name, role, is_paid")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Profile lookup error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Profile lookup error: " +
            profileError.message,
        },
        {
          status: 403,
        }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Profile not found. Please contact the administrator.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------
    // 3. ADMIN
    // --------------------------------------------------
    // Admins are not restricted to one device.

    if (profile.role === "admin") {
      return NextResponse.json({
        success: true,
        restricted: false,
      });
    }

    // --------------------------------------------------
    // 4. STUDENT
    // --------------------------------------------------

    if (profile.role !== "student") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid account role.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------
    // 5. CREATE DEVICE TOKEN
    // --------------------------------------------------

    const sessionToken = crypto.randomUUID();

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    // --------------------------------------------------
    // 6. CLAIM DEVICE THROUGH SUPABASE RPC
    // --------------------------------------------------

    const {
      data: claimed,
      error: claimError,
    } = await supabase.rpc(
      "claim_student_device_session",
      {
        p_user_id: user.id,
        p_session_token_hash:
          sessionTokenHash,
        p_expiry_minutes: 30,
      }
    );

    if (claimError) {
      console.error(
        "Device claim RPC error:",
        claimError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "DEVICE CLAIM ERROR: " +
            claimError.message,
          details: {
            code:
              claimError.code || null,
            hint:
              claimError.hint || null,
            details:
              claimError.details || null,
          },
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 7. DEVICE ALREADY USED
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 8. SUCCESS
    // --------------------------------------------------

    const response = NextResponse.json({
      success: true,
      restricted: true,
    });

    // Store the raw device token only in an
    // HTTP-only browser cookie.
    //
    // The database contains only the SHA-256 hash.

    response.cookies.set(
      "mocktest_student_device",
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
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
          "CLAIM DEVICE API ERROR: " +
          (error?.message ||
            "Unknown server error."),
      },
      {
        status: 500,
      }
    );
  }
}
