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

  const categoryId = searchParams.get("category_id");

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [tests, setTests] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardAccess, setNewCardAccess] = useState("free");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [attemptMode, setAttemptMode] = useState("one");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchText, setSearchText] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingTestId, setEditingTestId] = useState(null);
  const [editingTestTitle, setEditingTestTitle] = useState("");

  const [movingCategoryId, setMovingCategoryId] = useState(null);
  const [movingTestId, setMovingTestId] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedTestCategoryId, setSelectedTestCategoryId] = useState("");

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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
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
    const { data, error } = await supabase
      .from("html_test_categories")
      .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error) {
      setAllCategories(data || []);
    } else {
      setErrorMessage(error.message);
    }
  }

  // ==================================================
  // LOAD PAGE
  // ==================================================
  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const allowed = await checkAdmin();
    if (!allowed) return;

    await loadAllCategories();

    // ROOT HTML TESTS PAGE
    if (!categoryId) {
      setCategory(null);

      const { data, error } = await supabase
        .from("html_test_categories")
        .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
        .is("parent_id", null)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

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

    // CURRENT CATEGORY
    const { data: currentCategory, error: categoryError } = await supabase
      .from("html_test_categories")
      .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
      .eq("id", categoryId)
      .single();

    if (categoryError || !currentCategory) {
      setErrorMessage("Category could not be found.");
      setLoading(false);
      return;
    }

    setCategory(currentCategory);

    // DIRECT CHILD CATEGORIES
    const { data: childCategories, error: childrenError } = await supabase
      .from("html_test_categories")
      .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
      .eq("parent_id", categoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (childrenError) {
      setErrorMessage(childrenError.message);
      setLoading(false);
      return;
    }

    setChildren(childCategories || []);

    // DIRECT HTML TESTS
    const { data: htmlTests, error: testsError } = await supabase
      .from("html_tests")
      .select("id, title, slug, storage_path, access_type, attempt_mode, category_id, is_active, display_order, created_at")
      .eq("category_id", categoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (testsError) {
      setErrorMessage(testsError.message);
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
  const filteredChildren = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return children;
    return children.filter((item) =>
      item.name.toLowerCase().includes(search)
    );
  }, [children, searchText]);

  const filteredTests = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return tests;
    return tests.filter(
      (test) =>
        test.title.toLowerCase().includes(search) ||
        test.slug.toLowerCase().includes(search) ||
        test.storage_path?.toLowerCase().includes(search)
    );
  }, [tests, searchText]);

  function makeSlug(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleTitleChange(value) {
    setTitle(value);
    if (!slug) {
      setSlug(makeSlug(value));
    }
  }

  async function updateCategory(id, changes) {
    const response = await fetch("/api/admin/html-tests/category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Category update failed.");
    }
    return result;
  }

  async function updateTest(id, changes) {
    const response = await fetch("/api/admin/html-tests/test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Test update failed.");
    }
    return result;
  }

  // ==================================================
  // CREATE SUB-CARD
  // ==================================================
  async function createSubCard(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!categoryId) {
      setErrorMessage("Open a category before creating a sub-card.");
      return;
    }

    if (!newCardName.trim()) {
      setErrorMessage("Please enter a sub-card name.");
      return;
    }

    const { error } = await supabase.from("html_test_categories").insert({
      name: newCardName.trim(),
      access_type: category?.access_type === "paid" ? "paid" : "free",
      parent_id: categoryId,
      is_visible: true,
      display_order: children.length,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewCardName("");
    setShowCreate(false);
    setSuccessMessage("Sub-card created successfully.");
    await loadPage();
  }

  // ==================================================
  // UPLOAD HTML
  // ==================================================
  async function handleUpload(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!categoryId || !category) {
      setErrorMessage("Please open a category before uploading an HTML test.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a test title.");
      return;
    }

    if (!slug.trim()) {
      setErrorMessage("Please enter a test slug.");
      return;
    }

    if (!file) {
      setErrorMessage("Please select an HTML file.");
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".html") && !fileName.endsWith(".htm")) {
      setErrorMessage("Only .html and .htm files are allowed.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("slug", slug.trim());
      formData.append("categoryId", category.id);
      formData.append("attemptMode", attemptMode);
      formData.append("file", file);

      const response = await fetch("/api/admin/html-tests/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error || "Upload failed.");
        setUploading(false);
        return;
      }

      setTitle("");
      setSlug("");
      setAttemptMode("one");
      setFile(null);

      const fileInput = document.getElementById("html-file");
      if (fileInput) fileInput.value = "";

      setSuccessMessage("HTML test uploaded successfully.");
      setShowUpload(false);
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong during upload.");
    }

    setUploading(false);
  }

  // ==================================================
  // DELETE TEST
  // ==================================================
  async function handleDeleteTest(test) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${test.title}"?\n\nThe HTML file will also be permanently deleted from Supabase Storage.`
    );
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setBusyId(test.id);

    try {
      const response = await fetch("/api/admin/html-tests/test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: test.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setSuccessMessage("HTML test permanently deleted.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong during deletion.");
    }

    setBusyId(null);
  }

  // ==================================================
  // DELETE CATEGORY
  // ==================================================
  async function handleDeleteCategory(item) {
    const confirmed = window.confirm(
      `PERMANENT DELETE\n\n"${item.name}" and everything inside it will be permanently deleted.\n\nThis includes:\n• All sub-cards\n• All HTML test records\n• All HTML files from Storage\n\nThis cannot be undone.\n\nContinue?`
    );
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setBusyId(item.id);

    try {
      const response = await fetch("/api/admin/html-tests/category", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Category deletion failed.");
      }

      setSuccessMessage(`"${item.name}" was permanently deleted.`);
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong during category deletion.");
    }

    setBusyId(null);
  }

  // ==================================================
  // RENAME CATEGORY
  // ==================================================
  async function saveCategoryRename(item) {
    const name = editingCategoryName.trim();
    if (!name) {
      setErrorMessage("Category name cannot be empty.");
      return;
    }

    setBusyId(item.id);

    try {
      await updateCategory(item.id, { name });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setSuccessMessage("Category renamed successfully.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // TOGGLE CATEGORY VISIBILITY
  // ==================================================
  async function toggleCategoryVisibility(item) {
    setBusyId(item.id);
    setErrorMessage("");

    try {
      await updateCategory(item.id, { is_visible: !item.is_visible });
      setSuccessMessage(item.is_visible ? "Category hidden." : "Category is now visible.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE CATEGORY ACCESS
  // ==================================================
  async function toggleCategoryAccess(item) {
    const newType = item.access_type === "paid" ? "free" : "paid";
    const confirmed = window.confirm(
      `Change "${item.name}" to ${newType === "paid" ? "PAID" : "FREE"}?\n\nThis changes the card itself. Existing sub-cards and tests keep their own current access settings.`
    );
    if (!confirmed) return;

    setBusyId(item.id);

    try {
      await updateCategory(item.id, { access_type: newType });
      setSuccessMessage("Category access type changed.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE CATEGORY UP / DOWN (FIXED & NORMALIZED)
  // ==================================================
  async function moveCategory(item, direction) {
    // Sibling filtering must match both the parent and access tier (Free vs Paid on Root)
    const siblings = children
      .filter((c) => {
        const sameParent = (c.parent_id || null) === (item.parent_id || null);
        const sameTier = !item.parent_id ? c.access_type === item.access_type : true;
        return sameParent && sameTier;
      })
      .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

    const index = siblings.findIndex((c) => c.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic local state update for instant UI feedback
    const idToOrder = {};
    reordered.forEach((c, idx) => {
      idToOrder[c.id] = idx;
    });

    setChildren((prev) =>
      prev
        .map((c) => (idToOrder[c.id] !== undefined ? { ...c, display_order: idToOrder[c.id] } : c))
        .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    );

    setBusyId(item.id);
    setErrorMessage("");

    try {
      // Re-assign explicit sequential order numbers (0, 1, 2, ...) to prevent identical order conflicts
      await Promise.all(
        reordered.map((c, idx) =>
          updateCategory(c.id, { display_order: idx })
        )
      );

      setSuccessMessage("Category order updated.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update category order.");
      await loadPage();
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE CATEGORY TO ANOTHER PARENT
  // ==================================================
  async function saveCategoryMove(item) {
    const parentId = selectedParentId || null;
    if (parentId === item.id) {
      setErrorMessage("A category cannot be moved inside itself.");
      return;
    }

    setBusyId(item.id);

    try {
      await updateCategory(item.id, {
        parent_id: parentId,
        display_order: 0,
      });

      setMovingCategoryId(null);
      setSelectedParentId("");
      setSuccessMessage("Category moved successfully.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // RENAME TEST
  // ==================================================
  async function saveTestRename(test) {
    const newTitle = editingTestTitle.trim();
    if (!newTitle) {
      setErrorMessage("Test title cannot be empty.");
      return;
    }

    setBusyId(test.id);

    try {
      await updateTest(test.id, { title: newTitle });
      setEditingTestId(null);
      setEditingTestTitle("");
      setSuccessMessage("HTML test renamed successfully.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // TOGGLE TEST VISIBILITY
  // ==================================================
  async function toggleTestVisibility(test) {
    setBusyId(test.id);

    try {
      await updateTest(test.id, { is_active: !test.is_active });
      setSuccessMessage(test.is_active ? "HTML test hidden." : "HTML test is now visible.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE TEST ACCESS
  // ==================================================
  async function toggleTestAccess(test) {
    const newType = test.access_type === "paid" ? "free" : "paid";
    const confirmed = window.confirm(`Change "${test.title}" to ${newType === "paid" ? "PAID" : "FREE"}?`);
    if (!confirmed) return;

    setBusyId(test.id);

    try {
      await updateTest(test.id, { access_type: newType });
      setSuccessMessage("HTML test access type changed.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // CHANGE ATTEMPT MODE
  // ==================================================
  async function toggleAttemptMode(test) {
    const newMode = test.attempt_mode === "multiple" ? "one" : "multiple";
    setBusyId(test.id);

    try {
      await updateTest(test.id, { attempt_mode: newMode });
      setSuccessMessage("Attempt mode changed.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE TEST UP / DOWN (FIXED & NORMALIZED)
  // ==================================================
  async function moveTest(test, direction) {
    const siblings = [...tests].sort(
      (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    );

    const index = siblings.findIndex((item) => item.id === test.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic local state update
    const idToOrder = {};
    reordered.forEach((t, idx) => {
      idToOrder[t.id] = idx;
    });

    setTests((prev) =>
      prev
        .map((t) => (idToOrder[t.id] !== undefined ? { ...t, display_order: idToOrder[t.id] } : t))
        .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
    );

    setBusyId(test.id);
    setErrorMessage("");

    try {
      await Promise.all(
        reordered.map((t, idx) =>
          updateTest(t.id, { display_order: idx })
        )
      );

      setSuccessMessage("Test order updated.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update test order.");
      await loadPage();
    }

    setBusyId(null);
  }

  // ==================================================
  // MOVE TEST TO CATEGORY
  // ==================================================
  async function saveTestMove(test) {
    if (!selectedTestCategoryId) {
      setErrorMessage("Please select a destination category.");
      return;
    }

    setBusyId(test.id);

    try {
      await updateTest(test.id, {
        category_id: selectedTestCategoryId,
        display_order: 0,
      });

      setMovingTestId(null);
      setSelectedTestCategoryId("");
      setSuccessMessage("HTML test moved successfully.");
      await loadPage();
    } catch (error) {
      setErrorMessage(error.message);
    }

    setBusyId(null);
  }

  function goBack() {
    if (!category) {
      router.push("/admin");
      return;
    }

    if (category.parent_id) {
      router.push(`/admin/html-tests?category_id=${category.parent_id}`);
    } else {
      router.push("/admin/html-tests");
    }
  }

  function categoryNameById(id) {
    const found = allCategories.find((item) => item.id === id);
    return found?.name || "Unknown category";
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "20px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h1>🧩 HTML Tests</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "16px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
            border: "1px solid #fed7aa",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "18px",
          }}
        >
          <h1 style={{ margin: 0, color: "#9a3412", fontSize: "26px" }}>
            🧩 HTML Tests
          </h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
            Organize and upload your HTML mock tests.
          </p>
        </div>

        {/* MESSAGES */}
        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* SEARCH */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "16px",
          }}
        >
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={
              !category
                ? "🔎 Search main cards..."
                : "🔎 Search sub-cards, test titles, slugs or storage paths..."
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "9px",
              fontSize: "16px",
            }}
          />
        </div>

        {/* ROOT VIEW */}
        {!category && (
          <>
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "18px",
                marginBottom: "18px",
                border: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ marginTop: 0 }}>🧩 Test Categories</h2>
              <p style={{ color: "#6b7280" }}>
                Choose Free or Paid and open your test categories.
              </p>

              <button
                onClick={() => {
                  setSearchText("");
                  setShowCreate(true);
                }}
                style={{
                  width: "100%",
                  padding: "13px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#ffedd5",
                  color: "#9a3412",
                  fontWeight: "700",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ＋ Create Main Card
              </button>
            </div>

            {["free", "paid"].map((type) => {
              const items = filteredChildren.filter((item) => item.access_type === type);
              const isFree = type === "free";

              return (
                <section key={type} style={{ marginBottom: "22px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        background: isFree ? "#dcfce7" : "#fee2e2",
                        color: isFree ? "#166534" : "#991b1b",
                        padding: "7px 12px",
                        borderRadius: "999px",
                        fontWeight: "800",
                      }}
                    >
                      {isFree ? "🔓 FREE" : "🔐 PAID"}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div
                      style={{
                        background: "#fff",
                        border: "1px dashed #d1d5db",
                        borderRadius: "12px",
                        padding: "18px",
                        color: "#6b7280",
                      }}
                    >
                      No {isFree ? "Free" : "Paid"} main cards yet.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {items.map((item, index) => (
                        <CategoryCard
                          key={item.id}
                          item={item}
                          index={index}
                          items={items}
                          router={router}
                          busyId={busyId}
                          editingCategoryId={editingCategoryId}
                          editingCategoryName={editingCategoryName}
                          setEditingCategoryId={setEditingCategoryId}
                          setEditingCategoryName={setEditingCategoryName}
                          saveCategoryRename={saveCategoryRename}
                          toggleCategoryVisibility={toggleCategoryVisibility}
                          toggleCategoryAccess={toggleCategoryAccess}
                          moveCategory={moveCategory}
                          handleDeleteCategory={handleDeleteCategory}
                          movingCategoryId={movingCategoryId}
                          setMovingCategoryId={setMovingCategoryId}
                          selectedParentId={selectedParentId}
                          setSelectedParentId={setSelectedParentId}
                          saveCategoryMove={saveCategoryMove}
                          allCategories={allCategories}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}

        {/* CURRENT CATEGORY VIEW */}
        {category && (
          <>
            <button
              onClick={goBack}
              style={{
                marginBottom: "14px",
                padding: "10px 14px",
                border: "none",
                borderRadius: "9px",
                background: "#f3f4f6",
                color: "#374151",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>

            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                padding: "18px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 8px" }}>📁 {category.name}</h2>
                  <span
                    style={{
                      background: category.access_type === "paid" ? "#fee2e2" : "#dcfce7",
                      color: category.access_type === "paid" ? "#991b1b" : "#166534",
                      padding: "6px 11px",
                      borderRadius: "999px",
                      fontWeight: "800",
                    }}
                  >
                    {category.access_type === "paid" ? "🔐 PAID" : "🔓 FREE"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "10px",
                  marginTop: "18px",
                }}
              >
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    padding: "12px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#ffedd5",
                    color: "#9a3412",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ＋ Create Sub-card
                </button>

                <button
                  onClick={() => setShowUpload(true)}
                  style={{
                    padding: "12px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#fef3c7",
                    color: "#92400e",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ⬆️ Upload HTML
                </button>
              </div>
            </div>

            {/* CREATE SUB-CARD MODAL */}
            {showCreate && (
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <h3>＋ Create Sub-card</h3>
                <form onSubmit={createSubCard}>
                  <input
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="Sub-card name"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      marginBottom: "10px",
                      fontSize: "16px",
                    }}
                  />

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="submit"
                      style={{
                        padding: "10px 15px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#fed7aa",
                        color: "#9a3412",
                        fontWeight: "800",
                      }}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      style={smallGreyButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* UPLOAD FORM */}
            {showUpload && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <h3>⬆️ Upload HTML Test</h3>
                <p style={{ color: "#6b7280" }}>
                  Category: <strong>{category.name}</strong>
                </p>

                <form onSubmit={handleUpload}>
                  <label>
                    <strong>Test Title</strong>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Example: Odisha GK Mock Test 01"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      margin: "8px 0 16px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "16px",
                    }}
                  />

                  <label>
                    <strong>Test Slug</strong>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(makeSlug(e.target.value))}
                    placeholder="odisha-gk-01"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      margin: "8px 0 4px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "16px",
                    }}
                  />

                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    Test URL: {" /html-test/"}
                    {slug || "your-slug"}
                  </p>

                  <label>
                    <strong>Attempt Mode</strong>
                  </label>
                  <select
                    value={attemptMode}
                    onChange={(e) => setAttemptMode(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      margin: "8px 0 16px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background: "#fff",
                      fontSize: "16px",
                    }}
                  >
                    <option value="one">📝 One Attempt</option>
                    <option value="multiple">🔄 Multiple Attempts</option>
                  </select>

                  <label>
                    <strong>HTML File</strong>
                  </label>
                  <input
                    id="html-file"
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: "block", margin: "8px 0 18px" }}
                  />

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={uploading}
                      style={{
                        padding: "12px 18px",
                        border: "none",
                        borderRadius: "9px",
                        background: uploading ? "#d1d5db" : "#fde68a",
                        color: "#92400e",
                        fontWeight: "800",
                        cursor: uploading ? "not-allowed" : "pointer",
                      }}
                    >
                      {uploading ? "Uploading..." : "⬆️ Upload Test"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUpload(false)}
                      style={{
                        padding: "12px 18px",
                        border: "none",
                        borderRadius: "9px",
                        background: "#e5e7eb",
                        color: "#374151",
                        fontWeight: "700",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-CARDS */}
            {children.length > 0 && (
              <section style={{ marginBottom: "22px" }}>
                <h3>📁 Sub-cards</h3>
                {filteredChildren.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px dashed #d1d5db",
                      borderRadius: "12px",
                      padding: "18px",
                      color: "#6b7280",
                    }}
                  >
                    No matching sub-cards.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {filteredChildren.map((item, index) => (
                      <CategoryCard
                        key={item.id}
                        item={item}
                        index={index}
                        items={filteredChildren}
                        router={router}
                        busyId={busyId}
                        editingCategoryId={editingCategoryId}
                        editingCategoryName={editingCategoryName}
                        setEditingCategoryId={setEditingCategoryId}
                        setEditingCategoryName={setEditingCategoryName}
                        saveCategoryRename={saveCategoryRename}
                        toggleCategoryVisibility={toggleCategoryVisibility}
                        toggleCategoryAccess={toggleCategoryAccess}
                        moveCategory={moveCategory}
                        handleDeleteCategory={handleDeleteCategory}
                        movingCategoryId={movingCategoryId}
                        setMovingCategoryId={setMovingCategoryId}
                        selectedParentId={selectedParentId}
                        setSelectedParentId={setSelectedParentId}
                        saveCategoryMove={saveCategoryMove}
                        allCategories={allCategories}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* HTML TESTS */}
            <section>
              <h3>📄 HTML Tests</h3>
              {tests.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px dashed #d1d5db",
                    borderRadius: "12px",
                    padding: "20px",
                    color: "#6b7280",
                  }}
                >
                  No HTML tests in this category yet.
                  <br />
                  Tap <strong>⬆️ Upload HTML</strong> to add one.
                </div>
              ) : filteredTests.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px dashed #d1d5db",
                    borderRadius: "12px",
                    padding: "20px",
                    color: "#6b7280",
                  }}
                >
                  No HTML tests match your search.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {filteredTests.map((test, index) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      index={index}
                      tests={filteredTests}
                      busyId={busyId}
                      editingTestId={editingTestId}
                      editingTestTitle={editingTestTitle}
                      setEditingTestId={setEditingTestId}
                      setEditingTestTitle={setEditingTestTitle}
                      saveTestRename={saveTestRename}
                      toggleTestVisibility={toggleTestVisibility}
                      toggleTestAccess={toggleTestAccess}
                      toggleAttemptMode={toggleAttemptMode}
                      moveTest={moveTest}
                      handleDeleteTest={handleDeleteTest}
                      movingTestId={movingTestId}
                      setMovingTestId={setMovingTestId}
                      selectedTestCategoryId={selectedTestCategoryId}
                      setSelectedTestCategoryId={setSelectedTestCategoryId}
                      saveTestMove={saveTestMove}
                      allCategories={allCategories}
                      categoryId={categoryId}
                      categoryNameById={categoryNameById}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* MAIN CARD CREATION MODAL */}
        {showCreate && !category && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                background: "#fff",
                width: "100%",
                maxWidth: "450px",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <h2>＋ Create Main Card</h2>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!newCardName.trim()) {
                    setErrorMessage("Please enter a card name.");
                    return;
                  }

                  const { error } = await supabase
                    .from("html_test_categories")
                    .insert({
                      name: newCardName.trim(),
                      access_type: newCardAccess,
                      parent_id: null,
                      is_visible: true,
                      display_order: children.filter(
                        (item) => item.access_type === newCardAccess
                      ).length,
                    });

                  if (error) {
                    setErrorMessage(error.message);
                    return;
                  }

                  setNewCardName("");
                  setNewCardAccess("free");
                  setShowCreate(false);
                  setSuccessMessage("Main card created successfully.");
                  await loadPage();
                }}
              >
                <input
                  name="name"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="Card name"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "16px",
                    marginBottom: "12px",
                  }}
                />

                <select
                  name="access"
                  value={newCardAccess}
                  onChange={(e) => setNewCardAccess(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "16px",
                    marginBottom: "15px",
                  }}
                >
                  <option value="free">🔓 FREE</option>
                  <option value="paid">🔐 PAID</option>
                </select>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "none",
                      borderRadius: "9px",
                      background: "#fed7aa",
                      color: "#9a3412",
                      fontWeight: "800",
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "none",
                      borderRadius: "9px",
                      background: "#e5e7eb",
                      color: "#374151",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD RETURN */}
        <button
          onClick={() => router.push("/admin")}
          style={{
            marginTop: "25px",
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "10px",
            background: "#e5e7eb",
            color: "#374151",
            fontWeight: "700",
          }}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    </main>
  );
}

// ==================================================
// CATEGORY CARD
// ==================================================
function CategoryCard({
  item,
  index,
  items,
  router,
  busyId,
  editingCategoryId,
  editingCategoryName,
  setEditingCategoryId,
  setEditingCategoryName,
  saveCategoryRename,
  toggleCategoryVisibility,
  toggleCategoryAccess,
  moveCategory,
  handleDeleteCategory,
  movingCategoryId,
  setMovingCategoryId,
  selectedParentId,
  setSelectedParentId,
  saveCategoryMove,
  allCategories,
}) {
  const isPaid = item.access_type === "paid";
  const isBusy = busyId === item.id;

  return (
    <div
      style={{
        background: item.is_visible ? "#fff" : "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      {editingCategoryId === item.id ? (
        <div>
          <input
            value={editingCategoryName}
            onChange={(e) => setEditingCategoryName(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "11px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={() => saveCategoryRename(item)}
              disabled={isBusy}
              style={smallGreenButton}
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingCategoryId(null);
                setEditingCategoryName("");
              }}
              style={smallGreyButton}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 8px" }}>📁 {item.name}</h3>
              <span
                style={{
                  background: isPaid ? "#fee2e2" : "#dcfce7",
                  color: isPaid ? "#991b1b" : "#166534",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontWeight: "800",
                }}
              >
                {isPaid ? "🔐 PAID" : "🔓 FREE"}
              </span>

              {!item.is_visible && (
                <span
                  style={{
                    marginLeft: "7px",
                    background: "#e5e7eb",
                    color: "#4b5563",
                    padding: "6px 9px",
                    borderRadius: "999px",
                    fontWeight: "700",
                  }}
                >
                  Hidden
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push(`/admin/html-tests?category_id=${item.id}`)}
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "12px",
              border: "none",
              borderRadius: "10px",
              background: "#dbeafe",
              color: "#1e40af",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            📂 Open
          </button>

          <div style={controlGrid}>
            <button
              onClick={() => {
                setEditingCategoryId(item.id);
                setEditingCategoryName(item.name);
              }}
              style={smallOrangeButton}
              disabled={isBusy}
            >
              ✏️ Rename
            </button>

            <button
              onClick={() => toggleCategoryVisibility(item)}
              style={smallGreyButton}
              disabled={isBusy}
            >
              {item.is_visible ? "🙈 Hide" : "👁️ Show"}
            </button>

            <button
              onClick={() => toggleCategoryAccess(item)}
              style={isPaid ? smallGreenButton : smallRedButton}
              disabled={isBusy}
            >
              {isPaid ? "🔓 Make Free" : "🔐 Make Paid"}
            </button>

            <button
              onClick={() => moveCategory(item, "up")}
              style={smallGreyButton}
              disabled={isBusy || index === 0}
            >
              ⬆️ Up
            </button>

            <button
              onClick={() => moveCategory(item, "down")}
              style={smallGreyButton}
              disabled={isBusy || index === items.length - 1}
            >
              ⬇️ Down
            </button>

            <button
              onClick={() => {
                setMovingCategoryId(item.id);
                setSelectedParentId(item.parent_id || "");
              }}
              style={smallBlueButton}
              disabled={isBusy}
            >
              📁 Move
            </button>

            <button
              onClick={() => handleDeleteCategory(item)}
              style={smallDeleteButton}
              disabled={isBusy}
            >
              {isBusy ? "Working..." : "🗑️ Delete"}
            </button>
          </div>

          {movingCategoryId === item.id && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
              }}
            >
              <strong>Move category</strong>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#fff",
                }}
              >
                <option value="">Root / Free-Paid section</option>
                {allCategories
                  .filter((cat) => cat.id !== item.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.access_type === "paid" ? "PAID" : "FREE"})
                    </option>
                  ))}
              </select>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => saveCategoryMove(item)}
                  style={smallBlueButton}
                >
                  Move
                </button>
                <button
                  onClick={() => {
                    setMovingCategoryId(null);
                    setSelectedParentId("");
                  }}
                  style={smallGreyButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================================================
// TEST CARD
// ==================================================
function TestCard({
  test,
  index,
  tests,
  busyId,
  editingTestId,
  editingTestTitle,
  setEditingTestId,
  setEditingTestTitle,
  saveTestRename,
  toggleTestVisibility,
  toggleTestAccess,
  toggleAttemptMode,
  moveTest,
  handleDeleteTest,
  movingTestId,
  setMovingTestId,
  selectedTestCategoryId,
  setSelectedTestCategoryId,
  saveTestMove,
  allCategories,
  categoryNameById,
}) {
  const isPaid = test.access_type === "paid";
  const isBusy = busyId === test.id;

  return (
    <div
      style={{
        background: test.is_active ? "#fff" : "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      {editingTestId === test.id ? (
        <>
          <input
            value={editingTestTitle}
            onChange={(e) => setEditingTestTitle(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "11px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={() => saveTestRename(test)}
              disabled={isBusy}
              style={smallGreenButton}
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingTestId(null);
                setEditingTestTitle("");
              }}
              style={smallGreyButton}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: "0", flex: 1 }}>
              <h4 style={{ margin: "0 0 7px" }}>📄 {test.title}</h4>
              <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "14px" }}>
                Slug: {test.slug}
              </p>
              <p style={{ margin: "4px 0" }}>
                {test.attempt_mode === "multiple"
                  ? "🔄 Multiple Attempts"
                  : "📝 One Attempt"}
              </p>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#4b5563",
                  fontSize: "13px",
                  wordBreak: "break-all",
                }}
              >
                <strong>Storage:</strong> {test.storage_path || "Not available"}
              </p>
              <p style={{ margin: "7px 0 0", color: "#4b5563", fontSize: "14px" }}>
                <strong>Current category:</strong> {categoryNameById(test.category_id)}
              </p>
              {!test.is_active && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "7px",
                    background: "#e5e7eb",
                    color: "#4b5563",
                    padding: "5px 8px",
                    borderRadius: "999px",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Hidden
                </span>
              )}
            </div>

            <span
              style={{
                background: isPaid ? "#fee2e2" : "#dcfce7",
                color: isPaid ? "#991b1b" : "#166534",
                padding: "6px 10px",
                borderRadius: "999px",
                fontWeight: "800",
                height: "fit-content",
              }}
            >
              {isPaid ? "🔐 PAID" : "🔓 FREE"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <a
              href={`/html-test/${test.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 13px",
                background: "#dbeafe",
                color: "#1e40af",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              📂 Open Test
            </a>

            <button
              onClick={() => {
                setEditingTestId(test.id);
                setEditingTestTitle(test.title);
              }}
              style={smallOrangeButton}
              disabled={isBusy}
            >
              ✏️ Rename
            </button>

            <button
              onClick={() => toggleTestVisibility(test)}
              style={smallGreyButton}
              disabled={isBusy}
            >
              {test.is_active ? "🙈 Hide" : "👁️ Show"}
            </button>

            <button
              onClick={() => toggleTestAccess(test)}
              style={isPaid ? smallGreenButton : smallRedButton}
              disabled={isBusy}
            >
              {isPaid ? "🔓 Make Free" : "🔐 Make Paid"}
            </button>

            <button
              onClick={() => toggleAttemptMode(test)}
              style={smallBlueButton}
              disabled={isBusy}
            >
              {test.attempt_mode === "multiple"
                ? "📝 One Attempt"
                : "🔄 Multiple"}
            </button>

            <button
              onClick={() => moveTest(test, "up")}
              style={smallGreyButton}
              disabled={isBusy || index === 0}
            >
              ⬆️ Up
            </button>

            <button
              onClick={() => moveTest(test, "down")}
              style={smallGreyButton}
              disabled={isBusy || index === tests.length - 1}
            >
              ⬇️ Down
            </button>

            <button
              onClick={() => {
                setMovingTestId(test.id);
                setSelectedTestCategoryId(test.category_id || "");
              }}
              style={smallBlueButton}
              disabled={isBusy}
            >
              📁 Move
            </button>

            <button
              onClick={() => handleDeleteTest(test)}
              style={smallDeleteButton}
              disabled={isBusy}
            >
              {isBusy ? "Working..." : "🗑️ Delete"}
            </button>
          </div>

          {movingTestId === test.id && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
              }}
            >
              <strong>Move test</strong>
              <select
                value={selectedTestCategoryId}
                onChange={(e) => setSelectedTestCategoryId(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#fff",
                }}
              >
                <option value="">Select category</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.access_type === "paid" ? "PAID" : "FREE"})
                  </option>
                ))}
              </select>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Current category: {categoryNameById(test.category_id)}
              </p>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => saveTestMove(test)}
                  style={smallBlueButton}
                >
                  Move
                </button>
                <button
                  onClick={() => {
                    setMovingTestId(null);
                    setSelectedTestCategoryId("");
                  }}
                  style={smallGreyButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================================================
// BUTTON STYLES
// ==================================================
const controlGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
  gap: "7px",
  marginTop: "10px",
};

const smallOrangeButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#ffedd5",
  color: "#9a3412",
  fontWeight: "700",
  cursor: "pointer",
};

const smallBlueButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#dbeafe",
  color: "#1e40af",
  fontWeight: "700",
  cursor: "pointer",
};

const smallGreyButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#e5e7eb",
  color: "#374151",
  fontWeight: "700",
  cursor: "pointer",
};

const smallGreenButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: "700",
  cursor: "pointer",
};

const smallRedButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: "700",
  cursor: "pointer",
};

const smallDeleteButton = {
  padding: "8px 9px",
  border: "none",
  borderRadius: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: "700",
  cursor: "pointer",
};

export default function AdminHtmlTestsPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "20px" }}>
          <h1>🧩 HTML Tests</h1>
          <p>Loading...</p>
        </main>
      }
    >
      <HtmlTestsContent />
    </Suspense>
  );
}
