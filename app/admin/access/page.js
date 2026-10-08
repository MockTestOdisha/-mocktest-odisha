"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function StudentAccessPage() {
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

  const [accessType, setAccessType] = useState("normal");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // Bulk access
  const [bulkScope, setBulkScope] = useState("all");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkTestId, setBulkTestId] = useState("");
  const [bulkHtmlTestId, setBulkHtmlTestId] = useState("");
  const [bulkAccessType, setBulkAccessType] = useState("normal");
  const [bulkStartAt, setBulkStartAt] = useState("");
  const [bulkEndAt, setBulkEndAt] = useState("");

  // Messages
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageTarget, setMessageTarget] = useState("all");
  const [messageSelected, setMessageSelected] = useState([]);
  const [messageStartAt, setMessageStartAt] = useState("");
  const [messageEndAt, setMessageEndAt] = useState("");

  const [activeSection, setActiveSection] = useState("search");

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
      setError(err.message || "Unable to load Student Access & Communication.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return students;

    return students.filter((student) => {
      return (
        String(student.full_name || "")
          .toLowerCase()
          .includes(value) ||
        String(student.student_id || "")
          .toLowerCase()
          .includes(value) ||
        String(student.email || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [students, search]);

  const selectedBulkStudents = useMemo(() => {
    if (bulkScope === "all") {
      return students;
    }

    if (bulkScope === "category") {
      if (!bulkCategory) return [];

      return students.filter(
        (student) =>
          String(student.paid_exam_category_id || "") ===
          String(bulkCategory)
      );
    }

    return students.filter((student) =>
      bulkSelected.includes(student.id)
    );
  }, [students, bulkScope, bulkCategory, bulkSelected]);

  const selectedMessageStudents = useMemo(() => {
    if (messageTarget === "all") {
      return students;
    }

    return students.filter((student) =>
      messageSelected.includes(student.id)
    );
  }, [students, messageTarget, messageSelected]);

  async function selectStudent(student) {
    setSelectedStudent(student);
    setActiveSection("search");
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
      setError(err.message || "Unable to load student access.");
    }
  }

  function clearSelectedStudent() {
    setSelectedStudent(null);
    setNormalAccess([]);
    setHtmlAccess([]);
  }

  async function grantNormalAccess() {
    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (!selectedTestId) {
      setError("Select a normal mock.");
      return;
    }

    if (!startAt || !endAt) {
      setError("Select both start and end dates.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_test_access",
        {
          p_user_id: selectedStudent.id,
          p_test_id: selectedTestId,
          p_start_at: new Date(startAt).toISOString(),
          p_end_at: new Date(endAt).toISOString(),
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Normal mock access granted successfully.");

      await selectStudent(selectedStudent);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to grant normal mock access.");
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
      setError("Select an HTML mock.");
      return;
    }

    if (!startAt || !endAt) {
      setError("Select both start and end dates.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_grant_html_test_access",
        {
          p_user_id: selectedStudent.id,
          p_html_test_id: selectedHtmlTestId,
          p_start_at: new Date(startAt).toISOString(),
          p_end_at: new Date(endAt).toISOString(),
        }
      );

      if (rpcError) throw rpcError;

      setMessage("HTML mock access granted successfully.");

      await selectStudent(selectedStudent);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to grant HTML mock access.");
    } finally {
      setSaving(false);
    }
  }

  async function endNormalAccess(accessId) {
    if (!confirm("End this normal mock access?")) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_test_access",
        {
          p_access_id: accessId,
        }
      );

      if (rpcError) throw rpcError;

      setMessage("Normal mock access ended.");

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to end access.");
    } finally {
      setSaving(false);
    }
  }

  async function endHtmlAccess(accessId) {
    if (!confirm("End this HTML mock access?")) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_end_html_test_access",
        {
          p_access_id: accessId,
        }
      );

      if (rpcError) throw rpcError;

      setMessage("HTML mock access ended.");

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to end access.");
    } finally {
      setSaving(false);
    }
  }

  async function grantBulkAccess() {
    const targets = selectedBulkStudents;

    if (!targets.length) {
      setError("No students selected.");
      return;
    }

    if (!bulkStartAt || !bulkEndAt) {
      setError("Select both start and end dates.");
      return;
    }

    if (bulkAccessType === "normal" && !bulkTestId) {
      setError("Select a normal mock.");
      return;
    }

    if (bulkAccessType === "html" && !bulkHtmlTestId) {
      setError("Select an HTML mock.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let successCount = 0;
      const failures = [];

      for (const student of targets) {
        try {
          if (bulkAccessType === "normal") {
            const { error: rpcError } = await supabase.rpc(
              "admin_grant_test_access",
              {
                p_user_id: student.id,
                p_test_id: bulkTestId,
                p_start_at: new Date(bulkStartAt).toISOString(),
                p_end_at: new Date(bulkEndAt).toISOString(),
              }
            );

            if (rpcError) throw rpcError;
          } else {
            const { error: rpcError } = await supabase.rpc(
              "admin_grant_html_test_access",
              {
                p_user_id: student.id,
                p_html_test_id: bulkHtmlTestId,
                p_start_at: new Date(bulkStartAt).toISOString(),
                p_end_at: new Date(bulkEndAt).toISOString(),
              }
            );

            if (rpcError) throw rpcError;
          }

          successCount++;
        } catch (studentError) {
          failures.push({
            student: student.full_name || student.student_id || student.id,
            error: studentError.message,
          });
        }
      }

      if (failures.length) {
        setMessage(
          `${successCount} access grants completed. ${failures.length} failed.`
        );
      } else {
        setMessage(
          `Access successfully granted to ${successCount} student${
            successCount === 1 ? "" : "s"
          }.`
        );
      }

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Bulk access operation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function publishMessage() {
    if (!messageTitle.trim()) {
      setError("Enter a message title.");
      return;
    }

    if (!messageBody.trim()) {
      setError("Enter the message.");
      return;
    }

    if (messageTarget !== "all" && !messageSelected.length) {
      setError("Select at least one student.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const recipients =
        messageTarget === "all"
          ? null
          : messageSelected;

      const { error: insertError } = await supabase
        .from("student_messages")
        .insert({
          title: messageTitle.trim(),
          message: messageBody.trim(),
          target_type: messageTarget,
          target_student_ids: recipients,
          starts_at: messageStartAt
            ? new Date(messageStartAt).toISOString()
            : new Date().toISOString(),
          ends_at: messageEndAt
            ? new Date(messageEndAt).toISOString()
            : null,
          is_active: true,
        });

      if (insertError) throw insertError;

      setMessage("Message published successfully.");

      setMessageTitle("");
      setMessageBody("");
      setMessageSelected([]);
      setMessageStartAt("");
      setMessageEndAt("");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Unable to publish message. Make sure the Messages database table has been created."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function accountStatus(student) {
    if (!student) return "—";

    if (student.access_expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiry = new Date(student.access_expiry_date);
      expiry.setHours(0, 0, 0, 0);

      if (expiry < today) return "Expired";
    }

    return student.is_paid ? "Paid / Active" : "Free";
  }

  function accessStatus(start, end, active = true) {
    if (!active) return "Ended";

    const now = Date.now();
    const startTime = start ? new Date(start).getTime() : null;
    const endTime = end ? new Date(end).getTime() : null;

    if (startTime && now < startTime) return "Upcoming";
    if (endTime && now > endTime) return "Expired";

    return "Active";
  }

  function toggleStudent(list, setList, studentId) {
    setList((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <div className="eyebrow">ADMIN CONTROL CENTER</div>
            <h1>Student Access & Communication</h1>
            <p>
              Manage student access, mock tests, bulk permissions and
              communication.
            </p>
          </div>

          <div className="studentCount">
            {students.length} students
          </div>
        </header>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loadingCard">Loading student access...</div>
        ) : (
          <>
            <nav className="sectionNav">
              <button
                className={activeSection === "search" ? "navActive" : ""}
                onClick={() => setActiveSection("search")}
              >
                🔎
                <span>
                  Search & Select Student
                  <small>Individual student control</small>
                </span>
              </button>

              <button
                className={activeSection === "access" ? "navActive" : ""}
                onClick={() => setActiveSection("access")}
              >
                📚
                <span>
                  Test / Mock Access
                  <small>Grant individual access</small>
                </span>
              </button>

              <button
                className={activeSection === "bulk" ? "navActive" : ""}
                onClick={() => setActiveSection("bulk")}
              >
                👥
                <span>
                  Give Access to Everyone
                  <small>Bulk access control</small>
                </span>
              </button>

              <button
                className={activeSection === "messages" ? "navActive" : ""}
                onClick={() => setActiveSection("messages")}
              >
                📢
                <span>
                  Messages
                  <small>Student announcements</small>
                </span>
              </button>
            </nav>

            {activeSection === "search" && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <span className="sectionNumber">01</span>
                    <div>
                      <h2>🔎 Search & Select Student</h2>
                      <p>
                        Search by student name, Student ID or email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="searchBox">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name / Student ID / email..."
                  />
                </div>

                <div className="studentGrid">
                  <div className="studentList">
                    <div className="listHeader">
                      Students
                      <span>{filteredStudents.length}</span>
                    </div>

                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        className={
                          selectedStudent?.id === student.id
                            ? "studentRow selected"
                            : "studentRow"
                        }
                        onClick={() => selectStudent(student)}
                      >
                        <div className="avatar">
                          {(student.full_name || "S")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="studentInfo">
                          <strong>
                            {student.full_name || "Unnamed Student"}
                          </strong>

                          <span>
                            {student.student_id || "No Student ID"}
                          </span>

                          <small>{student.email || "No email"}</small>
                        </div>

                        <span className="arrow">›</span>
                      </button>
                    ))}

                    {!filteredStudents.length && (
                      <div className="empty">
                        No students found.
                      </div>
                    )}
                  </div>

                  <div className="profilePanel">
                    {!selectedStudent ? (
                      <div className="empty large">
                        <div className="emptyIcon">👤</div>
                        <strong>Select a student</strong>
                        <span>
                          Student profile and access information will appear
                          here.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="profileTop">
                          <div className="avatar big">
                            {(selectedStudent.full_name || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3>
                              {selectedStudent.full_name ||
                                "Unnamed Student"}
                            </h3>
                            <p>
                              {selectedStudent.student_id ||
                                "No Student ID"}
                            </p>
                            <p>
                              {selectedStudent.email || "No email"}
                            </p>
                          </div>

                          <button
                            className="lightButton"
                            onClick={clearSelectedStudent}
                          >
                            Clear
                          </button>
                        </div>

                        <div className="profileStats">
                          <div>
                            <span>Subscription</span>
                            <strong>
                              {selectedStudent.paid_exam_category_name ||
                                selectedStudent.paid_exam_category_id ||
                                "None"}
                            </strong>
                          </div>

                          <div>
                            <span>Status</span>
                            <strong>
                              {accountStatus(selectedStudent)}
                            </strong>
                          </div>

                          <div>
                            <span>Access until</span>
                            <strong>
                              {selectedStudent.access_expiry_date
                                ? formatDate(
                                    selectedStudent.access_expiry_date
                                  )
                                : "No expiry"}
                            </strong>
                          </div>

                          <div>
                            <span>Normal accesses</span>
                            <strong>{normalAccess.length}</strong>
                          </div>

                          <div>
                            <span>HTML accesses</span>
                            <strong>{htmlAccess.length}</strong>
                          </div>
                        </div>

                        <div className="overview">
                          <h3>Student Overview</h3>

                          <div className="overviewGrid">
                            <div>
                              <span>Student</span>
                              <strong>
                                {selectedStudent.full_name || "—"}
                              </strong>
                            </div>

                            <div>
                              <span>Student ID</span>
                              <strong>
                                {selectedStudent.student_id || "—"}
                              </strong>
                            </div>

                            <div>
                              <span>Email</span>
                              <strong>
                                {selectedStudent.email || "—"}
                              </strong>
                            </div>

                            <div>
                              <span>Subscription status</span>
                              <strong>
                                {accountStatus(selectedStudent)}
                              </strong>
                            </div>

                            <div>
                              <span>Tests available</span>
                              <strong>
                                {normalAccess.length +
                                  htmlAccess.length}
                              </strong>
                            </div>

                            <div>
                              <span>Last activity</span>
                              <strong>—</strong>
                            </div>
                          </div>
                        </div>

                        <div className="profileActions">
                          <button
                            onClick={() => setActiveSection("access")}
                          >
                            Manage Subscription / Access
                          </button>

                          <button
                            className="secondary"
                            onClick={() =>
                              setActiveSection("access")
                            }
                          >
                            View Test History
                          </button>

                          <button
                            className="danger"
                            onClick={() => {
                              setError(
                                "Suspend Access is not available yet because the current profiles schema has no suspension field."
                              );
                            }}
                          >
                            Suspend Access
                          </button>

                          <button
                            className="danger"
                            onClick={() => {
                              setError(
                                "Use the active access list below to end individual mock access."
                              );
                              setActiveSection("access");
                            }}
                          >
                            End Access
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeSection === "access" && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <span className="sectionNumber">02</span>
                    <div>
                      <h2>📚 Test / Mock Access</h2>
                      <p>
                        Grant additional normal or HTML mock access to the
                        selected student.
                      </p>
                    </div>
                  </div>
                </div>

                {!selectedStudent ? (
                  <div className="notice">
                    First select a student from{" "}
                    <strong>Search & Select Student</strong>.
                  </div>
                ) : (
                  <>
                    <div className="selectedBanner">
                      <div className="avatar">
                        {(selectedStudent.full_name || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {selectedStudent.full_name ||
                            "Unnamed Student"}
                        </strong>
                        <span>
                          {selectedStudent.student_id || "No ID"} ·{" "}
                          {selectedStudent.email || "No email"}
                        </span>
                      </div>

                      <div className="subscriptionBadge">
                        Subscription:{" "}
                        {selectedStudent.paid_exam_category_name ||
                          selectedStudent.paid_exam_category_id ||
                          "None"}
                      </div>
                    </div>

                    <div className="formCard">
                      <div className="formTabs">
                        <button
                          className={
                            accessType === "normal"
                              ? "tabActive"
                              : ""
                          }
                          onClick={() => setAccessType("normal")}
                        >
                          Normal Mock
                        </button>

                        <button
                          className={
                            accessType === "html"
                              ? "tabActive"
                              : ""
                          }
                          onClick={() => setAccessType("html")}
                        >
                          HTML Mock
                        </button>
                      </div>

                      {accessType === "normal" ? (
                        <div className="formGrid">
                          <label>
                            <span>Select Mock</span>
                            <select
                              value={selectedTestId}
                              onChange={(e) =>
                                setSelectedTestId(e.target.value)
                              }
                            >
                              <option value="">
                                Select normal mock
                              </option>

                              {restrictedTests.map((test) => (
                                <option key={test.id} value={test.id}>
                                  {test.title}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Start</span>
                            <input
                              type="datetime-local"
                              value={startAt}
                              onChange={(e) =>
                                setStartAt(e.target.value)
                              }
                            />
                          </label>

                          <label>
                            <span>End</span>
                            <input
                              type="datetime-local"
                              value={endAt}
                              onChange={(e) =>
                                setEndAt(e.target.value)
                              }
                            />
                          </label>

                          <div className="formButton">
                            <button
                              onClick={grantNormalAccess}
                              disabled={saving}
                            >
                              {saving
                                ? "Granting..."
                                : "Grant Normal Mock Access"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="formGrid">
                          <label>
                            <span>Select HTML Mock</span>
                            <select
                              value={selectedHtmlTestId}
                              onChange={(e) =>
                                setSelectedHtmlTestId(e.target.value)
                              }
                            >
                              <option value="">
                                Select HTML mock
                              </option>

                              {paidHtmlTests.map((test) => (
                                <option key={test.id} value={test.id}>
                                  {test.title ||
                                    test.name ||
                                    test.id}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Start</span>
                            <input
                              type="datetime-local"
                              value={startAt}
                              onChange={(e) =>
                                setStartAt(e.target.value)
                              }
                            />
                          </label>

                          <label>
                            <span>End</span>
                            <input
                              type="datetime-local"
                              value={endAt}
                              onChange={(e) =>
                                setEndAt(e.target.value)
                              }
                            />
                          </label>

                          <div className="formButton">
                            <button
                              onClick={grantHtmlAccess}
                              disabled={saving}
                            >
                              {saving
                                ? "Granting..."
                                : "Grant HTML Mock Access"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="accessLists">
                      <div className="accessCard">
                        <div className="cardTitle">
                          <h3>Normal Mock Access</h3>
                          <span>{normalAccess.length}</span>
                        </div>

                        {normalAccess.length === 0 ? (
                          <div className="empty">
                            No normal mock access.
                          </div>
                        ) : (
                          normalAccess.map((access) => (
                            <div
                              className="accessRow"
                              key={access.id}
                            >
                              <div>
                                <strong>
                                  {access.test_title ||
                                    access.title ||
                                    access.test_id}
                                </strong>

                                <span>
                                  {formatDate(access.start_at)} →{" "}
                                  {formatDate(access.end_at)}
                                </span>
                              </div>

                              <div className="rowRight">
                                <span
                                  className={`status ${accessStatus(
                                    access.start_at,
                                    access.end_at,
                                    access.is_active
                                  )
                                    .toLowerCase()
                                    .replace(" ", "-")}`}
                                >
                                  {accessStatus(
                                    access.start_at,
                                    access.end_at,
                                    access.is_active
                                  )}
                                </span>

                                {access.is_active && (
                                  <button
                                    className="smallDanger"
                                    onClick={() =>
                                      endNormalAccess(access.id)
                                    }
                                  >
                                    End
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="accessCard">
                        <div className="cardTitle">
                          <h3>HTML Mock Access</h3>
                          <span>{htmlAccess.length}</span>
                        </div>

                        {htmlAccess.length === 0 ? (
                          <div className="empty">
                            No HTML mock access.
                          </div>
                        ) : (
                          htmlAccess.map((access) => (
                            <div
                              className="accessRow"
                              key={access.id}
                            >
                              <div>
                                <strong>
                                  {access.html_test_title ||
                                    access.title ||
                                    access.html_test_id}
                                </strong>

                                <span>
                                  {formatDate(access.start_at)} →{" "}
                                  {formatDate(access.end_at)}
                                </span>
                              </div>

                              <div className="rowRight">
                                <span
                                  className={`status ${accessStatus(
                                    access.start_at,
                                    access.end_at,
                                    access.is_active
                                  )
                                    .toLowerCase()
                                    .replace(" ", "-")}`}
                                >
                                  {accessStatus(
                                    access.start_at,
                                    access.end_at,
                                    access.is_active
                                  )}
                                </span>

                                {access.is_active && (
                                  <button
                                    className="smallDanger"
                                    onClick={() =>
                                      endHtmlAccess(access.id)
                                    }
                                  >
                                    End
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === "bulk" && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <span className="sectionNumber">03</span>
                    <div>
                      <h2>👥 Give Access to Everyone</h2>
                      <p>
                        Grant the same mock access to one, selected or
                        multiple students.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bulkTop">
                  <div className="scopeCard">
                    <span>Target students</span>

                    <div className="scopeButtons">
                      <button
                        className={
                          bulkScope === "all" ? "scopeActive" : ""
                        }
                        onClick={() => setBulkScope("all")}
                      >
                        All Students
                      </button>

                      <button
                        className={
                          bulkScope === "selected"
                            ? "scopeActive"
                            : ""
                        }
                        onClick={() => setBulkScope("selected")}
                      >
                        Selected Students
                      </button>

                      <button
                        className={
                          bulkScope === "category"
                            ? "scopeActive"
                            : ""
                        }
                        onClick={() => setBulkScope("category")}
                      >
                        Subscription Category
                      </button>
                    </div>
                  </div>

                  <div className="countCard">
                    <span>Students matched</span>
                    <strong>{selectedBulkStudents.length}</strong>
                  </div>
                </div>

                {bulkScope === "category" && (
                  <div className="formCard">
                    <label>
                      <span>
                        Subscription Category ID
                      </span>

                      <input
                        value={bulkCategory}
                        onChange={(e) =>
                          setBulkCategory(e.target.value)
                        }
                        placeholder="Enter category ID"
                      />

                      <small>
                        This filters students by their existing
                        paid_exam_category_id.
                      </small>
                    </label>
                  </div>
                )}

                {bulkScope === "selected" && (
                  <div className="studentPicker">
                    <div className="pickerHeader">
                      <strong>Select Students</strong>

                      <span>
                        {bulkSelected.length} selected
                      </span>
                    </div>

                    <div className="pickerList">
                      {students.map((student) => (
                        <label
                          className="checkRow"
                          key={student.id}
                        >
                          <input
                            type="checkbox"
                            checked={bulkSelected.includes(
                              student.id
                            )}
                            onChange={() =>
                              toggleStudent(
                                bulkSelected,
                                setBulkSelected,
                                student.id
                              )
                            }
                          />

                          <span>
                            <strong>
                              {student.full_name ||
                                "Unnamed Student"}
                            </strong>
                            <small>
                              {student.student_id ||
                                student.email ||
                                "No ID"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="formCard">
                  <div className="formTabs">
                    <button
                      className={
                        bulkAccessType === "normal"
                          ? "tabActive"
                          : ""
                      }
                      onClick={() =>
                        setBulkAccessType("normal")
                      }
                    >
                      Normal Mock
                    </button>

                    <button
                      className={
                        bulkAccessType === "html"
                          ? "tabActive"
                          : ""
                      }
                      onClick={() =>
                        setBulkAccessType("html")
                      }
                    >
                      HTML Mock
                    </button>
                  </div>

                  <div className="formGrid">
                    {bulkAccessType === "normal" ? (
                      <label>
                        <span>Normal Mock</span>

                        <select
                          value={bulkTestId}
                          onChange={(e) =>
                            setBulkTestId(e.target.value)
                          }
                        >
                          <option value="">
                            Select mock
                          </option>

                          {restrictedTests.map((test) => (
                            <option key={test.id} value={test.id}>
                              {test.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label>
                        <span>HTML Mock</span>

                        <select
                          value={bulkHtmlTestId}
                          onChange={(e) =>
                            setBulkHtmlTestId(e.target.value)
                          }
                        >
                          <option value="">
                            Select HTML mock
                          </option>

                          {paidHtmlTests.map((test) => (
                            <option key={test.id} value={test.id}>
                              {test.title ||
                                test.name ||
                                test.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label>
                      <span>Start</span>

                      <input
                        type="datetime-local"
                        value={bulkStartAt}
                        onChange={(e) =>
                          setBulkStartAt(e.target.value)
                        }
                      />
                    </label>

                    <label>
                      <span>End</span>

                      <input
                        type="datetime-local"
                        value={bulkEndAt}
                        onChange={(e) =>
                          setBulkEndAt(e.target.value)
                        }
                      />
                    </label>

                    <div className="formButton">
                      <button
                        onClick={grantBulkAccess}
                        disabled={saving}
                      >
                        {saving
                          ? "Granting..."
                          : `Grant Access to ${selectedBulkStudents.length} Student${
                              selectedBulkStudents.length === 1
                                ? ""
                                : "s"
                            }`}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="infoBox">
                  <strong>Important</strong>
                  <p>
                    Bulk access uses the same existing access RPCs as
                    individual access. Students can therefore have
                    multiple simultaneous mock accesses.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "messages" && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <span className="sectionNumber">04</span>
                    <div>
                      <h2>📢 Messages</h2>
                      <p>
                        Send announcements that can appear on the
                        student dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="messageLayout">
                  <div className="messageComposer">
                    <label>
                      <span>Title</span>

                      <input
                        value={messageTitle}
                        onChange={(e) =>
                          setMessageTitle(e.target.value)
                        }
                        placeholder="e.g. Happy Durga Puja!"
                      />
                    </label>

                    <label>
                      <span>Message</span>

                      <textarea
                        value={messageBody}
                        onChange={(e) =>
                          setMessageBody(e.target.value)
                        }
                        placeholder="Write your message..."
                        rows={7}
                      />
                    </label>

                    <div className="formGrid two">
                      <label>
                        <span>Publish From</span>

                        <input
                          type="datetime-local"
                          value={messageStartAt}
                          onChange={(e) =>
                            setMessageStartAt(e.target.value)
                          }
                        />
                      </label>

                      <label>
                        <span>End / Hide After</span>

                        <input
                          type="datetime-local"
                          value={messageEndAt}
                          onChange={(e) =>
                            setMessageEndAt(e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="messageTarget">
                    <h3>Who should receive it?</h3>

                    <div className="targetButtons">
                      <button
                        className={
                          messageTarget === "all"
                            ? "targetActive"
                            : ""
                        }
                        onClick={() =>
                          setMessageTarget("all")
                        }
                      >
                        Everyone
                      </button>

                      <button
                        className={
                          messageTarget === "selected"
                            ? "targetActive"
                            : ""
                        }
                        onClick={() =>
                          setMessageTarget("selected")
                        }
                      >
                        Selected Students
                      </button>
                    </div>

                    {messageTarget === "selected" && (
                      <div className="pickerList messagePicker">
                        {students.map((student) => (
                          <label
                            className="checkRow"
                            key={student.id}
                          >
                            <input
                              type="checkbox"
                              checked={messageSelected.includes(
                                student.id
                              )}
                              onChange={() =>
                                toggleStudent(
                                  messageSelected,
                                  setMessageSelected,
                                  student.id
                                )
                              }
                            />

                            <span>
                              <strong>
                                {student.full_name ||
                                  "Unnamed Student"}
                              </strong>

                              <small>
                                {student.student_id ||
                                  student.email ||
                                  "No ID"}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="recipientCount">
                      Recipients:{" "}
                      <strong>
                        {selectedMessageStudents.length}
                      </strong>
                    </div>

                    <button
                      className="publishButton"
                      onClick={publishMessage}
                      disabled={saving}
                    >
                      {saving
                        ? "Publishing..."
                        : "📢 Publish Message"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          padding: 28px 18px 60px;
        }

        .container {
          width: min(1280px, 100%);
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 22px;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
          color: #64748b;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(25px, 4vw, 38px);
          letter-spacing: -1px;
        }

        .header p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .studentCount {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 800;
          white-space: nowrap;
        }

        .success,
        .error {
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 15px;
          font-size: 14px;
          font-weight: 600;
        }

        .success {
          background: #ecfdf3;
          color: #087443;
          border: 1px solid #b7ebca;
        }

        .error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .sectionNav {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .sectionNav button {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 15px;
          padding: 15px;
          display: flex;
          gap: 11px;
          align-items: center;
          text-align: left;
          cursor: pointer;
          color: #334155;
          transition: 0.2s;
        }

        .sectionNav button:hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .sectionNav button.navActive {
          border-color: #172033;
          background: #172033;
          color: #fff;
        }

        .sectionNav button > span {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-weight: 800;
        }

        .sectionNav small {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.7;
        }

        .section {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
        }

        .sectionHeader {
          padding: 22px 24px;
          border-bottom: 1px solid #eef0f4;
        }

        .sectionHeader > div {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sectionNumber {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #f1f5f9;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 900;
          color: #64748b;
        }

        .section h2 {
          margin: 0;
          font-size: 20px;
        }

        .sectionHeader p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .searchBox {
          padding: 18px 24px;
          border-bottom: 1px solid #eef0f4;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #dbe1e8;
          border-radius: 11px;
          padding: 12px 13px;
          background: #fff;
          color: #172033;
          outline: none;
          font: inherit;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
        }

        textarea {
          resize: vertical;
        }

        .studentGrid {
          display: grid;
          grid-template-columns: 390px 1fr;
          min-height: 500px;
        }

        .studentList {
          border-right: 1px solid #eef0f4;
        }

        .listHeader {
          padding: 15px 18px;
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          border-bottom: 1px solid #eef0f4;
        }

        .listHeader span,
        .cardTitle > span {
          min-width: 26px;
          height: 26px;
          padding: 0 7px;
          display: inline-grid;
          place-items: center;
          border-radius: 99px;
          background: #f1f5f9;
          font-size: 12px;
        }

        .studentRow {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #eef0f4;
          background: #fff;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          cursor: pointer;
        }

        .studentRow:hover,
        .studentRow.selected {
          background: #f8fafc;
        }

        .studentRow.selected {
          box-shadow: inset 3px 0 0 #172033;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #e2e8f0;
          display: grid;
          place-items: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        .avatar.big {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          font-size: 20px;
        }

        .studentInfo {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .studentInfo strong,
        .studentInfo span,
        .studentInfo small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .studentInfo strong {
          font-size: 14px;
        }

        .studentInfo span {
          font-size: 12px;
          color: #475569;
        }

        .studentInfo small {
          font-size: 11px;
          color: #94a3b8;
        }

        .arrow {
          font-size: 22px;
          color: #94a3b8;
        }

        .profilePanel {
          padding: 24px;
        }

        .profileTop {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eef0f4;
        }

        .profileTop h3 {
          margin: 0 0 4px;
          font-size: 20px;
        }

        .profileTop p {
          margin: 2px 0;
          color: #64748b;
          font-size: 13px;
        }

        .lightButton {
          margin-left: auto;
          border: 1px solid #dbe1e8;
          background: #fff;
          padding: 9px 12px;
          border-radius: 9px;
          cursor: pointer;
        }

        .profileStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 18px 0;
        }

        .profileStats > div,
        .overviewGrid > div {
          background: #f8fafc;
          border-radius: 12px;
          padding: 13px;
        }

        .profileStats span,
        .overviewGrid span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .profileStats strong,
        .overviewGrid strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .overview {
          margin-top: 18px;
        }

        .overview h3 {
          margin: 0 0 10px;
          font-size: 15px;
        }

        .overviewGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .profileActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        button {
          font: inherit;
        }

        .profileActions button,
        .formButton button,
        .publishButton {
          border: 0;
          background: #172033;
          color: #fff;
          padding: 11px 14px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .profileActions .secondary {
          background: #f1f5f9;
          color: #334155;
        }

        .profileActions .danger,
        .smallDanger {
          background: #fff1f2;
          color: #be123c;
        }

        .formCard {
          margin: 20px 24px;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          background: #fafbfc;
        }

        .formTabs {
          display: flex;
          gap: 7px;
          margin-bottom: 16px;
        }

        .formTabs button {
          border: 1px solid #dbe1e8;
          background: #fff;
          border-radius: 9px;
          padding: 9px 13px;
          cursor: pointer;
          font-weight: 700;
        }

        .formTabs .tabActive {
          background: #172033;
          border-color: #172033;
          color: #fff;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: end;
        }

        .formGrid.two {
          grid-template-columns: 1fr 1fr;
        }

        label {
          display: block;
        }

        label > span {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          margin-bottom: 6px;
        }

        label small {
          display: block;
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
        }

        .selectedBanner {
          margin: 20px 24px 0;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selectedBanner > div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .selectedBanner span {
          font-size: 12px;
          color: #64748b;
        }

        .subscriptionBadge {
          margin-left: auto;
          background: #f1f5f9;
          border-radius: 99px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .accessLists {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 0 24px 24px;
        }

        .accessCard {
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          overflow: hidden;
        }

        .cardTitle {
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eef0f4;
        }

        .cardTitle h3 {
          margin: 0;
          font-size: 14px;
        }

        .accessRow {
          padding: 13px 15px;
          border-bottom: 1px solid #eef0f4;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .accessRow:last-child {
          border-bottom: 0;
        }

        .accessRow > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .accessRow strong {
          font-size: 13px;
