"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HtmlCategoriesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [expanded, setExpanded] = useState({});
  const [creatingUnder, setCreatingUnder] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [showRootForm, setShowRootForm] = useState(false);
  const [rootName, setRootName] = useState("");
  const [rootAccessType, setRootAccessType] = useState("free");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      router.replace("/");
      return;
    }

    await loadCategories();
  }

  async function loadCategories() {
    setLoading(true);

    const { data, error } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Could not load categories: " + error.message);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }

  function getChildren(parentId) {
    return categories
      .filter((category) => category.parent_id === parentId)
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }

        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      });
  }

  function getRootCategories(accessType) {
    return categories
      .filter(
        (category) =>
          category.parent_id === null &&
          category.access_type === accessType
      )
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }

        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      });
  }

  function toggleExpanded(id) {
    setExpanded((previous) => ({
      ...previous,
      [id]: previous[id] === false,
    }));
  }

  function startCreateChild(category) {
    setCreatingUnder(category.id);
    setNewCategoryName("");

    setExpanded((previous) => ({
      ...previous,
      [category.id]: true,
    }));
  }

  function cancelCreateChild() {
    setCreatingUnder(null);
    setNewCategoryName("");
  }

  async function createChild(category) {
    const name = newCategoryName.trim();

    if (!name) {
      setMessage("Enter a category name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const children = getChildren(category.id);

    const nextOrder =
      children.length > 0
        ? Math.max(...children.map((item) => item.display_order)) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: category.access_type,
        parent_id: category.id,
        is_visible: true,
        display_order: nextOrder,
      });

    if (error) {
      setMessage("Could not create sub-card: " + error.message);
      setSaving(false);
      return;
    }

    setMessage("Sub-card created.");

    setCreatingUnder(null);
    setNewCategoryName("");

    await loadCategories();

    setSaving(false);
  }

  function startRename(category) {
    setRenamingId(category.id);
    setRenameValue(category.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function saveRename(category) {
    const name = renameValue.trim();

    if (!name) {
      setMessage("Category name cannot be empty.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setMessage("Could not rename category: " + error.message);
      setSaving(false);
      return;
    }

    setMessage("Category renamed.");

    setRenamingId(null);
    setRenameValue("");

    await loadCategories();

    setSaving(false);
  }

  async function createRootCategory() {
    const name = rootName.trim();

    if (!name) {
      setMessage("Enter a main card name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const roots = getRootCategories(rootAccessType);

    const nextOrder =
      roots.length > 0
        ? Math.max(...roots.map((item) => item.display_order)) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: rootAccessType,
        parent_id: null,
        is_visible: true,
        display_order: nextOrder,
      });

    if (error) {
      setMessage("Could not create main card: " + error.message);
      setSaving(false);
      return;
    }

    setMessage("Main card created.");

    setRootName("");
    setShowRootForm(false);

    await loadCategories();

    setSaving(false);
  }

  async function toggleVisibility(category) {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        is_visible: !category.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setMessage("Could not change visibility: " + error.message);
      setSaving(false);
      return;
    }

    await loadCategories();

    setSaving(false);
  }

  async function moveCategory(category, direction) {
    const siblings =
      category.parent_id === null
        ? getRootCategories(category.access_type)
        : getChildren(category.parent_id);

    const currentIndex = siblings.findIndex(
      (item) => item.id === category.id
    );

    if (currentIndex === -1) return;

    const newIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= siblings.length) {
      return;
    }

    const reordered = [...siblings];

    const [moved] = reordered.splice(currentIndex, 1);

    reordered.splice(newIndex, 0, moved);

    setSaving(true);
    setMessage("");

    const updates = reordered.map((item, index) =>
      supabase
        .from("html_test_categories")
        .update({
          display_order: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
    );

    const results = await Promise.all(updates);

    const failed = results.find((result) => result.error);

    if (failed) {
      setMessage(
        "Could not reorder category: " + failed.error.message
      );
      setSaving(false);
      return;
    }

    await loadCategories();

    setSaving(false);
  }

  async function deleteCategory(category) {
    const hasChildren = getChildren(category.id).length > 0;

    const warning = hasChildren
      ? `Delete "${category.name}" permanently?\n\nThis category and ALL nested sub-cards and their database records will be deleted.`
      : `Delete "${category.name}" permanently?`;

    if (!window.confirm(warning)) {
      return;
    }

    if (
      !window.confirm(
        `Final confirmation:\n\nPermanently delete "${category.name}"?`
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("html_test_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setMessage("Could not delete category: " + error.message);
      setSaving(false);
      return;
    }

    setMessage("Category permanently deleted.");

    await loadCategories();

    setSaving(false);
  }

  function uploadHtml(category) {
    router.push(
      `/admin/html-tests?category_id=${encodeURIComponent(category.id)}`
    );
  }

  function renderCategory(category, level = 0) {
    const children = getChildren(category.id);

    const isExpanded = expanded[category.id] !== false;

    const isCreating = creatingUnder === category.id;

    const isRenaming = renamingId === category.id;

    return (
      <div
        key={category.id}
        style={{
          marginLeft: level * 18,
          marginTop: 10,
        }}
      >
        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: 12,
            background: category.is_visible ? "#ffffff" : "#f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <button
              onClick={() => toggleExpanded(category.id)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              {isRenaming ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: 9,
                      border: "1px solid #9ca3af",
                      borderRadius: 8,
                    }}
                  />

                  <button
                    onClick={() => saveRename(category)}
                    disabled={saving}
                    style={smallButton("#16a34a")}
                  >
                    Save
                  </button>

                  <button
                    onClick={cancelRename}
                    style={smallButton("#6b7280")}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 16,
                        wordBreak: "break-word",
                      }}
                    >
                      📁 {category.name}
                    </strong>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background:
                          category.access_type === "free"
                            ? "#dcfce7"
                            : "#fee2e2",
                        color:
                          category.access_type === "free"
                            ? "#166534"
                            : "#991b1b",
                      }}
                    >
                      {category.access_type === "free"
                        ? "FREE"
                        : "PAID"}
                    </span>

                    {!category.is_visible && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#e5e7eb",
                          color: "#374151",
                        }}
                      >
                        HIDDEN
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    {children.length} sub-card
                    {children.length === 1 ? "" : "s"}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isRenaming && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginTop: 12,
              }}
            >
              <button
                onClick={() => startCreateChild(category)}
                style={smallButton("#2563eb")}
              >
                ＋ Create Sub-card
              </button>

              <button
                onClick={() => uploadHtml(category)}
                style={smallButton("#7c3aed")}
              >
                ⬆️ Upload HTML
              </button>

              <button
                onClick={() => startRename(category)}
                style={smallButton("#4b5563")}
              >
                ✏️ Rename
              </button>

              <button
                onClick={() => toggleVisibility(category)}
                style={smallButton(
                  category.is_visible ? "#d97706" : "#16a34a"
                )}
              >
                {category.is_visible ? "👁️ Hide" : "👁️ Show"}
              </button>

              <button
                onClick={() => moveCategory(category, "up")}
                style={smallButton("#0891b2")}
              >
                ↑
              </button>

              <button
                onClick={() => moveCategory(category, "down")}
                style={smallButton("#0891b2")}
              >
                ↓
              </button>

              <button
                onClick={() => deleteCategory(category)}
                style={smallButton("#dc2626")}
              >
                🗑️ Delete
              </button>
            </div>
          )}

          {isCreating && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 7,
                }}
              >
                Create sub-card inside "{category.name}"
              </div>

              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter sub-card name"
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  border: "1px solid #9ca3af",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => createChild(category)}
                  disabled={saving}
                  style={smallButton("#16a34a")}
                >
                  Create
                </button>

                <button
                  onClick={cancelCreateChild}
                  style={smallButton("#6b7280")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isExpanded && children.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {children.map((child) =>
                renderCategory(child, level + 1)
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function smallButton(background) {
    return {
      border: "none",
      background,
      color: "#ffffff",
      borderRadius: 8,
      padding: "8px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    };
  }

  if (loading) {
    return (
      <main
        style={{
          padding: 20,
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <p>Loading categories...</p>
      </main>
    );
  }

  const freeRoots = getRootCategories("free");
  const paidRoots = getRootCategories("paid");

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <button
        onClick={() => router.push("/admin")}
        style={{
          border: "none",
          background: "#111827",
          color: "#ffffff",
          borderRadius: 8,
          padding: "9px 13px",
          cursor: "pointer",
          fontWeight: 700,
          marginBottom: 15,
        }}
      >
        ← Admin Dashboard
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            🗂️ HTML Test Categories
          </h1>

          <p
            style={{
              color: "#6b7280",
              marginTop: 6,
            }}
          >
            Free/Paid → unlimited nested cards → HTML tests
          </p>
        </div>

        <button
          onClick={() => setShowRootForm((value) => !value)}
          style={{
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 9,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ＋ Create Main Card
        </button>
      </div>

      {showRootForm && (
        <div
          style={{
            marginTop: 15,
            padding: 14,
            borderRadius: 12,
            background: "#f9fafb",
            border: "1px solid #d1d5db",
          }}
        >
          <strong>Create Main Card</strong>

          <input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            placeholder="Example: Current Affairs"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              border: "1px solid #9ca3af",
              borderRadius: 8,
              marginTop: 10,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setRootAccessType("free")}
              style={{
                ...smallButton(
                  rootAccessType === "free"
                    ? "#16a34a"
                    : "#9ca3af"
                ),
                flex: 1,
                minWidth: 100,
              }}
            >
              🟢 Free
            </button>

            <button
              onClick={() => setRootAccessType("paid")}
              style={{
                ...smallButton(
                  rootAccessType === "paid"
                    ? "#dc2626"
                    : "#9ca3af"
                ),
                flex: 1,
                minWidth: 100,
              }}
            >
              🔴 Paid
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={createRootCategory}
              disabled={saving}
              style={smallButton("#2563eb")}
            >
              Create
            </button>

            <button
              onClick={() => {
                setShowRootForm(false);
                setRootName("");
              }}
              style={smallButton("#6b7280")}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 15,
            padding: 10,
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* FREE */}
      <section style={{ marginTop: 25 }}>
        <h2
          style={{
            marginBottom: 8,
            color: "#166534",
          }}
        >
          🟢 Free Tests
        </h2>

        {freeRoots.length === 0 ? (
          <div
            style={{
              padding: 15,
              border: "1px dashed #9ca3af",
              borderRadius: 10,
              color: "#6b7280",
            }}
          >
            No Free main cards yet.
          </div>
        ) : (
          freeRoots.map((category) =>
            renderCategory(category, 0)
          )
        )}
      </section>

      {/* PAID */}
      <section style={{ marginTop: 30 }}>
        <h2
          style={{
            marginBottom: 8,
            color: "#991b1b",
          }}
        >
          🔴 Paid Tests
        </h2>

        {paidRoots.length === 0 ? (
          <div
            style={{
              padding: 15,
              border: "1px dashed #9ca3af",
              borderRadius: 10,
              color: "#6b7280",
            }}
          >
            No Paid main cards yet.
          </div>
        ) : (
          paidRoots.map((category) =>
            renderCategory(category, 0)
          )
        )}
      </section>
    </main>
  );
}
