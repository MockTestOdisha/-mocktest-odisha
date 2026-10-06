"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAccessPage() {
  const router = useRouter();
  const supabase = createClient();

  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [htmlTests, setHtmlTests] = useState([]);

  const [accessType, setAccessType] = useState("normal");

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [selectedHtmlTest, setSelectedHtmlTest] = useState("");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
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

      const {
        data: studentData,
        error: studentError,
      } = await supabase.rpc(
        "admin_get_students_for_access"
      );

      if (studentError) {
        setErrorMessage(studentError.message);
        setLoading(false);
        return;
      }

      const {
        data: testData,
        error: testError,
      } = await supabase
        .from("tests")
        .select(
          "id, title, slug, test_type, is_active"
        )
        .eq("test_type", "restricted")
        .eq("is_active", true)
        .order("title");

      if (testError) {
        setErrorMessage(testError.message);
        setLoading(false);
        return;
      }

      const {
        data: htmlTestData,
        error: htmlTestError,
      } = await supabase
        .from("html_tests")
        .select(
          "id, title, slug, access_type, is_active"
        )
        .eq("access_type", "paid")
        .eq("is_active", true)
        .order("title");

      if (htmlTestError) {
        setErrorMessage(htmlTestError.message);
        setLoading(false);
        return;
      }

      setStudents(studentData || []);
      setTests(testData || []);
      setHtmlTests(htmlTestData || []);
      setLoading(false);
    }

    loadData();
  }, []);

  async function handleGrantAccess() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedStudent) {
      setErrorMessage("Please select a student.");
      return;
    }

    if (accessType === "normal" && !selectedTest) {
      setErrorMessage(
        "Please select a restricted test."
      );
      return;
    }

    if (
      accessType === "html" &&
      !selectedHtmlTest
    ) {
      setErrorMessage(
        "Please select a paid HTML test."
      );
      return;
    }

    if (!startAt) {
      setErrorMessage(
        "Please select a start date and time."
      );
      return;
    }

    if (!endAt) {
      setErrorMessage(
        "Please select an end date and time."
      );
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      setErrorMessage(
        "End time must be after start time."
      );
      return;
    }

    setSaving(true);

    if (accessType === "normal") {
      const { error } = await supabase.rpc(
        "admin_grant_test_access",
        {
          p_test_id: selectedTest,
          p_user_id: selectedStudent,
          p_start_at: startDate.toISOString(),
          p_end_at: endDate.toISOString(),
        }
      );

      if (error) {
        setErrorMessage(
          "Could not grant test access: " +
            error.message
        );
        setSaving(false);
        return;
      }

      setSuccessMessage(
        "Restricted test access granted successfully."
      );
    } else {
      const { error } = await supabase.rpc(
        "admin_grant_html_test_access",
        {
          p_html_test_id: selectedHtmlTest,
          p_user_id: selectedStudent,
          p_start_at: startDate.toISOString(),
          p_end_at: endDate.toISOString(),
        }
      );

      if (error) {
        setErrorMessage(
          "Could not grant HTML test access: " +
            error.message
        );
        setSaving(false);
        return;
      }

      setSuccessMessage(
        "Paid HTML test access granted successfully."
      );
    }

    setSaving(false);
  }

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
          Give a restricted test or paid HTML test to
          a specific student.
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

        {successMessage && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {successMessage}
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
                  {student.full_name ||
                    "Unnamed Student"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Access Type</strong>
            </label>

            <select
              value={accessType}
              onChange={(e) => {
                setAccessType(e.target.value);
                setSelectedTest("");
                setSelectedHtmlTest("");
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              <option value="normal">
                📝 Normal Restricted Test
              </option>

              <option value="html">
                🌐 Paid HTML Test
              </option>
            </select>
          </div>

          {accessType === "normal" ? (
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
          ) : (
            <div style={{ marginBottom: "20px" }}>
              <label>
                <strong>Paid HTML Test</strong>
              </label>

              <select
                value={selectedHtmlTest}
                onChange={(e) =>
                  setSelectedHtmlTest(e.target.value)
                }
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                }}
              >
                <option value="">
                  Select a paid HTML test
                </option>

                {htmlTests.map((test) => (
                  <option
                    key={test.id}
                    value={test.id}
                  >
                    {test.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Access Start</strong>
            </label>

            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) =>
                setStartAt(e.target.value)
              }
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Access End</strong>
            </label>

            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) =>
                setEndAt(e.target.value)
              }
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
              }}
            />
          </div>

          <button
            onClick={handleGrantAccess}
            disabled={
              saving ||
              !selectedStudent ||
              (accessType === "normal"
                ? !selectedTest
                : !selectedHtmlTest)
            }
            style={{
              padding: "12px 18px",
              background:
                saving ||
                !selectedStudent ||
                (accessType === "normal"
                  ? !selectedTest
                  : !selectedHtmlTest)
                  ? "#9ca3af"
                  : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor:
                saving ||
                !selectedStudent ||
                (accessType === "normal"
                  ? !selectedTest
                  : !selectedHtmlTest)
                  ? "not-allowed"
                  : "pointer",
              fontSize: "16px",
            }}
          >
            {saving
              ? "Granting Access..."
              : "Grant Access"}
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
