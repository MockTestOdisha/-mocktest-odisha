import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Setup admin client with service role key to guarantee session cleanup
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (user) {
      console.log("LOGOUT USER:", user.id);

      // 1. First attempt via RPC
      try {
        await supabase.rpc("logout_student_device_session", {
          p_user_id: user.id,
        });
      } catch (rpcErr) {
        console.warn("RPC logout failed, falling back to direct delete:", rpcErr);
      }

      // 2. Direct delete via Admin client to guarantee the lock is 100% removed
      try {
        await adminSupabase
          .from("student_device_sessions")
          .delete()
          .eq("user_id", user.id);
      } catch (deleteErr) {
        console.error("Direct session table cleanup error:", deleteErr);
      }

      // 3. Supabase Auth sign-out
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Supabase signOut error:", signOutError);
      }
    }

    // Build redirect URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = forwardedHost || request.headers.get("host");
    const loginUrl = `${forwardedProto}://${host}/login`;

    console.log("LOGOUT REDIRECT:", loginUrl);

    const response = NextResponse.redirect(loginUrl, 303);

    // Clear device cookie
    response.cookies.set("mocktest_student_device", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("LOGOUT API ERROR:", error);

    // Even if an unexpected error occurs, redirect to login and clear cookies
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = forwardedHost || request.headers.get("host");
    const loginUrl = `${forwardedProto}://${host}/login`;

    const fallbackResponse = NextResponse.redirect(loginUrl, 303);
    fallbackResponse.cookies.set("mocktest_student_device", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return fallbackResponse;
  }
}
