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

    // Admins do not use the one-device restriction.
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

    const sessionToken =
      (
        await import("next/headers")
      ).cookies;

    const cookieStore = await sessionToken();

    const deviceCookie =
      cookieStore.get(
        "mocktest_student_device"
      );

    if (!deviceCookie?.value) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This device session is missing.",
        },
        {
          status: 401,
        }
      );
    }

    const sessionTokenHash =
      crypto
        .createHash("sha256")
        .update(deviceCookie.value)
        .digest("hex");

    const {
      data: refreshed,
      error: refreshError,
    } = await supabase.rpc(
      "refresh_student_device_session",
      {
        p_user_id: user.id,
        p_session_token_hash:
          sessionTokenHash,
        p_expiry_minutes: 30,
      }
    );

    if (refreshError) {
      console.error(
        "Device refresh error:",
        refreshError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not refresh device session.",
        },
        {
          status: 500,
        }
      );
    }

    if (!refreshed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This device session is no longer active.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      success: true,
      restricted: true,
    });
  } catch (error) {
    console.error(
      "Refresh device API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while refreshing the device session.",
      },
      {
        status: 500,
      }
    );
  }
}
