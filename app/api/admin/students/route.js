import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
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

    const { data: students, error } = await adminSupabase
      .from("profiles")
      .select("id, full_name, roll_number, exam_category, access_expires_at, role, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, students: students || [] });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
