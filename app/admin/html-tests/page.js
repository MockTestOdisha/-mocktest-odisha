"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [newCardName, setNewCardName] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [attemptMode, setAttemptMode] = useState("one");
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --------------------------------------------------
  // Admin check
  // --------------------------------------------------

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return false;
    }

    const { data: profile, error } =
      await supabase
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

  // --------------------------------------------------
  // Load current category
  // --------------------------------------------------

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const allowed = await checkAdmin();

    if (!allowed) {
      return;
    }

    if (!categoryId) {
      setCategory(null);

      const { data, error } =
        await supabase
          .from("html_test_categories")
          .select(
            "id, name, access_type, parent_id, is_visible, display_order"
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
        "id, name, access_type, parent_id, is_visible, display_order"
      )
      .eq("id", categoryId)
      .single();

    if (categoryError || !currentCategory) {
      setErrorMessage(
        "Category could not be found."
      );
      setLoading(false);
      return;
    }

    setCategory(currentCategory);

    // Load direct child cards
    const {
      data: childCategories,
      error: childrenError,
    } = await supabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, parent_id, is_visible, display_order"
      )
      .eq("parent_id", categoryId)
      .order("display_order")
      .order("created_at");

    if (childrenError) {
      setErrorMessage(childrenError.message);
      setLoading(false);
      return;
    }

    setChildren(childCategories || []);

    // Load HTML tests directly inside this category
    const {
      data: htmlTests,
      error: testsError,
    } = await supabase
      .from("html_tests")
      .select(
        "id, title, slug, access_type, attempt_mode, category_id, is_active, created_at"
      )
      .eq("category_id", categoryId)
      .order("created_at", {
        ascending: false,
      });

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

  // --------------------------------------------------
  // Slug
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Create sub-card
  // --------------------------------------------------

  async function createSubCard(event) {
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
          name: newCardName.trim(),
          access_type:
            category?.access_type === "paid"
              ? "paid"
              : "free",
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

    setSuccessMessage(
      "Sub-card created successfully."
    );

    await loadPage();
  }

  // --------------------------------------------------
  // Upload HTML
  // --------------------------------------------------

  async function handleUpload(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!categoryId || !category) {
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
      !fileName.endsWith(".html") &&
      !fileName.endsWith(".htm")
    ) {
      setErrorMessage(
        "Only .html and .htm files are allowed."
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

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

      const response = await fetch(
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
    } catch {
      setErrorMessage(
        "Something went wrong during upload."
      );
    }

    setUploading(false);
  }

  // --------------------------------------------------
  // Delete HTML test
  // --------------------------------------------------

  async function handleDeleteTest(test) {
    const confirmed =
      window.confirm(
        `Are you sure you want to permanently delete "${test.title}"?\n\nThis will delete the HTML file from storage and remove the test record.`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setDeletingId(test.id);

    try {
      const response =
        await fetch(
          "/api/admin/html-tests/delete",
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
        setErrorMessage(
          result.error ||
            "Delete failed."
        );
        setDeletingId(null);
        return;
      }

      setTests((current) =>
        current.filter(
          (item) =>
            item.id !== test.id
        )
      );

      setSuccessMessage(
        "HTML test deleted successfully."
      );
    } catch {
      setErrorMessage(
        "Something went wrong during deletion."
      );
    }

    setDeletingId(null);
  }

  // --------------------------------------------------
  // Go back
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Root page
  // --------------------------------------------------

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f8fa",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <h1>🧩 HTML Tests</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fa",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #fff7ed, #fffbeb)",
            border:
              "1px solid #fed7aa",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "18px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#9a3412",
              fontSize: "26px",
            }}
          >
            🧩 HTML Tests
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#6b7280",
            }}
          >
            Organize and upload your
            HTML mock tests.
          </p>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
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
              border:
                "1px solid #bbf7d0",
              color: "#166534",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* ROOT */}
        {!category && (
          <>
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "18px",
                marginBottom: "18px",
                border:
                  "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                🧩 Test Categories
              </h2>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                Choose Free or Paid and
                open your test categories.
              </p>

              <button
                onClick={() =>
                  setShowCreate(true)
                }
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

            {["free", "paid"].map(
              (type) => {
                const items =
                  children.filter(
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
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "10px",
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
                          gap: "12px",
                        }}
                      >
                        {items.map(
                          (item) => (
                            <CategoryCard
                              key={
                                item.id
                              }
                              item={
                                item
                              }
                              router={
                                router
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
              onClick={goBack}
              style={{
                marginBottom: "14px",
                padding:
                  "10px 14px",
                border: "none",
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
                padding: "18px",
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
                  gap: "10px",
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
                  gap: "10px",
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
                    border: "none",
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
                    border: "none",
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

            {/* Create form */}
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

                <form
                  onSubmit={
                    createSubCard
                  }
                >
                  <input
                    value={
                      newCardName
                    }
                    onChange={(e) =>
                      setNewCardName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Sub-card name"
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
                        "8px",
                      marginBottom:
                        "10px",
                      fontSize:
                        "16px",
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="submit"
                      style={{
                        padding:
                          "10px 15px",
                        border:
                          "none",
                        borderRadius:
                          "8px",
                        background:
                          "#fed7aa",
                        color:
                          "#9a3412",
                        fontWeight:
                          "800",
                      }}
                    >
                      Create
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowCreate(
                          false
                        )
                      }
                      style={{
                        padding:
                          "10px 15px",
                        border:
                          "none",
                        borderRadius:
                          "8px",
                        background:
                          "#e5e7eb",
                        color:
                          "#374151",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Upload form */}
            {showUpload && (
              <div
                style={{
                  background:
                    "#fffbeb",
                  border:
                    "1px solid #fde68a",
                  borderRadius:
                    "12px",
                  padding:
                    "16px",
                  marginBottom:
                    "18px",
                }}
              >
                <h3>
                  ⬆️ Upload HTML Test
                </h3>

                <p
                  style={{
                    color:
                      "#6b7280",
                  }}
                >
                  Category:{" "}
                  <strong>
                    {category.name}
                  </strong>
                </p>

                <p
                  style={{
                    fontWeight:
                      "800",
                  }}
                >
                  {category.access_type ===
                  "paid"
                    ? "🔐 PAID"
                    : "🔓 FREE"}
                </p>

                <form
                  onSubmit={
                    handleUpload
                  }
                >
                  <label>
                    <strong>
                      Test Title
                    </strong>
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(e) =>
                      handleTitleChange(
                        e.target
                          .value
                      )
                    }
                    placeholder="Example: Odisha GK Mock Test 01"
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "12px",
                      margin:
                        "8px 0 16px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius:
                        "8px",
                      fontSize:
                        "16px",
                    }}
                  />

                  <label>
                    <strong>
                      Test Slug
                    </strong>
                  </label>

                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        makeSlug(
                          e.target
                            .value
                        )
                      )
                    }
                    placeholder="odisha-gk-01"
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "12px",
                      margin:
                        "8px 0 4px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius:
                        "8px",
                      fontSize:
                        "16px",
                    }}
                  />

                  <p
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "14px",
                      marginBottom:
                        "16px",
                    }}
                  >
                    Test URL:
                    {" /html-test/"}
                    {slug ||
                      "your-slug"}
                  </p>

                  <label>
                    <strong>
                      Attempt Mode
                    </strong>
                  </label>

                  <select
                    value={
                      attemptMode
                    }
                    onChange={(e) =>
                      setAttemptMode(
                        e.target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "12px",
                      margin:
                        "8px 0 16px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius:
                        "8px",
                      background:
                        "#fff",
                      fontSize:
                        "16px",
                    }}
                  >
                    <option value="one">
                      📝 One Attempt
                    </option>

                    <option value="multiple">
                      🔄 Multiple Attempts
                    </option>
                  </select>

                  <label>
                    <strong>
                      HTML File
                    </strong>
                  </label>

                  <input
                    id="html-file"
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={(e) =>
                      setFile(
                        e.target
                          .files?.[0] ||
                          null
                      )
                    }
                    style={{
                      display:
                        "block",
                      margin:
                        "8px 0 18px",
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={
                        uploading
                      }
                      style={{
                        padding:
                          "12px 18px",
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        background:
                          uploading
                            ? "#d1d5db"
                            : "#fde68a",
                        color:
                          "#92400e",
                        fontWeight:
                          "800",
                        cursor:
                          uploading
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {uploading
                        ? "Uploading..."
                        : "⬆️ Upload Test"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowUpload(
                          false
                        )
                      }
                      style={{
                        padding:
                          "12px 18px",
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        background:
                          "#e5e7eb",
                        color:
                          "#374151",
                        fontWeight:
                          "700",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-cards */}
            {children.length >
              0 && (
              <section
                style={{
                  marginBottom:
                    "22px",
                }}
              >
                <h3>
                  📁 Sub-cards
                </h3>

                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                  }}
                >
                  {children.map(
                    (item) => (
                      <CategoryCard
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        router={
                          router
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* HTML tests */}
            <section>
              <h3>
                📄 HTML Tests
              </h3>

              {tests.length ===
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
                      "20px",
                    color:
                      "#6b7280",
                  }}
                >
                  No HTML tests in
                  this category yet.
                  <br />
                  Tap{" "}
                  <strong>
                    ⬆️ Upload HTML
                  </strong>{" "}
                  to add one.
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                  }}
                >
                  {tests.map(
                    (test) => (
                      <div
                        key={
                          test.id
                        }
                        style={{
                          background:
                            "#fff",
                          border:
                            "1px solid #e5e7eb",
                          borderRadius:
                            "12px",
                          padding:
                            "16px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin:
                                  "0 0 7px",
                              }}
                            >
                              📄{" "}
                              {test.title}
                            </h4>

                            <p
                              style={{
                                margin:
                                  "4px 0",
                                color:
                                  "#6b7280",
                                fontSize:
                                  "14px",
                              }}
                            >
                              Slug:{" "}
                              {test.slug}
                            </p>

                            <p
                              style={{
                                margin:
                                  "4px 0",
                              }}
                            >
                              {test.attempt_mode ===
                              "multiple"
                                ? "🔄 Multiple Attempts"
                                : "📝 One Attempt"}
                            </p>
                          </div>

                          <span
                            style={{
                              background:
                                test.access_type ===
                                "paid"
                                  ? "#fee2e2"
                                  : "#dcfce7",
                              color:
                                test.access_type ===
                                "paid"
                                  ? "#991b1b"
                                  : "#166534",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "999px",
                              fontWeight:
                                "800",
                              height:
                                "fit-content",
                            }}
                          >
                            {test.access_type ===
                            "paid"
                              ? "🔐 PAID"
                              : "🔓 FREE"}
                          </span>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                            marginTop:
                              "12px",
                          }}
                        >
                          <a
                            href={`/html-test/${test.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding:
                                "9px 13px",
                              background:
                                "#dbeafe",
                              color:
                                "#1e40af",
                              borderRadius:
                                "8px",
                              textDecoration:
                                "none",
                              fontWeight:
                                "700",
                            }}
                          >
                            📂 Open Test
                          </a>

                          <button
                            onClick={() =>
                              handleDeleteTest(
                                test
                              )
                            }
                            disabled={
                              deletingId ===
                              test.id
                            }
                            style={{
                              padding:
                                "9px 13px",
                              background:
                                deletingId ===
                                test.id
                                  ? "#e5e7eb"
                                  : "#fee2e2",
                              color:
                                deletingId ===
                                test.id
                                  ? "#6b7280"
                                  : "#991b1b",
                              border:
                                "none",
                              borderRadius:
                                "8px",
                              fontWeight:
                                "700",
                            }}
                          >
                            {deletingId ===
                            test.id
                              ? "Deleting..."
                              : "🗑️ Delete"}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* Main-card creation */}
        {showCreate &&
          !category && (
            <div
              style={{
                position:
                  "fixed",
                inset: 0,
                background:
                  "rgba(0,0,0,0.35)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "20px",
                zIndex: 50,
              }}
            >
              <div
                style={{
                  background:
                    "#fff",
                  width:
                    "100%",
                  maxWidth:
                    "450px",
                  borderRadius:
                    "14px",
                  padding:
                    "20px",
                }}
              >
                <h2>
                  ＋ Create Main Card
                </h2>

                <form
                  onSubmit={async (
                    event
                  ) => {
                    event.preventDefault();

                    if (
                      !newCardName.trim()
                    ) {
                      return;
                    }

                    const access =
                      event.currentTarget.access.value;

                    const {
                      error,
                    } =
                      await supabase
                        .from(
                          "html_test_categories"
                        )
                        .insert({
                          name:
                            newCardName.trim(),
                          access_type:
                            access,
                          parent_id:
                            null,
                          is_visible:
                            true,
                          display_order:
                            children.filter(
                              (item) =>
                                item.access_type ===
                                access
                            ).length,
                        });

                    if (error) {
                      setErrorMessage(
                        error.message
                      );
                      return;
                    }

                    setNewCardName(
                      ""
                    );
                    setShowCreate(
                      false
                    );
                    setSuccessMessage(
                      "Main card created successfully."
                    );

                    await loadPage();
                  }}
                >
                  <input
                    name="name"
                    value={
                      newCardName
                    }
                    onChange={(e) =>
                      setNewCardName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Card name"
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
                        "8px",
                      fontSize:
                        "16px",
                      marginBottom:
                        "12px",
                    }}
                  />

                  <select
                    name="access"
                    defaultValue="free"
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
                        "8px",
                      fontSize:
                        "16px",
                      marginBottom:
                        "15px",
                    }}
                  >
                    <option value="free">
                      🔓 FREE
                    </option>
                    <option value="paid">
                      🔐 PAID
                    </option>
                  </select>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding:
                          "12px",
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        background:
                          "#fed7aa",
                        color:
                          "#9a3412",
                        fontWeight:
                          "800",
                      }}
                    >
                      Create
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowCreate(
                          false
                        )
                      }
                      style={{
                        flex: 1,
                        padding:
                          "12px",
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        background:
                          "#e5e7eb",
                        color:
                          "#374151",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* Bottom navigation */}
        <button
          onClick={() =>
            router.push(
              "/admin"
            )
          }
          style={{
            marginTop:
              "25px",
            width: "100%",
            padding:
              "12px",
            border:
              "none",
            borderRadius:
              "10px",
            background:
              "#e5e7eb",
            color:
              "#374151",
            fontWeight:
              "700",
          }}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    </main>
  );
}

// --------------------------------------------------
// Category card
// --------------------------------------------------

function CategoryCard({
  item,
  router,
}) {
  const isPaid =
    item.access_type ===
    "paid";

  return (
    <div
      style={{
        background:
          item.is_visible
            ? "#fff"
            : "#f3f4f6",
        border:
          "1px solid #e5e7eb",
        borderRadius:
          "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          gap: "10px",
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin:
                "0 0 8px",
            }}
          >
            📁 {item.name}
          </h3>

          <span
            style={{
              background:
                isPaid
                  ? "#fee2e2"
                  : "#dcfce7",
              color:
                isPaid
                  ? "#991b1b"
                  : "#166534",
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              fontWeight:
                "800",
            }}
          >
            {isPaid
              ? "🔐 PAID"
              : "🔓 FREE"}
          </span>
        </div>
      </div>

      <button
        onClick={() =>
          router.push(
            `/admin/html-tests?category_id=${item.id}`
          )
        }
        style={{
          width:
            "100%",
          marginTop:
            "14px",
          padding:
            "12px",
          border:
            "none",
          borderRadius:
            "10px",
          background:
            "#dbeafe",
          color:
            "#1e40af",
          fontWeight:
            "800",
          cursor:
            "pointer",
        }}
      >
        📂 Open
      </button>
    </div>
  );
}

export default function AdminHtmlTestsPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            padding: "20px",
          }}
        >
          <h1>🧩 HTML Tests</h1>
          <p>
            Loading...
          </p>
        </main>
      }
    >
      <HtmlTestsContent />
    </Suspense>
  );
}
