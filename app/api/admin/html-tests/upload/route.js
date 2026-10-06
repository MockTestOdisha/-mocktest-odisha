import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request) {
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

    const formData = await request.formData();

    const title = String(
      formData.get("title") || ""
    ).trim();

    const slug = String(
      formData.get("slug") || ""
    ).trim();

    const accessType =
      String(
        formData.get("accessType") || "free"
      ).toLowerCase();

    const attemptMode =
      String(
        formData.get("attemptMode") || "one"
      ).toLowerCase();

    const file = formData.get("file");

    if (!title) {
      return NextResponse.json(
        { error: "Test title is required." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Test slug is required." },
        { status: 400 }
      );
    }

    if (
      accessType !== "free" &&
      accessType !== "paid"
    ) {
      return NextResponse.json(
        { error: "Invalid access type." },
        { status: 400 }
      );
    }

    if (
      attemptMode !== "one" &&
      attemptMode !== "multiple"
    ) {
      return NextResponse.json(
        { error: "Invalid attempt mode." },
        { status: 400 }
      );
    }

    if (
      !file ||
      typeof file.arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { error: "HTML file is required." },
        { status: 400 }
      );
    }

    const originalFileName =
      String(file.name || "").toLowerCase();

    if (
      !originalFileName.endsWith(".html") &&
      !originalFileName.endsWith(".htm")
    ) {
      return NextResponse.json(
        {
          error:
            "Only .html and .htm files are allowed.",
        },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json(
        { error: "Invalid test slug." },
        { status: 400 }
      );
    }

    const html = await file.text();

    if (!html.trim()) {
      return NextResponse.json(
        { error: "The HTML file is empty." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const storagePath =
      `${cleanSlug}/index.html`;

    /*
     * Upload the original HTML exactly as supplied.
     */
    const { error: uploadError } =
      await adminSupabase.storage
        .from("html-tests")
        .upload(
          storagePath,
          Buffer.from(html, "utf8"),
          {
            contentType: "text/html",
            upsert: true,
          }
        );

    if (uploadError) {
      return NextResponse.json(
        {
          error: uploadError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Save the test information.
     */
    const { data: test, error: insertError } =
      await adminSupabase
        .from("html_tests")
        .insert({
          title,
          slug: cleanSlug,
          storage_path: storagePath,
          access_type: accessType,
          attempt_mode: attemptMode,
          is_active: true,
        })
        .select(
          "id, title, slug, storage_path, access_type, attempt_mode, is_active, created_at"
        )
        .single();

    /*
     * If database insertion fails,
     * remove the uploaded file too.
     */
    if (insertError) {
      await adminSupabase.storage
        .from("html-tests")
        .remove([storagePath]);

      return NextResponse.json(
        {
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        test,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "HTML test upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong during upload.",
      },
      { status: 500 }
    );
  }
}
