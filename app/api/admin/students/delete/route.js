import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "User ID required" }, { status: 400 });
    }

    // 1. Wipe test permissions & active sessions
    await adminSupabase.from("html_test_access").delete().eq("user_id", id);
    await adminSupabase.from("test_submissions").delete().eq("user_id", id);
    await adminSupabase.from("student_sessions").delete().eq("user_id", id);

    // 2. Wipe public profile row
    await adminSupabase.from("profiles").delete().eq("id", id);

    // 3. Wipe user from Supabase Auth completely
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
