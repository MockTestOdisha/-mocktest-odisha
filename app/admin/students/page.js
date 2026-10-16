"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ManageStudentsPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [msg, setMsg] = useState({ text: "", isError: false });

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Array of selected category IDs (supports single, multiple, or all)
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [expiryDate, setExpiryDate] = useState("");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    fetch("/api/admin/students/auto-purge").catch(() => {});
    setFetching(true);
    try {
      const { data: catData } = await supabase
        .from("html_test_categories")
        .select("id, name")
        .eq("access_type", "paid")
        .is("parent_id", null)
        .eq("is_visible", true)
        .order("display_order", { ascending: true });
      setCategories(catData || []);

      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (data.success) setStudents(data.students || []);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setFetching(false);
    }
  }

  // Toggle individual category checkbox
  function toggleCategory(catId) {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  // Select all or clear all
  function handleSelectAll() {
    if (selectedCatIds.length === categories.length) {
      setSelectedCatIds([]);
    } else {
      setSelectedCatIds(categories.map((c) => c.id));
    }
  }

  // Filter students view
  const displayedStudents = useMemo(() => {
    if (selectedCategoryFilter === "all") return students;
    if (selectedCategoryFilter === "common") {
      return students.filter((s) => {
        const cats = String(s.exam_category || "");
        return cats.includes(",") && !cats.includes("No active subscription");
      });
    }
    if (selectedCategoryFilter === "none") {
      return students.filter(
        (s) => !s.exam_category || s.exam_category.includes("No active subscription")
      );
    }
    return students.filter((s) => {
      const studentCats = String(s.exam_category || "").toLowerCase();
      return studentCats.includes(selectedCategoryFilter.toLowerCase());
    });
  }, [students, selectedCategoryFilter]);

  async function handleCreateStudent(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", isError: false });

    const chosenCategories = categories.filter((c) => selectedCatIds.includes(c.id));
    const chosenNames = chosenCategories.map((c) => c.name);

    try {
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          rollNumber,
          email,
          password,
          categoryIds: selectedCatIds, // Array of selected IDs
          categoryNames: chosenNames,  // Array of names
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create student.");

      const accessSummary = chosenNames.length > 0 ? chosenNames.join(", ") : "No categories assigned";
      setMsg({
        text: `Student created successfully with access to: ${accessSummary}!`,
        isError: false,
      });

      setFullName("");
      setRollNumber("");
      setEmail("");
      setPassword("");
      setSelectedCatIds([]);
      setExpiryDate("");
      await loadData();
    } catch (err) {
      setMsg({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStudent(id) {
    if (!confirm("Are you sure you want to permanently delete this student and all their data?")) return;
    try {
      const res = await fetch("/api/admin/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete student.");

      setStudents((prev) => prev.filter((s) => s.id !== id));
      alert("Student permanently deleted.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteFilteredGroup() {
    if (displayedStudents.length === 0) return;
    const groupLabel =
      selectedCategoryFilter === "common"
        ? "all Common Students with multiple subscriptions"
        : `all students in "${selectedCategoryFilter}"`;

    if (!confirm(`Are you sure you want to delete ${displayedStudents.length} student(s) (${groupLabel})?`)) return;

    setBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const s of displayedStudents) {
        try {
          const res = await fetch("/api/admin/students/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id }),
          });
          const data = await res.json();
          if (res.ok && data.success) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }
      alert(`Finished. Deleted: ${successCount}, Failed: ${failCount}`);
      await loadData();
    } finally {
      setBulkDeleting(false);
    }
  }

  const isAllSelected = categories.length > 0 && selectedCatIds.length === categories.length;

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "30px 16px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: "22px", color: "#0f172a" }}>Manage Students</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Create student accounts and grant paid bundle access.</p>
          </div>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* CREATE STUDENT FORM */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "30px" }}>
          <h2 style={{ fontSize: "16px", margin: "0 0 16px", color: "#1e293b" }}>Create New Student</h2>

          <form onSubmit={handleCreateStudent} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter student's full name" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Student ID / Roll Number 🆔</label>
              <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. OP-2026-001" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@example.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Assign password (min 6 chars)" style={inputStyle} />
            </div>

            {/* MULTI-CATEGORY / ALL PAID FOLDERS SELECTOR */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ ...labelStyle, margin: 0 }}>
                  Assign Paid Exam Categories 🎓 ({selectedCatIds.length} selected)
                </label>
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{
                      background: isAllSelected ? "#f1f5f9" : "#eff6ff",
                      color: isAllSelected ? "#475569" : "#2563eb",
                      border: "1px solid " + (isAllSelected ? "#cbd5e1" : "#bfdbfe"),
                      padding: "3px 9px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {isAllSelected ? "✕ Clear All" : "✓ Select All Paid Folders"}
                  </button>
                )}
              </div>

              <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 12px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: "8px" }}>
                {categories.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "#64748b" }}>No paid categories found.</span>
                ) : (
                  categories.map((c) => {
                    const isChecked = selectedCatIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          fontWeight: isChecked ? "700" : "500",
                          color: isChecked ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                          background: isChecked ? "#eff6ff" : "transparent",
                          padding: "6px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(c.id)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Access Expiry Date 📅</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "6px" }}>
              {loading ? "Creating Student & Assigning Access..." : "Create Student"}
            </button>
          </form>

          {msg.text && (
            <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", background: msg.isError ? "#fef2f2" : "#f0fdf4", color: msg.isError ? "#dc2626" : "#16a34a", border: `1px solid ${msg.isError ? "#fecaca" : "#bbf7d0"}` }}>
              {msg.text}
            </div>
          )}
        </div>

        {/* CATEGORY FILTER */}
        <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={{ fontSize: "15px", color: "#1e293b", margin: 0 }}>Filter by Exam Category</h2>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
              Showing {displayedStudents.length} of {students.length} student(s)
            </span>
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="all">👥 All Students</option>
            <option value="common">⚡ Common Students (2+ Mock Subscriptions)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                Enrolled in: {cat.name}
              </option>
            ))}
            <option value="none">No Active Subscription</option>
          </select>

          {selectedCategoryFilter !== "all" && displayedStudents.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fecaca" }}>
              <span style={{ fontSize: "12.5px", color: "#991b1b", fontWeight: "600" }}>
                Target: {displayedStudents.length} student(s) in{" "}
                <strong>
                  {selectedCategoryFilter === "common" ? "Common Students (2+ Subscriptions)" : selectedCategoryFilter}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleDeleteFilteredGroup}
                disabled={bulkDeleting}
                style={{
                  padding: "7px 14px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: bulkDeleting ? "not-allowed" : "pointer",
                }}
              >
                {bulkDeleting ? "Deleting..." : `Delete Entire Group (${displayedStudents.length})`}
              </button>
            </div>
          )}
        </div>

        {/* STUDENT ACCOUNTS LIST */}
        <h2 style={{ fontSize: "17px", color: "#1e293b", margin: "0 0 12px" }}>
          Student Accounts ({displayedStudents.length})
        </h2>

        {fetching ? (
          <p style={{ color: "#64748b", fontSize: "13px" }}>Loading students...</p>
        ) : displayedStudents.length === 0 ? (
          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            No students found in this category filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {displayedStudents.map((s) => {
              const isCommon = s.exam_category && s.exam_category.includes(",") && !s.exam_category.includes("No active subscription");

              return (
                <div key={s.id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", border: isCommon ? "1px solid #93c5fd" : "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{s.full_name}</h3>
                      {isCommon && (
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                          ⚡ Multi-Mock
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                      <div>Student ID: <strong style={{ color: "#334155" }}>{s.roll_number || "Not set"}</strong></div>
                      <div>Exam Category: <strong style={{ color: "#2563eb" }}>{s.exam_category || "No active subscription"}</strong></div>
                      <div>Access Expiry: <strong style={{ color: s.access_expires_at && new Date(s.access_expires_at) < new Date() ? "#dc2626" : "#16a34a" }}>
                        {s.access_expires_at ? new Date(s.access_expires_at).toLocaleDateString("en-IN") : "Lifetime / Not set"}
                      </strong></div>
                      <div>Created: {new Date(s.created_at).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteStudent(s.id)} style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                    Delete Student
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const labelStyle = { fontSize: "12.5px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", outline: "none" };
