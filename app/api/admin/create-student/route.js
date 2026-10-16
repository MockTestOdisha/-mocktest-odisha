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

    // 2. Resolve human-readable category names
    let categoryNamesList = Array.isArray(categoryNames) ? categoryNames : [];
    if (targetCatIds.length > 0 && categoryNamesList.length === 0) {
      const { data: foundCats } = await supabaseAdmin
        .from("html_test_categories")
        .select("id, name")
        .in("id", targetCatIds);
      categoryNamesList = (foundCats || []).map((c) => c.name);
    }

    const combinedCategoryLabel =
      categoryNamesList.length > 0
        ? categoryNamesList.join(", ")
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

    // 4. Update Profile
    await supabaseAdmin.from("profiles").upsert({
      id: studentId,
      full_name: fullName,
      roll_number: rollNumber || null,
      exam_category: combinedCategoryLabel,
      access_expires_at: expiresAt,
    });

    // 5. Grant tests for every selected category
    for (const catId of targetCatIds) {
      // 5a. Call database RPC
      try {
        await supabaseAdmin.rpc("admin_grant_html_category_bundle", {
          p_student_id: studentId,
          p_category_id: catId,
          p_expires_at: expiresAt,
        });
      } catch (rpcErr) {
        console.warn("RPC failed, falling back to direct query:", rpcErr);
      }

      // 5b. Direct fallback: find all subcategories & assign all matching tests
      const { data: allChildCats } = await supabaseAdmin
        .from("html_test_categories")
        .select("id")
        .or(`id.eq.${catId},parent_id.eq.${catId}`);

      const catFamilyIds = (allChildCats || []).map((c) => c.id);
      if (!catFamilyIds.includes(catId)) catFamilyIds.push(catId);

      const { data: matchingTests } = await supabaseAdmin
        .from("html_tests")
        .select("id")
        .in("category_id", catFamilyIds);

      if (matchingTests && matchingTests.length > 0) {
        const testAccessRows = matchingTests.map((t) => ({
          student_id: studentId,
          html_test_id: t.id,
          expires_at: expiresAt,
        }));

        await supabaseAdmin
          .from("html_test_access")
          .upsert(testAccessRows, { onConflict: "student_id,html_test_id" });
      }

      // Also ensure the category bundle tracking row exists
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
