"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HtmlTestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const categoryId =
    searchParams.get("category_id");

  const [loading, setLoading] =
    useState(true);

  const [category, setCategory] =
    useState(null);

  const [children, setChildren] =
    useState([]);

  const [tests, setTests] =
    useState([]);

  const [allCategories, setAllCategories] =
    useState([]);

  const [showCreate, setShowCreate] =
    useState(false);

  const [showUpload, setShowUpload] =
    useState(false);

  const [newCardName, setNewCardName] =
    useState("");

  const [newCardAccess, setNewCardAccess] =
    useState("free");

  const [title, setTitle] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [attemptMode, setAttemptMode] =
    useState("one");

  const [file, setFile] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [busyId, setBusyId] =
    useState(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [editingCategoryId, setEditingCategoryId] =
    useState(null);

  const [editingCategoryName, setEditingCategoryName] =
    useState("");

  const [editingTestId, setEditingTestId] =
    useState(null);

  const [editingTestTitle, setEditingTestTitle] =
    useState("");

  const [movingCategoryId, setMovingCategoryId] =
    useState(null);

  const [movingTestId, setMovingTestId] =
    useState(null);

  const [selectedParentId, setSelectedParentId] =
    useState("");

  const [selectedTestCategoryId, setSelectedTestCategoryId] =
    useState("");

  // ==================================================
  // ADMIN CHECK
  // ==================================================

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return false;
    }

    const {
      data: profile,
      error,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      error ||
      !profile ||
      profile.role !== "admin"
    ) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return false;
    }

    return true;
  }

  // ==================================================
  // LOAD ALL CATEGORIES
  // ==================================================

  async function loadAllCategories() {
    const { data, error } =
      await supabase
        .from("html_test_categories")
        .select(
          "id, name, access_type, parent_id, is_visible, display_order"
        )
        .order("display_order")
        .order("created_at");

    if (!error) {
      setAllCategories(data || []);
    }
  }

  // ==================================================
  // LOAD PAGE
  // ==================================================

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const allowed =
      await checkAdmin();

    if (!allowed) {
      return;
    }

    await loadAllCategories();

    if (!categoryId) {
      setCategory(null);

      const {
        data,
        error,
      } = await supabase
        .from("html_test_categories")
        .select(
          "id, name, access_type, parent_id, is_visible, display_order, created_at"
        )
        .is("parent_id", null)
        .order("access_type")
        .order("display_order")
        .order("created_at");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setChildren(data || []);
      setTests([]);
      setLoading(false);
      return;
    }

    const {
      data: currentCategory,
      error: categoryError,
    } = await supabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, parent_id, is_visible, display_order, created_at"
      )
      .eq("id", categoryId)
      .single();

    if (
      categoryError ||
      !currentCategory
    ) {
      setErrorMessage(
        "Category could not be found."
      );
      setLoading(false);
      return;
    }

    setCategory(currentCategory);

    // Direct child categories
    const {
      data: childCategories,
      error: childrenError,
    } = await supabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, parent_id, is_visible, display_order, created_at"
      )
      .eq("parent_id", categoryId)
      .order("display_order")
      .order("created_at");

    if (childrenError) {
      setErrorMessage(
        childrenError.message
      );
      setLoading(false);
      return;
    }

    setChildren(
      childCategories || []
    );

    // Direct HTML tests
    const {
      data: htmlTests,
      error: testsError,
    } = await supabase
      .from("html_tests")
      .select(
        "id, title, slug, storage_path, access_type, attempt_mode, category_id, is_active, display_order, created_at"
      )
      .eq("category_id", categoryId)
      .order("display_order")
      .order("created_at", {
        ascending: false,
      });

    if (testsError) {
      setErrorMessage(
        testsError.message
      );
      setLoading(false);
      return;
    }

    setTests(htmlTests || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [categoryId]);

  // ==================================================
  // SEARCH
  // ==================================================

  const filteredChildren =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return children;
      }

      return children.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(search)
      );
    }, [children, searchText]);

  const filteredTests =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return tests;
      }

      return tests.filter(
        (test) =>
          test.title
            .toLowerCase()
            .includes(search) ||
          test.slug
            .toLowerCase()
            .includes(search) ||
          test.storage_path
            ?.toLowerCase()
            .includes(search)
      );
    }, [tests, searchText]);

  // ==================================================
  // SLUG
  // ==================================================

  function makeSlug(value) {
    return value
      .toLowerCase()
      .replace(
        /[^a-z0-9-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        "");
  }

  function handleTitleChange(value) {
    setTitle(value);

    if (!slug) {
      setSlug(
        makeSlug(value)
      );
    }
  }

  // ==================================================
  // API HELPER
  // ==================================================

  async function updateCategory(
    id,
    changes
  ) {
    const response =
      await fetch(
        "/api/admin/html-tests/category",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            ...changes,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Category update failed."
      );
    }

    return result;
  }

  async function updateTest(
    id,
    changes
  ) {
    const response =
      await fetch(
        "/api/admin/html-tests/test",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            ...changes,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Test update failed."
      );
    }

    return result;
  }

  // ==================================================
  // CREATE SUB-CARD
  // ==================================================

  async function createSubCard(
    event
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!categoryId) {
      setErrorMessage(
        "Open a category before creating a sub-card."
      );
      return;
    }

    if (!newCardName.trim()) {
      setErrorMessage(
        "Please enter a sub-card name."
      );
      return;
    }

    const { error } =
      await supabase
        .from("html_test_categories")
        .insert({
          name:
            newCardName.trim(),
          access_type:
            category?.access_type ===
            "paid"
              ? "paid"
              : "free",
          parent_id:
            categoryId,
          is_visible: true,
          display_order:
            children.length,
        });

    if (error) {
      setErrorMessage(
        error.message
      );
      return;
    }

    setNewCardName("");
    setShowCreate(false);

    setSuccessMessage(
      "Sub-card created successfully."
    );

    await loadPage();
  }

  // ==================================================
  // UPLOAD HTML
  // ==================================================

  async function handleUpload(
    event
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !categoryId ||
      !category
    ) {
      setErrorMessage(
        "Please open a category before uploading an HTML test."
      );
      return;
    }

    if (!title.trim()) {
      setErrorMessage(
        "Please enter a test title."
      );
      return;
    }

    if (!slug.trim()) {
      setErrorMessage(
        "Please enter a test slug."
      );
      return;
    }

    if (!file) {
      setErrorMessage(
        "Please select an HTML file."
      );
      return;
    }

    const fileName =
      file.name.toLowerCase();

    if (
      !fileName.endsWith(
        ".html"
      ) &&
      !fileName.endsWith(
        ".htm"
      )
    ) {
      setErrorMessage(
        "Only .html and .htm files are allowed."
      );
      return;
    }

    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "slug",
        slug.trim()
      );

      formData.append(
        "categoryId",
        category.id
      );

      formData.append(
        "attemptMode",
        attemptMode
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/admin/html-tests/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "Upload failed."
        );
        setUploading(false);
        return;
      }

      setTitle("");
      setSlug("");
      setAttemptMode("one");
      setFile(null);

      const fileInput =
        document.getElementById(
          "html-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccessMessage(
        "HTML test uploaded successfully."
      );

      setShowUpload(false);

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Something went wrong during upload."
      );
    }

    setUploading(false);
  }

  // ==================================================
  // DELETE TEST
  // ==================================================

  async function handleDeleteTest(
    test
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to permanently delete "${test.title}"?\n\nThe HTML file will also be permanently deleted from Supabase Storage.`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setBusyId(test.id);

    try {
      const response =
        await fetch(
          "/api/admin/html-tests/test",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: test.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Delete failed."
        );
      }

      setSuccessMessage(
        "HTML test permanently deleted."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Something went wrong during deletion."
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // CATEGORY DELETE
  // ==================================================

  async function handleDeleteCategory(
    item
  ) {
    const confirmed =
      window.confirm(
        `PERMANENT DELETE\n\n"${item.name}" and everything inside it will be permanently deleted.\n\nThis includes:\n• All sub-cards\n• All HTML test records\n• All HTML files from Storage\n\nThis cannot be undone.\n\nContinue?`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setBusyId(item.id);

    try {
      const response =
        await fetch(
          "/api/admin/html-tests/category",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: item.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Category deletion failed."
        );
      }

      setSuccessMessage(
        `"${item.name}" was permanently deleted.`
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Something went wrong during category deletion."
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // RENAME CATEGORY
  // ==================================================

  async function saveCategoryRename(
    item
  ) {
    const name =
      editingCategoryName.trim();

    if (!name) {
      setErrorMessage(
        "Category name cannot be empty."
      );
      return;
    }

    setBusyId(item.id);

    try {
      await updateCategory(
        item.id,
        { name }
      );

      setEditingCategoryId(
        null
      );
      setEditingCategoryName("");

      setSuccessMessage(
        "Category renamed successfully."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // TOGGLE CATEGORY VISIBILITY
  // ==================================================

  async function toggleCategoryVisibility(
    item
  ) {
    setBusyId(item.id);
    setErrorMessage("");

    try {
      await updateCategory(
        item.id,
        {
          is_visible:
            !item.is_visible,
        }
      );

      setSuccessMessage(
        item.is_visible
          ? "Category hidden."
          : "Category is now visible."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE CATEGORY ACCESS
  // ==================================================

  async function toggleCategoryAccess(
    item
  ) {
    const newType =
      item.access_type ===
      "paid"
        ? "free"
        : "paid";

    const confirmed =
      window.confirm(
        `Change "${item.name}" to ${
          newType === "paid"
            ? "PAID"
            : "FREE"
        }?\n\nThis changes the card itself. Existing sub-cards and tests keep their own current access settings.`
      );

    if (!confirmed) {
      return;
    }

    setBusyId(item.id);

    try {
      await updateCategory(
        item.id,
        {
          access_type:
            newType,
        }
      );

      setSuccessMessage(
        "Category access type changed."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE CATEGORY
  // ==================================================

  async function moveCategory(
    item,
    direction
  ) {
    const siblings =
      children
        .filter(
          (child) =>
            child.parent_id ===
            item.parent_id
        )
        .sort(
          (a, b) =>
            a.display_order -
            b.display_order
        );

    const index =
      siblings.findIndex(
        (child) =>
          child.id === item.id
      );

    const newIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      index < 0 ||
      newIndex < 0 ||
      newIndex >=
        siblings.length
    ) {
      return;
    }

    const other =
      siblings[newIndex];

    setBusyId(item.id);

    try {
      await updateCategory(
        item.id,
        {
          display_order:
            other.display_order,
        }
      );

      await updateCategory(
        other.id,
        {
          display_order:
            item.display_order,
        }
      );

      setSuccessMessage(
        "Category order updated."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE CATEGORY TO ANOTHER PARENT
  // ==================================================

  async function saveCategoryMove(
    item
  ) {
    const parentId =
      selectedParentId || null;

    if (
      parentId === item.id
    ) {
      setErrorMessage(
        "A category cannot be moved inside itself."
      );
      return;
    }

    setBusyId(item.id);

    try {
      await updateCategory(
        item.id,
        {
          parent_id:
            parentId,
          display_order: 0,
        }
      );

      setMovingCategoryId(
        null
      );
      setSelectedParentId("");

      setSuccessMessage(
        "Category moved successfully."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // RENAME TEST
  // ==================================================

  async function saveTestRename(
    test
  ) {
    const newTitle =
      editingTestTitle.trim();

    if (!newTitle) {
      setErrorMessage(
        "Test title cannot be empty."
      );
      return;
    }

    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          title: newTitle,
        }
      );

      setEditingTestId(null);
      setEditingTestTitle("");

      setSuccessMessage(
        "HTML test renamed successfully."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // TOGGLE TEST VISIBILITY
  // ==================================================

  async function toggleTestVisibility(
    test
  ) {
    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          is_active:
            !test.is_active,
        }
      );

      setSuccessMessage(
        test.is_active
          ? "HTML test hidden."
          : "HTML test is now visible."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE TEST ACCESS
  // ==================================================

  async function toggleTestAccess(
    test
  ) {
    const newType =
      test.access_type ===
      "paid"
        ? "free"
        : "paid";

    const confirmed =
      window.confirm(
        `Change "${test.title}" to ${
          newType === "paid"
            ? "PAID"
            : "FREE"
        }?`
      );

    if (!confirmed) {
      return;
    }

    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          access_type:
            newType,
        }
      );

      setSuccessMessage(
        "HTML test access type changed."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE ATTEMPT MODE
  // ==================================================

  async function toggleAttemptMode(
    test
  ) {
    const newMode =
      test.attempt_mode ===
      "multiple"
        ? "one"
        : "multiple";

    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          attempt_mode:
            newMode,
        }
      );

      setSuccessMessage(
        "Attempt mode changed."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE TEST UP/DOWN
  // ==================================================

  async function moveTest(
    test,
    direction
  ) {
    const siblings =
      [...tests].sort(
        (a, b) =>
          a.display_order -
          b.display_order
      );

    const index =
      siblings.findIndex(
        (item) =>
          item.id === test.id
      );

    const newIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      index < 0 ||
      newIndex < 0 ||
      newIndex >=
        siblings.length
    ) {
      return;
    }

    const other =
      siblings[newIndex];

    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          display_order:
            other.display_order,
        }
      );

      await updateTest(
        other.id,
        {
          display_order:
            test.display_order,
        }
      );

      setSuccessMessage(
        "Test order updated."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE TEST TO CATEGORY
  // ==================================================

  async function saveTestMove(
    test
  ) {
    if (
      !selectedTestCategoryId
    ) {
      setErrorMessage(
        "Please select a destination category."
      );
      return;
    }

    setBusyId(test.id);

    try {
      await updateTest(
        test.id,
        {
          category_id:
            selectedTestCategoryId,
          display_order: 0,
        }
      );

      setMovingTestId(null);
      setSelectedTestCategoryId("");

      setSuccessMessage(
        "HTML test moved successfully."
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error.message
      );
    }

    setBusyId(null);
  }

  // ==================================================
  // GO BACK
  // ==================================================

  function goBack() {
    if (!category) {
      router.push("/admin");
      return;
    }

    if (category.parent_id) {
      router.push(
        `/admin/html-tests?category_id=${category.parent_id}`
      );
    } else {
      router.push(
        "/admin/html-tests"
      );
    }
  }

  // ==================================================
  // CATEGORY NAME
  // ==================================================

  function categoryNameById(
    id
  ) {
    const found =
      allCategories.find(
        (item) =>
          item.id === id
      );

    return (
      found?.name ||
      "Unknown category"
    );
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#f7f8fa",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth:
              "1000px",
            margin:
              "0 auto",
          }}
        >
          <h1>
            🧩 HTML Tests
          </h1>
          <p>
            Loading...
          </p>
        </div>
      </main>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f7f8fa",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth:
            "1000px",
          margin:
            "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #fff7ed, #fffbeb)",
            border:
              "1px solid #fed7aa",
            borderRadius:
              "16px",
            padding:
              "20px",
            marginBottom:
              "18px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color:
                "#9a3412",
              fontSize:
                "26px",
            }}
          >
            🧩 HTML Tests
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "#6b7280",
            }}
          >
            Organize and upload
            your HTML mock tests.
          </p>
        </div>

        {/* MESSAGES */}

        {errorMessage && (
          <div
            style={{
              background:
                "#fef2f2",
              border:
                "1px solid #fecaca",
              color:
                "#991b1b",
              padding:
                "12px",
              borderRadius:
                "10px",
              marginBottom:
                "15px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background:
                "#f0fdf4",
              border:
                "1px solid #bbf7d0",
              color:
                "#166534",
              padding:
                "12px",
              borderRadius:
                "10px",
              marginBottom:
                "15px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* SEARCH */}

        <div
          style={{
            background:
              "#fff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "12px",
            padding:
              "12px",
            marginBottom:
              "16px",
          }}
        >
          <input
            value={
              searchText
            }
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
            placeholder={
              category
                ? "🔎 Search sub-cards, test titles, slugs or storage paths..."
                : "🔎 Search main cards..."
            }
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "12px",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "9px",
              fontSize:
                "16px",
            }}
          />
        </div>

        {/* ROOT */}

        {!category && (
          <>
            <div
              style={{
                background:
                  "#fff",
                borderRadius:
                  "14px",
                padding:
                  "18px",
                marginBottom:
                  "18px",
                border:
                  "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  marginTop:
                    0,
                }}
              >
                🧩 Test Categories
              </h2>

              <p
                style={{
                  color:
                    "#6b7280",
                }}
              >
                Choose Free or Paid
                and open your test
                categories.
              </p>

              <button
                onClick={() =>
                  setShowCreate(
                    true
                  )
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "13px",
                  border:
                    "none",
                  borderRadius:
                    "10px",
                  background:
                    "#ffedd5",
                  color:
                    "#9a3412",
                  fontWeight:
                    "700",
                  fontSize:
                    "16px",
                  cursor:
                    "pointer",
                }}
              >
                ＋ Create Main Card
              </button>
            </div>

            {["free", "paid"].map(
              (type) => {
                const items =
                  filteredChildren.filter(
                    (item) =>
                      item.access_type ===
                      type
                  );

                const isFree =
                  type === "free";

                return (
                  <section
                    key={type}
                    style={{
                      marginBottom:
                        "22px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "10px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <span
                        style={{
                          background:
                            isFree
                              ? "#dcfce7"
                              : "#fee2e2",
                          color:
                            isFree
                              ? "#166534"
                              : "#991b1b",
                          padding:
                            "7px 12px",
                          borderRadius:
                            "999px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {isFree
                          ? "🔓 FREE"
                          : "🔐 PAID"}
                      </span>
                    </div>

                    {items.length ===
                    0 ? (
                      <div
                        style={{
                          background:
                            "#fff",
                          border:
                            "1px dashed #d1d5db",
                          borderRadius:
                            "12px",
                          padding:
                            "18px",
                          color:
                            "#6b7280",
                        }}
                      >
                        No{" "}
                        {isFree
                          ? "Free"
                          : "Paid"}{" "}
                        main cards yet.
                      </div>
                    ) : (
                      <div
                        style={{
                          display:
                            "grid",
                          gap:
                            "12px",
                        }}
                      >
                        {items.map(
                          (
                            item,
                            index
                          ) => (
                            <CategoryCard
                              key={
                                item.id
                              }
                              item={
                                item
                              }
                              index={
                                index
                              }
                              items={
                                items
                              }
                              router={
                                router
                              }
                              busyId={
                                busyId
                              }
                              editingCategoryId={
                                editingCategoryId
                              }
                              editingCategoryName={
                                editingCategoryName
                              }
                              setEditingCategoryId={
                                setEditingCategoryId
                              }
                              setEditingCategoryName={
                                setEditingCategoryName
                              }
                              saveCategoryRename={
                                saveCategoryRename
                              }
                              toggleCategoryVisibility={
                                toggleCategoryVisibility
                              }
                              toggleCategoryAccess={
                                toggleCategoryAccess
                              }
                              moveCategory={
                                moveCategory
                              }
                              handleDeleteCategory={
                                handleDeleteCategory
                              }
                              movingCategoryId={
                                movingCategoryId
                              }
                              setMovingCategoryId={
                                setMovingCategoryId
                              }
                              selectedParentId={
                                selectedParentId
                              }
                              setSelectedParentId={
                                setSelectedParentId
                              }
                              saveCategoryMove={
                                saveCategoryMove
                              }
                              allCategories={
                                allCategories
                              }
                            />
                          )
                        )}
                      </div>
                    )}
                  </section>
                );
              }
            )}
          </>
        )}

        {/* CATEGORY PAGE */}

        {category && (
          <>
            <button
              onClick={
                goBack
              }
              style={{
                marginBottom:
                  "14px",
                padding:
                  "10px 14px",
                border:
                  "none",
                borderRadius:
                  "9px",
                background:
                  "#f3f4f6",
                color:
                  "#374151",
                fontWeight:
                  "700",
                cursor:
                  "pointer",
              }}
            >
              ← Back
            </button>

            <div
              style={{
                background:
                  "#fff",
                borderRadius:
                  "14px",
                border:
                  "1px solid #e5e7eb",
                padding:
                  "18px",
                marginBottom:
                  "16px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin:
                        "0 0 8px",
                    }}
                  >
                    📁{" "}
                    {category.name}
                  </h2>

                  <span
                    style={{
                      background:
                        category.access_type ===
                        "paid"
                          ? "#fee2e2"
                          : "#dcfce7",
                      color:
                        category.access_type ===
                        "paid"
                          ? "#991b1b"
                          : "#166534",
                      padding:
                        "6px 11px",
                      borderRadius:
                        "999px",
                      fontWeight:
                        "800",
                    }}
                  >
                    {category.access_type ===
                    "paid"
                      ? "🔐 PAID"
                      : "🔓 FREE"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",
                  gap:
                    "10px",
                  marginTop:
                    "18px",
                }}
              >
                <button
                  onClick={() =>
                    setShowCreate(
                      true
                    )
                  }
                  style={{
                    padding:
                      "12px",
                    border:
                      "none",
                    borderRadius:
                      "10px",
                    background:
                      "#ffedd5",
                    color:
                      "#9a3412",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  ＋ Create Sub-card
                </button>

                <button
                  onClick={() =>
                    setShowUpload(
                      true
                    )
                  }
                  style={{
                    padding:
                      "12px",
                    border:
                      "none",
                    borderRadius:
                      "10px",
                    background:
                      "#fef3c7",
                    color:
                      "#92400e",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  ⬆️ Upload HTML
                </button>
              </div>
            </div>

            {/* CREATE SUB-CARD */}

            {showCreate && (
              <div
                style={{
                  background:
                    "#fff7ed",
                  border:
                    "1px solid #fed7aa",
                  borderRadius:
                    "12px",
                  padding:
                    "16px",
                  marginBottom:
                    "16px",
                }}
              >
                <h3>
                  ＋ Create Sub-card
                </h3>
