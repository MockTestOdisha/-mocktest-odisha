"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  const [activeSortMode, setActiveSortMode] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingTestId, setEditingTestId] = useState(null);
  const [editingTestTitle, setEditingTestTitle] = useState("");

  const [movingCategoryId, setMovingCategoryId] = useState(null);
  const [movingTestId, setMovingTestId] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedTestCategoryId, setSelectedTestCategoryId] = useState("");

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/admin/login"); return false; }
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (error || !profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return false;
    }
    return true;
  }

  async function loadAllCategories() {
    const { data, error } = await supabase
      .from("html_test_categories")
      .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error) setAllCategories(data || []);
    else setErrorMessage(error.message);
  }

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");
    const allowed = await checkAdmin();
    if (!allowed) return;
    await loadAllCategories();

    if (!categoryId) {
      setCategory(null);
      const { data, error } = await supabase
        .from("html_test_categories")
        .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
        .is("parent_id", null)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) { setErrorMessage(error.message); setLoading(false); return; }
      setChildren(data || []);
      setTests([]);
      setLoading(false);
      return;
    }

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

    const { data: childCategories, error: childrenError } = await supabase
      .from("html_test_categories")
      .select("id, name, access_type, parent_id, is_visible, display_order, created_at")
      .eq("parent_id", categoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (childrenError) { setErrorMessage(childrenError.message); setLoading(false); return; }
    setChildren(childCategories || []);

    const { data: htmlTests, error: testsError } = await supabase
      .from("html_tests")
      .select("id, title, slug, storage_path, access_type, attempt_mode, category_id, is_active, display_order, created_at")
      .eq("category_id", categoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (testsError) { setErrorMessage(testsError.message); setLoading(false); return; }
    setTests(htmlTests || []);
    setLoading(false);
  }

  useEffect(() => { loadPage(); }, [categoryId]);

  const filteredChildren = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    return !s ? children : children.filter((i) => i.name.toLowerCase().includes(s));
  }, [children, searchText]);

  const filteredTests = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    return !s ? tests : tests.filter((t) => t.title.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s) || t.storage_path?.toLowerCase().includes(s));
  }, [tests, searchText]);

  function makeSlug(v) { return v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""); }
  function handleTitleChange(v) { setTitle(v); if (!slug) setSlug(makeSlug(v)); }

  async function updateCategory(id, changes) {
    const res = await fetch("/api/admin/html-tests/category", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
    const r = await res.json();
    if (!res.ok) throw new Error(r.error || "Category update failed.");
    return r;
  }

  async function updateTest(id, changes) {
    const res = await fetch("/api/admin/html-tests/test", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
    const r = await res.json();
    if (!res.ok) throw new Error(r.error || "Test update failed.");
    return r;
  }

  async function createSubCard(e) {
    e.preventDefault();
    if (!categoryId) return setErrorMessage("Open a category first.");
    if (!newCardName.trim()) return setErrorMessage("Enter a sub-card name.");
    const { error } = await supabase.from("html_test_categories").insert({
      name: newCardName.trim(), access_type: category?.access_type === "paid" ? "paid" : "free", parent_id: categoryId, is_visible: true, display_order: children.length
    });
    if (error) return setErrorMessage(error.message);
    setNewCardName(""); setShowCreate(false); setSuccessMessage("Sub-card created."); await loadPage();
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!categoryId || !category) return setErrorMessage("Open a category first.");
    if (!title.trim() || !slug.trim()) return setErrorMessage("Fill title and slug.");
    if (!file || (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm"))) return setErrorMessage("Select a valid .html file.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim()); fd.append("slug", slug.trim()); fd.append("categoryId", category.id); fd.append("attemptMode", attemptMode); fd.append("file", file);
      const res = await fetch("/api/admin/html-tests/upload", { method: "POST", body: fd });
      const r = await res.json();
      if (!res.ok) { setErrorMessage(r.error || "Upload failed."); setUploading(false); return; }
      setTitle(""); setSlug(""); setAttemptMode("one"); setFile(null);
      const fi = document.getElementById("html-file"); if (fi) fi.value = "";
      setSuccessMessage("HTML test uploaded successfully."); setShowUpload(false); await loadPage();
    } catch (err) { setErrorMessage(err.message || "Upload error."); }
    setUploading(false);
  }

  async function handleDeleteTest(test) {
    if (!window.confirm(`Permanently delete "${test.title}" and its HTML file?`)) return;
    setBusyId(test.id);
    try {
      const res = await fetch("/api/admin/html-tests/test", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: test.id }) });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed.");
      setSuccessMessage("Test deleted."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function handleDeleteCategory(item) {
    if (!window.confirm(`PERMANENT DELETE: "${item.name}" and all sub-cards and tests inside?`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch("/api/admin/html-tests/category", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed.");
      setSuccessMessage(`"${item.name}" deleted.`); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function saveCategoryRename(item) {
    if (!editingCategoryName.trim()) return setErrorMessage("Name cannot be empty.");
    setBusyId(item.id);
    try {
      await updateCategory(item.id, { name: editingCategoryName.trim() });
      setEditingCategoryId(null); setEditingCategoryName(""); setSuccessMessage("Category renamed."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function toggleCategoryVisibility(item) {
    setBusyId(item.id);
    try {
      await updateCategory(item.id, { is_visible: !item.is_visible });
      setSuccessMessage(item.is_visible ? "Category hidden." : "Category visible."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function toggleCategoryAccess(item) {
    const nt = item.access_type === "paid" ? "free" : "paid";
    if (!window.confirm(`Change "${item.name}" to ${nt.toUpperCase()}?`)) return;
    setBusyId(item.id);
    try {
      await updateCategory(item.id, { access_type: nt });
      setSuccessMessage("Access type changed."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function moveCategory(item, dir) {
    const siblings = children.filter((c) => (c.parent_id || null) === (item.parent_id || null) && (!item.parent_id ? c.access_type === item.access_type : true)).sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0));
    const idx = siblings.findIndex((c) => c.id === item.id);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= siblings.length) return;
    const reordered = [...siblings]; const [moved] = reordered.splice(idx, 1); reordered.splice(target, 0, moved);
    const idToOrder = {}; reordered.forEach((c, i) => { idToOrder[c.id] = i; });
    setChildren((prev) => prev.map((c) => idToOrder[c.id] !== undefined ? { ...c, display_order: idToOrder[c.id] } : c).sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0)));
    setBusyId(item.id);
    try {
      await Promise.all(reordered.map((c, i) => updateCategory(c.id, { display_order: i })));
      setSuccessMessage("Category order updated."); await loadPage();
    } catch (err) { setErrorMessage(err.message); await loadPage(); }
    setBusyId(null);
  }

  async function saveCategoryMove(item) {
    const pid = selectedParentId || null;
    if (pid === item.id) return setErrorMessage("Cannot move category inside itself.");
    setBusyId(item.id);
    try {
      await updateCategory(item.id, { parent_id: pid, display_order: 0 });
      setMovingCategoryId(null); setSelectedParentId(""); setSuccessMessage("Category moved."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function saveTestRename(test) {
    if (!editingTestTitle.trim()) return setErrorMessage("Title cannot be empty.");
    setBusyId(test.id);
    try {
      await updateTest(test.id, { title: editingTestTitle.trim() });
      setEditingTestId(null); setEditingTestTitle(""); setSuccessMessage("Test renamed."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function toggleTestVisibility(test) {
    setBusyId(test.id);
    try {
      await updateTest(test.id, { is_active: !test.is_active });
      setSuccessMessage(test.is_active ? "Test hidden." : "Test visible."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function toggleTestAccess(test) {
    const nt = test.access_type === "paid" ? "free" : "paid";
    if (!window.confirm(`Change "${test.title}" to ${nt.toUpperCase()}?`)) return;
    setBusyId(test.id);
    try {
      await updateTest(test.id, { access_type: nt });
      setSuccessMessage("Test access changed."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function toggleAttemptMode(test) {
    setBusyId(test.id);
    try {
      await updateTest(test.id, { attempt_mode: test.attempt_mode === "multiple" ? "one" : "multiple" });
      setSuccessMessage("Attempt mode changed."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  async function moveTest(test, dir) {
    setActiveSortMode("");
    const siblings = [...tests].sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0));
    const idx = siblings.findIndex((t) => t.id === test.id);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= siblings.length) return;
    const reordered = [...siblings]; const [moved] = reordered.splice(idx, 1); reordered.splice(target, 0, moved);
    const idToOrder = {}; reordered.forEach((t, i) => { idToOrder[t.id] = i; });
    setTests((prev) => prev.map((t) => idToOrder[t.id] !== undefined ? { ...t, display_order: idToOrder[t.id] } : t).sort((a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0)));
    setBusyId(test.id);
    try {
      await Promise.all(reordered.map((t, i) => updateTest(t.id, { display_order: i })));
      setSuccessMessage("Test order updated."); await loadPage();
    } catch (err) { setErrorMessage(err.message); await loadPage(); }
    setBusyId(null);
  }

  // ==================================================
  // DRAG & DROP HANDLER
  // ==================================================
  async function handleDropTest(targetIndex) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setActiveSortMode("");

    const reordered = [...tests];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    const idToOrder = {};
    reordered.forEach((t, i) => { idToOrder[t.id] = i; });

    setTests(reordered.map((t, i) => ({ ...t, display_order: i })));
    setDraggedIndex(null);
    setBusyId("drag-save");

    try {
      await Promise.all(reordered.map((t, i) => updateTest(t.id, { display_order: i })));
      setSuccessMessage("Order saved after reordering.");
      await loadPage();
    } catch (err) {
      setErrorMessage("Could not save dragged order: " + err.message);
      await loadPage();
    } finally {
      setBusyId(null);
    }
  }

  // ==================================================
  // ONE-CLICK SMART AUTO-SORT
  // ==================================================
  async function autoSortTests(mode) {
    if (!tests || tests.length < 2) return;
    setActiveSortMode(mode);

    const list = [...tests];
    if (mode === "a-z") list.sort((a, b) => a.title.localeCompare(b.title));
    else if (mode === "z-a") list.sort((a, b) => b.title.localeCompare(a.title));
    else if (mode === "newest") list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (mode === "oldest") list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    setTests(list.map((t, idx) => ({ ...t, display_order: idx })));
    setBusyId("autosort");
    try {
      await Promise.all(list.map((t, idx) => updateTest(t.id, { display_order: idx })));
      setSuccessMessage("Tests sorted and saved."); await loadPage();
    } catch (err) { setErrorMessage("Could not sort: " + err.message); await loadPage(); }
    setBusyId(null);
  }

  async function saveTestMove(test) {
    if (!selectedTestCategoryId) return setErrorMessage("Select a destination category.");
    setBusyId(test.id);
    try {
      await updateTest(test.id, { category_id: selectedTestCategoryId, display_order: 0 });
      setMovingTestId(null); setSelectedTestCategoryId(""); setSuccessMessage("Test moved."); await loadPage();
    } catch (err) { setErrorMessage(err.message); }
    setBusyId(null);
  }

  function goBack() {
    if (!category) router.push("/admin");
    else if (category.parent_id) router.push(`/admin/html-tests?category_id=${category.parent_id}`);
    else router.push("/admin/html-tests");
  }

  const categoryNameById = (id) => allCategories.find((i) => i.id === id)?.name || "Unknown category";

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "20px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h1>🧩 HTML Tests</h1><p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "16px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ background: "linear-gradient(135deg, #fff7ed, #fffbeb)", border: "1px solid #fed7aa", borderRadius: "16px", padding: "20px", marginBottom: "18px" }}>
          <h1 style={{ margin: 0, color: "#9a3412", fontSize: "26px" }}>🧩 HTML Tests</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280" }}>Organize, upload, and drag to arrange your HTML mock tests.</p>
        </div>

        {/* MESSAGES */}
        {errorMessage && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px", borderRadius: "10px", marginBottom: "15px" }}>{errorMessage}</div>}
        {successMessage && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "12px", borderRadius: "10px", marginBottom: "15px" }}>{successMessage}</div>}

        {/* SEARCH */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={!category ? "🔎 Search main cards..." : "🔎 Search sub-cards, test titles, slugs or storage paths..."}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #d1d5db", borderRadius: "9px", fontSize: "16px" }}
          />
        </div>

        {/* ROOT VIEW */}
        {!category && (
          <>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "18px", marginBottom: "18px", border: "1px solid #e5e7eb" }}>
              <h2 style={{ marginTop: 0 }}>🧩 Test Categories</h2>
              <p style={{ color: "#6b7280" }}>Choose Free or Paid and open your test categories.</p>
              <button onClick={() => { setSearchText(""); setShowCreate(true); }} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "10px", background: "#ffedd5", color: "#9a3412", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}>
                ＋ Create Main Card
              </button>
            </div>

            {["free", "paid"].map((type) => {
              const items = filteredChildren.filter((item) => item.access_type === type);
              const isFree = type === "free";
              return (
                <section key={type} style={{ marginBottom: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ background: isFree ? "#dcfce7" : "#fee2e2", color: isFree ? "#166534" : "#991b1b", padding: "7px 12px", borderRadius: "999px", fontWeight: "800" }}>
                      {isFree ? "🔓 FREE" : "🔐 PAID"}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: "12px", padding: "18px", color: "#6b7280" }}>No {isFree ? "Free" : "Paid"} main cards yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {items.map((item, index) => (
                        <CategoryCard key={item.id} item={item} index={index} items={items} router={router} busyId={busyId} editingCategoryId={editingCategoryId} editingCategoryName={editingCategoryName} setEditingCategoryId={setEditingCategoryId} setEditingCategoryName={setEditingCategoryName} saveCategoryRename={saveCategoryRename} toggleCategoryVisibility={toggleCategoryVisibility} toggleCategoryAccess={toggleCategoryAccess} moveCategory={moveCategory} handleDeleteCategory={handleDeleteCategory} movingCategoryId={movingCategoryId} setMovingCategoryId={setMovingCategoryId} selectedParentId={selectedParentId} setSelectedParentId={setSelectedParentId} saveCategoryMove={saveCategoryMove} allCategories={allCategories} />
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
            <button onClick={goBack} style={{ marginBottom: "14px", padding: "10px 14px", border: "none", borderRadius: "9px", background: "#f3f4f6", color: "#374151", fontWeight: "700", cursor: "pointer" }}>
              ← Back
            </button>

            <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "18px", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: "0 0 8px" }}>📁 {category.name}</h2>
                <span style={{ background: category.access_type === "paid" ? "#fee2e2" : "#dcfce7", color: category.access_type === "paid" ? "#991b1b" : "#166534", padding: "6px 11px", borderRadius: "999px", fontWeight: "800" }}>
                  {category.access_type === "paid" ? "🔐 PAID" : "🔓 FREE"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginTop: "18px" }}>
                <button onClick={() => setShowCreate(true)} style={{ padding: "12px", border: "none", borderRadius: "10px", background: "#ffedd5", color: "#9a3412", fontWeight: "800", cursor: "pointer" }}>
                  ＋ Create Sub-card
                </button>
                <button onClick={() => setShowUpload(true)} style={{ padding: "12px", border: "none", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: "800", cursor: "pointer" }}>
                  ⬆️ Upload HTML
                </button>
              </div>
            </div>

            {/* CREATE SUB-CARD MODAL */}
            {showCreate && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <h3>＋ Create Sub-card</h3>
                <form onSubmit={createSubCard}>
                  <input value={newCardName} onChange={(e) => setNewCardName(e.target.value)} placeholder="Sub-card name" style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "10px", fontSize: "16px" }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="submit" style={{ padding: "10px 15px", border: "none", borderRadius: "8px", background: "#fed7aa", color: "#9a3412", fontWeight: "800", cursor: "pointer" }}>Create</button>
                    <button type="button" onClick={() => setShowCreate(false)} style={smallGreyButton}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* UPLOAD FORM */}
            {showUpload && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
                <h3>⬆️ Upload HTML Test</h3>
                <p style={{ color: "#6b7280" }}>Category: <strong>{category.name}</strong></p>
                <form onSubmit={handleUpload}>
                  <label><strong>Test Title</strong></label>
                  <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Odisha GK Mock Test 01" style={{ width: "100%", boxSizing: "border-box", padding: "12px", margin: "8px 0 16px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
                  <label><strong>Test Slug</strong></label>
                  <input type="text" value={slug} onChange={(e) => setSlug(makeSlug(e.target.value))} placeholder="odisha-gk-01" style={{ width: "100%", boxSizing: "border-box", padding: "12px", margin: "8px 0 4px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
                  <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>Test URL: {" /html-test/"}{slug || "your-slug"}</p>
                  <label><strong>Attempt Mode</strong></label>
                  <select value={attemptMode} onChange={(e) => setAttemptMode(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "12px", margin: "8px 0 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "16px" }}>
                    <option value="one">📝 One Attempt</option>
                    <option value="multiple">🔄 Multiple Attempts</option>
                  </select>
                  <label><strong>HTML File</strong></label>
                  <input id="html-file" type="file" accept=".html,.htm,text/html" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "block", margin: "8px 0 18px" }} />
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="submit" disabled={uploading} style={{ padding: "12px 18px", border: "none", borderRadius: "9px", background: uploading ? "#d1d5db" : "#fde68a", color: "#92400e", fontWeight: "800", cursor: uploading ? "not-allowed" : "pointer" }}>
                      {uploading ? "Uploading..." : "⬆️ Upload Test"}
                    </button>
                    <button type="button" onClick={() => setShowUpload(false)} style={{ padding: "12px 18px", border: "none", borderRadius: "9px", background: "#e5e7eb", color: "#374151", fontWeight: "700", cursor: "pointer" }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-CARDS */}
            {children.length > 0 && (
              <section style={{ marginBottom: "22px" }}>
                <h3>📁 Sub-cards</h3>
                {filteredChildren.length === 0 ? (
                  <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: "12px", padding: "18px", color: "#6b7280" }}>No matching sub-cards.</div>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {filteredChildren.map((item, index) => (
                      <CategoryCard key={item.id} item={item} index={index} items={filteredChildren} router={router} busyId={busyId} editingCategoryId={editingCategoryId} editingCategoryName={editingCategoryName} setEditingCategoryId={setEditingCategoryId} setEditingCategoryName={setEditingCategoryName} saveCategoryRename={saveCategoryRename} toggleCategoryVisibility={toggleCategoryVisibility} toggleCategoryAccess={toggleCategoryAccess} moveCategory={moveCategory} handleDeleteCategory={handleDeleteCategory} movingCategoryId={movingCategoryId} setMovingCategoryId={setMovingCategoryId} selectedParentId={selectedParentId} setSelectedParentId={setSelectedParentId} saveCategoryMove={saveCategoryMove} allCategories={allCategories} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* QUICK SORT TOOLBAR WITH CYAN ACTIVE HIGHLIGHT */}
            {tests && tests.length > 1 && (
              <div style={{ background: "#f1f5f9", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>⚡ Quick Sort:</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button onClick={() => autoSortTests("newest")} disabled={busyId === "autosort"} style={getSortBtnStyle(activeSortMode === "newest")}>📅 Newest First</button>
                  <button onClick={() => autoSortTests("oldest")} disabled={busyId === "autosort"} style={getSortBtnStyle(activeSortMode === "oldest")}>📅 Oldest First</button>
                  <button onClick={() => autoSortTests("a-z")} disabled={busyId === "autosort"} style={getSortBtnStyle(activeSortMode === "a-z")}>🔤 A → Z</button>
                  <button onClick={() => autoSortTests("z-a")} disabled={busyId === "autosort"} style={getSortBtnStyle(activeSortMode === "z-a")}>🔤 Z → A</button>
                </div>
              </div>
            )}

            {/* HTML TESTS */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h3 style={{ margin: 0 }}>📄 HTML Tests</h3>
                {tests.length > 1 && (
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                    💡 Hold ⠿ handle to drag & reorder
                  </span>
                )}
              </div>

              {tests.length === 0 ? (
                <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: "12px", padding: "20px", color: "#6b7280" }}>
                  No HTML tests in this category yet.<br />Tap <strong>⬆️ Upload HTML</strong> to add one.
                </div>
              ) : filteredTests.length === 0 ? (
                <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: "12px", padding: "20px", color: "#6b7280" }}>No HTML tests match your search.</div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {filteredTests.map((test, index) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      index={index}
                      tests={filteredTests}
                      busyId={busyId}
                      draggedIndex={draggedIndex}
                      setDraggedIndex={setDraggedIndex}
                      handleDropTest={handleDropTest}
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

        {/* MAIN CARD MODAL */}
        {showCreate && !category && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
            <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: "14px", padding: "20px" }}>
              <h2>＋ Create Main Card</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newCardName.trim()) return setErrorMessage("Please enter a card name.");
                const { error } = await supabase.from("html_test_categories").insert({
                  name: newCardName.trim(), access_type: newCardAccess, parent_id: null, is_visible: true, display_order: children.filter((i) => i.access_type === newCardAccess).length,
                });
                if (error) return setErrorMessage(error.message);
                setNewCardName(""); setNewCardAccess("free"); setShowCreate(false); setSuccessMessage("Main card created."); await loadPage();
              }}>
                <input value={newCardName} onChange={(e) => setNewCardName(e.target.value)} placeholder="Card name" style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px", marginBottom: "12px" }} />
                <select value={newCardAccess} onChange={(e) => setNewCardAccess(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px", marginBottom: "15px" }}>
                  <option value="free">🔓 FREE</option><option value="paid">🔐 PAID</option>
                </select>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" style={{ flex: 1, padding: "12px", border: "none", borderRadius: "9px", background: "#fed7aa", color: "#9a3412", fontWeight: "800", cursor: "pointer" }}>Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "9px", background: "#e5e7eb", color: "#374151", cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <button onClick={() => router.push("/admin")} style={{ marginTop: "25px", width: "100%", padding: "12px", border: "none", borderRadius: "10px", background: "#e5e7eb", color: "#374151", fontWeight: "700", cursor: "pointer" }}>
          ← Back to Admin Dashboard
        </button>
      </div>
    </main>
  );
}

function CategoryCard({ item, index, items, router, busyId, editingCategoryId, editingCategoryName, setEditingCategoryId, setEditingCategoryName, saveCategoryRename, toggleCategoryVisibility, toggleCategoryAccess, moveCategory, handleDeleteCategory, movingCategoryId, setMovingCategoryId, selectedParentId, setSelectedParentId, saveCategoryMove, allCategories }) {
  const isPaid = item.access_type === "paid";
  const isBusy = busyId === item.id;
  return (
    <div style={{ background: item.is_visible ? "#fff" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px" }}>
      {editingCategoryId === item.id ? (
        <div>
          <input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "11px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => saveCategoryRename(item)} disabled={isBusy} style={smallGreenButton}>Save</button>
            <button onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }} style={smallGreyButton}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 8px" }}>📁 {item.name}</h3>
              <span style={{ background: isPaid ? "#fee2e2" : "#dcfce7", color: isPaid ? "#991b1b" : "#166534", padding: "6px 10px", borderRadius: "999px", fontWeight: "800" }}>{isPaid ? "🔐 PAID" : "🔓 FREE"}</span>
              {!item.is_visible && <span style={{ marginLeft: "7px", background: "#e5e7eb", color: "#4b5563", padding: "6px 9px", borderRadius: "999px", fontWeight: "700" }}>Hidden</span>}
            </div>
          </div>
          <button onClick={() => router.push(`/admin/html-tests?category_id=${item.id}`)} style={{ width: "100%", marginTop: "14px", padding: "12px", border: "none", borderRadius: "10px", background: "#dbeafe", color: "#1e40af", fontWeight: "800", cursor: "pointer" }}>📂 Open</button>
          <div style={controlGrid}>
            <button onClick={() => { setEditingCategoryId(item.id); setEditingCategoryName(item.name); }} style={smallOrangeButton} disabled={isBusy}>✏️ Rename</button>
            <button onClick={() => toggleCategoryVisibility(item)} style={smallGreyButton} disabled={isBusy}>{item.is_visible ? "🙈 Hide" : "👁️ Show"}</button>
            <button onClick={() => toggleCategoryAccess(item)} style={isPaid ? smallGreenButton : smallRedButton} disabled={isBusy}>{isPaid ? "🔓 Make Free" : "🔐 Make Paid"}</button>
            <button onClick={() => moveCategory(item, "up")} style={smallGreyButton} disabled={isBusy || index === 0}>⬆️ Up</button>
            <button onClick={() => moveCategory(item, "down")} style={smallGreyButton} disabled={isBusy || index === items.length - 1}>⬇️ Down</button>
            <button onClick={() => { setMovingCategoryId(item.id); setSelectedParentId(item.parent_id || ""); }} style={smallBlueButton} disabled={isBusy}>📁 Move</button>
            <button onClick={() => handleDeleteCategory(item)} style={smallDeleteButton} disabled={isBusy}>{isBusy ? "Working..." : "🗑️ Delete"}</button>
          </div>
          {movingCategoryId === item.id && (
            <div style={{ marginTop: "12px", padding: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px" }}>
              <strong>Move category</strong>
              <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} style={{ width: "100%", marginTop: "8px", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff" }}>
                <option value="">Root / Free-Paid section</option>
                {allCategories.filter((c) => c.id !== item.id).map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.access_type === "paid" ? "PAID" : "FREE"})</option>))}
              </select>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => saveCategoryMove(item)} style={smallBlueButton}>Move</button>
                <button onClick={() => { setMovingCategoryId(null); setSelectedParentId(""); }} style={smallGreyButton}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TestCard({
  test,
  index,
  tests,
  busyId,
  draggedIndex,
  setDraggedIndex,
  handleDropTest,
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
  const isBusy = busyId === test.id || busyId === "drag-save";
  const isDragging = draggedIndex === index;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDropTest(index)}
      style={{
        background: test.is_active ? "#fff" : "#f3f4f6",
        border: isDragging ? "2px dashed #06b6d4" : "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        opacity: isDragging ? 0.45 : 1,
        transition: "border-color 0.15s ease, opacity 0.15s ease",
      }}
    >
      {editingTestId === test.id ? (
        <>
          <input value={editingTestTitle} onChange={(e) => setEditingTestTitle(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "11px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => saveTestRename(test)} disabled={isBusy} style={smallGreenButton}>Save</button>
            <button onClick={() => { setEditingTestId(null); setEditingTestTitle(""); }} style={smallGreyButton}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          {/* DRAG HANDLE BAR */}
          <div
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragEnd={() => setDraggedIndex(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: "800",
              color: "#475569",
              cursor: "grab",
              marginBottom: "8px",
              userSelect: "none",
            }}
          >
            <span>⠿ Drag to sort</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "0", flex: 1 }}>
              <h4 style={{ margin: "0 0 7px" }}>📄 {test.title}</h4>
              <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "14px" }}>Slug: {test.slug}</p>
              <p style={{ margin: "4px 0" }}>{test.attempt_mode === "multiple" ? "🔄 Multiple Attempts" : "📝 One Attempt"}</p>
              <p style={{ margin: "7px 0 0", color: "#4b5563", fontSize: "13px", wordBreak: "break-all" }}><strong>Storage:</strong> {test.storage_path || "Not available"}</p>
              <p style={{ margin: "7px 0 0", color: "#4b5563", fontSize: "14px" }}><strong>Current category:</strong> {categoryNameById(test.category_id)}</p>
              {!test.is_active && <span style={{ display: "inline-block", marginTop: "7px", background: "#e5e7eb", color: "#4b5563", padding: "5px 8px", borderRadius: "999px", fontWeight: "700", fontSize: "13px" }}>Hidden</span>}
            </div>
            <span style={{ background: isPaid ? "#fee2e2" : "#dcfce7", color: isPaid ? "#991b1b" : "#166534", padding: "6px 10px", borderRadius: "999px", fontWeight: "800", height: "fit-content" }}>{isPaid ? "🔐 PAID" : "🔓 FREE"}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            <a href={`/html-test/${test.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 13px", background: "#dbeafe", color: "#1e40af", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>📂 Open Test</a>
            <button onClick={() => { setEditingTestId(test.id); setEditingTestTitle(test.title); }} style={smallOrangeButton} disabled={isBusy}>✏️ Rename</button>
            <button onClick={() => toggleTestVisibility(test)} style={smallGreyButton} disabled={isBusy}>{test.is_active ? "🙈 Hide" : "👁️ Show"}</button>
            <button onClick={() => toggleTestAccess(test)} style={isPaid ? smallGreenButton : smallRedButton} disabled={isBusy}>{isPaid ? "🔓 Make Free" : "🔐 Make Paid"}</button>
            <button onClick={() => toggleAttemptMode(test)} style={smallBlueButton} disabled={isBusy}>{test.attempt_mode === "multiple" ? "📝 One Attempt" : "🔄 Multiple"}</button>
            <button onClick={() => moveTest(test, "up")} style={smallGreyButton} disabled={isBusy || index === 0}>⬆️ Up</button>
            <button onClick={() => moveTest(test, "down")} style={smallGreyButton} disabled={isBusy || index === tests.length - 1}>⬇️ Down</button>
            <button onClick={() => { setMovingTestId(test.id); setSelectedTestCategoryId(test.category_id || ""); }} style={smallBlueButton} disabled={isBusy}>📁 Move</button>
            <button onClick={() => handleDeleteTest(test)} style={smallDeleteButton} disabled={isBusy}>{isBusy ? "Working..." : "🗑️ Delete"}</button>
          </div>
          {movingTestId === test.id && (
            <div style={{ marginTop: "12px", padding: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px" }}>
              <strong>Move test</strong>
              <select value={selectedTestCategoryId} onChange={(e) => setSelectedTestCategoryId(e.target.value)} style={{ width: "100%", marginTop: "8px", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff" }}>
                <option value="">Select category</option>
                {allCategories.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.access_type === "paid" ? "PAID" : "FREE"})</option>))}
              </select>
              <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: "13px" }}>Current category: {categoryNameById(test.category_id)}</p>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => saveTestMove(test)} style={smallBlueButton}>Move</button>
                <button onClick={() => { setMovingTestId(null); setSelectedTestCategoryId(""); }} style={smallGreyButton}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const controlGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))", gap: "7px", marginTop: "10px" };

function getSortBtnStyle(isActive) {
  return {
    border: isActive ? "1px solid #0891b2" : "1px solid #94a3b8",
    background: isActive ? "#06b6d4" : "#ffffff",
    color: isActive ? "#ffffff" : "#0f172a",
    borderRadius: "6px",
    padding: "5px 9px",
    fontSize: "11.5px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: isActive ? "0 2px 6px rgba(6, 182, 212, 0.35)" : "none",
    transition: "background 0.15s ease, color 0.15s ease",
  };
}

const smallOrangeButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#ffedd5", color: "#9a3412", fontWeight: "700", cursor: "pointer" };
const smallBlueButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#dbeafe", color: "#1e40af", fontWeight: "700", cursor: "pointer" };
const smallGreyButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#e5e7eb", color: "#374151", fontWeight: "700", cursor: "pointer" };
const smallGreenButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#dcfce7", color: "#166534", fontWeight: "700", cursor: "pointer" };
const smallRedButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#fee2e2", color: "#991b1b", fontWeight: "700", cursor: "pointer" };
const smallDeleteButton = { padding: "8px 9px", border: "none", borderRadius: "8px", background: "#fee2e2", color: "#991b1b", fontWeight: "700", cursor: "pointer" };

export default function AdminHtmlTestsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "20px" }}><h1>🧩 HTML Tests</h1><p>Loading...</p></main>}>
      <HtmlTestsContent />
    </Suspense>
  );
}
