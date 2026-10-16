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

    // 1. Normalize Category IDs into a clean array
    let targetCatIds = [];
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      targetCatIds = categoryIds.filter(Boolean);
    } else if (categoryId) {
      targetCatIds = [categoryId];
    }

    // 2. Fetch category names from database if not supplied
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

    // 3. Create the student in Supabase Auth
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

    // 4. Upsert Profile with roll number, combined category names, and expiry
    await supabaseAdmin.from("profiles").upsert({
      id: studentId,
      full_name: fullName,
      roll_number: rollNumber || null,
      exam_category: combinedCategoryLabel,
      access_expires_at: expiryDate || null,
    });

    // 5. Grant access for each selected category in both table and RPC
    for (const catId of targetCatIds) {
      // Direct insert into access tracking table
      await supabaseAdmin.from("html_test_category_access").upsert(
        {
          student_id: studentId,
          category_id: catId,
          expires_at: expiryDate || null,
        },
        { onConflict: "student_id,category_id" }
      );

      // Call database bundle RPC to grant all child tests
      try {
        await supabaseAdmin.rpc("admin_grant_html_category_bundle", {
          p_student_id: studentId,
          p_category_id: catId,
          p_expires_at: expiryDate || null,
        });
      } catch (rpcErr) {
        console.warn("RPC grant error (fallback to table insert):", rpcErr);
      }
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
