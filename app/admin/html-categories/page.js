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

  const [mainName, setMainName] = useState("");
  const [mainAccessType, setMainAccessType] = useState("free");

  const [childName, setChildName] = useState("");
  const [childParentId, setChildParentId] = useState("");

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
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
      .order("access_type", { ascending: true })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

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

  async function createMainCard() {
    clearMessages();

    const name = mainName.trim();

    if (!name) {
      setErrorMessage("Please enter a main card name.");
      return;
    }

    setSaving(true);

    const sameType = categories.filter(
      (category) =>
        category.parent_id === null &&
        category.access_type === mainAccessType
    );

    const nextOrder =
      sameType.length > 0
        ? Math.max(
            ...sameType.map((category) =>
              Number(category.display_order || 0)
            )
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: mainAccessType,
        parent_id: null,
        is_visible: true,
        display_order: nextOrder,
      });

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not create main card: " + error.message
      );
      return;
    }

    setMainName("");
    setMessage("Main card created successfully.");

    await loadCategories();
  }

  async function createSubCard() {
    clearMessages();

    const name = childName.trim();

    if (!name) {
      setErrorMessage("Please enter a sub-card name.");
      return;
    }

    if (!childParentId) {
      setErrorMessage(
        "Please select a main card for the sub-card."
      );
      return;
    }

    const parent = categories.find(
      (category) => category.id === childParentId
    );

    if (!parent) {
      setErrorMessage("Selected main card was not found.");
      return;
    }

    setSaving(true);

    const siblings = categories.filter(
      (category) => category.parent_id === childParentId
    );

    const nextOrder =
      siblings.length > 0
        ? Math.max(
            ...siblings.map((category) =>
              Number(category.display_order || 0)
            )
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: parent.access_type,
        parent_id: parent.id,
        is_visible: true,
        display_order: nextOrder,
      });

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not create sub-card: " + error.message
      );
      return;
    }

    setChildName("");
    setChildParentId("");

    setMessage("Sub-card created successfully.");

    await loadCategories();
  }

  async function renameCategory(category) {
    const newName = window.prompt(
      "Enter the new name:",
      category.name
    );

    if (newName === null) {
      return;
    }

    const name = newName.trim();

    if (!name) {
      alert("Name cannot be empty.");
      return;
    }

    clearMessages();
    setSaving(true);

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not rename category: " + error.message
      );
      return;
    }

    setMessage("Category renamed successfully.");

    await loadCategories();
  }

  async function toggleVisibility(category) {
    clearMessages();
    setSaving(true);

    const { error } = await supabase
      .from("html_test_categories")
      .update({
        is_visible: !category.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    setSaving(false);

    if (error) {
      setErrorMessage(
        "Could not change visibility: " + error.message
      );
      return;
    }

    setMessage(
      category.is_visible
        ? "Category hidden."
        : "Category made visible."
    );

    await loadCategories();
  }

  async function deleteCategory(category) {
    const isMain = category.parent_id === null;

    const confirmationText = isMain
      ? `Delete the main card "${category.name}" permanently?\n\nThis will also permanently delete all of its sub-cards and any HTML tests connected to those categories.`
      : `Delete the sub-card "${category.name}" permanently?\n\nAny HTML tests connected to this sub-card will also be permanently deleted from the database.`;

    const confirmed = window.confirm(
      confirmationText
    );

    if (!confirmed) {
      return;
    }

    const secondConfirmation = window.confirm(
      `FINAL CONFIRMATION\n\nAre you absolutely sure you want to permanently delete "${category.name}"?\n\nThis action cannot be undone.`
    );

    if (!secondConfirmation) {
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
        "Could not delete category: " + error.message
      );
      return;
    }

    setMessage(
      `"${category.name}" was permanently deleted.`
    );

    if (childParentId === category.id) {
      setChildParentId("");
    }

    await loadCategories();
  }

  async function moveCategory(category, direction) {
    clearMessages();

    const siblings = categories
      .filter(
        (item) =>
          item.parent_id === category.parent_id &&
          item.access_type === category.access_type
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    const currentIndex = siblings.findIndex(
      (item) => item.id === category.id
    );

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= siblings.length
    ) {
      return;
    }

    const current = siblings[currentIndex];
    const target = siblings[targetIndex];

    setSaving(true);

    const { error: firstError } = await supabase
      .from("html_test_categories")
      .update({
        display_order: target.display_order,
        updated_at: new Date().toISOString(),
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

    const { error: secondError } = await supabase
      .from("html_test_categories")
      .update({
        display_order: current.display_order,
        updated_at: new Date().toISOString(),
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

  function getMainCategories(accessType) {
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

  function getSubCategories(parentId) {
    return categories
      .filter(
        (category) => category.parent_id === parentId
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );
  }

  function renderMainCards(accessType) {
    const mainCards = getMainCategories(accessType);

    return (
      <div>
        {mainCards.length === 0 ? (
          <div
            style={{
              background: "#f8fafc",
              padding: "15px",
              borderRadius: "8px",
              color: "#64748b",
              marginBottom: "15px",
            }}
          >
            No main cards created yet.
          </div>
        ) : (
          mainCards.map((mainCard, mainIndex) => {
            const subCards = getSubCategories(
              mainCard.id
            );

            return (
              <div
                key={mainCard.id}
                style={{
                  border: "1px solid #dbe3ef",
                  borderRadius: "10px",
                  marginBottom: "15px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {/* Main Card */}
                <div
                  style={{
                    padding: "16px",
                    background:
                      accessType === "free"
                        ? "#ecfdf5"
                        : "#fff7ed",
                    borderBottom:
                      "1px solid #dbe3ef",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 5px",
                        }}
                      >
                        📁 {mainCard.name}
                      </h3>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        Main Card •{" "}
                        {mainCard.is_visible
                          ? "Visible"
                          : "Hidden"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <button
                        onClick={() =>
                          moveCategory(
                            mainCard,
                            "up"
                          )
                        }
                        disabled={
                          saving ||
                          mainIndex === 0
                        }
                        style={smallButtonStyle(
                          "#475569"
                        )}
                      >
                        ↑
                      </button>

                      <button
                        onClick={() =>
                          moveCategory(
                            mainCard,
                            "down"
                          )
                        }
                        disabled={
                          saving ||
                          mainIndex ===
                            mainCards.length - 1
                        }
                        style={smallButtonStyle(
                          "#475569"
                        )}
                      >
                        ↓
                      </button>

                      <button
                        onClick={() =>
                          renameCategory(mainCard)
                        }
                        disabled={saving}
                        style={smallButtonStyle(
                          "#2563eb"
                        )}
                      >
                        Rename
                      </button>

                      <button
                        onClick={() =>
                          toggleVisibility(
                            mainCard
                          )
                        }
                        disabled={saving}
                        style={smallButtonStyle(
                          "#7c3aed"
                        )}
                      >
                        {mainCard.is_visible
                          ? "Hide"
                          : "Show"}
                      </button>

                      <button
                        onClick={() =>
                          deleteCategory(mainCard)
                        }
                        disabled={saving}
                        style={smallButtonStyle(
                          "#dc2626"
                        )}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub Cards */}
                <div
                  style={{
                    padding: "15px",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      marginBottom: "10px",
                    }}
                  >
                    Sub-cards
                  </div>

                  {subCards.length === 0 ? (
                    <div
                      style={{
                        background: "#fff",
                        padding: "12px",
                        borderRadius: "7px",
                        color: "#64748b",
                        border:
                          "1px solid #e2e8f0",
                      }}
                    >
                      No sub-cards yet.
                    </div>
                  ) : (
                    subCards.map(
                      (
                        subCard,
                        subIndex
                      ) => (
                        <div
                          key={subCard.id}
                          style={{
                            background: "#fff",
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom:
                              "8px",
                            border:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap:
                                "wrap",
                              gap: "10px",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                            }}
                          >
                            <div>
                              <strong>
                                📂{" "}
                                {
                                  subCard.name
                                }
                              </strong>

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
                                {subCard.is_visible
                                  ? "Visible"
                                  : "Hidden"}
                              </div>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap: "5px",
                              }}
                            >
                              <button
                                onClick={() =>
                                  moveCategory(
                                    subCard,
                                    "up"
                                  )
                                }
                                disabled={
                                  saving ||
                                  subIndex ===
                                    0
                                }
                                style={smallButtonStyle(
                                  "#475569"
                                )}
                              >
                                ↑
                              </button>

                              <button
                                onClick={() =>
                                  moveCategory(
                                    subCard,
                                    "down"
                                  )
                                }
                                disabled={
                                  saving ||
                                  subIndex ===
                                    subCards.length -
                                      1
                                }
                                style={smallButtonStyle(
                                  "#475569"
                                )}
                              >
                                ↓
                              </button>

                              <button
                                onClick={() =>
                                  renameCategory(
                                    subCard
                                  )
                                }
                                disabled={
                                  saving
                                }
                                style={smallButtonStyle(
                                  "#2563eb"
                                )}
                              >
                                Rename
                              </button>

                              <button
                                onClick={() =>
                                  toggleVisibility(
                                    subCard
                                  )
                                }
                                disabled={
                                  saving
                                }
                                style={smallButtonStyle(
                                  "#7c3aed"
                                )}
                              >
                                {subCard.is_visible
                                  ? "Hide"
                                  : "Show"}
                              </button>

                              <button
                                onClick={() =>
                                  deleteCategory(
                                    subCard
                                  )
                                }
                                disabled={
                                  saving
                                }
                                style={smallButtonStyle(
                                  "#dc2626"
                                )}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
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
            maxWidth: "1000px",
            margin: "0 auto",
            background: "#fff",
            padding: "25px",
            borderRadius: "10px",
          }}
        >
          <h1>Loading HTML Test Categories...</h1>
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
            onClick={() => router.push("/admin")}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "15px",
            }}
          >
            ← Admin Dashboard
          </button>

          <h1 style={{ margin: 0 }}>
            🗂️ HTML Test Categories
          </h1>

          <p style={{ marginBottom: 0 }}>
            Organize HTML tests into Free/Paid main
            cards and sub-cards.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "12px 15px",
              borderRadius: "8px",
              marginBottom: "15px",
              border: "1px solid #86efac",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px 15px",
              borderRadius: "8px",
              marginBottom: "15px",
              border: "1px solid #fca5a5",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Create Main Card */}
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
          <h2 style={{ marginTop: 0 }}>
            ➕ Create Main Card
          </h2>

          <p
            style={{
              color: "#64748b",
              marginTop: 0,
            }}
          >
            Create any category name you want. For
            example: Current Affairs, History, Mock
            Tests, Railway, Banking, Odisha GK, etc.
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
              value={mainName}
              onChange={(event) =>
                setMainName(event.target.value)
              }
              placeholder="Main card name"
              style={inputStyle}
            />

            <select
              value={mainAccessType}
              onChange={(event) =>
                setMainAccessType(
                  event.target.value
                )
              }
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

          <button
            onClick={createMainCard}
            disabled={saving}
            style={{
              marginTop: "12px",
              padding: "11px 18px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: "600",
            }}
          >
            {saving
              ? "Saving..."
              : "Create Main Card"}
          </button>
        </section>

        {/* Create Sub Card */}
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
          <h2 style={{ marginTop: 0 }}>
            ➕ Create Sub-card
          </h2>

          <p
            style={{
              color: "#64748b",
              marginTop: 0,
            }}
          >
            A sub-card belongs to a main card.
            HTML tests will later be placed inside
            these sub-cards.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(200px, 1fr) minmax(200px, 1fr)",
              gap: "10px",
            }}
          >
            <input
              value={childName}
              onChange={(event) =>
                setChildName(
                  event.target.value
                )
              }
              placeholder="Sub-card name"
              style={inputStyle}
            />

            <select
              value={childParentId}
              onChange={(event) =>
                setChildParentId(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select Main Card
              </option>

              <optgroup label="🟢 Free">
                {getMainCategories(
                  "free"
                ).map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="💰 Paid">
                {getMainCategories(
                  "paid"
                ).map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={createSubCard}
            disabled={saving}
            style={{
              marginTop: "12px",
              padding: "11px 18px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: "600",
            }}
          >
            {saving
              ? "Saving..."
              : "Create Sub-card"}
          </button>
        </section>

        {/* Free Categories */}
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
          <h2 style={{ marginTop: 0 }}>
            🟢 Free Tests
          </h2>

          {renderMainCards("free")}
        </section>

        {/* Paid Categories */}
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
          <h2 style={{ marginTop: 0 }}>
            💰 Paid Tests
          </h2>

          {renderMainCards("paid")}
        </section>

        {/* Future HTML Test Management */}
        <section
          style={{
            background: "#eff6ff",
            padding: "18px",
            borderRadius: "10px",
            border: "1px solid #bfdbfe",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            📄 HTML Tests
          </h3>

          <p
            style={{
              marginBottom: "12px",
              color: "#1e40af",
            }}
          >
            After the category structure is working,
            we will connect the existing HTML test
            upload system here so an admin can place
            each uploaded HTML test inside a selected
            sub-card.
          </p>

          <button
            onClick={() =>
              router.push("/admin/html-tests")
            }
            style={{
              padding: "10px 15px",
              background: "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
            }}
          >
            Open Existing HTML Tests
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
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  fontSize: "15px",
  background: "#fff",
};

function smallButtonStyle(background) {
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
