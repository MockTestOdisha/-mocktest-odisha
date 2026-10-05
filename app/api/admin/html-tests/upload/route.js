import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request) {
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

    const formData = await request.formData();

    const file = formData.get("file");
    const title = formData.get("title");
    const slug = formData.get("slug");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "HTML file is required." },
        { status: 400 }
      );
    }

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required." },
        { status: 400 }
      );
    }

    const cleanSlug = String(slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json(
        { error: "Invalid slug." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".html") &&
      !fileName.endsWith(".htm")
    ) {
      return NextResponse.json(
        { error: "Only HTML files are allowed." },
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

    /*
     * Store each uploaded test in its own folder.
     */
    const storagePath = `${cleanSlug}/index.html`;

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing } = await adminSupabase
      .from("html_tests")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A test with this slug already exists." },
        { status: 409 }
      );
    }

    const { error: uploadError } =
      await adminSupabase.storage
        .from("html-tests")
        .upload(
          storagePath,
          new Blob([html], {
            type: "text/html",
          }),
          {
            contentType: "text/html",
            upsert: false,
          }
        );

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: test, error: insertError } =
      await adminSupabase
        .from("html_tests")
        .insert({
          title: String(title).trim(),
          slug: cleanSlug,
          storage_path: storagePath,
          is_active: true,
        })
        .select()
        .single();

    if (insertError) {
      await adminSupabase.storage
        .from("html-tests")
        .remove([storagePath]);

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      test,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Upload failed.",
      },
      {
        status: 500,
      }
    );
  }
}
