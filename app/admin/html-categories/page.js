"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HtmlCategoriesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryAccessType, setCategoryAccessType] =
    useState("free");

  const [parentId, setParentId] = useState("");

  const [expanded, setExpanded] = useState({});

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    await loadCategories();

    setLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, parent_id, is_visible, display_order, created_at"
      )
      .order("display_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setErrorMessage(
        "Could not load categories: " + error.message
      );
      return;
    }

    setCategories(data || []);
  }

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function getChildren(categoryId) {
    return categories
      .filter(
        (category) =>
          category.parent_id === categoryId
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );
  }

  function getRootCategories(accessType) {
    return categories
      .filter(
        (category) =>
          category.parent_id === null &&
          category.access_type === accessType
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );
  }

  function getDepth(categoryId) {
    let depth = 0;
    let current = categories.find(
      (category) => category.id === categoryId
    );

    while (current && current.parent_id) {
      depth += 1;

      current = categories.find(
        (category) =>
          category.id === current.parent_id
      );

      if (depth > 100) {
        break;
      }
    }

    return depth;
  }

  function isDescendant(
    possibleChildId,
    possibleParentId
  ) {
    let current = categories.find(
      (category) =>
        category.id === possibleChildId
    );

    let safety = 0;

    while (current?.parent_id) {
      if (current.parent_id === possibleParentId) {
        return true;
      }

      current = categories.find(
        (category) =>
          category.id === current.parent_id
      );

      safety += 1;

      if (safety > 100) {
        break;
      }
    }

    return false;
  }

  function getNextDisplayOrder(parentCategoryId) {
    const siblings = categories.filter(
      (category) =>
        category.parent_id ===
        parentCategoryId
    );

    if (siblings.length === 0) {
      return 0;
    }

    return (
      Math.max(
        ...siblings.map((category) =>
          Number(category.display_order || 0)
        )
      ) + 1
    );
  }

  async function createCategory() {
    clearMessages();

    const name = categoryName.trim();

    if (!name) {
      setErrorMessage(
        "Please enter a category name."
      );
      return;
    }

    if (parentId) {
      const parent = categories.find(
        (category) =>
          category.id === parentId
      );

      if (!parent) {
        setErrorMessage(
          "Selected parent category was not found."
        );
        return;
      }

      if (
        parent.access_type !==
        categoryAccessType
      ) {
        setErrorMessage(
          "A category must have the same Free/Paid type as its parent."
        );
        return;
      }
    }

    setSaving(true);

    const displayOrder =
      getNextDisplayOrder(
        parentId || null
      );

    const { data, error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: categoryAccessType,
        parent_id: parentId || null,
        is_visible: true,
        display_order: displayOrder,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not create category: " +
          error.message
      );
      return;
    }

    if (parentId) {
      setExpanded((previous) => ({
        ...previous,
        [parentId]: true,
      }));
    }

    setCategoryName("");
    setParentId("");

    setMessage(
      `Category "${data.name}" created successfully.`
    );

    await loadCategories();
  }

  async function renameCategory(category) {
    const newName = window.prompt(
      "Enter the new category name:",
      category.name
    );

    if (newName === null) {
      return;
    }

    const name = newName.trim();

    if (!name) {
      window.alert(
        "Category name cannot be empty."
      );
      return;
    }

    clearMessages();
    setSaving(true);

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        name,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", category.id);

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not rename category: " +
          error.message
      );
      return;
    }

    setMessage(
      `Category renamed to "${name}".`
    );

    await loadCategories();
  }

  async function toggleVisibility(category) {
    clearMessages();
    setSaving(true);

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        is_visible: !category.is_visible,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", category.id);

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not change visibility: " +
          error.message
      );
      return;
    }

    setMessage(
      category.is_visible
        ? `"${category.name}" is now hidden.`
        : `"${category.name}" is now visible.`
    );

    await loadCategories();
  }

  async function deleteCategory(category) {
    const children = getChildren(
      category.id
    );

    const hasChildren =
      children.length > 0;

    const firstMessage = hasChildren
      ? `Permanently delete "${category.name}"?\n\nThis category contains ${children.length} direct child categor${children.length === 1 ? "y" : "ies"}.\n\nEverything underneath it will also be permanently deleted because of the database cascade.`
      : `Permanently delete "${category.name}"?\n\nThis action cannot be undone.`;

    const confirmed =
      window.confirm(firstMessage);

    if (!confirmed) {
      return;
    }

    const finalConfirmed =
      window.confirm(
        `FINAL CONFIRMATION\n\nDelete "${category.name}" permanently?\n\nYES = permanently delete\nNO = cancel`
      );

    if (!finalConfirmed) {
      return;
    }

    clearMessages();
    setSaving(true);

    const { error } = await supabase
      .from("html_test_categories")
      .delete()
      .eq("id", category.id);

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not delete category: " +
          error.message
      );
      return;
    }

    setMessage(
      `"${category.name}" and all nested categories beneath it were permanently deleted.`
    );

    await loadCategories();
  }

  async function moveCategory(
    category,
    direction
  ) {
    clearMessages();

    const siblings = categories
      .filter(
        (item) =>
          item.parent_id ===
          category.parent_id &&
          item.access_type ===
          category.access_type
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    const currentIndex =
      siblings.findIndex(
        (item) =>
          item.id === category.id
      );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= siblings.length
    ) {
      return;
    }

    const current =
      siblings[currentIndex];

    const target =
      siblings[targetIndex];

    setSaving(true);

    const currentOrder =
      Number(
        current.display_order || 0
      );

    const targetOrder =
      Number(
        target.display_order || 0
      );

    const { error: firstError } =
      await supabase
        .from("html_test_categories")
        .update({
          display_order:
            targetOrder,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", current.id);

    if (firstError) {
      setSaving(false);

      setErrorMessage(
        "Could not reorder category: " +
          firstError.message
      );

      return;
    }

    const { error: secondError } =
      await supabase
        .from("html_test_categories")
        .update({
          display_order:
            currentOrder,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", target.id);

    setSaving(false);

    if (secondError) {
      setErrorMessage(
        "Could not finish reordering: " +
          secondError.message
      );

      await loadCategories();

      return;
    }

    await loadCategories();
  }

  function toggleExpanded(categoryId) {
    setExpanded((previous) => ({
      ...previous,
      [categoryId]:
        !previous[categoryId],
    }));
  }

  function getAllPossibleParents(
    accessType
  ) {
    return categories
      .filter(
        (category) =>
          category.access_type ===
          accessType
      )
      .sort((a, b) => {
        const depthA =
          getDepth(a.id);

        const depthB =
          getDepth(b.id);

        if (depthA !== depthB) {
          return depthA - depthB;
        }

        return (
          Number(
            a.display_order || 0
          ) -
          Number(
            b.display_order || 0
          )
        );
      });
  }

  function renderCategoryTree(
    category,
    level = 0
  ) {
    const children =
      getChildren(category.id);

    const isExpanded =
      expanded[category.id] === true;

    const siblings = categories
      .filter(
        (item) =>
          item.parent_id ===
          category.parent_id &&
          item.access_type ===
          category.access_type
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    const index =
      siblings.findIndex(
        (item) =>
          item.id === category.id
      );

    return (
      <div key={category.id}>
        <div
          style={{
            marginLeft:
              level * 24,
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border:
                "1px solid #dbe3ef",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  minWidth: "180px",
                }}
              >
                {children.length >
                0 ? (
                  <button
                    onClick={() =>
                      toggleExpanded(
                        category.id
                      )
                    }
                    style={{
                      width: "30px",
                      height: "30px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "15px",
                    }}
                  >
                    {isExpanded
                      ? "−"
                      : "+"}
                  </button>
                ) : (
                  <span
                    style={{
                      width: "30px",
                      textAlign:
                        "center",
                      color: "#94a3b8",
                    }}
                  >
                    •
                  </span>
                )}

                <div>
                  <div
                    style={{
                      fontWeight:
                        "700",
                      fontSize:
                        "15px",
                    }}
                  >
                    {level === 0
                      ? "📁"
                      : "📂"}{" "}
                    {category.name}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#64748b",
                      marginTop:
                        "3px",
                    }}
                  >
                    Level{" "}
                    {level + 1} •{" "}
                    {category.is_visible
                      ? "Visible"
                      : "Hidden"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "5px",
                }}
              >
                <button
                  onClick={() =>
                    setParentId(
                      category.id
                    )
                  }
                  disabled={saving}
                  style={buttonStyle(
                    "#059669"
                  )}
                >
                  + Child
                </button>

                <button
                  onClick={() =>
                    moveCategory(
                      category,
                      "up"
                    )
                  }
                  disabled={
                    saving ||
                    index <= 0
                  }
                  style={buttonStyle(
                    "#475569"
                  )}
                >
                  ↑
                </button>

                <button
                  onClick={() =>
                    moveCategory(
                      category,
                      "down"
                    )
                  }
                  disabled={
                    saving ||
                    index >=
                      siblings.length -
                        1
                  }
                  style={buttonStyle(
                    "#475569"
                  )}
                >
                  ↓
                </button>

                <button
                  onClick={() =>
                    renameCategory(
                      category
                    )
                  }
                  disabled={saving}
                  style={buttonStyle(
                    "#2563eb"
                  )}
                >
                  Rename
                </button>

                <button
                  onClick={() =>
                    toggleVisibility(
                      category
                    )
                  }
                  disabled={saving}
                  style={buttonStyle(
                    "#7c3aed"
                  )}
                >
                  {category.is_visible
                    ? "Hide"
                    : "Show"}
                </button>

                <button
                  onClick={() =>
                    deleteCategory(
                      category
                    )
                  }
                  disabled={saving}
                  style={buttonStyle(
                    "#dc2626"
                  )}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {isExpanded &&
          children.map((child) =>
            renderCategoryTree(
              child,
              level + 1
            )
          )}
      </div>
    );
  }

  function renderAccessSection(
    accessType
  ) {
    const roots =
      getRootCategories(
        accessType
      );

    return (
      <section
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          {accessType ===
          "free"
            ? "🟢 Free Tests"
            : "💰 Paid Tests"}
        </h2>

        {roots.length === 0 ? (
          <div
            style={{
              background:
                "#f8fafc",
              padding: "15px",
              borderRadius: "8px",
              color:
                "#64748b",
              border:
                "1px solid #e2e8f0",
            }}
          >
            No categories created
            yet.
          </div>
        ) : (
          roots.map((root) =>
            renderCategoryTree(
              root,
              0
            )
          )
        )}
      </section>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          padding: "30px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            background: "#fff",
            padding: "25px",
            borderRadius: "10px",
          }}
        >
          <h1>
            Loading HTML Test
            Categories...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            padding: "22px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() =>
              router.push("/admin")
            }
            style={{
              background:
                "rgba(255,255,255,0.15)",
              color: "#fff",
              border:
                "1px solid rgba(255,255,255,0.3)",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom:
                "15px",
            }}
          >
            ← Admin Dashboard
          </button>

          <h1
            style={{
              margin: 0,
            }}
          >
            🗂️ HTML Test
            Categories
          </h1>

          <p
            style={{
              marginBottom: 0,
            }}
          >
            Create unlimited nested
            categories for Free and
            Paid HTML tests.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div
            style={{
              background:
                "#dcfce7",
              color: "#166534",
              padding:
                "12px 15px",
              borderRadius:
                "8px",
              marginBottom:
                "15px",
              border:
                "1px solid #86efac",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background:
                "#fee2e2",
              color: "#991b1b",
              padding:
                "12px 15px",
              borderRadius:
                "8px",
              marginBottom:
                "15px",
              border:
                "1px solid #fca5a5",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Create Category */}
        <section
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom:
              "20px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            ➕ Create Category
          </h2>

          <p
            style={{
              color: "#64748b",
              marginTop: 0,
            }}
          >
            A category can be a
            main card or a child of
            another category. There
            is no fixed nesting limit.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(200px, 1fr) 180px",
              gap: "10px",
            }}
          >
            <input
              value={categoryName}
              onChange={(event) =>
                setCategoryName(
                  event.target.value
                )
              }
              placeholder="Category name"
              style={inputStyle}
            />

            <select
              value={
                categoryAccessType
              }
              onChange={(event) => {
                setCategoryAccessType(
                  event.target.value
                );
                setParentId("");
              }}
              style={inputStyle}
            >
              <option value="free">
                🟢 Free
              </option>

              <option value="paid">
                💰 Paid
              </option>
            </select>
          </div>

          <div
            style={{
              marginTop:
                "10px",
            }}
          >
            <label
              style={{
                display:
                  "block",
                fontWeight:
                  "600",
                marginBottom:
                  "6px",
              }}
            >
              Parent Category
            </label>

            <select
              value={parentId}
              onChange={(event) =>
                setParentId(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                No Parent — Create
                Main Card
              </option>

              {getAllPossibleParents(
                categoryAccessType
              ).map(
                (category) => {
                  const depth =
                    getDepth(
                      category.id
                    );

                  return (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {"— ".repeat(
                        depth
                      )}
                      {category.name}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          {parentId && (
            <div
              style={{
                marginTop:
                  "10px",
                padding:
                  "10px",
                background:
                  "#ecfdf5",
                color:
                  "#166534",
                borderRadius:
                  "7px",
                fontSize:
                  "14px",
              }}
            >
              This category will
              be created inside:{" "}
              <strong>
                {
                  categories.find(
                    (category) =>
                      category.id ===
                      parentId
                  )?.name
                }
              </strong>
            </div>
          )}

          <button
            onClick={
              createCategory
            }
            disabled={saving}
            style={{
              marginTop:
                "12px",
              padding:
                "11px 18px",
              background:
                "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius:
                "7px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight:
                "600",
            }}
          >
            {saving
              ? "Saving..."
              : parentId
              ? "Create Child Category"
              : "Create Main Card"}
          </button>
        </section>

        {/* Free */}
        {renderAccessSection(
          "free"
        )}

        {/* Paid */}
        {renderAccessSection(
          "paid"
        )}

        {/* Information */}
        <section
          style={{
            background:
              "#eff6ff",
            padding: "18px",
            borderRadius:
              "10px",
            border:
              "1px solid #bfdbfe",
            marginBottom:
              "20px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            ℹ️ Category Structure
          </h3>

          <p>
            You can now create
            unlimited levels.
          </p>

          <pre
            style={{
              background:
                "#fff",
              padding:
                "12px",
              borderRadius:
                "7px",
              overflowX:
                "auto",
              fontSize:
                "13px",
            }}
          >
{`Free
└── Current Affairs
    └── 2026
        └── October
            └── Week 1
                ├── Test 1
                └── Test 2

Paid
└── Odisha Special
    └── OPSC
        └── Prelims
            └── Mock Tests`}
          </pre>
        </section>

        {/* Existing HTML Tests */}
        <section
          style={{
            background:
              "#fff",
            padding:
              "20px",
            borderRadius:
              "10px",
            marginBottom:
              "20px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            📄 HTML Tests
          </h2>

          <p
            style={{
              color:
                "#64748b",
            }}
          >
            The next step will
            connect your uploaded
            HTML test files to
            these categories.
          </p>

          <button
            onClick={() =>
              router.push(
                "/admin/html-tests"
              )
            }
            style={{
              padding:
                "10px 15px",
              background:
                "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius:
                "7px",
              cursor:
                "pointer",
            }}
          >
            Open HTML Tests
          </button>
        </section>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "7px",
  fontSize: "15px",
  background: "#fff",
};

function buttonStyle(
  background
) {
  return {
    padding: "7px 10px",
    background,
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "13px",
  };
}
