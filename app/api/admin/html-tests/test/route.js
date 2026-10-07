import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

async function getAdmin() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Admin login required." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile ||
    profile.role !== "admin"
  ) {
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user };
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ==================================================
// UPDATE HTML TEST
// ==================================================

export async function PATCH(request) {
  try {
    const admin = await getAdmin();

    if (admin.error) {
      return admin.error;
    }

    const body = await request.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    const { data: existingTest, error: findError } =
      await adminSupabase
        .from("html_tests")
        .select(
          "id, title, slug, storage_path, access_type, attempt_mode, category_id, is_active, display_order"
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!existingTest) {
      return NextResponse.json(
        { error: "HTML test not found." },
        { status: 404 }
      );
    }

    const update = {};

    // --------------------------------------------------
    // Rename
    // --------------------------------------------------

    if (body.title !== undefined) {
      const title = String(
        body.title || ""
      ).trim();

      if (!title) {
        return NextResponse.json(
          {
            error:
              "Test title cannot be empty.",
          },
          { status: 400 }
        );
      }

      update.title = title;
    }

    // --------------------------------------------------
    // Free / Paid
    // --------------------------------------------------

    if (body.access_type !== undefined) {
      const accessType = String(
        body.access_type
      ).toLowerCase();

      if (
        accessType !== "free" &&
        accessType !== "paid"
      ) {
        return NextResponse.json(
          {
            error:
              "Access type must be free or paid.",
          },
          { status: 400 }
        );
      }

      update.access_type = accessType;
    }

    // --------------------------------------------------
    // Show / Hide
    // --------------------------------------------------

    if (body.is_active !== undefined) {
      update.is_active = Boolean(
        body.is_active
      );
    }

    // --------------------------------------------------
    // Attempt mode
    // --------------------------------------------------

    if (body.attempt_mode !== undefined) {
      const attemptMode = String(
        body.attempt_mode
      ).toLowerCase();

      if (
        attemptMode !== "one" &&
        attemptMode !== "multiple"
      ) {
        return NextResponse.json(
          {
            error:
              "Attempt mode must be one or multiple.",
          },
          { status: 400 }
        );
      }

      update.attempt_mode = attemptMode;
    }

    // --------------------------------------------------
    // Display order
    // --------------------------------------------------

    if (body.display_order !== undefined) {
      const displayOrder = Number(
        body.display_order
      );

      if (!Number.isInteger(displayOrder)) {
        return NextResponse.json(
          {
            error:
              "Display order must be an integer.",
          },
          { status: 400 }
        );
      }

      update.display_order =
        displayOrder;
    }

    // --------------------------------------------------
    // Move to another category
    // --------------------------------------------------

    if (body.category_id !== undefined) {
      const categoryId =
        body.category_id === null ||
        body.category_id === ""
          ? null
          : String(body.category_id);

      if (!categoryId) {
        return NextResponse.json(
          {
            error:
              "A test must belong to a category.",
          },
          { status: 400 }
        );
      }

      const { data: category, error: categoryError } =
        await adminSupabase
          .from("html_test_categories")
          .select("id")
          .eq("id", categoryId)
          .maybeSingle();

      if (categoryError) {
        return NextResponse.json(
          { error: categoryError.message },
          { status: 500 }
        );
      }

      if (!category) {
        return NextResponse.json(
          {
            error:
              "The selected category does not exist.",
          },
          { status: 400 }
        );
      }

      update.category_id = categoryId;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        {
          error:
            "No test changes were supplied.",
        },
        { status: 400 }
      );
    }

    const { data: updatedTest, error: updateError } =
      await adminSupabase
        .from("html_tests")
        .update(update)
        .eq("id", id)
        .select(
          "id, title, slug, storage_path, access_type, attempt_mode, category_id, is_active, display_order, created_at"
        )
        .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      test: updatedTest,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// PERMANENT DELETE HTML TEST
// ==================================================

export async function DELETE(request) {
  try {
    const admin = await getAdmin();

    if (admin.error) {
      return admin.error;
    }

    const body = await request.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Test ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    const { data: test, error: findError } =
      await adminSupabase
        .from("html_tests")
        .select(
          "id, title, storage_path"
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        { error: "HTML test not found." },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // Delete HTML file from Supabase Storage
    // --------------------------------------------------

    if (test.storage_path) {
      const { error: storageError } =
        await adminSupabase.storage
          .from("html-tests")
          .remove([
            test.storage_path,
          ]);

      if (storageError) {
        return NextResponse.json(
          {
            error:
              "Could not delete the HTML file from storage: " +
              storageError.message,
          },
          { status: 500 }
        );
      }
    }

    // --------------------------------------------------
    // Delete database record
    // --------------------------------------------------

    const { error: deleteError } =
      await adminSupabase
        .from("html_tests")
        .delete()
        .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            "The storage file was deleted, but the test record could not be deleted: " +
            deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_test_id: id,
      deleted_test_title:
        test.title,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong during deletion.",
      },
      { status: 500 }
    );
  }
}
