"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HtmlCategoriesContent() {
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
  const [showRootCreate, setShowRootCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [rootAccessType, setRootAccessType] = useState("free");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [currentCategoryId]);

  async function checkAdmin() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (error || profile?.role !== "admin") { router.replace("/"); return; }
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
      .select("id,name,access_type,parent_id,is_visible,display_order,created_at")
      .is("parent_id", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setMessage("Could not load categories: " + error.message);
    else setRootCategories(data || []);
  }

  async function loadCategory() {
    const { data: current, error: currentError } = await supabase
      .from("html_test_categories")
      .select("id,name,access_type,parent_id,is_visible,display_order,created_at")
      .eq("id", currentCategoryId)
      .single();
    if (currentError || !current) { setMessage("Category not found."); return; }
    setCategory(current);

    const { data: childRows, error: childError } = await supabase
      .from("html_test_categories")
      .select("id,name,access_type,parent_id,is_visible,display_order,created_at")
      .eq("parent_id", currentCategoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (childError) setMessage("Could not load sub-cards: " + childError.message);
    else setChildren(childRows || []);
  }

  async function createRootCategory() {
    const name = newName.trim();
    if (!name) return setMessage("Enter a category name.");
    setSaving(true);
    const freeRoots = rootCategories.filter((i) => i.access_type === rootAccessType);
    const nextOrder = freeRoots.length > 0 ? Math.max(...freeRoots.map((i) => Number(i.display_order) || 0)) + 1 : 0;
    const { error } = await supabase.from("html_test_categories").insert({
      name, access_type: rootAccessType, parent_id: null, is_visible: true, display_order: nextOrder
    });
    if (error) setMessage("Could not create main card: " + error.message);
    else { setNewName(""); setShowRootCreate(false); await loadRootCategories(); setMessage("Main card created."); }
    setSaving(false);
  }

  async function createChild() {
    if (!category) return;
    const name = newName.trim();
    if (!name) return setMessage("Enter a sub-card name.");
    setSaving(true);
    const nextOrder = children.length > 0 ? Math.max(...children.map((i) => Number(i.display_order) || 0)) + 1 : 0;
    const { error } = await supabase.from("html_test_categories").insert({
      name, access_type: category.access_type, parent_id: category.id, is_visible: true, display_order: nextOrder
    });
    if (error) setMessage("Could not create sub-card: " + error.message);
    else { setNewName(""); setShowCreate(false); await loadCategory(); setMessage("Sub-card created."); }
    setSaving(false);
  }

  async function saveRename(item) {
    const name = renameValue.trim();
    if (!name) return setMessage("Category name cannot be empty.");
    setSaving(true);
    const { error } = await supabase.from("html_test_categories").update({ name }).eq("id", item.id);
    if (error) setMessage("Could not rename: " + error.message);
    else { setRenamingId(null); setRenameValue(""); await loadPage(); setMessage("Category renamed."); }
    setSaving(false);
  }

  async function toggleVisibility(item) {
    setSaving(true);
    const { error } = await supabase.from("html_test_categories").update({ is_visible: !item.is_visible }).eq("id", item.id);
    if (error) setMessage("Could not change visibility: " + error.message);
    else await loadPage();
    setSaving(false);
  }

  async function deleteCategory(item) {
    if (!window.confirm(`Permanently delete "${item.name}" and all sub-cards?`)) return;
    setSaving(true);
    const { error } = await supabase.from("html_test_categories").delete().eq("id", item.id);
    if (error) setMessage("Could not delete: " + error.message);
    else { await loadPage(); setMessage("Category deleted."); }
    setSaving(false);
  }

  async function moveItem(item, direction) {
    const list = currentCategoryId ? [...children] : rootCategories.filter((e) => e.access_type === item.access_type);
    const index = list.findIndex((e) => e.id === item.id);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const idToOrder = {};
    reordered.forEach((entry, idx) => { idToOrder[entry.id] = idx; });

    if (currentCategoryId) {
      setChildren((prev) => prev.map((e) => idToOrder[e.id] !== undefined ? { ...e, display_order: idToOrder[e.id] } : e).sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0)));
    } else {
      setRootCategories((prev) => prev.map((e) => idToOrder[e.id] !== undefined ? { ...e, display_order: idToOrder[e.id] } : e).sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0)));
    }

    setSaving(true);
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase.from("html_test_categories").update({ display_order: i }).eq("id", reordered[i].id);
      }
      setMessage("Order updated successfully.");
      await loadPage();
    } catch (err) {
      setMessage("Could not reorder: " + err.message);
      await loadPage();
    } finally {
      setSaving(false);
    }
  }

  const btn = (bg) => ({ border: "none", background: bg, color: "#fff", borderRadius: 8, padding: "8px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" });
  const badge = (t) => (
    <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: t === "free" ? "#dcfce7" : "#fee2e2", color: t === "free" ? "#166534" : "#991b1b" }}>
      {t === "free" ? "FREE" : "PAID"}
    </span>
  );

  function renderCard(item, index, list) {
    const isRenaming = renamingId === item.id;
    return (
      <div key={item.id} style={{ border: "1px solid #d1d5db", borderRadius: 14, padding: 14, marginBottom: 12, background: item.is_visible ? "#fff" : "#f3f4f6" }}>
        {isRenaming ? (
          <div>
            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #9ca3af", borderRadius: 8 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => saveRename(item)} disabled={saving} style={btn("#16a34a")}>Save</button>
              <button onClick={() => { setRenamingId(null); setRenameValue(""); }} style={btn("#6b7280")}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div onClick={() => router.push(`/admin/html-categories?parent=${item.id}`)} style={{ cursor: "pointer", padding: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 22 }}>📁</span>
                <strong style={{ fontSize: 17 }}>{item.name}</strong>
                {badge(item.access_type)}
                {!item.is_visible && <span style={{ padding: "4px 8px", borderRadius: 999, background: "#e5e7eb", color: "#374151", fontSize: 11, fontWeight: 700 }}>HIDDEN</span>}
              </div>
              <div style={{ marginTop: 5, color: "#6b7280", fontSize: 13 }}>Tap to open →</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
              <button onClick={() => router.push(`/admin/html-categories?parent=${item.id}`)} style={btn("#2563eb")}>📂 Open</button>
              <button onClick={() => router.push(`/admin/html-tests?category_id=${encodeURIComponent(item.id)}`)} style={btn("#7c3aed")}>⬆️ Upload HTML</button>
              <button onClick={() => { setRenamingId(item.id); setRenameValue(item.name); }} style={btn("#4b5563")}>✏️ Rename</button>
              <button onClick={() => toggleVisibility(item)} style={btn(item.is_visible ? "#d97706" : "#16a34a")}>{item.is_visible ? "👁️ Hide" : "👁️ Show"}</button>
              <button onClick={() => moveItem(item, "up")} disabled={index === 0} style={btn(index === 0 ? "#9ca3af" : "#0891b2")}>↑</button>
              <button onClick={() => moveItem(item, "down")} disabled={index === list.length - 1} style={btn(index === list.length - 1 ? "#9ca3af" : "#0891b2")}>↓</button>
              <button onClick={() => deleteCategory(item)} style={btn("#dc2626")}>🗑️ Delete</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) return <main style={{ padding: 20 }}><p>Loading...</p></main>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <button onClick={() => category ? (category.parent_id ? router.push(`/admin/html-categories?parent=${category.parent_id}`) : router.push("/admin/html-categories")) : router.push("/admin")} style={{ border: "none", background: "#111827", color: "#fff", borderRadius: 8, padding: "9px 13px", fontWeight: 700, cursor: "pointer", marginBottom: 18 }}>
        ← Back
      </button>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>{category ? `📁 ${category.name}` : "🗂️ HTML Test Categories"}</h1>
        {category && <div style={{ marginTop: 7 }}>{badge(category.access_type)}</div>}
      </div>

      {!category ? (
        <>
          <button onClick={() => setShowRootCreate(!showRootCreate)} style={{ border: "none", background: "#2563eb", color: "#fff", borderRadius: 9, padding: "10px 14px", fontWeight: 700, cursor: "pointer", marginBottom: 15 }}>
            ＋ Create Main Card
          </button>
          {showRootCreate && (
            <div style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 14, marginBottom: 20, background: "#f9fafb" }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Main card name" autoFocus style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #9ca3af", borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setRootAccessType("free")} style={btn(rootAccessType === "free" ? "#16a34a" : "#9ca3af")}>🟢 Free</button>
                <button onClick={() => setRootAccessType("paid")} style={btn(rootAccessType === "paid" ? "#dc2626" : "#9ca3af")}>🔴 Paid</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={createRootCategory} disabled={saving} style={btn("#2563eb")}>Create</button>
                <button onClick={() => { setShowRootCreate(false); setNewName(""); }} style={btn("#6b7280")}>Cancel</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          <button onClick={() => { setShowCreate(!showCreate); setNewName(""); }} style={btn("#2563eb")}>＋ Create Sub-card</button>
          <button onClick={() => router.push(`/admin/html-tests?category_id=${encodeURIComponent(category.id)}`)} style={btn("#7c3aed")}>⬆️ Upload HTML</button>
        </div>
      )}

      {category && showCreate && (
        <div style={{ padding: 14, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, marginBottom: 18 }}>
          <strong>Create sub-card inside "{category.name}"</strong>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sub-card name" autoFocus style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #9ca3af", borderRadius: 8, marginTop: 10 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={createChild} disabled={saving} style={btn("#16a34a")}>Create</button>
            <button onClick={() => { setShowCreate(false); setNewName(""); }} style={btn("#6b7280")}>Cancel</button>
          </div>
        </div>
      )}

      {message && <div style={{ padding: 10, borderRadius: 8, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", marginBottom: 15 }}>{message}</div>}

      {!category ? (
        <>
          <h2 style={{ color: "#166534", marginTop: 25 }}>🟢 Free Tests</h2>
          {rootCategories.filter((i) => i.access_type === "free").map((item, index, list) => renderCard(item, index, list))}
          <h2 style={{ color: "#991b1b", marginTop: 30 }}>🔴 Paid Tests</h2>
          {rootCategories.filter((i) => i.access_type === "paid").map((item, index, list) => renderCard(item, index, list))}
        </>
      ) : (
        <>
          <h2 style={{ marginTop: 10 }}>Contents</h2>
          {children.length === 0 ? <p style={{ color: "#6b7280" }}>This card is empty.</p> : children.map((item, index, list) => renderCard(item, index, list))}
        </>
      )}
    </main>
  );
}

export default function HtmlCategoriesPage() {
  return (
    <Suspense fallback={<main style={{ padding: 20 }}><p>Loading categories...</p></main>}>
      <HtmlCategoriesContent />
    </Suspense>
  );
}
