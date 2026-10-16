import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await req.json();
    const {
      fullName,
      rollNumber,
      email,
      password,
      categoryIds,
      categoryId,
      categoryNames,
      categoryName,
      expiryDate,
    } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, message: "Full Name, Email, and Password are required." },
        { status: 400 }
      );
    }

    // 1. Gather all selected category IDs
    let targetCatIds = [];
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      targetCatIds = categoryIds.filter(Boolean);
    } else if (categoryId) {
      targetCatIds = [categoryId];
    }

    // 2. Fetch Category Names from DB if not provided
    let namesList = Array.isArray(categoryNames) ? categoryNames : [];
    if (targetCatIds.length > 0 && namesList.length === 0) {
      const { data: foundCats } = await supabaseAdmin
        .from("html_test_categories")
        .select("name")
        .in("id", targetCatIds);
      namesList = (foundCats || []).map((c) => c.name);
    }

    const combinedCategoryLabel =
      namesList.length > 0
        ? namesList.join(", ")
        : categoryName || null;

    // 3. Create student in Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        roll_number: rollNumber || null,
      },
    });

    if (authErr) {
      return NextResponse.json({ success: false, message: authErr.message }, { status: 400 });
    }

    const studentId = authData.user.id;
    const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null;

    // 4. Update Profile with roll number and category labels
    await supabaseAdmin.from("profiles").upsert({
      id: studentId,
      full_name: fullName,
      roll_number: rollNumber || null,
      exam_category: combinedCategoryLabel,
      access_expires_at: expiresAt,
    });

    // 5. Grant access for every selected category directly into permission tables
    for (const catId of targetCatIds) {
      // 5a. Call database RPC
      try {
        await supabaseAdmin.rpc("admin_grant_html_category_bundle", {
          p_student_id: studentId,
          p_category_id: catId,
          p_expires_at: expiresAt,
        });
      } catch (rpcErr) {
        console.warn("RPC failed, falling back to direct table inserts:", rpcErr);
      }

      // 5b. Find all child categories (parent_id = catId OR id = catId)
      const { data: catFamily } = await supabaseAdmin
        .from("html_test_categories")
        .select("id")
        .or(`id.eq.${catId},parent_id.eq.${catId}`);

      const allCatIds = (catFamily || []).map((c) => c.id);
      if (!allCatIds.includes(catId)) allCatIds.push(catId);

      // 5c. Fetch all matching tests
      const { data: testsInCat } = await supabaseAdmin
        .from("html_tests")
        .select("id")
        .in("category_id", allCatIds);

      // 5d. Insert real access rows into html_test_access
      if (testsInCat && testsInCat.length > 0) {
        const rows = testsInCat.map((t) => ({
          student_id: studentId,
          html_test_id: t.id,
          expires_at: expiresAt,
        }));

        await supabaseAdmin
          .from("html_test_access")
          .upsert(rows, { onConflict: "student_id,html_test_id" });
      }

      // 5e. Insert bundle tracking row
      await supabaseAdmin.from("html_test_category_access").upsert(
        {
          student_id: studentId,
          category_id: catId,
          expires_at: expiresAt,
        },
        { onConflict: "student_id,category_id" }
      );
    }

    return NextResponse.json({
      success: true,
      studentId,
      assignedCategories: targetCatIds.length,
      categoryLabel: combinedCategoryLabel,
    });
  } catch (err) {
    console.error("Create student error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
