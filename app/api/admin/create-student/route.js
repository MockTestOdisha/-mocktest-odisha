import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) =>
                  cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be logged in as an admin.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
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
        {
          error:
            "Only admins can create students.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName = body.fullName?.trim();
    const studentId = body.studentId?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const paidExamCategoryId =
      body.paidExamCategoryId || null;
    const accessExpiryDate =
      body.accessExpiryDate || null;

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        {
          error:
            "Student ID / Roll Number is required.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    if (!paidExamCategoryId) {
      return NextResponse.json(
        {
          error:
            "Please select an exam category.",
        },
        { status: 400 }
      );
    }

    if (!accessExpiryDate) {
      return NextResponse.json(
        {
          error:
            "Access expiry date is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // --------------------------------------------------
    // VERIFY PAID EXAM CATEGORY
    // --------------------------------------------------

    const {
      data: examCategory,
      error: examCategoryError,
    } = await adminSupabase
      .from("html_test_categories")
      .select("id, name, access_type, is_visible")
      .eq("id", paidExamCategoryId)
      .eq("access_type", "paid")
      .maybeSingle();

    if (
      examCategoryError ||
      !examCategory
    ) {
      return NextResponse.json(
        {
          error:
            "Selected paid exam category was not found.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // CREATE AUTH USER
    // --------------------------------------------------

    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          student_id: studentId,
        },
      });

    if (authError) {
      return NextResponse.json(
        {
          error: authError.message,
        },
        { status: 400 }
      );
    }

    const newUser = authData.user;

    // --------------------------------------------------
    // CREATE STUDENT PROFILE
    // --------------------------------------------------

    const {
      error: insertError,
    } = await adminSupabase
      .from("profiles")
      .insert({
        id: newUser.id,
        full_name: fullName,
        role: "student",
        student_id: studentId,
        paid_exam_category_id:
          paidExamCategoryId,
        access_expiry_date:
          accessExpiryDate,
      });

    if (insertError) {
      await adminSupabase.auth.admin.deleteUser(
        newUser.id
      );

      return NextResponse.json(
        {
          error:
            "Could not create student profile: " +
            insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      studentId: newUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
