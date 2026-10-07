"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HtmlCategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const currentCategoryId = searchParams.get("parent");

  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [rootCategories, setRootCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const [rootAccessType, setRootAccessType] = useState("free");
  const [showRootCreate, setShowRootCreate] = useState(false);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [currentCategoryId]);

  async function checkAdmin() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      router.replace("/");
      return;
    }

    await loadPage();
  }

  async function loadPage() {
    setMessage("");

    if (!currentCategoryId) {
      await loadRootCategories();
    } else {
      await loadCategory();
    }

    setLoading(false);
  }

  async function loadRootCategories() {
    const { data, error } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .is("parent_id", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Could not load categories: " + error.message);
      return;
    }

    setRootCategories(data || []);
  }

  async function loadCategory() {
    const { data: current, error: currentError } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .eq("id", currentCategoryId)
      .single();

    if (currentError || !current) {
      setMessage("Category not found.");
      return;
    }

    setCategory(current);

    const { data: childRows, error: childError } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .eq("parent_id", currentCategoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (childError) {
      setMessage("Could not load sub-cards: " + childError.message);
      return;
    }

    setChildren(childRows || []);
  }

  function openCategory(id) {
    router.push(`/admin/html-categories?parent=${id}`);
  }

  function goBack() {
    if (!category) {
      router.push("/admin");
      return;
    }

    if (category.parent_id) {
      router.push(
        `/admin/html-categories?parent=${category.parent_id}`
      );
    } else {
      router.push("/admin/html-categories");
    }
  }

  async function createRootCategory() {
    const name = newName.trim();

    if (!name) {
      setMessage("Enter a category name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const maxOrder =
      rootCategories.length > 0
        ? Math.max(
            ...rootCategories.map((item) => item.display_order)
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: rootAccessType,
        parent_id: null,
        is_visible: true,
        display_order: maxOrder,
      });

    if (error) {
      setMessage(
        "Could not create main card: " + error.message
      );
      setSaving(false);
      return;
    }

    setNewName("");
    setShowRootCreate(false);

    await loadRootCategories();

    setMessage("Main card created.");
    setSaving(false);
  }

  async function createChild() {
    if (!category) return;

    const name = newName.trim();

    if (!name) {
      setMessage("Enter a sub-card name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const maxOrder =
      children.length > 0
        ? Math.max(
            ...children.map((item) => item.display_order)
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: category.access_type,
        parent_id: category.id,
        is_visible: true,
        display_order: maxOrder,
      });

    if (error) {
      setMessage(
        "Could not create sub-card: " + error.message
      );
      setSaving(false);
      return;
    }

    setNewName("");
    setShowCreate(false);

    await loadCategory();

    setMessage("Sub-card created.");
    setSaving(false);
  }

  function startRename(item) {
    setRenamingId(item.id);
    setRenameValue(item.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function saveRename(item) {
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
      .eq("id", item.id);

    if (error) {
      setMessage("Could not rename: " + error.message);
      setSaving(false);
      return;
    }

    setRenamingId(null);
    setRenameValue("");

    await loadPage();

    setMessage("Category renamed.");
    setSaving(false);
  }

  async function toggleVisibility(item) {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        is_visible: !item.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setMessage(
        "Could not change visibility: " + error.message
      );
      setSaving(false);
      return;
    }

    await loadPage();

    setSaving(false);
  }

  async function deleteCategory(item) {
    const confirmation = window.confirm(
      `Delete "${item.name}" permanently?\n\n` +
        `All nested sub-cards and HTML test database records inside it will also be deleted.`
    );

    if (!confirmation) return;

    const secondConfirmation = window.confirm(
      `FINAL CONFIRMATION\n\nPermanently delete "${item.name}"?`
    );

    if (!secondConfirmation) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("html_test_categories")
      .delete()
      .eq("id", item.id);

    if (error) {
      setMessage("Could not delete: " + error.message);
      setSaving(false);
      return;
    }

    await loadPage();

    setMessage("Category permanently deleted.");
    setSaving(false);
  }

  async function moveItem(item, direction) {
    const list = currentCategoryId
      ? [...children]
      : [...rootCategories];

    const index = list.findIndex(
      (entry) => entry.id === item.id
    );

    if (index === -1) return;

    const newIndex =
      direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= list.length) {
      return;
    }

    const moved = list.splice(index, 1)[0];
    list.splice(newIndex, 0, moved);

    setSaving(true);
    setMessage("");

    for (let i = 0; i < list.length; i++) {
      const { error } = await supabase
        .from("html_test_categories")
        .update({
          display_order: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", list[i].id);

      if (error) {
        setMessage(
          "Could not reorder: " + error.message
        );
        setSaving(false);
        return;
      }
    }

    await loadPage();

    setSaving(false);
  }

  function uploadHtml(item) {
    router.push(
      `/admin/html-tests?category_id=${encodeURIComponent(
        item.id
      )}`
    );
  }

  function accessBadge(type) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          background:
            type === "free" ? "#dcfce7" : "#fee2e2",
          color:
            type === "free" ? "#166534" : "#991b1b",
        }}
      >
        {type === "free" ? "FREE" : "PAID"}
      </span>
    );
  }

  function renderItem(item, index, list) {
    const isRenaming = renamingId === item.id;

    return (
      <div
        key={item.id}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          background: item.is_visible
            ? "#ffffff"
            : "#f3f4f6",
        }}
      >
        {isRenaming ? (
          <div>
            <input
              value={renameValue}
              onChange={(e) =>
                setRenameValue(e.target.value)
              }
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
                border: "1px solid #9ca3af",
                borderRadius: 8,
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                onClick={() => saveRename(item)}
                disabled={saving}
                style={button("#16a34a")}
              >
                Save
              </button>

              <button
                onClick={cancelRename}
                style={button("#6b7280")}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => openCategory(item.id)}
              style={{
                cursor: "pointer",
                padding: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 22 }}>📁</span>

                <strong
                  style={{
                    fontSize: 17,
                    wordBreak: "break-word",
                  }}
                >
                  {item.name}
                </strong>

                {accessBadge(item.access_type)}

                {!item.is_visible && (
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "#e5e7eb",
                      color: "#374151",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    HIDDEN
                  </span>
                )}
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                Tap to open →
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginTop: 12,
              }}
            >
              <button
                onClick={() => openCategory(item.id)}
                style={button("#2563eb")}
              >
                📂 Open
              </button>

              <button
                onClick={() => uploadHtml(item)}
                style={button("#7c3aed")}
              >
                ⬆️ Upload HTML
              </button>

              <button
                onClick={() => startRename(item)}
                style={button("#4b5563")}
              >
                ✏️ Rename
              </button>

              <button
                onClick={() => toggleVisibility(item)}
                style={button(
                  item.is_visible
                    ? "#d97706"
                    : "#16a34a"
                )}
              >
                {item.is_visible
                  ? "👁️ Hide"
                  : "👁️ Show"}
              </button>

              <button
                onClick={() =>
                  moveItem(item, "up")
                }
                disabled={index === 0}
                style={button(
                  index === 0 ? "#9ca3af" : "#0891b2"
                )}
              >
                ↑
              </button>

              <button
                onClick={() =>
                  moveItem(item, "down")
                }
                disabled={index === list.length - 1}
                style={button(
                  index === list.length - 1
                    ? "#9ca3af"
                    : "#0891b2"
                )}
              >
                ↓
              </button>

              <button
                onClick={() => deleteCategory(item)}
                style={button("#dc2626")}
              >
                🗑️ Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function button(background) {
    return {
      border: "none",
      background,
      color: "#ffffff",
      borderRadius: 8,
      padding: "8px 11px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    };
  }

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 16,
      }}
    >
      {/* BACK */}
      <button
        onClick={goBack}
        style={{
          border: "none",
          background: "#111827",
          color: "#ffffff",
          borderRadius: 8,
          padding: "9px 13px",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 18,
        }}
      >
        ← Back
      </button>

      {/* PAGE TITLE */}
      <div
        style={{
          marginBottom: 18,
        }}
      >
        <h1 style={{ margin: 0 }}>
          {category
            ? `📁 ${category.name}`
            : "🗂️ HTML Test Categories"}
        </h1>

        {category && (
          <div style={{ marginTop: 7 }}>
            {accessBadge(category.access_type)}
          </div>
        )}
      </div>

      {/* ROOT CREATE */}
      {!category && (
        <>
          <button
            onClick={() =>
              setShowRootCreate(!showRootCreate)
            }
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 9,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 15,
            }}
          >
            ＋ Create Main Card
          </button>

          {showRootCreate && (
            <div
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                background: "#f9fafb",
              }}
            >
              <input
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                placeholder="Main card name"
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  border: "1px solid #9ca3af",
                  borderRadius: 8,
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  onClick={() =>
                    setRootAccessType("free")
                  }
                  style={button(
                    rootAccessType === "free"
                      ? "#16a34a"
                      : "#9ca3af"
                  )}
                >
                  🟢 Free
                </button>

                <button
                  onClick={() =>
                    setRootAccessType("paid")
                  }
                  style={button(
                    rootAccessType === "paid"
                      ? "#dc2626"
                      : "#9ca3af"
                  )}
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
                  style={button("#2563eb")}
                >
                  Create
                </button>

                <button
                  onClick={() => {
                    setShowRootCreate(false);
                    setNewName("");
                  }}
                  style={button("#6b7280")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* CURRENT CATEGORY CONTROLS */}
      {category && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setNewName("");
            }}
            style={button("#2563eb")}
          >
            ＋ Create Sub-card
          </button>

          <button
            onClick={() => uploadHtml(category)}
            style={button("#7c3aed")}
          >
            ⬆️ Upload HTML
          </button>
        </div>
      )}

      {/* CREATE CHILD */}
      {category && showCreate && (
        <div
          style={{
            padding: 14,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <strong>
            Create sub-card inside "{category.name}"
          </strong>

          <input
            value={newName}
            onChange={(e) =>
              setNewName(e.target.value)
            }
            placeholder="Sub-card name"
            autoFocus
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
            }}
          >
            <button
              onClick={createChild}
              disabled={saving}
              style={button("#16a34a")}
            >
              Create
            </button>

            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              style={button("#6b7280")}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            marginBottom: 15,
          }}
        >
          {message}
        </div>
      )}

      {/* ROOT PAGE */}
      {!category && (
        <>
          <h2
            style={{
              color: "#166534",
              marginTop: 25,
            }}
          >
            🟢 Free Tests
          </h2>

          {rootCategories
            .filter(
              (item) => item.access_type === "free"
            )
            .map((item, index, list) =>
              renderItem(item, index, list)
            )}

          {rootCategories.filter(
            (item) => item.access_type === "free"
          ).length === 0 && (
            <p style={{ color: "#6b7280" }}>
              No Free main cards yet.
            </p>
          )}

          <h2
            style={{
              color: "#991b1b",
              marginTop: 30,
            }}
          >
            🔴 Paid Tests
          </h2>

          {rootCategories
            .filter(
              (item) => item.access_type === "paid"
            )
            .map((item, index, list) =>
              renderItem(item, index, list)
            )}

          {rootCategories.filter(
            (item) => item.access_type === "paid"
          ).length === 0 && (
            <p style={{ color: "#6b7280" }}>
              No Paid main cards yet.
            </p>
          )}
        </>
      )}

      {/* CATEGORY PAGE */}
      {category && (
        <>
          <h2 style={{ marginTop: 10 }}>
            Contents
          </h2>

          {children.length === 0 ? (
            <div
              style={{
                padding: 20,
                border: "1px dashed #9ca3af",
                borderRadius: 12,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 30 }}>
                📂
              </div>

              <p>
                This card is empty.
              </p>

              <p>
                Create a sub-card or upload an HTML
                test.
              </p>
            </div>
          ) : (
            children.map((item, index, list) =>
              renderItem(item, index, list)
            )
          )}
        </>
      )}
    </main>
  );
}
