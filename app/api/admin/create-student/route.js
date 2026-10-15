import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { fullName, rollNumber, email, password, categoryId, categoryName, expiryDate } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });

    if (authError || !authUser?.user) {
      return NextResponse.json({ success: false, message: authError?.message || "Failed to create user." }, { status: 400 });
    }

    const userId = authUser.user.id;
    const endAt = expiryDate ? new Date(expiryDate).toISOString() : null;

    // 2. Update Profile with Category & Expiry
    await adminSupabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      roll_number: rollNumber ? rollNumber.trim() : null,
      exam_category: categoryName || null,
      access_expires_at: endAt,
      role: "student",
      is_paid: !!categoryId,
    });

    // 3. If a Paid Folder is chosen, grant access to all tests inside it and its subcategories
    if (categoryId) {
      // Find all subcategories under this main folder
      const { data: childCats } = await adminSupabase
        .from("html_test_categories")
        .select("id")
        .eq("parent_id", categoryId);

      const allCatIds = [categoryId, ...(childCats || []).map((c) => c.id)];

      // Find all tests belonging to these categories
      const { data: testsToGrant } = await adminSupabase
        .from("html_tests")
        .select("id")
        .in("category_id", allCatIds)
        .eq("is_active", true);

      if (testsToGrant && testsToGrant.length > 0) {
        const accessRecords = testsToGrant.map((t) => ({
          html_test_id: t.id,
          user_id: userId,
          start_at: new Date().toISOString(),
          end_at: endAt,
          is_active: true,
        }));

        await adminSupabase.from("html_test_access").upsert(accessRecords, { onConflict: "html_test_id,user_id" });
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
