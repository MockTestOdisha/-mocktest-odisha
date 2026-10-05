"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAccessPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTest, setSelectedTest] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadData() {
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

      const { data: studentData, error: studentError } =
        await supabase.rpc("admin_get_students_for_access");

      if (studentError) {
        setErrorMessage(studentError.message);
        setLoading(false);
        return;
      }

      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select("id, title, slug, test_type, is_active")
        .eq("test_type", "restricted")
        .eq("is_active", true)
        .order("title");

      if (testError) {
        setErrorMessage(testError.message);
        setLoading(false);
        return;
      }

      setStudents(studentData || []);
      setTests(testData || []);
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Test Access...</h1>
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
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1>Test Access</h1>

        <p>
          Give a restricted test to a specific student.
        </p>

        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "10px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Student</strong>
            </label>

            <select
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(e.target.value)
              }
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              <option value="">
                Select a student
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.full_name || "Unnamed Student"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Restricted Test</strong>
            </label>

            <select
              value={selectedTest}
              onChange={(e) =>
                setSelectedTest(e.target.value)
              }
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              <option value="">
                Select a restricted test
              </option>

              {tests.map((test) => (
                <option
                  key={test.id}
                  value={test.id}
                >
                  {test.title}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={!selectedStudent || !selectedTest}
            style={{
              padding: "12px 18px",
              background:
                !selectedStudent || !selectedTest
                  ? "#9ca3af"
                  : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor:
                !selectedStudent || !selectedTest
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Continue
          </button>
        </div>

        <button
          onClick={() => router.push("/admin")}
          style={{
            marginTop: "20px",
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
