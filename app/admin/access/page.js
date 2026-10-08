"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function formatDateTime(value) {
  if (!value) return "No date set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAccessStatus(access) {
  if (!access) return "Unknown";

  const now = new Date();

  if (!access.is_active) return "Ended";

  if (access.start_at && new Date(access.start_at) > now) {
    return "Scheduled";
  }

  if (access.end_at && new Date(access.end_at) < now) {
    return "Expired";
  }

  return "Active";
}

function getStatusClass(status) {
  switch (status) {
    case "Active":
      return "status-active";
    case "Scheduled":
      return "status-scheduled";
    case "Expired":
      return "status-expired";
    case "Ended":
      return "status-ended";
    default:
      return "status-ended";
  }
}

function toLocalDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localInputToISO(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export default function StudentAccessPage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [search, setSearch] = useState("");
  const [showStudentList, setShowStudentList] = useState(false);

  const [testAccess, setTestAccess] = useState([]);
  const [htmlTestAccess, setHtmlTestAccess] = useState([]);

  const [restrictedTests, setRestrictedTests] = useState([]);
  const [paidHtmlTests, setPaidHtmlTests] = useState([]);

  const [selectedAccessType, setSelectedAccessType] =
    useState("normal");

  const [selectedTest, setSelectedTest] = useState("");
  const [selectedHtmlTest, setSelectedHtmlTest] = useState("");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testLoadError, setTestLoadError] = useState("");

  const [editingAccess, setEditingAccess] = useState(null);

  /* ---------------- BULK ACCESS ---------------- */

  const [showBulkAccess, setShowBulkAccess] = useState(false);

  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSelectedStudents, setBulkSelectedStudents] =
    useState([]);

  const [bulkTest, setBulkTest] = useState("");
  const [bulkStartAt, setBulkStartAt] = useState("");
  const [bulkEndAt, setBulkEndAt] = useState("");

  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    loadStudents();
    loadTests();
  }, []);

  async function loadStudents() {
    setLoadingStudents(true);
    setError("");

    const { data, error: studentError } =
      await supabase.rpc(
        "admin_get_students_for_access"
      );

    if (studentError) {
      setError(studentError.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoadingStudents(false);
  }

  async function loadTests() {
    setLoadingTests(true);
    setTestLoadError("");

    try {
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
        .order("title", {
          ascending: true,
        });

      if (testError) {
        setRestrictedTests([]);
        setTestLoadError(
          `Could not load restricted tests: ${testError.message}`
        );
      } else {
        setRestrictedTests(testData || []);

        if (!testData || testData.length === 0) {
          setTestLoadError(
            "No active restricted tests are available. Create or activate a restricted test first."
          );
        }
      }

      const {
        data: htmlData,
        error: htmlError,
      } = await supabase.rpc(
        "admin_get_paid_html_tests"
      );

      if (htmlError) {
        setPaidHtmlTests([]);

        setTestLoadError((current) => {
          if (current) {
            return `${current} Paid HTML tests could not be loaded: ${htmlError.message}`;
          }

          return `Could not load paid HTML tests: ${htmlError.message}`;
        });
      } else {
        setPaidHtmlTests(htmlData || []);
      }
    } catch (loadError) {
      setRestrictedTests([]);
      setPaidHtmlTests([]);

      setTestLoadError(
        loadError?.message ||
          "Could not load available tests."
      );
    }

    setLoadingTests(false);
  }

  async function loadStudentAccess(userId) {
    if (!userId) return;

    setLoadingAccess(true);
    setError("");

    const [
      normalResult,
      htmlResult,
    ] = await Promise.all([
      supabase.rpc(
        "admin_get_student_test_access",
        {
          p_user_id: userId,
        }
      ),

      supabase.rpc(
        "admin_get_student_html_test_access",
        {
          p_user_id: userId,
        }
      ),
    ]);

    if (normalResult.error) {
      setError(normalResult.error.message);
      setTestAccess([]);
    } else {
      setTestAccess(normalResult.data || []);
    }

    if (htmlResult.error) {
      setError((current) => {
        if (current) {
          return `${current} ${htmlResult.error.message}`;
        }

        return htmlResult.error.message;
      });

      setHtmlTestAccess([]);
    } else {
      setHtmlTestAccess(htmlResult.data || []);
    }

    setLoadingAccess(false);
  }

  function handleStudentSelect(student) {
    setSelectedStudent(student);

    setSearch(
      student.full_name ||
        student.email ||
        student.student_id ||
        ""
    );

    setShowStudentList(false);

    setMessage("");
    setError("");

    setSelectedTest("");
    setSelectedHtmlTest("");

    setEditingAccess(null);

    loadStudentAccess(student.id);
  }

  function handleAccessTypeChange(type) {
    setSelectedAccessType(type);

    setSelectedTest("");
    setSelectedHtmlTest("");

    setStartAt("");
    setEndAt("");

    setEditingAccess(null);

    setMessage("");
    setError("");
  }

  function startEditNormalAccess(access) {
    setSelectedAccessType("normal");
    setSelectedTest(access.test_id);
    setSelectedHtmlTest("");

    setStartAt(
      toLocalDateTimeInput(access.start_at)
    );

    setEndAt(
      toLocalDateTimeInput(access.end_at)
    );

    setEditingAccess({
      kind: "normal",
      ...access,
    });

    setMessage("");
    setError("");
  }

  function startEditHtmlAccess(access) {
    setSelectedAccessType("html");
    setSelectedTest("");
    setSelectedHtmlTest(access.html_test_id);

    setStartAt(
      toLocalDateTimeInput(access.start_at)
    );

    setEndAt(
      toLocalDateTimeInput(access.end_at)
    );

    setEditingAccess({
      kind: "html",
      ...access,
    });

    setMessage("");
    setError("");
  }

  function validateAccessDates() {
    if (!startAt || !endAt) {
      setError(
        "Please select both Access Start and Access End."
      );
      return false;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError("Please enter valid access dates.");
      return false;
    }

    if (end <= start) {
      setError(
        "Access End must be later than Access Start."
      );
      return false;
    }

    return true;
  }

  async function handleGrantAccess(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    if (selectedAccessType === "normal") {
      if (restrictedTests.length === 0) {
        setError(
          "No active restricted tests are available. Please create or activate a restricted test first."
        );
        return;
      }

      if (!selectedTest) {
        setError(
          "Please select a restricted test."
        );
        return;
      }
    }

    if (selectedAccessType === "html") {
      if (paidHtmlTests.length === 0) {
        setError(
          "No paid HTML tests are available."
        );
        return;
      }

      if (!selectedHtmlTest) {
        setError(
          "Please select a paid HTML test."
        );
        return;
      }
    }

    if (!validateAccessDates()) {
      return;
    }

    setSaving(true);

    const startISO = localInputToISO(startAt);
    const endISO = localInputToISO(endAt);

    try {
      if (selectedAccessType === "normal") {
        const { error: grantError } =
          await supabase.rpc(
            "admin_grant_test_access",
            {
              p_test_id: selectedTest,
              p_user_id: selectedStudent.id,
              p_start_at: startISO,
              p_end_at: endISO,
            }
          );

        if (grantError) throw grantError;
      } else {
        const { error: grantError } =
          await supabase.rpc(
            "admin_grant_html_test_access",
            {
              p_html_test_id: selectedHtmlTest,
              p_user_id: selectedStudent.id,
              p_start_at: startISO,
              p_end_at: endISO,
            }
          );

        if (grantError) throw grantError;
      }

      setMessage(
        editingAccess
          ? "Access dates updated successfully."
          : "Access granted successfully."
      );

      setError("");

      setStartAt("");
      setEndAt("");
      setSelectedTest("");
      setSelectedHtmlTest("");
      setEditingAccess(null);

      await loadStudentAccess(
        selectedStudent.id
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
          "Could not update test access."
      );
    }

    setSaving(false);
  }

  async function handleEndNormalAccess(access) {
    if (!selectedStudent) return;

    const confirmed = window.confirm(
      `End access to "${access.test_title}" for this student?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");
    setSaving(true);

    const { error: endError } =
      await supabase.rpc(
        "admin_end_test_access",
        {
          p_test_id: access.test_id,
          p_user_id: selectedStudent.id,
        }
      );

    if (endError) {
      setError(endError.message);
    } else {
      setMessage(
        "Normal test access ended successfully."
      );

      await loadStudentAccess(
        selectedStudent.id
      );
    }

    setSaving(false);
  }

  async function handleEndHtmlAccess(access) {
    if (!selectedStudent) return;

    const confirmed = window.confirm(
      `End access to "${access.test_title}" for this student?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");
    setSaving(true);

    const { error: endError } =
      await supabase.rpc(
        "admin_end_html_test_access",
        {
          p_html_test_id:
            access.html_test_id,
          p_user_id: selectedStudent.id,
        }
      );

    if (endError) {
      setError(endError.message);
    } else {
      setMessage(
        "Paid HTML test access ended successfully."
      );

      await loadStudentAccess(
        selectedStudent.id
      );
    }

    setSaving(false);
  }

  /* ---------------- BULK FUNCTIONS ---------------- */

  const filteredBulkStudents = students.filter(
    (student) => {
      const query = bulkSearch
        .trim()
        .toLowerCase();

      if (!query) return true;

      return [
        student.full_name,
        student.student_id,
        student.email,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    }
  );

  function toggleBulkStudent(studentId) {
    setBulkSelectedStudents((current) => {
      if (current.includes(studentId)) {
        return current.filter(
          (id) => id !== studentId
        );
      }

      return [...current, studentId];
    });
  }

  function selectAllBulkStudents() {
    setBulkSelectedStudents(
      filteredBulkStudents.map(
        (student) => student.id
      )
    );
  }

  function clearBulkStudents() {
    setBulkSelectedStudents([]);
  }

  function validateBulkDates() {
    if (!bulkStartAt || !bulkEndAt) {
      setError(
        "Please select both Bulk Access Start and Bulk Access End."
      );
      return false;
    }

    const start = new Date(bulkStartAt);
    const end = new Date(bulkEndAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError(
        "Please enter valid bulk access dates."
      );
      return false;
    }

    if (end <= start) {
      setError(
        "Bulk Access End must be later than Bulk Access Start."
      );
      return false;
    }

    return true;
  }

  async function handleBulkGrantAccess(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (restrictedTests.length === 0) {
      setError(
        "No active restricted tests are available."
      );
      return;
    }

    if (!bulkTest) {
      setError(
        "Please select a restricted test."
      );
      return;
    }

    if (bulkSelectedStudents.length === 0) {
      setError(
        "Please select at least one student."
      );
      return;
    }

    if (!validateBulkDates()) {
      return;
    }

    setBulkSaving(true);

    try {
      const { data, error: bulkError } =
        await supabase.rpc(
          "admin_bulk_grant_test_access",
          {
            p_test_id: bulkTest,
            p_user_ids:
              bulkSelectedStudents,
            p_start_at:
              localInputToISO(
                bulkStartAt
              ),
            p_end_at:
              localInputToISO(
                bulkEndAt
              ),
          }
        );

      if (bulkError) {
        throw bulkError;
      }

      setMessage(
        `Bulk access updated successfully for ${
          data ?? bulkSelectedStudents.length
        } student(s).`
      );

      setBulkSelectedStudents([]);
      setBulkTest("");
      setBulkStartAt("");
      setBulkEndAt("");
    } catch (bulkError) {
      setError(
        bulkError?.message ||
          "Could not grant bulk access."
      );
    }

    setBulkSaving(false);
  }

  const filteredStudents = students.filter(
    (student) => {
      const query = search.trim().toLowerCase();

      if (!query) return true;

      return [
        student.full_name,
        student.student_id,
        student.email,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    }
  );

  const selectedExamName =
    selectedAccessType === "normal"
      ? restrictedTests.find(
          (test) => test.id === selectedTest
        )?.title
      : paidHtmlTests.find(
          (test) =>
            test.id === selectedHtmlTest
        )?.title;

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="brand">
            👥 ADMIN CONTROL CENTER
          </div>

          <h1>
            Student Access & Communication
          </h1>

          <p>
            Manage student access, permissions and
            communication from one place.
          </p>
        </div>

        <a
          href="/admin"
          className="dashboard-link"
        >
          ← Dashboard
        </a>
      </header>

      <div className="container">
        {message && (
          <div className="alert success">
            <div className="alert-icon">
              ✅
            </div>

            <div>
              <strong>Success</strong>
              <div>{message}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert error">
            <div className="alert-icon">
              ⚠️
            </div>

            <div>
              <strong>Error</strong>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* STEP 1 */}

        <section className="step-card">
          <div className="step-number">
            1
          </div>

          <div className="step-content">
            <h2>Select Student</h2>

            <p className="muted">
              Search by name, Student ID / Roll
              Number or email.
            </p>

            <div className="search-wrap">
              <span>🔎</span>

              <input
                type="text"
                value={search}
                onFocus={() =>
                  setShowStudentList(true)
                }
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setShowStudentList(true);
                }}
                placeholder="Search student..."
              />
            </div>

            {showStudentList && (
              <div className="student-results">
                {loadingStudents ? (
                  <div className="empty">
                    Loading students...
                  </div>
                ) : filteredStudents.length ===
                  0 ? (
                  <div className="empty">
                    No students found.
                  </div>
                ) : (
                  filteredStudents.map(
                    (student) => (
                      <button
                        key={student.id}
                        type="button"
                        className="student-result"
                        onClick={() =>
                          handleStudentSelect(
                            student
                          )
                        }
                      >
                        <div className="student-result-avatar">
                          {(
                            student.full_name ||
                            student.email ||
                            "S"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {student.full_name ||
                              "Unnamed student"}
                          </strong>

                          <span>
                            {student.student_id ||
                              "No Student ID"}
                          </span>

                          <span>
                            {student.email ||
                              "No email"}
                          </span>
                        </div>
                      </button>
                    )
                  )
                )}
              </div>
            )}

            {selectedStudent && (
              <div className="selected-student">
                <div className="selected-label">
                  <span>👤</span>
                  SELECTED STUDENT
                </div>

                <div className="selected-row">
                  <div className="selected-avatar">
                    {(
                      selectedStudent.full_name ||
                      selectedStudent.email ||
                      "S"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="selected-main">
                    <strong>
                      {selectedStudent.full_name ||
                        "Unnamed student"}
                    </strong>

                    <span>
                      {selectedStudent.email ||
                        "No email"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="change-button"
                    onClick={() => {
                      setSelectedStudent(
                        null
                      );
                      setSearch("");
                      setTestAccess([]);
                      setHtmlTestAccess([]);
                      setMessage("");
                      setError("");
                    }}
                  >
                    Change
                  </button>
                </div>

                <div className="student-info-grid">
                  <div>
                    <span>
                      🆔 Student ID
                    </span>

                    <strong>
                      {selectedStudent.student_id ||
                        "Not assigned"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      📚 Exam Category
                    </span>

                    <strong>
                      {selectedStudent.exam_category ||
                        "Not assigned"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      📅 Overall Access Expiry
                    </span>

                    <strong>
                      {selectedStudent.access_expiry_date
                        ? formatDateTime(
                            selectedStudent.access_expiry_date
                          )
                        : "No expiry set"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      🔐 Account Status
                    </span>

                    <strong className="account-active">
                      Active
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 2 */}

        <section className="step-card">
          <div className="step-number">
            2
          </div>

          <div className="step-content">
            <h2>
              Current Test Access
            </h2>

            <p className="muted">
              Review, extend or end this
              student's test access.
            </p>

            {!selectedStudent ? (
              <div className="empty-panel">
                Select a student above to view
                current test access.
              </div>
            ) : loadingAccess ? (
              <div className="empty-panel">
                Loading current access...
              </div>
            ) : (
              <div className="access-sections">
                <div className="access-section">
                  <h3>
                    📝 Restricted Tests
                  </h3>

                  {testAccess.length ===
                  0 ? (
                    <div className="empty-panel small">
                      No restricted-test access
                      records found.
                    </div>
                  ) : (
                    <div className="access-list">
                      {testAccess.map(
                        (access) => {
                          const status =
                            getAccessStatus(
                              access
                            );

                          return (
                            <div
                              key={
                                access.access_id
                              }
                              className="access-card"
                            >
                              <div className="access-card-main">
                                <strong>
                                  {
                                    access.test_title
                                  }
                                </strong>

                                <div className="access-dates">
                                  <span>
                                    Start:{" "}
                                    {formatDateTime(
                                      access.start_at
                                    )}
                                  </span>

                                  <span>
                                    End:{" "}
                                    {formatDateTime(
                                      access.end_at
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="access-card-actions">
                                <span
                                  className={`status ${getStatusClass(
                                    status
                                  )}`}
                                >
                                  {status}
                                </span>

                                <button
                                  type="button"
                                  className="edit-button"
                                  onClick={() =>
                                    startEditNormalAccess(
                                      access
                                    )
                                  }
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  type="button"
                                  className="end-button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleEndNormalAccess(
                                      access
                                    )
                                  }
                                >
                                  ❌ End
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                <div className="access-section">
                  <h3>
                    🌐 Paid HTML Tests
                  </h3>

                  {htmlTestAccess.length ===
                  0 ? (
                    <div className="empty-panel small">
                      No paid HTML-test access
                      records found.
                    </div>
                  ) : (
                    <div className="access-list">
                      {htmlTestAccess.map(
                        (access) => {
                          const status =
                            getAccessStatus(
                              access
                            );

                          return (
                            <div
                              key={
                                access.access_id
                              }
                              className="access-card"
                            >
                              <div className="access-card-main">
                                <strong>
                                  {
                                    access.test_title
                                  }
                                </strong>

                                <div className="access-dates">
                                  <span>
                                    Start:{" "}
                                    {formatDateTime(
                                      access.start_at
                                    )}
                                  </span>

                                  <span>
                                    End:{" "}
                                    {formatDateTime(
                                      access.end_at
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="access-card-actions">
                                <span
                                  className={`status ${getStatusClass(
                                    status
                                  )}`}
                                >
                                  {status}
                                </span>

                                <button
                                  type="button"
                                  className="edit-button"
                                  onClick={() =>
                                    startEditHtmlAccess(
                                      access
                                    )
                                  }
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  type="button"
                                  className="end-button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleEndHtmlAccess(
                                      access
                                    )
                                  }
                                >
                                  ❌ End
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 3 */}

        <section className="step-card">
          <div className="step-number">
            3
          </div>

          <div className="step-content">
            <h2>Give Test Access</h2>

            <p className="muted">
              Choose what this student should
              be able to access.
            </p>

            <form
              onSubmit={handleGrantAccess}
            >
              <div className="access-type-grid">
                <button
                  type="button"
                  className={`access-type ${
                    selectedAccessType ===
                    "normal"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleAccessTypeChange(
                      "normal"
                    )
                  }
                >
                  <span>📝</span>
                  <strong>
                    Normal Test
                  </strong>
                  <small>
                    Restricted mock test
                  </small>
                </button>

                <button
                  type="button"
                  className={`access-type ${
                    selectedAccessType ===
                    "html"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleAccessTypeChange(
                      "html"
                    )
                  }
                >
                  <span>🌐</span>
                  <strong>
                    Paid HTML Test
                  </strong>
                  <small>
                    Interactive HTML test
                  </small>
                </button>
              </div>

              {selectedAccessType ===
                "normal" && (
                <div className="form-grid">
                  <div className="field">
                    <label>
                      Restricted Test
                    </label>

                    <select
                      value={
                        selectedTest
                      }
                      onChange={(event) =>
                        setSelectedTest(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        loadingTests ||
                        restrictedTests.length ===
                          0
                      }
                    >
                      <option value="">
                        {loadingTests
                          ? "Loading restricted tests..."
                          : restrictedTests.length ===
                            0
                          ? "No active restricted tests"
                          : "Select a restricted test"}
                      </option>

                      {restrictedTests.map(
                        (test) => (
                          <option
                            key={test.id}
                            value={test.id}
                          >
                            {test.title}
                          </option>
                        )
                      )}
                    </select>

                    {restrictedTests.length ===
                      0 &&
                      !loadingTests && (
                        <div className="field-help error-help">
                          ⚠️{" "}
                          {testLoadError ||
                            "No active restricted tests are available."}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {selectedAccessType ===
                "html" && (
                <div className="form-grid">
                  <div className="field">
                    <label>
                      Paid HTML Test
                    </label>

                    <select
                      value={
                        selectedHtmlTest
                      }
                      onChange={(event) =>
                        setSelectedHtmlTest(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        loadingTests ||
                        paidHtmlTests.length ===
                          0
                      }
                    >
                      <option value="">
                        {loadingTests
                          ? "Loading paid HTML tests..."
                          : paidHtmlTests.length ===
                            0
                          ? "No paid HTML tests"
                          : "Select a paid HTML test"}
                      </option>

                      {paidHtmlTests.map(
                        (test) => (
                          <option
                            key={test.id}
                            value={test.id}
                          >
                            {test.title}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-grid dates-grid">
                <div className="field">
                  <label>
                    Access Start
                  </label>

                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) =>
                      setStartAt(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    Access End
                  </label>

                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) =>
                      setEndAt(
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              {editingAccess && (
                <div className="editing-banner">
                  ✏️ Editing access for{" "}
                  <strong>
                    {
                      editingAccess.test_title
                    }
                  </strong>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccess(
                        null
                      );
                      setStartAt("");
                      setEndAt("");
                      setSelectedTest("");
                      setSelectedHtmlTest("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {selectedExamName && (
                <div className="selected-exam-preview">
                  <span>
                    Selected exam:
                  </span>

                  <strong>
                    {selectedExamName}
                  </strong>
                </div>
              )}

              <button
                type="submit"
                className="grant-button"
                disabled={
                  saving ||
                  !selectedStudent ||
                  (selectedAccessType ===
                    "normal" &&
                    (!selectedTest ||
                      restrictedTests.length ===
                        0)) ||
                  (selectedAccessType ===
                    "html" &&
                    (!selectedHtmlTest ||
                      paidHtmlTests.length ===
                        0))
                }
              >
                {saving
                  ? "Saving..."
                  : editingAccess
                  ? "✓ Update Access"
                  : "✓ Grant Access"}
              </button>
            </form>
          </div>
        </section>

        {/* BULK ACCESS */}

        <section className="bulk-card">
          <button
            type="button"
            className="bulk-header"
            onClick={() =>
              setShowBulkAccess(
                (current) => !current
              )
            }
          >
            <div>
              <div className="bulk-title">
                👥 Bulk Exam Access
              </div>

              <div className="bulk-subtitle">
                Give the same restricted exam
                access to multiple students at
                once.
              </div>
            </div>

            <span className="bulk-toggle">
              {showBulkAccess
                ? "▲"
                : "▼"}
            </span>
          </button>

          {showBulkAccess && (
            <div className="bulk-body">
              <div className="bulk-info">
                Select students, choose a
                restricted exam and set the
                access period.
              </div>

              <div className="bulk-grid">
                <div className="bulk-students">
                  <div className="bulk-section-title">
                    Students
                  </div>

                  <input
                    className="bulk-search"
                    type="text"
                    value={bulkSearch}
                    onChange={(event) =>
                      setBulkSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search students..."
                  />

                  <div className="bulk-actions">
                    <button
                      type="button"
                      onClick={
                        selectAllBulkStudents
                      }
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearBulkStudents
                      }
                    >
                      Clear
                    </button>
                  </div>

                  <div className="selected-count">
                    {
                      bulkSelectedStudents.length
                    }{" "}
                    student(s) selected
                  </div>

                  <div className="bulk-student-list">
                    {loadingStudents ? (
                      <div className="empty">
                        Loading students...
                      </div>
                    ) : filteredBulkStudents.length ===
                      0 ? (
                      <div className="empty">
                        No students found.
                      </div>
                    ) : (
                      filteredBulkStudents.map(
                        (student) => {
                          const checked =
                            bulkSelectedStudents.includes(
                              student.id
                            );

                          return (
                            <label
                              key={
                                student.id
                              }
                              className={`bulk-student ${
                                checked
                                  ? "checked"
                                  : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  toggleBulkStudent(
                                    student.id
                                  )
                                }
                              />

                              <span className="bulk-student-name">
                                <strong>
                                  {student.full_name ||
                                    "Unnamed student"}
                                </strong>

                                <small>
                                  {student.student_id ||
                                    "No ID"}{" "}
                                  •{" "}
                                  {student.email ||
                                    "No email"}
                                </small>
                              </span>
                            </label>
                          );
                        }
                      )
                    )}
                  </div>
                </div>

                <div className="bulk-settings">
                  <div className="bulk-section-title">
                    Access Settings
                  </div>

                  <div className="field">
                    <label>
                      Restricted Test
                    </label>

                    <select
                      value={bulkTest}
                      onChange={(event) =>
                        setBulkTest(
                          event.target.value
                        )
                      }
                      disabled={
                        loadingTests ||
                        restrictedTests.length ===
                          0
                      }
                    >
                      <option value="">
                        {loadingTests
                          ? "Loading restricted tests..."
                          : restrictedTests.length ===
                            0
                          ? "No active restricted tests"
                          : "Select a restricted test"}
                      </option>

                      {restrictedTests.map(
                        (test) => (
                          <option
                            key={test.id}
                            value={test.id}
                          >
                            {test.title}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {restrictedTests.length ===
                    0 &&
                    !loadingTests && (
                      <div className="bulk-warning">
                        ⚠️ No active restricted tests
                        are available yet. This
                        section is ready, but the
                        exam must be created later.
                      </div>
                    )}

                  <div className="field">
                    <label>
                      Access Start
                    </label>

                    <input
                      type="datetime-local"
                      value={bulkStartAt}
                      onChange={(event) =>
                        setBulkStartAt(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      Access End
                    </label>

                    <input
                      type="datetime-local"
                      value={bulkEndAt}
                      onChange={(event) =>
                        setBulkEndAt(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="bulk-grant-button"
                    disabled={
                      bulkSaving ||
                      restrictedTests.length ===
                        0 ||
                      !bulkTest ||
                      bulkSelectedStudents.length ===
                        0
                    }
                    onClick={
                      handleBulkGrantAccess
                    }
                  >
                    {bulkSaving
                      ? "Applying Access..."
                      : `✓ Grant Access to ${
                          bulkSelectedStudents.length
                        } Student${
                          bulkSelectedStudents.length ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="communication-card">
          <div className="communication-icon">
            📢
          </div>

          <div>
            <h2>
              Student Access &
              Communication
            </h2>

            <p>
              Access management is now active.
              Bulk student actions are now
              available. Exam-category controls,
              announcements and student
              notifications can be added next.
            </p>
          </div>
        </section>
      </div>

      <footer>
        Mock Test Odisha • Student Access &
        Communication
      </footer>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f4f7fb;
          color: #172033;
        }

        .topbar {
          padding: 28px 20px;
          background: linear-gradient(
            135deg,
            #0f766e,
            #115e59
          );
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .brand {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .topbar h1 {
          margin: 0;
          font-size: 28px;
        }

        .topbar p {
          margin: 7px 0 0;
          opacity: 0.88;
        }

        .dashboard-link {
          color: white;
          text-decoration: none;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.35
          );
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 700;
          white-space: nowrap;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 22px 16px 40px;
        }

        .alert {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-size: 14px;
        }

        .alert.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert.error {
          background: #fff7ed;
          color: #9a3412;
          border: 1px solid #fed7aa;
        }

        .alert strong {
          display: block;
          margin-bottom: 3px;
        }

        .alert-icon {
          font-size: 18px;
        }

        .step-card {
          position: relative;
          display: flex;
          gap: 18px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 18px;
          box-shadow: 0 5px 20px
            rgba(15, 23, 42, 0.04);
        }

        .step-number {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 50%;
          background: #0f766e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .step-content {
          flex: 1;
          min-width: 0;
        }

        .step-content h2 {
          margin: 0;
          font-size: 21px;
        }

        .muted {
          margin: 6px 0 18px;
          color: #64748b;
          font-size: 14px;
        }

        .search-wrap {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0 13px;
          background: white;
        }

        .search-wrap input {
          width: 100%;
          border: 0;
          outline: 0;
          padding: 13px 0;
          font-size: 15px;
        }

        .student-results {
          margin-top: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: white;
          box-shadow: 0 10px 30px
            rgba(15, 23, 42, 0.08);
          max-height: 300px;
          overflow-y: auto;
        }

        .student-result {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #eef2f7;
          background: white;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          cursor: pointer;
        }

        .student-result:hover {
          background: #f8fafc;
        }

        .student-result-avatar,
        .selected-avatar {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 50%;
          background: #d1fae5;
          color: #047857;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .student-result strong,
        .student-result span {
          display: block;
        }

        .student-result strong {
          color: #172033;
        }

        .student-result span {
          color: #64748b;
          font-size: 13px;
          margin-top: 2px;
        }

        .empty {
          padding: 18px;
          text-align: center;
          color: #64748b;
        }

        .selected-student {
          margin-top: 18px;
          border: 1px solid #bbf7d0;
          border-radius: 16px;
          padding: 17px;
          background: #f0fdf4;
        }

        .selected-label {
          font-size: 11px;
          font-weight: 900;
          color: #047857;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }

        .selected-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-main {
          flex: 1;
        }

        .selected-main strong,
        .selected-main span {
          display: block;
        }

        .selected-main span {
          color: #64748b;
          font-size: 13px;
          margin-top: 2px;
        }

        .change-button {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 9px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 10px;
          margin-top: 17px;
        }

        .student-info-grid > div {
          background: white;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid #dcfce7;
        }

        .student-info-grid span,
        .student-info-grid strong {
          display: block;
        }

        .student-info-grid span {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .student-info-grid strong {
          font-size: 13px;
        }

        .account-active {
          color: #047857;
        }

        .access-section + .access-section {
          margin-top: 22px;
        }

        .access-section h3 {
          margin: 0 0 10px;
          font-size: 16px;
        }

        .empty-panel {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 18px;
          color: #64748b;
          background: #f8fafc;
          text-align: center;
        }

        .empty-panel.small {
          text-align: left;
          padding: 14px;
          font-size: 14px;
        }

        .access-list {
          display: grid;
          gap: 10px;
        }

        .access-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: center;
        }

        .access-card-main {
          min-width: 0;
        }

        .access-card-main strong {
          display: block;
          margin-bottom: 6px;
        }

        .access-dates {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: #64748b;
          font-size: 12px;
        }

        .access-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .status {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .status-active {
          background: #dcfce7;
          color: #166534;
        }

        .status-scheduled {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-expired,
        .status-ended {
          background: #f1f5f9;
          color: #64748b;
        }

        .edit-button,
        .end-button {
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
        }

        .edit-button {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .end-button {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }

        .end-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .access-type-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-bottom: 18px;
        }

        .access-type {
          text-align: left;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          background: white;
          padding: 15px;
          cursor: pointer;
        }

        .access-type.selected {
          border-color: #0f766e;
          background: #f0fdfa;
          box-shadow: 0 0 0 2px
            rgba(15, 118, 110, 0.08);
        }

        .access-type span {
          font-size: 21px;
          display: block;
          margin-bottom: 5px;
        }

        .access-type strong,
        .access-type small {
          display: block;
        }

        .access-type small {
          color: #64748b;
          margin-top: 3px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .dates-grid {
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
        }

        .field {
          margin-bottom: 14px;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .field select,
        .field input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          padding: 12px;
          font-size: 14px;
          outline: none;
        }

        .field select:focus,
        .field input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px
            rgba(15, 118, 110, 0.08);
        }

        .field select:disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
        }

        .field-help {
          margin-top: 7px;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-help {
          color: #b45309;
        }

        .editing-banner {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          padding: 11px 13px;
          border-radius: 10px;
          background: #eff6ff;
          color: #1e40af;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .editing-banner button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: #1d4ed8;
          font-weight: 800;
          cursor: pointer;
        }

        .selected-exam-preview {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          padding: 11px 13px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          margin-bottom: 13px;
        }

        .selected-exam-preview span {
          color: #64748b;
        }

        .grant-button {
          width: 100%;
          border: 0;
          border-radius: 11px;
          padding: 13px 16px;
          background: #0f766e;
          color: white;
          font-weight: 900;
          cursor: pointer;
          font-size: 15px;
        }

        .grant-button:hover {
          background: #115e59;
        }

        .grant-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* BULK */

        .bulk-card {
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          margin-bottom: 18px;
          overflow: hidden;
          box-shadow: 0 5px 20px
            rgba(15, 23, 42, 0.04);
        }

        .bulk-header {
          width: 100%;
          border: 0;
          background: #eff6ff;
          padding: 20px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          cursor: pointer;
        }

        .bulk-title {
          font-size: 19px;
          font-weight: 900;
          color: #1e3a8a;
        }

        .bulk-subtitle {
          margin-top: 4px;
          color: #475569;
          font-size: 13px;
        }

        .bulk-toggle {
          color: #1d4ed8;
          font-size: 16px;
          font-weight: 900;
        }

        .bulk-body {
          padding: 22px;
        }

        .bulk-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          color: #475569;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .bulk-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 20px;
        }

        .bulk-section-title {
          font-size: 15px;
          font-weight: 900;
          margin-bottom: 9px;
        }

        .bulk-search {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 11px 12px;
          outline: none;
          font-size: 14px;
        }

        .bulk-actions {
          display: flex;
          gap: 8px;
          margin: 9px 0;
        }

        .bulk-actions button {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .selected-count {
          color: #0f766e;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .bulk-student-list {
          max-height: 330px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .bulk-student {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border-bottom: 1px solid #eef2f7;
          cursor: pointer;
        }

        .bulk-student:last-child {
          border-bottom: 0;
        }

        .bulk-student.checked {
          background: #f0fdfa;
        }

        .bulk-student input {
          width: 17px;
          height: 17px;
        }

        .bulk-student-name {
          min-width: 0;
        }

        .bulk-student-name strong,
        .bulk-student-name small {
          display: block;
        }

        .bulk-student-name strong {
          font-size: 13px;
        }

        .bulk-student-name small {
          color: #64748b;
          font-size: 11px;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bulk-settings {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          background: #fafcff;
        }

        .bulk-warning {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          border-radius: 10px;
          padding: 10px;
          font-size: 12px;
          line-height: 1.45;
          margin-bottom: 14px;
        }

        .bulk-grant-button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          padding: 13px;
          background: #1d4ed8;
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .bulk-grant-button:hover {
          background: #1e40af;
        }

        .bulk-grant-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .communication-card {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .communication-icon {
          font-size: 26px;
        }

        .communication-card h2 {
          margin: 0;
          font-size: 18px;
        }

        .communication-card p {
          margin: 6px 0 0;
          color: #475569;
          line-height: 1.55;
          font-size: 14px;
        }

        footer {
          text-align: center;
          color: #64748b;
          font-size: 13px;
          padding: 25px 15px 35px;
        }

        @media (max-width: 800px) {
          .topbar {
            flex-direction: column;
          }

          .student-info-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .access-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .access-card-actions {
            justify-content: flex-start;
          }

          .bulk-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .step-card {
            padding: 18px;
            gap: 12px;
          }

          .step-number {
            width: 30px;
            height: 30px;
            min-width: 30px;
          }

          .topbar h1 {
            font-size: 23px;
          }

          .student-info-grid,
          .access-type-grid,
          .dates-grid {
            grid-template-columns: 1fr;
          }

          .selected-row {
            align-items: flex-start;
          }

          .change-button {
            margin-left: auto;
          }

          .bulk-body {
            padding: 15px;
          }
        }
      `}</style>
    </main>
  );
}
