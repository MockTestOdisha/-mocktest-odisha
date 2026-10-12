import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { answer } = await req.json();
    const expected = (process.env.ADMIN_SECURITY_ANSWER || "Bhubaneswar").trim().toLowerCase();

    if (!answer || answer.trim().toLowerCase() !== expected) {
      return NextResponse.json({ success: false, message: "Incorrect security answer." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
