import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Call the dynamic function that computes active categories live from test access
    const { data: students, error } = await supabaseAdmin.rpc(
      "admin_get_students_for_access"
    );

    if (error) throw error;

    const formatted = (students || []).map((s) => ({
      id: s.id,
      full_name: s.full_name,
      roll_number: s.student_id,
      email: s.email,
      exam_category: s.paid_exam_category_name,
      access_expires_at: s.access_expiry_date,
      created_at: s.created_at,
    }));

    return NextResponse.json({ success: true, students: formatted });
  } catch (err) {
    console.error("Failed to fetch students:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
