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
  const [selectedCatId, setSelectedCatId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Group filter states
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [matchMode, setMatchMode] = useState("exact"); // "exact" or "contains"

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

  // Extract all unique subscription groups dynamically (including combined bundles)
  const availableGroups = useMemo(() => {
    const groupSet = new Set();
    students.forEach((s) => {
      if (s.exam_category && s.exam_category.trim()) {
        groupSet.add(s.exam_category.trim());
      } else {
        groupSet.add("No subscription");
      }
    });
    return Array.from(groupSet).sort();
  }, [students]);

  // Filter students based on selected group and matching mode
  const displayedStudents = useMemo(() => {
    if (selectedGroup === "all") return students;
    return students.filter((s) => {
      const cat = (s.exam_category || "No subscription").trim().toLowerCase();
      const target = selectedGroup.trim().toLowerCase();

      if (matchMode === "exact") {
        return cat === target;
      } else {
        // Intersection / contains mode (has this mock bundle as part of their access)
        return cat.includes(target);
      }
    });
  }, [students, selectedGroup, matchMode]);

  async function handleCreateStudent(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", isError: false });

    const chosenCat = categories.find((c) => c.id === selectedCatId);

    try {
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          rollNumber,
          email,
          password,
          categoryId: selectedCatId || null,
          categoryName: chosenCat?.name || null,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create student.");

      setMsg({
        text: `Student created successfully with full access to ${chosenCat ? chosenCat.name : "selected exams"}!`,
        isError: false,
      });
      setFullName("");
      setRollNumber("");
      setEmail("");
      setPassword("");
      setSelectedCatId("");
      setExpiryDate("");
      loadData();
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
      alert("Student permanently deleted from database and auth.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteGroup() {
    if (displayedStudents.length === 0) return;
    const confirmText = `Are you sure you want to permanently delete ALL ${displayedStudents.length} student(s) in this group (${selectedGroup})?\n\nThis will purge all their auth accounts, permissions, and database rows completely.`;
    if (!confirm(confirmText)) return;

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

      alert(`Deletion finished.\nSuccessfully deleted: ${successCount}\nFailed: ${failCount}`);
      await loadData();
    } finally {
      setBulkDeleting(false);
    }
  }

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
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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

            <div>
              <label style={labelStyle}>Class / Exam Category 🎓 (Paid Main Folders Only)</label>
              <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} style={inputStyle}>
                <option value="">Select paid exam category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Access Expiry Date 📅</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "6px" }}>
              {loading ? "Creating Student & Assigning Tests..." : "Create Student"}
            </button>
          </form>

          {msg.text && (
            <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", background: msg.isError ? "#fef2f2" : "#f0fdf4", color: msg.isError ? "#dc2626" : "#16a34a", border: `1px solid ${msg.isError ? "#fecaca" : "#bbf7d0"}` }}>
              {msg.text}
            </div>
          )}
        </div>

        {/* GROUPING & BULK DELETION CONTROLS */}
        <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ fontSize: "16px", color: "#1e293b", margin: 0 }}>
              Subscription Groups & Filter
            </h2>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
              Showing {displayedStudents.length} of {students.length} student(s)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center" }}>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={inputStyle}
            >
              <option value="all">👥 All Students (No Group Filter)</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>
                  Group: {grp}
                </option>
              ))}
            </select>

            <select
              value={matchMode}
              onChange={(e) => setMatchMode(e.target.value)}
              style={{ ...inputStyle, width: "auto" }}
              title="Exact bundle match or partial match"
            >
              <option value="exact">Exact Bundle</option>
              <option value="contains">Has Access (Includes)</option>
            </select>
          </div>

          {selectedGroup !== "all" && displayedStudents.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fecaca" }}>
              <span style={{ fontSize: "12.5px", color: "#991b1b", fontWeight: "600" }}>
                Target: {displayedStudents.length} student(s) in <strong>{selectedGroup}</strong>
              </span>
              <button
                type="button"
                onClick={handleDeleteGroup}
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
                {bulkDeleting ? "Deleting Group..." : `Delete Entire Group (${displayedStudents.length})`}
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
            No students found in this group filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {displayedStudents.map((s) => (
              <div key={s.id} style={{ background: "#fff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "15px", color: "#0f172a" }}>{s.full_name}</h3>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                    <div>Student ID: <strong style={{ color: "#334155" }}>{s.roll_number || "Not set"}</strong></div>
                    <div>Exam Category: <strong style={{ color: "#2563eb" }}>{s.exam_category || "Not set"}</strong></div>
                    <div>Access Expiry: <strong style={{ color: s.access_expires_at && new Date(s.access_expires_at) < new Date() ? "#dc2626" : "#16a34a" }}>
                      {s.access_expires_at ? new Date(s.access_expires_at).toLocaleDateString() : "Lifetime / Not set"}
                    </strong></div>
                    <div>Created: {new Date(s.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteStudent(s.id)} style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                  Delete Student
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const labelStyle = { fontSize: "12.5px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", outline: "none" };
