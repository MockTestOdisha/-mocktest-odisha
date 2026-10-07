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

    // Verify admin
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

    const categoryId = String(
      formData.get("categoryId") || ""
    ).trim();

    const attemptMode = String(
      formData.get("attemptMode") || "one"
    ).toLowerCase();

    const file = formData.get("file");

    // -----------------------------
    // Basic validation
    // -----------------------------

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

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "HTML test category is required.",
        },
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

    // -----------------------------
    // Check HTML file
    // -----------------------------

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

    // -----------------------------
    // Clean slug
    // -----------------------------

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

    // -----------------------------
    // Read HTML
    // -----------------------------

    const html = await file.text();

    if (!html.trim()) {
      return NextResponse.json(
        { error: "The HTML file is empty." },
        { status: 400 }
      );
    }

    // -----------------------------
    // Service-role client
    // -----------------------------

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // -----------------------------
    // Get category
    // -----------------------------

    const {
      data: category,
      error: categoryError,
    } = await adminSupabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, parent_id, is_visible"
      )
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      return NextResponse.json(
        {
          error:
            "Could not verify the HTML test category: " +
            categoryError.message,
        },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          error:
            "The selected HTML test category does not exist.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Determine Free / Paid
    // from category
    // -----------------------------

    const accessType =
      category.access_type === "paid"
        ? "paid"
        : "free";

    // -----------------------------
    // Check duplicate slug
    // -----------------------------

    const {
      data: existingTest,
      error: existingTestError,
    } = await adminSupabase
      .from("html_tests")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existingTestError) {
      return NextResponse.json(
        {
          error:
            "Could not check test slug: " +
            existingTestError.message,
        },
        { status: 500 }
      );
    }

    if (existingTest) {
      return NextResponse.json(
        {
          error:
            "This test slug already exists. Please use a different slug.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Storage path
    // -----------------------------

    const storagePath =
      `${cleanSlug}/index.html`;

    // -----------------------------
    // Upload original HTML
    // -----------------------------

    const { error: uploadError } =
      await adminSupabase.storage
        .from("html-tests")
        .upload(
          storagePath,
          Buffer.from(html, "utf8"),
          {
            contentType: "text/html",
            upsert: false,
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

    // -----------------------------
    // Save test
    // -----------------------------

    const {
      data: test,
      error: insertError,
    } = await adminSupabase
      .from("html_tests")
      .insert({
        title,
        slug: cleanSlug,
        storage_path: storagePath,
        access_type: accessType,
        attempt_mode: attemptMode,
        category_id: category.id,
        is_active: true,
      })
      .select(
        `
        id,
        title,
        slug,
        storage_path,
        access_type,
        attempt_mode,
        category_id,
        is_active,
        created_at
        `
      )
      .single();

    // -----------------------------
    // Roll back Storage if DB fails
    // -----------------------------

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

    // -----------------------------
    // Success
    // -----------------------------

    return NextResponse.json(
      {
        success: true,
        test,
        category: {
          id: category.id,
          name: category.name,
          access_type: accessType,
        },
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
