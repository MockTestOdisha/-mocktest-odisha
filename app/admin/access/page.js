"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminAccessPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState("");

  const [normalAccess, setNormalAccess] = useState([]);
  const [htmlAccess, setHtmlAccess] = useState([]);
  const [restrictedTests, setRestrictedTests] = useState([]);
  const [paidHtmlTests, setPaidHtmlTests] = useState([]);

  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedHtmlTestId, setSelectedHtmlTestId] = useState("");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkScope, setBulkScope] = useState("selected");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkExpiry, setBulkExpiry] = useState("");
  const [newStatus, setNewStatus] = useState("active");

  const [activePanel, setActivePanel] = useState("student");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const [
        studentsResult,
        testsResult,
        htmlTestsResult,
      ] = await Promise.all([
        supabase.rpc("admin_get_students_for_access"),

        supabase
          .from("tests")
          .select("id, title, test_type, is_active")
          .eq("test_type", "restricted")
          .eq("is_active", true)
          .order("title"),

        supabase.rpc("admin_get_paid_html_tests"),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      if (testsResult.error) {
        throw testsResult.error;
      }

      if (htmlTestsResult.error) {
        throw htmlTestsResult.error;
      }

      setStudents(studentsResult.data || []);
      setRestrictedTests(testsResult.data || []);
      setPaidHtmlTests(htmlTestsResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load access center.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return students;

    return students.filter((student) => {
      return (
        (student.full_name || "").toLowerCase().includes(q) ||
        (student.student_id || "").toLowerCase().includes(q) ||
        (student.email || "").toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  async function selectStudent(student) {
    setSelectedStudent(student);
    setMessage("");
    setError("");

    setNormalAccess([]);
    setHtmlAccess([]);

    try {
      const [normalResult, htmlResult] = await Promise.all([
        supabase.rpc("admin_get_student_test_access", {
          p_user_id: student.id,
        }),

        supabase.rpc("admin_get_student_html_test_access", {
          p_user_id: student.id,
        }),
      ]);

      if (normalResult.error) {
        throw normalResult.error;
      }

      if (htmlResult.error) {
        throw htmlResult.error;
      }

      setNormalAccess(normalResult.data || []);
      setHtmlAccess(htmlResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load student's exam access.");
    }
  }

  function clearNotice() {
    setMessage("");
    setError("");
  }

  function openPanel(panel) {
    clearNotice();
    setActivePanel(panel);

    setTimeout(() => {
      const element = document.getElementById(
        `access-panel-${panel}`
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 50);
  }

  async function grantNormalAccess() {
    clearNotice();

    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (!selectedTestId) {
      setError("Select an exam.");
      return;
    }

    if (!startAt || !endAt) {
      setError("Enter both start and end date/time.");
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_test_access",
        {
          p_test_id: selectedTestId,
          p_user_id: selectedStudent.id,
          p_start_at: new Date(startAt).toISOString(),
          p_end_at: new Date(endAt).toISOString(),
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Normal exam access saved successfully.");

      await selectStudent(selectedStudent);

      setSelectedTestId("");
      setStartAt("");
      setEndAt("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not save exam access.");
    } finally {
      setSaving(false);
    }
  }

  async function grantHtmlAccess() {
    clearNotice();

    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (!selectedHtmlTestId) {
      setError("Select a paid HTML exam.");
      return;
    }

    if (!startAt || !endAt) {
      setError("Enter both start and end date/time.");
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_html_test_access",
        {
          p_html_test_id: selectedHtmlTestId,
          p_user_id: selectedStudent.id,
          p_start_at: new Date(startAt).toISOString(),
          p_end_at: new Date(endAt).toISOString(),
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Paid HTML exam access saved successfully.");

      await selectStudent(selectedStudent);

      setSelectedHtmlTestId("");
      setStartAt("");
      setEndAt("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not save HTML exam access.");
    } finally {
      setSaving(false);
    }
  }

  async function endNormalAccess(access) {
    if (!selectedStudent) return;

    const ok = window.confirm(
      `End access to "${access.test_title}" for this student?`
    );

    if (!ok) return;

    clearNotice();
    setSaving(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_test_access",
        {
          p_test_id: access.test_id,
          p_user_id: selectedStudent.id,
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Normal exam access ended.");

      await selectStudent(selectedStudent);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not end access.");
    } finally {
      setSaving(false);
    }
  }

  async function endHtmlAccess(access) {
    if (!selectedStudent) return;

    const ok = window.confirm(
      `End access to "${access.test_title}" for this student?`
    );

    if (!ok) return;

    clearNotice();
    setSaving(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_html_test_access",
        {
          p_html_test_id: access.html_test_id,
          p_user_id: selectedStudent.id,
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Paid HTML exam access ended.");

      await selectStudent(selectedStudent);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not end access.");
    } finally {
      setSaving(false);
    }
  }

  function accessStatus(start, end, active) {
    if (!active) return "Ended";

    const now = new Date();

    if (start && now < new Date(start)) {
      return "Scheduled";
    }

    if (end && now > new Date(end)) {
      return "Expired";
    }

    return "Active";
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function studentAccountStatus(student) {
    if (!student) return "—";

    if (student.role !== "student") {
      return student.role || "Unknown";
    }

    if (!student.access_expiry_date) {
      return "Active";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(student.access_expiry_date);

    expiry.setHours(23, 59, 59, 999);

    if (expiry < today) {
      return "Expired";
    }

    return "Active";
  }

  function toggleBulkStudent(id) {
    setBulkStudents((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAllBulk() {
    setBulkStudents(
      filteredStudents.map((student) => student.id)
    );
  }

  function clearBulk() {
    setBulkStudents([]);
  }

  const bulkTargetStudents = useMemo(() => {
    if (bulkScope === "all") {
      return students;
    }

    if (bulkScope === "category") {
      return students.filter(
        (student) =>
          student.paid_exam_category_id === bulkCategory ||
          student.exam_category === bulkCategory
      );
    }

    return students.filter((student) =>
      bulkStudents.includes(student.id)
    );
  }, [
    bulkScope,
    bulkCategory,
    bulkStudents,
    students,
  ]);

  async function updateBulkExpiry() {
    clearNotice();

    if (!bulkTargetStudents.length) {
      setError("No students selected.");
      return;
    }

    if (!bulkExpiry) {
      setError("Choose an expiry date.");
      return;
    }

    setSaving(true);

    try {
      for (const student of bulkTargetStudents) {
        const { error: rpcError } = await supabase
          .from("profiles")
          .update({
            access_expiry_date: bulkExpiry,
          })
          .eq("id", student.id);

        if (rpcError) throw rpcError;
      }

      setMessage(
        `Access expiry updated for ${bulkTargetStudents.length} student(s).`
      );

      await loadPage();

      setBulkExpiry("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update student expiry.");
    } finally {
      setSaving(false);
    }
  }

  async function updateBulkStatus() {
    clearNotice();

    if (!bulkTargetStudents.length) {
      setError("No students selected.");
      return;
    }

    setSaving(true);

    try {
      for (const student of bulkTargetStudents) {
        let expiryDate = student.access_expiry_date;

        if (newStatus === "expired") {
          expiryDate = new Date()
            .toISOString()
            .slice(0, 10);
        }

        const { error: rpcError } = await supabase
          .from("profiles")
          .update({
            access_expiry_date: expiryDate,
          })
          .eq("id", student.id);

        if (rpcError) throw rpcError;
      }

      setMessage(
        `Status operation completed for ${bulkTargetStudents.length} student(s).`
      );

      await loadPage();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update student status.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-card">
          Loading Student Access & Communication...
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Student Access & Communication</h1>

          <p>
            Manage student exam access, expiry dates and
            student controls.
          </p>
        </div>

        <a href="/admin" className="back-button">
          ← Admin Dashboard
        </a>
      </header>

      {message && (
        <div className="notice success">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {/* MAIN CONTROL CENTER */}

      <section className="control-center">
        <div className="control-heading">
          <div>
            <h2>Access Control Center</h2>

            <p>
              Choose what you want to manage.
            </p>
          </div>
        </div>

        <div className="control-grid">
          <button
            className={`control-card blue ${
              activePanel === "student" ? "selected" : ""
            }`}
            onClick={() => openPanel("student")}
          >
            <span className="control-icon">👤</span>

            <div>
              <h3>Student Access</h3>

              <p>
                Select a student and view their current
                exam access.
              </p>
            </div>

            <span className="control-arrow">
              →
            </span>
          </button>

          <button
            className={`control-card green ${
              activePanel === "exam" ? "selected" : ""
            }`}
            onClick={() => openPanel("exam")}
          >
            <span className="control-icon">🎯</span>

            <div>
              <h3>Exam Access</h3>

              <p>
                Give or end restricted and paid HTML exam
                access.
              </p>
            </div>

            <span className="control-arrow">
              →
            </span>
          </button>

          <button
            className={`control-card purple ${
              activePanel === "bulk" ? "selected" : ""
            }`}
            onClick={() => openPanel("bulk")}
          >
            <span className="control-icon">👥</span>

            <div>
              <h3>Bulk Exam Access</h3>

              <p>
                Manage expiry and account operations for
                multiple students.
              </p>
            </div>

            <span className="control-arrow">
              →
            </span>
          </button>

          <button
            className={`control-card orange ${
              activePanel === "expiry" ? "selected" : ""
            }`}
            onClick={() => openPanel("expiry")}
          >
            <span className="control-icon">⏳</span>

            <div>
              <h3>Expiry & Account Status</h3>

              <p>
                Check student account expiry and active or
                expired status.
              </p>
            </div>

            <span className="control-arrow">
              →
            </span>
          </button>

          <button
            className="control-card gray"
            onClick={() => {
              setMessage(
                "Communication tools are not connected yet."
              );
              setError("");
            }}
          >
            <span className="control-icon">📢</span>

            <div>
              <h3>Messages & Communication</h3>

              <p>
                Communication tools will be added after the
                messaging database is connected.
              </p>
            </div>

            <span className="control-badge">
              Coming
            </span>
          </button>

          <button
            className="control-card gray"
            onClick={() => {
              setMessage(
                "Access history is not connected yet."
              );
              setError("");
            }}
          >
            <span className="control-icon">📜</span>

            <div>
              <h3>Access History</h3>

              <p>
                View historical access activity after the
                history system is connected.
              </p>
            </div>

            <span className="control-badge">
              Coming
            </span>
          </button>
        </div>
      </section>

      {/* FIND STUDENT */}

      <section
        id="access-panel-student"
        className="panel"
      >
        <div className="panel-title">
          <div>
            <h2>Find Student</h2>

            <p>
              Search by name, Student ID / Roll Number or
              email.
            </p>
          </div>

          <span className="count-badge">
            {students.length} students
          </span>
        </div>

        <input
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student name, ID or email..."
        />

        <div className="student-list">
          {filteredStudents.length === 0 ? (
            <div className="empty">
              No students found.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                className={`student-row ${
                  selectedStudent?.id === student.id
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  selectStudent(student);
                  openPanel("student");
                }}
              >
                <div>
                  <strong>
                    {student.full_name ||
                      "Unnamed Student"}
                  </strong>

                  <span>
                    {student.student_id ||
                      "No Student ID"}
                  </span>

                  <small>
                    {student.email || "No email"}
                  </small>
                </div>

                <div className="student-meta">
                  <span>
                    {student.exam_category ||
                      "No category"}
                  </span>

                  <span
                    className={
                      studentAccountStatus(student) ===
                      "Expired"
                        ? "status expired"
                        : "status active"
                    }
                  >
                    {studentAccountStatus(student)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedStudent && (
        <>
          {/* STUDENT PROFILE */}

          <section className="profile-card">
            <div>
              <span className="label">
                Student
              </span>

              <h2>
                {selectedStudent.full_name ||
                  "Unnamed Student"}
              </h2>
            </div>

            <div>
              <span className="label">
                Student ID
              </span>

              <strong>
                {selectedStudent.student_id || "—"}
              </strong>
            </div>

            <div>
              <span className="label">
                Email
              </span>

              <strong>
                {selectedStudent.email || "—"}
              </strong>
            </div>

            <div>
              <span className="label">
                Exam Category
              </span>

              <strong>
                {selectedStudent.exam_category || "—"}
              </strong>
            </div>

            <div>
              <span className="label">
                Overall Expiry
              </span>

              <strong>
                {selectedStudent.access_expiry_date ||
                  "No expiry"}
              </strong>
            </div>

            <div>
              <span className="label">
                Account Status
              </span>

              <strong>
                {studentAccountStatus(
                  selectedStudent
                )}
              </strong>
            </div>
          </section>

          {/* QUICK OPTIONS */}

          <section className="quick-options">
            <button
              className={
                activePanel === "student"
                  ? "quick-option active"
                  : "quick-option"
              }
              onClick={() => openPanel("student")}
            >
              👤 Student Access
            </button>

            <button
              className={
                activePanel === "exam"
                  ? "quick-option active"
                  : "quick-option"
              }
              onClick={() => openPanel("exam")}
            >
              🎯 Exam Access
            </button>

            <button
              className={
                activePanel === "bulk"
                  ? "quick-option active"
                  : "quick-option"
              }
              onClick={() => openPanel("bulk")}
            >
              👥 Bulk Access
            </button>

            <button
              className={
                activePanel === "expiry"
                  ? "quick-option active"
                  : "quick-option"
              }
              onClick={() => openPanel("expiry")}
            >
              ⏳ Expiry & Status
            </button>
          </section>

          {/* CURRENT ACCESS */}

          {activePanel === "student" && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Current Student Access</h2>

                  <p>
                    All active and previous exam access for
                    this student.
                  </p>
                </div>
              </div>

              <div className="access-summary">
                <div className="summary-card">
                  <strong>
                    {normalAccess.length}
                  </strong>

                  <span>
                    Normal Exam Access
                  </span>
                </div>

                <div className="summary-card">
                  <strong>
                    {htmlAccess.length}
                  </strong>

                  <span>
                    Paid HTML Access
                  </span>
                </div>
              </div>

              <div className="access-section">
                <h3>
                  Normal Restricted Exams
                </h3>

                <div className="access-list">
                  {normalAccess.length === 0 ? (
                    <div className="empty">
                      No normal restricted exam access
                      assigned.
                    </div>
                  ) : (
                    normalAccess.map((access) => {
                      const status = accessStatus(
                        access.start_at,
                        access.end_at,
                        access.is_active
                      );

                      return (
                        <div
                          className="access-card"
                          key={access.access_id}
                        >
                          <div>
                            <h3>
                              {access.test_title}
                            </h3>

                            <p>
                              Start:{" "}
                              {formatDate(
                                access.start_at
                              )}
                            </p>

                            <p>
                              End:{" "}
                              {formatDate(
                                access.end_at
                              )}
                            </p>
                          </div>

                          <div className="access-actions">
                            <span
                              className={`status ${status.toLowerCase()}`}
                            >
                              {status}
                            </span>

                            {access.is_active && (
                              <button
                                className="danger-button"
                                onClick={() =>
                                  endNormalAccess(
                                    access
                                  )
                                }
                                disabled={saving}
                              >
                                End Access
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="access-section">
                <h3>
                  Paid HTML Exams
                </h3>

                <div className="access-list">
                  {htmlAccess.length === 0 ? (
                    <div className="empty">
                      No paid HTML exam access assigned.
                    </div>
                  ) : (
                    htmlAccess.map((access) => {
                      const status = accessStatus(
                        access.start_at,
                        access.end_at,
                        access.is_active
                      );

                      return (
                        <div
                          className="access-card"
                          key={access.access_id}
                        >
                          <div>
                            <h3>
                              {access.test_title}
                            </h3>

                            <p>
                              Start:{" "}
                              {formatDate(
                                access.start_at
                              )}
                            </p>

                            <p>
                              End:{" "}
                              {formatDate(
                                access.end_at
                              )}
                            </p>
                          </div>

                          <div className="access-actions">
                            <span
                              className={`status ${status.toLowerCase()}`}
                            >
                              {status}
                            </span>

                            {access.is_active && (
                              <button
                                className="danger-button"
                                onClick={() =>
                                  endHtmlAccess(
                                    access
                                  )
                                }
                                disabled={saving}
                              >
                                End Access
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {/* EXAM ACCESS */}

          {activePanel === "exam" && (
            <>
              <section
                id="access-panel-exam"
                className="panel"
              >
                <div className="panel-title">
                  <div>
                    <h2>
                      Give Normal Exam Access
                    </h2>

                    <p>
                      Assign or update access for a
                      restricted normal exam.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label>
                      Exam
                    </label>

                    <select
                      value={selectedTestId}
                      onChange={(e) =>
                        setSelectedTestId(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select restricted exam
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

                  <div className="field">
                    <label>
                      Start
                    </label>

                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) =>
                        setStartAt(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      End
                    </label>

                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) =>
                        setEndAt(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  className="primary-button"
                  onClick={grantNormalAccess}
                  disabled={
                    saving || !selectedStudent
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Give / Update Access"}
                </button>
              </section>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      Give Paid HTML Exam Access
                    </h2>

                    <p>
                      Assign or update access for a
                      paid HTML exam.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label>
                      Paid HTML Exam
                    </label>

                    <select
                      value={
                        selectedHtmlTestId
                      }
                      onChange={(e) =>
                        setSelectedHtmlTestId(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select paid HTML exam
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

                  <div className="field">
                    <label>
                      Start
                    </label>

                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) =>
                        setStartAt(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      End
                    </label>

                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) =>
                        setEndAt(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  className="primary-button"
                  onClick={grantHtmlAccess}
                  disabled={
                    saving || !selectedStudent
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Give / Update HTML Access"}
                </button>
              </section>
            </>
          )}

          {/* BULK ACCESS */}

          {activePanel === "bulk" && (
            <section
              id="access-panel-bulk"
              className="panel"
            >
              <div className="panel-title">
                <div>
                  <h2>
                    Bulk Student Access
                  </h2>

                  <p>
                    Update account expiry or status
                    for multiple students.
                  </p>
                </div>
              </div>

              <div className="bulk-selection">
                <div className="field">
                  <label>
                    Target Students
                  </label>

                  <select
                    value={bulkScope}
                    onChange={(e) =>
                      setBulkScope(
                        e.target.value
                      )
                    }
                  >
                    <option value="selected">
                      Selected students
                    </option>

                    <option value="category">
                      Exam category
                    </option>

                    <option value="all">
                      All students
                    </option>
                  </select>
                </div>

                {bulkScope === "category" && (
                  <div className="field">
                    <label>
                      Exam Category
                    </label>

                    <select
                      value={bulkCategory}
                      onChange={(e) =>
                        setBulkCategory(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select category
                      </option>

                      {[
                        ...new Map(
                          students
                            .filter(
                              (student) =>
                                student.exam_category
                            )
                            .map(
                              (student) => [
                                student.exam_category,
                                student.exam_category,
                              ]
                            )
                        ).values(),
                      ].map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="bulk-actions">
                <button
                  className="secondary-button"
                  onClick={selectAllBulk}
                >
                  Select All Visible
                </button>

                <button
                  className="secondary-button"
                  onClick={clearBulk}
                >
                  Clear Selection
                </button>
              </div>

              <div className="bulk-count">
                {bulkTargetStudents.length} student(s)
                targeted
              </div>

              <div className="bulk-student-list">
                {filteredStudents.map(
                  (student) => (
                    <label
                      className="bulk-student"
                      key={student.id}
                    >
                      <input
                        type="checkbox"
                        checked={bulkStudents.includes(
                          student.id
                        )}
                        onChange={() =>
                          toggleBulkStudent(
                            student.id
                          )
                        }
                      />

                      <span>
                        <strong>
                          {student.full_name ||
                            "Unnamed"}
                        </strong>

                        <small>
                          {student.student_id ||
                            "No ID"}{" "}
                          •{" "}
                          {student.exam_category ||
                            "No category"}
                        </small>
                      </span>
                    </label>
                  )
                )}
              </div>

              <div className="bulk-divider" />

              <div className="future-panel">
                <div className="field">
                  <label>
                    Access Expiry Date
                  </label>

                  <input
                    type="date"
                    value={bulkExpiry}
                    onChange={(e) =>
                      setBulkExpiry(
                        e.target.value
                      )
                    }
                  />
                </div>

                <button
                  className="primary-button"
                  onClick={updateBulkExpiry}
                  disabled={saving}
                >
                  Update Expiry
                </button>
              </div>

              <div className="bulk-divider" />

              <div className="future-panel">
                <div className="field">
                  <label>
                    Status
                  </label>

                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(
                        e.target.value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="suspended">
                      Suspended
                    </option>

                    <option value="expired">
                      Expired
                    </option>
                  </select>
                </div>

                <button
                  className="primary-button"
                  onClick={updateBulkStatus}
                  disabled={saving}
                >
                  Update Status
                </button>
              </div>
            </section>
          )}

          {/* EXPIRY & STATUS */}

          {activePanel === "expiry" && (
            <section
              id="access-panel-expiry"
              className="panel"
            >
              <div className="panel-title">
                <div>
                  <h2>
                    Expiry & Account Status
                  </h2>

                  <p>
                    Manage this student's overall
                    account expiry.
                  </p>
                </div>
              </div>

              <div className="expiry-card">
                <div>
                  <span className="label">
                    Student
                  </span>

                  <strong>
                    {selectedStudent.full_name ||
                      "Unnamed Student"}
                  </strong>
                </div>

                <div>
                  <span className="label">
                    Current Expiry
                  </span>

                  <strong>
                    {selectedStudent.access_expiry_date ||
                      "No expiry"}
                  </strong>
                </div>

                <div>
                  <span className="label">
                    Current Status
                  </span>

                  <span
                    className={
                      studentAccountStatus(
                        selectedStudent
                      ) === "Expired"
                        ? "status expired"
                        : "status active"
                    }
                  >
                    {studentAccountStatus(
                      selectedStudent
                    )}
                  </span>
                </div>
              </div>

              <div className="expiry-note">
                <strong>
                  Account expiry
                </strong>

                <p>
                  The current system uses
                  <code>
                    profiles.access_expiry_date
                  </code>{" "}
                  for the student's overall account
                  expiry.
                </p>
              </div>

              <div className="field expiry-input">
                <label>
                  New Expiry Date
                </label>

                <input
                  type="date"
                  value={bulkExpiry}
                  onChange={(e) =>
                    setBulkExpiry(
                      e.target.value
                    )
                  }
                />
              </div>

              <button
                className="primary-button"
                disabled={
                  saving || !bulkExpiry
                }
                onClick={async () => {
                  clearNotice();
                  setSaving(true);

                  try {
                    const { error: updateError } =
                      await supabase
                        .from("profiles")
                        .update({
                          access_expiry_date:
                            bulkExpiry,
                        })
                        .eq(
                          "id",
                          selectedStudent.id
                        );

                    if (updateError) {
                      throw updateError;
                    }

                    setMessage(
                      "Student account expiry updated successfully."
                    );

                    setBulkExpiry("");

                    await loadPage();

                    const refreshedStudent =
                      students.find(
                        (student) =>
                          student.id ===
                          selectedStudent.id
                      );

                    if (refreshedStudent) {
                      await selectStudent(
                        refreshedStudent
                      );
                    }
                  } catch (err) {
                    console.error(err);

                    setError(
                      err.message ||
                        "Could not update account expiry."
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving
                  ? "Saving..."
                  : "Update Account Expiry"}
              </button>
            </section>
          )}
        </>
      )}

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .page {
    min-height: 100vh;
    background: #f5f7fb;
    padding: 24px;
    color: #172033;
  }

  .topbar {
    max-width: 1200px;
    margin: 0 auto 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  h1 {
    margin: 0 0 6px;
    font-size: 28px;
  }

  h2 {
    margin: 0 0 5px;
    font-size: 21px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 17px;
  }

  p {
    margin: 4px 0;
    color: #667085;
  }

  .back-button {
    text-decoration: none;
    padding: 10px 15px;
    border-radius: 10px;
    background: #172033;
    color: white;
    font-weight: 700;
  }

  .notice {
    max-width: 1200px;
    margin: 0 auto 16px;
    padding: 13px 16px;
    border-radius: 12px;
    font-weight: 700;
  }

  .success {
    background: #ecfdf3;
    color: #087443;
    border: 1px solid #a7f3d0;
  }

  .error {
    background: #fef2f2;
    color: #b42318;
    border: 1px solid #fecaca;
  }

  .control-center,
  .panel,
  .profile-card {
    max-width: 1200px;
    margin: 0 auto 20px;
    background: white;
    border: 1px solid #e4e7ec;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 5px 18px rgba(16, 24, 40, 0.05);
  }

  .control-heading {
    margin-bottom: 18px;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 13px;
  }

  .control-card {
    position: relative;
    min-height: 150px;
    border: 1px solid #e4e7ec;
    background: white;
    border-radius: 15px;
    padding: 18px;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    transition: 0.15s ease;
  }

  .control-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
  }

  .control-card.selected {
    border: 2px solid #2563eb;
    background: #f8fbff;
  }

  .control-card.blue {
    border-top: 4px solid #2563eb;
  }

  .control-card.green {
    border-top: 4px solid #16a34a;
  }

  .control-card.purple {
    border-top: 4px solid #7c3aed;
  }

  .control-card.orange {
    border-top: 4px solid #ea580c;
  }

  .control-card.gray {
    border-top: 4px solid #667085;
  }

  .control-icon {
    font-size: 28px;
  }

  .control-card h3 {
    margin: 0 0 5px;
  }

  .control-card p {
    font-size: 13px;
    line-height: 1.45;
  }

  .control-arrow {
    position: absolute;
    right: 17px;
    bottom: 15px;
    font-size: 20px;
    font-weight: 800;
  }

  .control-badge {
    position: absolute;
    right: 13px;
    top: 13px;
    background: #f2f4f7;
    color: #667085;
    padding: 5px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 18px;
  }

  .count-badge,
  .bulk-count {
    background: #eef4ff;
    color: #2454a6;
    border-radius: 999px;
    padding: 7px 12px;
    font-weight: 700;
    font-size: 13px;
  }

  .search {
    width: 100%;
    padding: 13px 14px;
    border: 1px solid #d0d5dd;
    border-radius: 11px;
    font-size: 15px;
    margin-bottom: 14px;
  }

  .student-list {
    display: grid;
    gap: 9px;
  }

  .student-row {
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    border: 1px solid #e4e7ec;
    background: white;
    padding: 14px;
    border-radius: 12px;
    cursor: pointer;
  }

  .student-row:hover,
  .student-row.selected {
    border-color: #2563eb;
    background: #f7faff;
  }

  .student-row strong,
  .student-row span,
  .student-row small {
    display: block;
  }

  .student-row span {
    color: #475467;
    font-size: 13px;
    margin-top: 3px;
  }

  .student-row small {
    color: #98a2b3;
    margin-top: 3px;
  }

  .student-meta {
    text-align: right;
  }

  .status {
    display: inline-block;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 800;
    background: #f2f4f7;
    color: #475467;
  }

  .status.active {
    background: #ecfdf3;
    color: #087443;
  }

  .status.scheduled {
    background: #eff8ff;
    color: #175cd3;
  }

  .status.expired,
  .status.ended {
    background: #fef3f2;
    color: #b42318;
  }

  .profile-card {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
  }

  .profile-card > div {
    min-width: 0;
  }

  .profile-card h2 {
    font-size: 18px;
  }

  .label {
    display: block;
    color: #98a2b3;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .quick-options {
    max-width: 1200px;
    margin: 0 auto 20px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .quick-option {
    border: 1px solid #d0d5dd;
    background: white;
    padding: 12px;
    border-radius: 11px;
    cursor: pointer;
    font-weight: 800;
  }

  .quick-option:hover,
  .quick-option.active {
    background: #172033;
    color: white;
    border-color: #172033;
  }

  .access-summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .summary-card {
    border: 1px solid #e4e7ec;
    background: #f8fafc;
    border-radius: 13px;
    padding: 17px;
  }

  .summary-card strong {
    display: block;
    font-size: 25px;
    margin-bottom: 4px;
  }

  .summary-card span {
    color: #667085;
    font-size: 13px;
  }

  .access-section {
    margin-top: 25px;
  }

  .access-list {
    display: grid;
    gap: 12px;
  }

  .access-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border: 1px solid #e4e7ec;
    border-radius: 13px;
  }

  .access-actions {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .danger-button {
    border: 0;
    background: #b42318;
    color: white;
    padding: 8px 11px;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 700;
  }

  .primary-button {
    border: 0;
    background: #2563eb;
    color: white;
    padding: 11px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 800;
    margin-top: 14px;
  }

  .primary-button:disabled,
  .danger-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .secondary-button {
    border: 1px solid #d0d5dd;
    background: white;
    color: #344054;
    padding: 9px 13px;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 700;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: 13px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-size: 13px;
    font-weight: 800;
    color: #344054;
  }

  .field input,
  .field select {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 10px;
    background: white;
    font-size: 14px;
  }

  .bulk-selection {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
  }

  .bulk-actions {
    display: flex;
    gap: 9px;
    margin: 15px 0;
    flex-wrap: wrap;
  }

  .bulk-student-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 15px;
  }

  .bulk-student {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid #e4e7ec;
    padding: 11px;
    border-radius: 10px;
    cursor: pointer;
  }

  .bulk-student span {
    display: flex;
    flex-direction: column;
  }

  .bulk-student small {
    color: #667085;
    margin-top: 3px;
  }

  .bulk-divider {
    height: 1px;
    background: #eaecf0;
    margin: 22px 0;
  }

  .future-panel {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 18px;
    border: 1px dashed #bfdbfe;
    border-radius: 16px;
    background: #f8fbff;
  }

  .future-panel .field {
    flex: 1;
  }

  .future-panel .primary-button {
    margin-top: 23px;
  }

  .expiry-card {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    padding: 18px;
    border: 1px solid #e4e7ec;
    border-radius: 13px;
    background: #f8fafc;
  }

  .expiry-card > div {
    display: flex;
    flex-direction: column;
  }

  .expiry-note {
    margin-top: 18px;
    padding: 15px;
    border-radius: 12px;
    background: #fff8eb;
    border: 1px solid #fedf89;
  }

  .expiry-note p {
    margin-top: 6px;
  }

  .expiry-note code {
    margin-left: 4px;
    margin-right: 4px;
    font-size: 12px;
  }

  .expiry-input {
    max-width: 400px;
    margin-top: 20px;
  }

  .empty {
    padding: 20px;
    border: 1px dashed #d0d5dd;
    border-radius: 12px;
    text-align: center;
    color: #667085;
  }

  .loading-card {
    max-width: 600px;
    margin: 80px auto;
    background: white;
    padding: 30px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 5px 18px rgba(16, 24, 40, 0.06);
  }

  @media (max-width: 1000px) {
    .control-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .profile-card {
      grid-template-columns: repeat(2, 1fr);
    }

    .quick-options {
      grid-template-columns: repeat(2, 1fr);
    }

    .form-grid,
    .bulk-selection {
      grid-template-columns: 1fr;
    }

    .bulk-student-list {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 650px) {
    .page {
      padding: 12px;
    }

    .topbar {
      flex-direction: column;
      align-items: stretch;
    }

    .control-grid {
      grid-template-columns: 1fr;
    }

    .control-card {
      min-height: 125px;
    }

    .quick-options {
      grid-template-columns: 1fr;
    }

    .profile-card {
      grid-template-columns: 1fr;
    }

    .student-row,
    .access-card,
    .future-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .student-meta {
      text-align: left;
    }

    .access-actions {
      justify-content: flex-start;
    }

    .access-summary {
      grid-template-columns: 1fr;
    }

    .expiry-card {
      grid-template-columns: 1fr;
    }

    .panel-title {
      flex-direction: column;
    }

    .count-badge {
      align-self: flex-start;
    }
  }
`;
