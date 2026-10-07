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

  if (error || !profile || profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    supabase,
  };
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// --------------------------------------------------
// Rename / visibility / Free-Paid / move
// --------------------------------------------------

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
        { error: "Category ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    const { data: category, error: categoryError } =
      await adminSupabase
        .from("html_test_categories")
        .select(
          "id, name, access_type, parent_id, is_visible, display_order"
        )
        .eq("id", id)
        .maybeSingle();

    if (categoryError) {
      return NextResponse.json(
        { error: categoryError.message },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    const update = {};

    // Rename
    if (body.name !== undefined) {
      const name = String(body.name || "").trim();

      if (!name) {
        return NextResponse.json(
          { error: "Category name cannot be empty." },
          { status: 400 }
        );
      }

      update.name = name;
    }

    // Visibility
    if (body.is_visible !== undefined) {
      update.is_visible = Boolean(body.is_visible);
    }

    // Free / Paid
    if (body.access_type !== undefined) {
      const accessType = String(body.access_type).toLowerCase();

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

    // Display order
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

      update.display_order = displayOrder;
    }

    // Move to another parent
    if (body.parent_id !== undefined) {
      const parentId =
        body.parent_id === null ||
        body.parent_id === ""
          ? null
          : String(body.parent_id);

      if (parentId === id) {
        return NextResponse.json(
          {
            error:
              "A category cannot be its own parent.",
          },
          { status: 400 }
        );
      }

      if (parentId) {
        const { data: parent } =
          await adminSupabase
            .from("html_test_categories")
            .select("id")
            .eq("id", parentId)
            .maybeSingle();

        if (!parent) {
          return NextResponse.json(
            {
              error:
                "The selected parent category does not exist.",
            },
            { status: 400 }
          );
        }

        // Prevent moving a category inside one
        // of its own descendants.
        let currentParentId = parentId;

        while (currentParentId) {
          if (currentParentId === id) {
            return NextResponse.json(
              {
                error:
                  "A category cannot be moved inside its own descendant.",
              },
              { status: 400 }
            );
          }

          const { data: parentRow } =
            await adminSupabase
              .from("html_test_categories")
              .select("parent_id")
              .eq("id", currentParentId)
              .maybeSingle();

          if (!parentRow) {
            break;
          }

          currentParentId =
            parentRow.parent_id;
        }
      }

      update.parent_id = parentId;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        {
          error:
            "No category changes were supplied.",
        },
        { status: 400 }
      );
    }

    update.updated_at = new Date().toISOString();

    const { data: updatedCategory, error } =
      await adminSupabase
        .from("html_test_categories")
        .update(update)
        .eq("id", id)
        .select(
          "id, name, access_type, parent_id, is_visible, display_order, updated_at"
        )
        .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: updatedCategory,
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

// --------------------------------------------------
// Permanent category delete
// --------------------------------------------------

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
        { error: "Category ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    // --------------------------------------------------
    // Collect every descendant category
    // --------------------------------------------------

    const categoryIds = [id];
    let index = 0;

    while (index < categoryIds.length) {
      const currentId =
        categoryIds[index];

      const { data: childCategories, error } =
        await adminSupabase
          .from("html_test_categories")
          .select("id")
          .eq("parent_id", currentId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      for (const child of childCategories || []) {
        if (
          !categoryIds.includes(child.id)
        ) {
          categoryIds.push(child.id);
        }
      }

      index++;
    }

    // --------------------------------------------------
    // Find all HTML tests inside those categories
    // --------------------------------------------------

    const { data: tests, error: testsError } =
      await adminSupabase
        .from("html_tests")
        .select("id, storage_path")
        .in("category_id", categoryIds);

    if (testsError) {
      return NextResponse.json(
        { error: testsError.message },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // Delete HTML files from Storage
    // --------------------------------------------------

    const storagePaths = (tests || [])
      .map((test) => test.storage_path)
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageError } =
        await adminSupabase.storage
          .from("html-tests")
          .remove(storagePaths);

      if (storageError) {
        return NextResponse.json(
          {
            error:
              "Could not delete HTML files from storage: " +
              storageError.message,
          },
          { status: 500 }
        );
      }
    }

    // --------------------------------------------------
    // Delete category
    //
    // Database cascade removes:
    // - child categories
    // - html_tests records
    // --------------------------------------------------

    const { error: deleteError } =
      await adminSupabase
        .from("html_test_categories")
        .delete()
        .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            "Storage was deleted, but the category could not be deleted: " +
            deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_category_id: id,
      deleted_category_count:
        categoryIds.length,
      deleted_test_count:
        tests?.length || 0,
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
