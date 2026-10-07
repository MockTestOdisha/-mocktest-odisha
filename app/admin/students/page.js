"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ManageStudentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState([]);
  const [examCategories, setExamCategories] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [paidExamCategoryId, setPaidExamCategoryId] =
    useState("");

  const [accessExpiryDate, setAccessExpiryDate] =
    useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadStudents() {
    const { data, error } = await supabase.rpc(
      "admin_get_students"
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStudents(data || []);
  }

  async function loadExamCategories() {
    const { data, error } = await supabase
      .from("html_test_categories")
      .select(
        "id, name, access_type, is_visible, parent_id, display_order"
      )
      .eq("access_type", "paid")
      .eq("is_visible", true)
      .order("display_order", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Could not load paid exam categories:",
        error
      );

      setErrorMessage(
        "Could not load paid exam categories: " +
          error.message
      );

      return;
    }

    setExamCategories(data || []);
  }

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
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

      await Promise.all([
        loadStudents(),
        loadExamCategories(),
      ]);

      setLoading(false);
    }

    checkAdmin();
  }, []);

  async function handleCreateStudent(e) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage(
        "Please enter the student's full name."
      );
      return;
    }

    if (!studentId.trim()) {
      setErrorMessage(
        "Please enter the Student ID / Roll Number."
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        "Please enter the student's email."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!paidExamCategoryId) {
      setErrorMessage(
        "Please select an exam category."
      );
      return;
    }

    if (!accessExpiryDate) {
      setErrorMessage(
        "Please select an access expiry date."
      );
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        "/api/admin/create-student",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: fullName.trim(),
            studentId: studentId.trim(),
            email: email.trim(),
            password,
            paidExamCategoryId,
            accessExpiryDate,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error ||
            "Could not create student."
        );

        setCreating(false);
        return;
      }

      setMessage(
        "Student account created successfully."
      );

      setFullName("");
      setStudentId("");
      setEmail("");
      setPassword("");
      setPaidExamCategoryId("");
      setAccessExpiryDate("");

      await loadStudents();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Could not create student."
      );
    }

    setCreating(false);
  }

  async function handleDeleteStudent(student) {
    const confirmed = window.confirm(
      `Delete "${student.full_name || "this student"}"?\n\n` +
        "This will permanently delete the student's account and profile."
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setDeletingId(student.id);

    try {
      const { error } = await supabase.rpc(
        "admin_delete_student",
        {
          p_user_id: student.id,
        }
      );

      if (error) {
        setErrorMessage(
          "Could not delete student: " +
            error.message
        );

        setDeletingId(null);
        return;
      }

      setMessage(
        "Student account deleted successfully."
      );

      await loadStudents();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Could not delete student."
      );
    }

    setDeletingId(null);
  }

  function getCategoryLabel(category) {
    if (!category.parent_id) {
      return category.name;
    }

    const parent = examCategories.find(
      (item) => item.id === category.parent_id
    );

    if (!parent) {
      return category.name;
    }

    return `${parent.name} → ${category.name}`;
  }

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Students...</h1>
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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h1>Manage Students</h1>

          <p>
            Create and manage student accounts.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Create New Student</h2>

          <form onSubmit={handleCreateStudent}>
            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>Full Name</strong>
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Student full name"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>
                  Student ID / Roll Number 🆔
                </strong>
              </label>

              <input
                type="text"
                value={studentId}
                onChange={(e) =>
                  setStudentId(e.target.value)
                }
                placeholder="Example: OD2026001"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>Email</strong>
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="student@example.com"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>Password</strong>
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimum 6 characters"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>
                  Class / Exam Category 🎓
                </strong>
              </label>

              <select
                value={paidExamCategoryId}
                onChange={(e) =>
                  setPaidExamCategoryId(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              >
                <option value="">
                  Select paid exam category
                </option>

                {examCategories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {getCategoryLabel(category)}
                    </option>
                  )
                )}
              </select>

              {examCategories.length === 0 && (
                <p
                  style={{
                    marginTop: "8px",
                    color: "#b45309",
                  }}
                >
                  No paid exam categories
                  found. Create a paid category
                  under HTML Tests first.
                </p>
              )}
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>
                  Access Expiry Date 📅
                </strong>
              </label>

              <input
                type="date"
                value={accessExpiryDate}
                onChange={(e) =>
                  setAccessExpiryDate(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {message && (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "15px",
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
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "15px",
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={
                creating ||
                examCategories.length === 0
              }
              style={{
                padding: "12px 18px",
                background:
                  creating ||
                  examCategories.length === 0
                    ? "#93c5fd"
                    : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor:
                  creating ||
                  examCategories.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "16px",
              }}
            >
              {creating
                ? "Creating Student..."
                : "Create Student"}
            </button>
          </form>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>Student Accounts</h2>

          {students.length === 0 ? (
            <p>No students found.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {students.map((student) => (
                <div
                  key={student.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {student.full_name ||
                      "Unnamed Student"}
                  </h3>

                  <p>
                    <strong>
                      Student ID:
                    </strong>{" "}
                    {student.student_id ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>
                      Exam Category:
                    </strong>{" "}
                    {student.paid_exam_category_id
                      ? examCategories.find(
                          (category) =>
                            category.id ===
                            student.paid_exam_category_id
                        )?.name ||
                        "Category not found"
                      : "Not set"}
                  </p>

                  <p>
                    <strong>
                      Access Expiry:
                    </strong>{" "}
                    {student.access_expiry_date ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(
                      student.created_at
                    ).toLocaleString()}
                  </p>

                  <button
                    onClick={() =>
                      handleDeleteStudent(student)
                    }
                    disabled={
                      deletingId === student.id
                    }
                    style={{
                      marginTop: "5px",
                      padding: "10px 16px",
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor:
                        deletingId ===
                        student.id
                          ? "not-allowed"
                          : "pointer",
                      fontSize: "15px",
                    }}
                  >
                    {deletingId === student.id
                      ? "Deleting..."
                      : "Delete Student"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() =>
            router.push("/admin")
          }
          style={{
            marginTop: "25px",
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
}
