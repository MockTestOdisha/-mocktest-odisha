import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = await createServerClient();

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
          message: "Authentication error: " + userError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Login required.",
        },
        { status: 401 }
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

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError);
      return NextResponse.json(
        {
          success: false,
          message: "Profile not found. Please contact the administrator.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 3. ADMIN BYPASS
    // --------------------------------------------------
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
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 4. CREATE NEW DEVICE TOKEN
    // --------------------------------------------------
    const sessionToken = crypto.randomUUID();
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // --------------------------------------------------
    // 5. CLAIM DEVICE VIA RPC OR FALLBACK
    // --------------------------------------------------
    let claimSuccessful = false;

    try {
      const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_student_device_session",
        {
          p_user_id: user.id,
          p_session_token_hash: sessionTokenHash,
          p_expiry_minutes: 30,
        }
      );

      if (!claimError && claimed === true) {
        claimSuccessful = true;
      }
    } catch (rpcErr) {
      console.warn("RPC claim failed, attempting fallback:", rpcErr);
    }

    // Fallback: If RPC returned false or failed, check database state directly
    if (!claimSuccessful) {
      const { data: existingSessions } = await adminSupabase
        .from("student_device_sessions")
        .select("id, updated_at, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const now = new Date().getTime();
      const lastSession = existingSessions?.[0];
      const lastSessionTime = lastSession
        ? new Date(lastSession.updated_at || lastSession.created_at).getTime()
        : 0;

      // If no active session exists or previous session is older than 30 minutes, claim cleanly
      const isExpiredOrEmpty =
        !lastSession || now - lastSessionTime > 30 * 60 * 1000;

      if (isExpiredOrEmpty) {
        // Delete any stale rows
        await adminSupabase
          .from("student_device_sessions")
          .delete()
          .eq("user_id", user.id);

        // Insert new session row
        const { error: insertError } = await adminSupabase
          .from("student_device_sessions")
          .insert({
            user_id: user.id,
            session_token_hash: sessionTokenHash,
            updated_at: new Date().toISOString(),
          });

        if (!insertError) {
          claimSuccessful = true;
        }
      }
    }

    // --------------------------------------------------
    // 6. IF STILL BLOCKED
    // --------------------------------------------------
    if (!claimSuccessful) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This student account is already active on another device. Please log out from that device or try again shortly.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 7. SET COOKIE & RETURN SUCCESS
    // --------------------------------------------------
    const response = NextResponse.json({
      success: true,
      restricted: true,
    });

    response.cookies.set("mocktest_student_device", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Claim device API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "CLAIM DEVICE API ERROR: " +
          (error?.message || "Unknown server error."),
      },
      { status: 500 }
    );
  }
}
