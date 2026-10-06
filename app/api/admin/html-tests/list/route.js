import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Admin login required." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: tests, error } =
      await adminSupabase
        .from("html_tests")
        .select(
          "id, title, slug, storage_path, access_type, attempt_mode, is_active, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        tests: tests || [],
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "HTML test list error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not load HTML tests.",
      },
      {
        status: 500,
      }
    );
  }
}
