"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminAccessPage() {
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
  const [bulkScope, setBulkScope] = useState("all");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkExpiry, setBulkExpiry] = useState("");
  const [newStatus, setNewStatus] = useState("active");

  const [activePanel, setActivePanel] = useState(null);

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
          .select("id,title,test_type,is_active")
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
      setError(err.message || "Failed to load access control data.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return students;
    }

    return students.filter((student) => {
      return (
        String(student.full_name || "")
          .toLowerCase()
          .includes(term) ||
        String(student.student_id || "")
          .toLowerCase()
          .includes(term) ||
        String(student.email || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [students, search]);

  async function selectStudent(student) {
    setSelectedStudent(student);
    setMessage("");
    setError("");

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
      setError(err.message || "Failed to load student access.");
      setNormalAccess([]);
      setHtmlAccess([]);
    }
  }

  function openPanel(panel) {
    setMessage("");
    setError("");

    setActivePanel((current) => {
      if (current === panel) {
        return null;
      }

      return panel;
    });
  }

  async function grantNormalAccess() {
    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (!selectedTestId) {
      setError("Select a restricted test.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_test_access",
        {
          p_user_id: selectedStudent.id,
          p_test_id: selectedTestId,
          p_start_at: startAt || null,
          p_end_at: endAt || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Normal test access granted.");

      await selectStudent(selectedStudent);

      setSelectedTestId("");
      setStartAt("");
      setEndAt("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to grant normal test access.");
    } finally {
      setSaving(false);
    }
  }

  async function grantHtmlAccess() {
    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (!selectedHtmlTestId) {
      setError("Select a paid HTML test.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_html_test_access",
        {
          p_user_id: selectedStudent.id,
          p_html_test_id: selectedHtmlTestId,
          p_start_at: startAt || null,
          p_end_at: endAt || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Paid HTML test access granted.");

      await selectStudent(selectedStudent);

      setSelectedHtmlTestId("");
      setStartAt("");
      setEndAt("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to grant HTML test access.");
    } finally {
      setSaving(false);
    }
  }

  async function endNormalAccess(accessId) {
    if (!confirm("End this normal test access?")) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_test_access",
        {
          p_access_id: accessId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Normal test access ended.");

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to end access.");
    } finally {
      setSaving(false);
    }
  }

  async function endHtmlAccess(accessId) {
    if (!confirm("End this paid HTML test access?")) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_html_test_access",
        {
          p_access_id: accessId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Paid HTML test access ended.");

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to end HTML access.");
    } finally {
      setSaving(false);
    }
  }

  function accessStatus(item) {
    if (item.is_active === false) {
      return "Ended";
    }

    if (item.end_at) {
      const end = new Date(item.end_at);

      if (end < new Date()) {
        return "Expired";
      }
    }

    return "Active";
  }

  function formatDate(value) {
    if (!value) {
      return "No expiry";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  function studentAccountStatus(student) {
    if (!student) {
      return "";
    }

    if (student.access_expiry_date) {
      const today = new Date();
      const expiry = new Date(student.access_expiry_date);

      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);

      if (expiry < today) {
        return "Expired";
      }
    }

    return "Active";
  }

  function toggleBulkStudent(studentId) {
    setBulkStudents((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId);
      }

      return [...current, studentId];
    });
  }

  function selectAllBulkStudents() {
    if (bulkStudents.length === filteredStudents.length) {
      setBulkStudents([]);
    } else {
      setBulkStudents(filteredStudents.map((student) => student.id));
    }
  }

  const bulkTargetStudents = useMemo(() => {
    if (bulkScope === "selected") {
      return students.filter((student) =>
        bulkStudents.includes(student.id)
      );
    }

    if (bulkScope === "category") {
      return students.filter(
        (student) =>
          String(student.paid_exam_category_id || "") ===
          String(bulkCategory || "")
      );
    }

    return students;
  }, [students, bulkScope, bulkStudents, bulkCategory]);

  async function updateBulkExpiry() {
    if (!bulkTargetStudents.length) {
      setError("No students selected.");
      return;
    }

    if (!bulkExpiry) {
      setError("Select an expiry date.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const ids = bulkTargetStudents.map((student) => student.id);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          access_expiry_date: bulkExpiry,
        })
        .in("id", ids);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        `Expiry date updated for ${ids.length} student(s).`
      );

      await loadPage();

      if (selectedStudent) {
        const updatedStudent = students.find(
          (student) => student.id === selectedStudent.id
        );

        if (updatedStudent) {
          await selectStudent(updatedStudent);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update expiry dates.");
    } finally {
      setSaving(false);
    }
  }

  async function updateBulkStatus() {
    if (!bulkTargetStudents.length) {
      setError("No students selected.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const ids = bulkTargetStudents.map((student) => student.id);

      let updateData = {};

      if (newStatus === "expired") {
        const today = new Date().toISOString().slice(0, 10);

        updateData = {
          access_expiry_date: today,
        };
      }

      if (newStatus === "active") {
        updateData = {
          access_expiry_date: null,
        };
      }

      if (newStatus === "suspended") {
        setError(
          "Suspended status is not available because the current profiles table does not have a suspension field."
        );
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .in("id", ids);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        `Account status updated for ${ids.length} student(s).`
      );

      await loadPage();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update student status.");
    } finally {
      setSaving(false);
    }
  }

  async function updateIndividualExpiry() {
    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          access_expiry_date: bulkExpiry || null,
        })
        .eq("id", selectedStudent.id);

      if (updateError) {
        throw updateError;
      }

      setMessage("Student account expiry updated.");

      await loadPage();

      const refreshedStudent = students.find(
        (student) => student.id === selectedStudent.id
      );

      if (refreshedStudent) {
        await selectStudent(refreshedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update account expiry.");
    } finally {
      setSaving(false);
    }
  }

  function PanelCard({
    id,
    icon,
    title,
    description,
    panel,
    children,
  }) {
    const isOpen = activePanel === panel;

    return (
      <div id={id} className="parent-card-wrap">
        <button
          type="button"
          className={`parent-card ${isOpen ? "parent-card-open" : ""}`}
          onClick={() => openPanel(panel)}
        >
          <div className="parent-left">
            <div className="parent-icon">{icon}</div>

            <div className="parent-text">
              <div className="parent-title">{title}</div>
              <div className="parent-description">
                {description}
              </div>
            </div>
          </div>

          <div className={`arrow ${isOpen ? "arrow-open" : ""}`}>
            ▼
          </div>
        </button>

        {isOpen && (
          <div className="child-panel">
            {children}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-card">Loading Access Control Center...</div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            padding: 24px;
            background: #f5f7fb;
          }

          .loading-card {
            max-width: 1100px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="top-header">
          <div>
            <div className="eyebrow">ADMIN CONTROL CENTER</div>

            <h1>Student Access & Communication</h1>

            <p>
              Manage student exam access, expiry dates and
              communication.
            </p>
          </div>

          <a href="/admin" className="dashboard-button">
            ← Admin Dashboard
          </a>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* FIND STUDENT */}

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>Find Student</h2>

              <p>
                Search by name, Student ID / Roll Number or
                email.
              </p>
            </div>

            <div className="student-count">
              {filteredStudents.length} students
            </div>
          </div>

          <input
            className="search-input"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search student..."
          />

          <div className="student-list">
            {filteredStudents.map((student) => {
              const selected =
                selectedStudent?.id === student.id;

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student)}
                  className={`student-row ${
                    selected ? "student-row-selected" : ""
                  }`}
                >
                  <div>
                    <strong>
                      {student.full_name || "Unnamed Student"}
                    </strong>

                    <span>
                      {student.student_id ||
                        "No Student ID"}
                    </span>
                  </div>

                  <div className="student-meta">
                    <span>
                      {student.email || "No email"}
                    </span>

                    <span>
                      {student.paid_exam_category_id
                        ? "Category assigned"
                        : "No category"}
                    </span>

                    <span>
                      {studentAccountStatus(student)}
                    </span>
                  </div>
                </button>
              );
            })}

            {!filteredStudents.length && (
              <div className="empty-box">
                No students found.
              </div>
            )}
          </div>
        </section>

        {/* SELECTED STUDENT */}

        {selectedStudent && (
          <section className="selected-student-card">
            <div>
              <div className="selected-label">
                SELECTED STUDENT
              </div>

              <h2>
                {selectedStudent.full_name ||
                  "Unnamed Student"}
              </h2>

              <div className="selected-details">
                <span>
                  ID:{" "}
                  {selectedStudent.student_id ||
                    "Not assigned"}
                </span>

                <span>
                  Email:{" "}
                  {selectedStudent.email || "No email"}
                </span>

                <span>
                  Account:{" "}
                  {studentAccountStatus(selectedStudent)}
                </span>

                <span>
                  Expiry:{" "}
                  {selectedStudent.access_expiry_date ||
                    "No expiry"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="clear-button"
              onClick={() => {
                setSelectedStudent(null);
                setNormalAccess([]);
                setHtmlAccess([]);
              }}
            >
              Clear
            </button>
          </section>
        )}

        {/* CONTROL CENTER */}

        <section className="control-section">
          <div className="control-heading">
            <div className="eyebrow">
              ACCESS CONTROL CENTER
            </div>

            <h2>Choose an option</h2>

            <p>
              Tap an option to expand its controls directly
              underneath.
            </p>
          </div>

          {/* STUDENT ACCESS */}

          <PanelCard
            id="student-access"
            icon="👤"
            title="Student Access"
            description="View the selected student's current access."
            panel="student"
          >
            {!selectedStudent ? (
              <div className="notice-box">
                Select a student above first.
              </div>
            ) : (
              <div>
                <div className="child-title">
                  Current Student Access
                </div>

                <div className="access-columns">
                  <div className="inner-card">
                    <h3>Restricted Tests</h3>

                    {normalAccess.length === 0 ? (
                      <div className="empty-box">
                        No restricted test access.
                      </div>
                    ) : (
                      <div className="access-list">
                        {normalAccess.map((item) => (
                          <div
                            className="access-item"
                            key={item.id}
                          >
                            <div>
                              <strong>
                                {item.test_title ||
                                  item.title ||
                                  "Restricted Test"}
                              </strong>

                              <div className="small-text">
                                Start:{" "}
                                {formatDate(item.start_at)}
                              </div>

                              <div className="small-text">
                                End:{" "}
                                {formatDate(item.end_at)}
                              </div>
                            </div>

                            <div className="access-actions">
                              <span
                                className={`status-pill ${
                                  accessStatus(item) ===
                                  "Active"
                                    ? "status-active"
                                    : ""
                                }`}
                              >
                                {accessStatus(item)}
                              </span>

                              {item.is_active !== false && (
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() =>
                                    endNormalAccess(item.id)
                                  }
                                  disabled={saving}
                                >
                                  End Access
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="inner-card">
                    <h3>Paid HTML Tests</h3>

                    {htmlAccess.length === 0 ? (
                      <div className="empty-box">
                        No paid HTML test access.
                      </div>
                    ) : (
                      <div className="access-list">
                        {htmlAccess.map((item) => (
                          <div
                            className="access-item"
                            key={item.id}
                          >
                            <div>
                              <strong>
                                {item.html_test_title ||
                                  item.title ||
                                  "Paid HTML Test"}
                              </strong>

                              <div className="small-text">
                                Start:{" "}
                                {formatDate(item.start_at)}
                              </div>

                              <div className="small-text">
                                End:{" "}
                                {formatDate(item.end_at)}
                              </div>
                            </div>

                            <div className="access-actions">
                              <span
                                className={`status-pill ${
                                  accessStatus(item) ===
                                  "Active"
                                    ? "status-active"
                                    : ""
                                }`}
                              >
                                {accessStatus(item)}
                              </span>

                              {item.is_active !== false && (
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() =>
                                    endHtmlAccess(item.id)
                                  }
                                  disabled={saving}
                                >
                                  End Access
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </PanelCard>

          {/* EXAM ACCESS */}

          <PanelCard
            id="exam-access"
            icon="📝"
            title="Exam Access"
            description="Give or manage restricted test and paid HTML test access."
            panel="exam"
          >
            {!selectedStudent ? (
              <div className="notice-box">
                Select a student above first.
              </div>
            ) : (
              <div>
                <div className="child-title">
                  Grant Exam Access
                </div>

                <div className="access-columns">
                  {/* NORMAL TEST */}

                  <div className="inner-card">
                    <h3>Normal Restricted Test</h3>

                    <label>Test</label>

                    <select
                      className="form-input"
                      value={selectedTestId}
                      onChange={(event) =>
                        setSelectedTestId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select restricted test
                      </option>

                      {restrictedTests.map((test) => (
                        <option
                          key={test.id}
                          value={test.id}
                        >
                          {test.title}
                        </option>
                      ))}
                    </select>

                    <label>Start</label>

                    <input
                      type="datetime-local"
                      className="form-input"
                      value={startAt}
                      onChange={(event) =>
                        setStartAt(event.target.value)
                      }
                    />

                    <label>End</label>

                    <input
                      type="datetime-local"
                      className="form-input"
                      value={endAt}
                      onChange={(event) =>
                        setEndAt(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="primary-button"
                      onClick={grantNormalAccess}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : "Give Normal Test Access"}
                    </button>
                  </div>

                  {/* HTML TEST */}

                  <div className="inner-card">
                    <h3>Paid HTML Test</h3>

                    <label>HTML Test</label>

                    <select
                      className="form-input"
                      value={selectedHtmlTestId}
                      onChange={(event) =>
                        setSelectedHtmlTestId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select paid HTML test
                      </option>

                      {paidHtmlTests.map((test) => (
                        <option
                          key={test.id}
                          value={test.id}
                        >
                          {test.title ||
                            test.name ||
                            test.slug}
                        </option>
                      ))}
                    </select>

                    <label>Start</label>

                    <input
                      type="datetime-local"
                      className="form-input"
                      value={startAt}
                      onChange={(event) =>
                        setStartAt(event.target.value)
                      }
                    />

                    <label>End</label>

                    <input
                      type="datetime-local"
                      className="form-input"
                      value={endAt}
                      onChange={(event) =>
                        setEndAt(event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="primary-button"
                      onClick={grantHtmlAccess}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : "Give Paid HTML Test Access"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </PanelCard>

          {/* BULK ACCESS */}

          <PanelCard
            id="bulk-access"
            icon="👥"
            title="Bulk Exam Access"
            description="Apply access or expiry changes to multiple students."
            panel="bulk"
          >
            <div>
              <div className="child-title">
                Bulk Student Controls
              </div>

              <div className="bulk-controls">
                <div className="inner-card">
                  <h3>Choose Students</h3>

                  <select
                    className="form-input"
                    value={bulkScope}
                    onChange={(event) =>
                      setBulkScope(event.target.value)
                    }
                  >
                    <option value="all">
                      All Students
                    </option>

                    <option value="selected">
                      Selected Students
                    </option>

                    <option value="category">
                      By Exam Category
                    </option>
                  </select>

                  {bulkScope === "category" && (
                    <input
                      className="form-input"
                      value={bulkCategory}
                      onChange={(event) =>
                        setBulkCategory(event.target.value)
                      }
                      placeholder="Enter category ID"
                    />
                  )}

                  <div className="bulk-summary">
                    {bulkTargetStudents.length} student(s)
                    selected for bulk action.
                  </div>
                </div>

                <div className="inner-card">
                  <h3>Student Selection</h3>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={selectAllBulkStudents}
                  >
                    {bulkStudents.length ===
                    filteredStudents.length
                      ? "Clear Selection"
                      : "Select All Visible"}
                  </button>

                  <div className="bulk-student-list">
                    {filteredStudents.map((student) => (
                      <label
                        key={student.id}
                        className="checkbox-row"
                      >
                        <input
                          type="checkbox"
                          checked={bulkStudents.includes(
                            student.id
                          )}
                          onChange={() =>
                            toggleBulkStudent(student.id)
                          }
                        />

                        <span>
                          {student.full_name ||
                            "Unnamed Student"}
                        </span>

                        <small>
                          {student.student_id ||
                            "No ID"}
                        </small>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>

          {/* EXPIRY */}

          <PanelCard
            id="expiry-status"
            icon="⏳"
            title="Expiry & Account Status"
            description="Manage student account expiry dates."
            panel="expiry"
          >
            <div>
              <div className="child-title">
                Expiry & Account Status
              </div>

              {!selectedStudent ? (
                <div className="notice-box">
                  Select a student above to manage individual
                  expiry.
                </div>
              ) : (
                <div className="inner-card">
                  <h3>Selected Student Expiry</h3>

                  <div className="current-expiry">
                    Current expiry:{" "}
                    <strong>
                      {selectedStudent.access_expiry_date ||
                        "No expiry"}
                    </strong>
                  </div>

                  <input
                    type="date"
                    className="form-input"
                    value={bulkExpiry}
                    onChange={(event) =>
                      setBulkExpiry(event.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="primary-button"
                    onClick={updateIndividualExpiry}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Update Student Expiry"}
                  </button>
                </div>
              )}

              <div className="bulk-expiry-card">
                <h3>Bulk Expiry Update</h3>

                <p>
                  This applies to the students selected in
                  the Bulk Exam Access section.
                </p>

                <input
                  type="date"
                  className="form-input"
                  value={bulkExpiry}
                  onChange={(event) =>
                    setBulkExpiry(event.target.value)
                  }
                />

                <button
                  type="button"
                  className="primary-button"
                  onClick={updateBulkExpiry}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Update Bulk Expiry"}
                </button>
              </div>

              <div className="bulk-expiry-card">
                <h3>Bulk Account Status</h3>

                <p>
                  Active clears the account expiry. Expired
                  sets today's date. Suspended is not enabled
                  because there is currently no suspension
                  field in the profile schema.
                </p>

                <select
                  className="form-input"
                  value={newStatus}
                  onChange={(event) =>
                    setNewStatus(event.target.value)
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="expired">
                    Expired
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>
                </select>

                <button
                  type="button"
                  className="primary-button"
                  onClick={updateBulkStatus}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Update Account Status"}
                </button>
              </div>
            </div>
          </PanelCard>

          {/* MESSAGES */}

          <PanelCard
            id="messages"
            icon="💬"
            title="Messages & Communication"
            description="Send announcements and student communication."
            panel="messages"
          >
            <div className="coming-card">
              <div className="coming-icon">💬</div>

              <h3>Messages & Communication</h3>

              <p>
                This section is reserved for the upcoming
                student messaging and announcement system.
              </p>

              <span className="coming-badge">
                Coming Next
              </span>
            </div>
          </PanelCard>

          {/* HISTORY */}

          <PanelCard
            id="history"
            icon="📋"
            title="Access History"
            description="Review changes made to student access."
            panel="history"
          >
            <div className="coming-card">
              <div className="coming-icon">📋</div>

              <h3>Access History</h3>

              <p>
                This section is reserved for access history,
                audit records and previous changes.
              </p>

              <span className="coming-badge">
                Coming Next
              </span>
            </div>
          </PanelCard>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 24px;
          color: #172033;
        }

        .container {
          max-width: 1150px;
          margin: 0 auto;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #64748b;
          margin-bottom: 7px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
        }

        .top-header p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .dashboard-button {
          text-decoration: none;
          background: white;
          color: #172033;
          border: 1px solid #dce2ec;
          padding: 11px 16px;
          border-radius: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .success-message,
        .error-message {
          padding: 13px 15px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .success-message {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .error-message {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .section-card,
        .selected-student-card,
        .control-section {
          background: white;
          border-radius: 18px;
          border: 1px solid #e3e8f0;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
          margin-bottom: 20px;
        }

        .section-card {
          padding: 20px;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 16px;
        }

        .section-heading h2,
        .control-heading h2 {
          margin: 0;
          font-size: 21px;
        }

        .section-heading p,
        .control-heading p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .student-count {
          background: #eef2ff;
          color: #4338ca;
          padding: 7px 11px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .search-input,
        .form-input {
          width: 100%;
          border: 1px solid #d8dee8;
          background: white;
          border-radius: 10px;
          padding: 12px 13px;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus,
        .form-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .student-list {
          margin-top: 14px;
          display: grid;
          gap: 8px;
        }

        .student-row {
          width: 100%;
          border: 1px solid #e5e9f0;
          background: #fff;
          border-radius: 12px;
          padding: 13px;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          transition: 0.18s ease;
        }

        .student-row:hover {
          border-color: #a5b4fc;
          background: #fafaff;
        }

        .student-row-selected {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .student-row strong {
          display: block;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .student-row span {
          display: block;
          font-size: 12px;
          color: #64748b;
        }

        .student-meta {
          text-align: right;
          min-width: 170px;
        }

        .student-meta span {
          margin-bottom: 3px;
        }

        .selected-student-card {
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          border-color: #c7d2fe;
          background: #f8faff;
        }

        .selected-label {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.2px;
          color: #6366f1;
          margin-bottom: 5px;
        }

        .selected-student-card h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .selected-details {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .selected-details span {
          background: white;
          border: 1px solid #e1e6ef;
          padding: 5px 8px;
          border-radius: 7px;
          font-size: 12px;
          color: #475569;
        }

        .clear-button {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 9px;
          padding: 9px 13px;
          cursor: pointer;
          font-weight: 700;
        }

        .control-section {
          padding: 20px;
        }

        .control-heading {
          margin-bottom: 17px;
        }

        .parent-card-wrap {
          margin-bottom: 11px;
        }

        .parent-card {
          width: 100%;
          border: 1px solid #dfe5ee;
          background: white;
          border-radius: 15px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          text-align: left;
          transition: 0.18s ease;
        }

        .parent-card:hover {
          border-color: #a5b4fc;
          background: #fafaff;
        }

        .parent-card-open {
          border-color: #6366f1;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          background: #f8faff;
        }

        .parent-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .parent-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          font-size: 21px;
          flex-shrink: 0;
        }

        .parent-title {
          font-size: 16px;
          font-weight: 850;
          margin-bottom: 3px;
          color: #172033;
        }

        .parent-description {
          color: #64748b;
          font-size: 13px;
        }

        .arrow {
          font-size: 13px;
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .arrow-open {
          transform: rotate(180deg);
          color: #4f46e5;
        }

        .child-panel {
          border: 1px solid #6366f1;
          border-top: none;
          border-bottom-left-radius: 15px;
          border-bottom-right-radius: 15px;
          background: #f8faff;
          padding: 18px;
        }

        .child-title {
          font-size: 17px;
          font-weight: 850;
          margin-bottom: 15px;
        }

        .access-columns,
        .bulk-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .inner-card,
        .bulk-expiry-card {
          background: white;
          border: 1px solid #e2e7ef;
          border-radius: 13px;
          padding: 16px;
        }

        .inner-card h3,
        .bulk-expiry-card h3 {
          margin: 0 0 13px;
          font-size: 15px;
        }

        .inner-card label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          margin: 10px 0 5px;
        }

        .primary-button,
        .secondary-button,
        .danger-button {
          border: none;
          border-radius: 9px;
          padding: 10px 13px;
          font-weight: 800;
          cursor: pointer;
          font-size: 13px;
        }

        .primary-button {
          width: 100%;
          margin-top: 13px;
          background: #4f46e5;
          color: white;
        }

        .primary-button:disabled,
        .danger-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .secondary-button {
          background: #eef2ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
        }

        .danger-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .access-list {
          display: grid;
          gap: 9px;
        }

        .access-item {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 11px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .access-item strong {
          font-size: 13px;
        }

        .small-text {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }

        .access-actions {
          display: flex;
          align-items: flex-end;
          flex-direction: column;
          gap: 7px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 20px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .status-active {
          background: #dcfce7;
          color: #15803d;
        }

        .bulk-summary {
          margin-top: 12px;
          background: #f8fafc;
          border-radius: 9px;
          padding: 10px;
          font-size: 12px;
          color: #475569;
          font-weight: 700;
        }

        .bulk-student-list {
          max-height: 280px;
          overflow-y: auto;
          margin-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 2px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }

        .checkbox-row small {
          color: #94a3b8;
          margin-left: auto;
        }

        .current-expiry {
          background: #f8fafc;
          border-radius: 9px;
          padding: 10px;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .bulk-expiry-card {
          margin-top: 14px;
        }

        .bulk-expiry-card p {
          margin: -5px 0 12px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .coming-card {
          text-align: center;
          padding: 30px 20px;
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 13px;
        }

        .coming-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .coming-card h3 {
          margin: 0 0 7px;
        }

        .coming-card p {
          color: #64748b;
          font-size: 13px;
          margin: 0 auto 14px;
          max-width: 500px;
        }

        .coming-badge {
          display: inline-block;
          background: #f1f5f9;
          color: #475569;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .notice-box,
        .empty-box {
          padding: 14px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          color: #64748b;
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .page {
            padding: 13px;
          }

          .top-header {
            align-items: flex-start;
            flex-direction: column;
          }

          h1 {
            font-size: 25px;
          }

          .dashboard-button {
            width: 100%;
            text-align: center;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .student-row {
            flex-direction: column;
          }

          .student-meta {
            text-align: left;
            min-width: 0;
          }

          .selected-student-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .clear-button {
            width: 100%;
          }

          .access-columns,
          .bulk-controls {
            grid-template-columns: 1fr;
          }

          .parent-card {
            padding: 14px;
          }

          .parent-left {
            align-items: flex-start;
          }

          .parent-icon {
            width: 40px;
            height: 40px;
          }

          .parent-description {
            line-height: 1.4;
          }

          .child-panel {
            padding: 12px;
          }

          .access-item {
            flex-direction: column;
          }

          .access-actions {
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}
