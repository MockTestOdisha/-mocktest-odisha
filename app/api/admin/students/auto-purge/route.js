import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: count, error } = await supabaseAdmin.rpc(
      "purge_expired_students_after_20_days"
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      purgedCount: count || 0,
    });
  } catch (err) {
    console.error("Auto-purge error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
