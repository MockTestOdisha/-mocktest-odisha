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

    // 1. Collect selected category IDs
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
      namesList.length > 0 ? namesList.join(", ") : categoryName || null;

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

    const userId = authData.user.id;
    const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null;

    // 4. Update Profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      roll_number: rollNumber || null,
      exam_category: combinedCategoryLabel,
      access_expires_at: expiresAt,
    });

    // 5. Find all category IDs including subfolders
    const { data: allCategories } = await supabaseAdmin
      .from("html_test_categories")
      .select("id, parent_id");

    const allApplicableCatIds = new Set(targetCatIds);
    let changed = true;
    while (changed) {
      changed = false;
      (allCategories || []).forEach((c) => {
        if (c.parent_id && allApplicableCatIds.has(c.parent_id) && !allApplicableCatIds.has(c.id)) {
          allApplicableCatIds.add(c.id);
          changed = true;
        }
      });
    }

    // 6. Find all tests inside those categories
    const { data: matchingTests } = await supabaseAdmin
      .from("html_tests")
      .select("id")
      .in("category_id", Array.from(allApplicableCatIds));

    // 7. Insert using your exact column names: user_id, html_test_id, end_at, is_active
    if (matchingTests && matchingTests.length > 0) {
      const testRows = matchingTests.map((t) => ({
        user_id: userId,
        html_test_id: t.id,
        start_at: new Date().toISOString(),
        end_at: expiresAt,
        is_active: true,
      }));

      const { error: insertErr } = await supabaseAdmin
        .from("html_test_access")
        .insert(testRows);

      if (insertErr) {
        console.error("Insert error into html_test_access:", insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      assignedCategories: targetCatIds.length,
      testsGranted: matchingTests ? matchingTests.length : 0,
      categoryLabel: combinedCategoryLabel,
    });
  } catch (err) {
    console.error("Create student error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
