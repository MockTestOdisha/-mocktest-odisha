import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

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

    const body = await request.json();
    const testId = body?.id;

    if (!testId) {
      return NextResponse.json(
        { error: "HTML test ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: test, error: testError } =
      await adminSupabase
        .from("html_tests")
        .select("id, storage_path")
        .eq("id", testId)
        .maybeSingle();

    if (testError) {
      return NextResponse.json(
        { error: testError.message },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        { error: "HTML test not found." },
        { status: 404 }
      );
    }

    const { error: storageError } =
      await adminSupabase.storage
        .from("html-tests")
        .remove([test.storage_path]);

    if (storageError) {
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 }
      );
    }

    const { error: deleteError } =
      await adminSupabase
        .from("html_tests")
        .delete()
        .eq("id", testId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "HTML test deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Delete failed." },
      { status: 500 }
    );
  }
}
