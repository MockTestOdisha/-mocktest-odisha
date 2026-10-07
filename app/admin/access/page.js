"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAccessPage() {
const router = useRouter();
const supabase = createClient();

const [students, setStudents] = useState([]);
const [tests, setTests] = useState([]);
const [htmlTests, setHtmlTests] = useState([]);

const [normalAccess, setNormalAccess] = useState([]);
const [htmlAccess, setHtmlAccess] = useState([]);

const [accessType, setAccessType] = useState("normal");

const [selectedStudent, setSelectedStudent] =
useState("");

const [selectedTest, setSelectedTest] =
useState("");

const [selectedHtmlTest, setSelectedHtmlTest] =
useState("");

const [searchText, setSearchText] =
useState("");

const [startAt, setStartAt] =
useState("");

const [endAt, setEndAt] =
useState("");

const [editingAccess, setEditingAccess] =
useState(null);

const [loading, setLoading] = useState(true);
const [accessLoading, setAccessLoading] =
useState(false);
const [saving, setSaving] = useState(false);

const [errorMessage, setErrorMessage] =
useState("");

const [successMessage, setSuccessMessage] =
useState("");

useEffect(() => {
async function loadData() {
try {
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

    const {
      data: studentData,
      error: studentError,
    } = await supabase.rpc(
      "admin_get_students_for_access"
    );

    if (studentError) {
      setErrorMessage(
        "Could not load students: " +
          studentError.message
      );
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
      setErrorMessage(
        "Could not load restricted tests: " +
          testError.message
      );
      setLoading(false);
      return;
    }

    const {
      data: htmlTestData,
      error: htmlTestError,
    } = await supabase.rpc(
      "admin_get_paid_html_tests"
    );

    if (htmlTestError) {
      setErrorMessage(
        "Could not load paid HTML tests: " +
          htmlTestError.message
      );
      setLoading(false);
      return;
    }

    setStudents(studentData || []);
    setTests(testData || []);
    setHtmlTests(htmlTestData || []);
    setLoading(false);
  } catch (error) {
    setErrorMessage(
      error.message ||
        "Could not load admin access data."
    );
    setLoading(false);
  }
}

loadData();

}, []);

const filteredStudents = useMemo(() => {
const search = searchText
.trim()
.toLowerCase();

if (!search) {
  return students;
}

return students.filter((student) => {
  const name = (
    student.full_name || ""
  ).toLowerCase();

  const email = (
    student.email || ""
  ).toLowerCase();

  return (
    name.includes(search) ||
    email.includes(search)
  );
});

}, [students, searchText]);

const selectedStudentData = useMemo(() => {
return (
students.find(
(student) =>
String(student.id) ===
String(selectedStudent)
) || null
);
}, [students, selectedStudent]);

async function loadStudentAccess(studentId) {
if (!studentId) {
setNormalAccess([]);
setHtmlAccess([]);
return;
}

setAccessLoading(true);
setErrorMessage("");

const {
  data: normalData,
  error: normalError,
} = await supabase.rpc(
  "admin_get_student_test_access",
  {
    p_user_id: studentId,
  }
);

if (normalError) {
  setErrorMessage(
    "Could not load restricted-test access: " +
      normalError.message
  );
  setAccessLoading(false);
  return;
}

const {
  data: htmlData,
  error: htmlError,
} = await supabase.rpc(
  "admin_get_student_html_test_access",
  {
    p_user_id: studentId,
  }
);

if (htmlError) {
  setErrorMessage(
    "Could not load HTML-test access: " +
      htmlError.message
  );
  setAccessLoading(false);
  return;
}

setNormalAccess(normalData || []);
setHtmlAccess(htmlData || []);
setAccessLoading(false);

}

async function handleStudentSelect(studentId) {
setSelectedStudent(studentId);
setSearchText("");
setErrorMessage("");
setSuccessMessage("");
setEditingAccess(null);

setStartAt("");
setEndAt("");

await loadStudentAccess(studentId);

}

function clearSelectedStudent() {
setSelectedStudent("");
setSearchText("");
setNormalAccess([]);
setHtmlAccess([]);
setEditingAccess(null);
setStartAt("");
setEndAt("");
setErrorMessage("");
setSuccessMessage("");
}

function formatDateTime(value) {
if (!value) {
return "No limit";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return value;
}

return date.toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

}

function isAccessCurrentlyActive(access) {
if (!access.is_active) {
return false;
}

const now = new Date();

if (
  access.start_at &&
  now < new Date(access.start_at)
) {
  return false;
}

if (
  access.end_at &&
  now > new Date(access.end_at)
) {
  return false;
}

return true;

}

function getAccessStatus(access) {
if (!access.is_active) {
return {
label: "Ended",
className: "status-ended",
};
}

const now = new Date();

if (
  access.start_at &&
  now < new Date(access.start_at)
) {
  return {
    label: "Scheduled",
    className: "status-scheduled",
  };
}

if (
  access.end_at &&
  now > new Date(access.end_at)
) {
  return {
    label: "Expired",
    className: "status-expired",
  };
}

return {
  label: "Active",
  className: "status-active",
};

}

function convertToDateTimeLocal(value) {
if (!value) {
return "";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return "";
}

const offset =
  date.getTimezoneOffset();

const localDate = new Date(
  date.getTime() - offset * 60000
);

return localDate
  .toISOString()
  .slice(0, 16);

}

function startEditAccess(type, access) {
setEditingAccess({
type,
access,
});

setStartAt(
  convertToDateTimeLocal(
    access.start_at
  )
);

setEndAt(
  convertToDateTimeLocal(
    access.end_at
  )
);

setErrorMessage("");
setSuccessMessage("");

window.scrollTo({
  top: document.body.scrollHeight,
  behavior: "smooth",
});

}

function cancelEdit() {
setEditingAccess(null);
setStartAt("");
setEndAt("");
setErrorMessage("");
setSuccessMessage("");
}

async function handleGrantOrUpdateAccess() {
setErrorMessage("");
setSuccessMessage("");

if (!selectedStudent) {
  setErrorMessage(
    "Please select a student."
  );
  return;
}

if (
  accessType === "normal" &&
  !selectedTest
) {
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
    "Please select an access start date and time."
  );
  return;
}

if (!endAt) {
  setErrorMessage(
    "Please select an access end date and time."
  );
  return;
}

const startDate = new Date(startAt);
const endDate = new Date(endAt);

if (
  Number.isNaN(startDate.getTime()) ||
  Number.isNaN(endDate.getTime())
) {
  setErrorMessage(
    "Please enter valid start and end times."
  );
  return;
}

if (endDate <= startDate) {
  setErrorMessage(
    "End time must be after start time."
  );
  return;
}

setSaving(true);

if (editingAccess) {
  const access =
    editingAccess.access;

  const type =
    editingAccess.type;

  if (type === "normal") {
    const { error } =
      await supabase.rpc(
        "admin_grant_test_access",
        {
          p_test_id:
            access.test_id,
          p_user_id:
            selectedStudent,
          p_start_at:
            startDate.toISOString(),
          p_end_at:
            endDate.toISOString(),
        }
      );

    if (error) {
      setErrorMessage(
        "Could not update access: " +
          error.message
      );
      setSaving(false);
      return;
    }
  } else {
    const { error } =
      await supabase.rpc(
        "admin_grant_html_test_access",
        {
          p_html_test_id:
            access.html_test_id,
          p_user_id:
            selectedStudent,
          p_start_at:
            startDate.toISOString(),
          p_end_at:
            endDate.toISOString(),
        }
      );

    if (error) {
      setErrorMessage(
        "Could not update HTML-test access: " +
          error.message
      );
      setSaving(false);
      return;
    }
  }

  await loadStudentAccess(
    selectedStudent
  );

  setEditingAccess(null);
  setStartAt("");
  setEndAt("");

  setSuccessMessage(
    "Access dates updated successfully."
  );

  setSaving(false);
  return;
}

if (accessType === "normal") {
  const { error } =
    await supabase.rpc(
      "admin_grant_test_access",
      {
        p_test_id: selectedTest,
        p_user_id: selectedStudent,
        p_start_at:
          startDate.toISOString(),
        p_end_at:
          endDate.toISOString(),
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
  const { error } =
    await supabase.rpc(
      "admin_grant_html_test_access",
      {
        p_html_test_id:
          selectedHtmlTest,
        p_user_id:
          selectedStudent,
        p_start_at:
          startDate.toISOString(),
        p_end_at:
          endDate.toISOString(),
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

await loadStudentAccess(
  selectedStudent
);

setSelectedTest("");
setSelectedHtmlTest("");
setStartAt("");
setEndAt("");

setSaving(false);

}

async function handleEndNormalAccess(access) {
if (
!window.confirm(
"End access to "${access.test_title}" for this student?"
)
) {
return;
}

setErrorMessage("");
setSuccessMessage("");
setSaving(true);

const { error } =
  await supabase.rpc(
    "admin_end_test_access",
    {
      p_test_id: access.test_id,
      p_user_id: selectedStudent,
    }
  );

if (error) {
  setErrorMessage(
    "Could not end test access: " +
      error.message
  );
  setSaving(false);
  return;
}

await loadStudentAccess(
  selectedStudent
);

setSuccessMessage(
  "Restricted test access ended."
);

setSaving(false);

}

async function handleEndHtmlAccess(access) {
if (
!window.confirm(
"End access to "${access.test_title}" for this student?"
)
) {
return;
}

setErrorMessage("");
setSuccessMessage("");
setSaving(true);

const { error } =
  await supabase.rpc(
    "admin_end_html_test_access",
    {
      p_html_test_id:
        access.html_test_id,
      p_user_id: selectedStudent,
    }
  );

if (error) {
  setErrorMessage(
    "Could not end HTML-test access: " +
      error.message
  );
  setSaving(false);
  return;
}

await loadStudentAccess(
  selectedStudent
);

setSuccessMessage(
  "Paid HTML-test access ended."
);

setSaving(false);

}

if (loading) {
return (
<main className="loading-page">
<div className="loading-card">
<div className="loading-icon">
👥
</div>

      <h2>
        Loading Student Access...
      </h2>

      <p>
        Please wait...
      </p>
    </div>

    <style jsx>{`
      .loading-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: #f5f7fb;
        font-family: Arial, sans-serif;
      }

      .loading-card {
        width: 100%;
        max-width: 420px;
        padding: 35px 25px;
        background: white;
        border-radius: 20px;
        text-align: center;
        box-shadow:
          0 10px 30px
          rgba(15, 23, 42, 0.08);
      }

      .loading-icon {
        font-size: 42px;
        margin-bottom: 10px;
      }

      .loading-card h2 {
        margin: 0 0 8px;
        color: #172554;
      }

      .loading-card p {
        margin: 0;
        color: #64748b;
      }
    `}</style>
  </main>
);

}

return (
<main className="access-page">
<div className="access-container">

    <header className="page-header">
      <div className="header-left">
        <div className="header-icon">
          👥
        </div>

        <div>
          <div className="header-label">
            ADMIN CONTROL CENTER
          </div>

          <h1>
            Student Access & Communication
          </h1>

          <p>
            Manage student access, permissions
            and communication from one place.
          </p>
        </div>
      </div>

      <button
        onClick={() =>
          router.push("/admin")
        }
        className="back-button"
      >
        ← Dashboard
      </button>
    </header>

    {errorMessage && (
      <div className="message error-message">
        <span className="message-icon">
          ⚠️
        </span>

        <div>
          <strong>Error</strong>
          <p>{errorMessage}</p>
        </div>
      </div>
    )}

    {successMessage && (
      <div className="message success-message">
        <span className="message-icon">
          ✅
        </span>

        <div>
          <strong>Success</strong>
          <p>{successMessage}</p>
        </div>
      </div>
    )}

    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="step-number">
            1
          </span>

          <div>
            <h2>
              Select Student
            </h2>

            <p>
              Search by student name or email.
            </p>
          </div>
        </div>
      </div>

      <div className="search-box">
        <span>🔎</span>

        <input
          type="text"
          value={searchText}
          onChange={(e) =>
            setSearchText(
              e.target.value
            )
          }
          placeholder="Search student..."
        />

        {searchText && (
          <button
            type="button"
            onClick={() =>
              setSearchText("")
            }
            className="clear-search"
          >
            ×
          </button>
        )}
      </div>

      {!selectedStudent ? (
        <div className="student-list">
          {filteredStudents.length ===
          0 ? (
            <div className="empty-state">
              <div>🔍</div>

              <strong>
                No students found
              </strong>

              <p>
                Try another name or email.
              </p>
            </div>
          ) : (
            filteredStudents.map(
              (student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() =>
                    handleStudentSelect(
                      student.id
                    )
                  }
                  className="student-row"
                >
                  <div className="student-avatar">
                    {(
                      student.full_name ||
                      "S"
                    )
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="student-row-info">
                    <strong>
                      {student.full_name ||
                        "Unnamed Student"}
                    </strong>

                    <span>
                      {student.email ||
                        "Student"}
                    </span>
                  </div>

                  <span className="row-arrow">
                    →
                  </span>
                </button>
              )
            )
          )}
        </div>
      ) : (
        <div className="selected-student-card">
          <div className="selected-student-top">
            <div className="large-avatar">
              {(
                selectedStudentData
                  ?.full_name ||
                "S"
              )
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="selected-student-main">
              <span className="selected-label">
                SELECTED STUDENT
              </span>

              <h3>
                {selectedStudentData
                  ?.full_name ||
                  "Unnamed Student"}
              </h3>

              <p>
                {selectedStudentData
                  ?.email ||
                  "Email not available"}
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearSelectedStudent
              }
              className="change-button"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </section>

    {selectedStudent && (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">
                2
              </span>

              <div>
                <h2>
                  Current Test Access
                </h2>

                <p>
                  Review, extend or end this
                  student's test access.
                </p>
              </div>
            </div>
          </div>

          {accessLoading ? (
            <div className="access-loading">
              🔄 Loading access...
            </div>
          ) : (
            <>
              <div className="access-section">
                <div className="access-section-title">
                  📝 Restricted Tests
                </div>

                {normalAccess.length ===
                0 ? (
                  <div className="no-access">
                    No restricted-test access
                    records found.
                  </div>
                ) : (
                  <div className="access-list">
                    {normalAccess.map(
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
                                className={`status-badge ${status.className}`}
                              >
                                {status.label}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  startEditAccess(
                                    "normal",
                                    access
                                  )
                                }
                                className="small-button edit-button"
                              >
                                ✏️ Edit
                              </button>

                              {isAccessCurrentlyActive(
                                access
                              ) && (
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleEndNormalAccess(
                                      access
                                    )
                                  }
                                  className="small-button end-button"
                                >
                                  ❌ End
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              <div className="access-section">
                <div className="access-section-title">
                  🌐 Paid HTML Tests
                </div>

                {htmlAccess.length ===
                0 ? (
                  <div className="no-access">
                    No paid HTML-test access
                    records found.
                  </div>
                ) : (
                  <div className="access-list">
                    {htmlAccess.map(
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
                                className={`status-badge ${status.className}`}
                              >
                                {status.label}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  startEditAccess(
                                    "html",
                                    access
                                  )
                                }
                                className="small-button edit-button"
                              >
                                ✏️ Edit
                              </button>

                              {isAccessCurrentlyActive(
                                access
                              ) && (
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    handleEndHtmlAccess(
                                      access
                                    )
                                  }
                                  className="small-button end-button"
                                >
                                  ❌ End
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="step-number">
                3
              </span>

              <div>
                <h2>
                  {editingAccess
                    ? "Edit Test Access"
                    : "Give Test Access"}
                </h2>

                <p>
                  {editingAccess
                    ? "Change the access dates for this test."
                    : "Choose what this student should be able to access."}
                </p>
              </div>
            </div>
          </div>

          {!editingAccess && (
            <>
              <div className="field-group">
                <label>
                  Access Type
                </label>

                <div className="access-type-grid">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessType(
                        "normal"
                      );
                      setSelectedTest("");
                      setSelectedHtmlTest("");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`access-type-card ${
                      accessType ===
                      "normal"
                        ? "active"
                        : ""
                    }`}
                  >
                    <span className="type-icon">
                      📝
                    </span>

                    <span>
                      <strong>
                        Normal Test
                      </strong>

                      <small>
                        Restricted mock test
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccessType(
                        "html"
                      );
                      setSelectedTest("");
                      setSelectedHtmlTest("");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`access-type-card ${
                      accessType ===
                      "html"
                        ? "active"
                        : ""
                    }`}
                  >
                    <span className="type-icon">
                      🌐
                    </span>

                    <span>
                      <strong>
                        Paid HTML Test
                      </strong>

                      <small>
                        Interactive HTML test
                      </small>
                    </span>
                  </button>
                </div>
              </div>

              {accessType ===
              "normal" ? (
                <div className="field-group">
                  <label>
                    Restricted Test
                  </label>

                  <select
                    value={
                      selectedTest
                    }
                    onChange={(e) =>
                      setSelectedTest(
                        e.target.value
                      )
                    }
                    className="form-control"
                  >
                    <option value="">
                      Select a restricted test
                    </option>

                    {tests.map(
                      (test) => (
                        <option
                          key={
                            test.id
                          }
                          value={
                            test.id
                          }
                        >
                          {
                            test.title
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              ) : (
                <div className="field-group">
                  <label>
                    Paid HTML Test
                  </label>

                  <select
                    value={
                      selectedHtmlTest
                    }
                    onChange={(e) =>
                      setSelectedHtmlTest(
                        e.target.value
                      )
                    }
                    className="form-control"
                  >
                    <option value="">
                      Select a paid HTML test
                    </option>

                    {htmlTests.map(
                      (test) => (
                        <option
                          key={
                            test.id
                          }
                          value={
                            test.id
                          }
                        >
                          {
                            test.title
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          {editingAccess && (
            <div className="editing-banner">
              ✏️ Editing access for:
              <strong>
                {" "}
                {editingAccess.access.test_title}
              </strong>
            </div>
          )}

          <div className="date-grid">
            <div className="field-group">
              <label>
                Access Start
              </label>

              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) =>
                  setStartAt(
                    e.target.value
                  )
                }
                className="form-control"
              />
            </div>

            <div className="field-group">
              <label>
                Access End
              </label>

              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) =>
                  setEndAt(
                    e.target.value
                  )
                }
                className="form-control"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleGrantOrUpdateAccess
            }
            disabled={
              saving ||
              (!editingAccess &&
                !selectedStudent) ||
              (!editingAccess &&
                (accessType === "normal"
                  ? !selectedTest
                  : !selectedHtmlTest))
            }
            className="grant-button"
          >
            {saving
              ? "Saving..."
              : editingAccess
              ? "✓ Update Access Dates"
              : "✓ Grant Access"}
          </button>

          {editingAccess && (
            <button
              type="button"
              onClick={cancelEdit}
              className="cancel-button"
            >
              Cancel Editing
            </button>
          )}
        </section>
      </>
    )}

    <section className="future-panel">
      <div className="future-icon">
        📢
      </div>

      <div>
        <h3>
          Student Access & Communication
        </h3>

        <p>
          Access management is now active.
          Bulk student actions, exam-category
          controls, announcements and student
          notifications can be added next.
        </p>
      </div>
    </section>

    <footer>
      Mock Test Odisha • Student Access &
      Communication
    </footer>
  </div>

  <style jsx>{`
    * {
      box-sizing: border-box;
    }

    .access-page {
      min-height: 100vh;
      padding: 18px;
      background:
        linear-gradient(
          180deg,
          #eef5ff 0%,
          #f8fafc 45%,
          #ffffff 100%
        );
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #172554;
    }

    .access-container {
      width: 100%;
      max-width: 950px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 20px;
      margin-bottom: 18px;
      background: white;
      border: 1px solid #dbeafe;
      border-radius: 18px;
      box-shadow:
        0 8px 25px
        rgba(30, 58, 138, 0.07);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 15px;
      background: #fef3c7;
      font-size: 28px;
    }

    .header-label {
      margin-bottom: 4px;
      color: #2563eb;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 23px;
      line-height: 1.25;
      color: #172554;
    }

    .page-header p {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }

    .back-button {
      flex-shrink: 0;
      border: none;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
    }

    .back-button:hover {
      background: #dbeafe;
    }

    .message {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px 16px;
      margin-bottom: 16px;
      border-radius: 13px;
    }

    .message-icon {
      font-size: 20px;
    }

    .message strong {
      display: block;
      margin-bottom: 3px;
    }

    .message p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .error-message {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .success-message {
      background: #dcfce7;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .panel {
      padding: 22px;
      margin-bottom: 17px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow:
        0 5px 20px
        rgba(15, 23, 42, 0.05);
    }

    .panel-heading {
      margin-bottom: 20px;
    }

    .panel-heading > div {
      display: flex;
      align-items: flex-start;
      gap: 11px;
    }

    .step-number {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 800;
    }

    .panel-heading h2 {
      margin: 0;
      font-size: 18px;
      color: #172554;
    }

    .panel-heading p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 13px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 0 13px;
      height: 48px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      margin-bottom: 12px;
    }

    .search-box span {
      font-size: 18px;
    }

    .search-box input {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      color: #172554;
    }

    .clear-search {
      width: 27px;
      height: 27px;
      border: none;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      font-size: 18px;
      cursor: pointer;
    }

    .student-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      max-height: 330px;
      overflow-y: auto;
    }

    .student-row {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 11px;
      padding: 11px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: white;
      text-align: left;
      cursor: pointer;
    }

    .student-row:hover {
      background: #f8fbff;
      border-color: #93c5fd;
    }

    .student-avatar,
    .large-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 50%;
      background:
        linear-gradient(
          135deg,
          #2563eb,
          #4f46e5
        );
      color: white;
      font-weight: 800;
    }

    .student-avatar {
      width: 39px;
      height: 39px;
      font-size: 15px;
    }

    .student-row-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .student-row-info strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: #172554;
    }

    .student-row-info span {
      margin-top: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #64748b;
      font-size: 11px;
    }

    .row-arrow {
      color: #94a3b8;
      font-size: 19px;
    }

    .empty-state,
    .no-access {
      padding: 25px 15px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }

    .empty-state > div {
      margin-bottom: 7px;
      font-size: 28px;
    }

    .empty-state strong {
      display: block;
      color: #334155;
    }

    .empty-state p {
      margin: 5px 0 0;
      font-size: 12px;
    }

    .selected-student-card {
      padding: 17px;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      background: #f8fbff;
    }

    .selected-student-top {
      display: flex;
      align-items: center;
      gap: 13px;
    }

    .large-avatar {
      width: 54px;
      height: 54px;
      font-size: 20px;
    }

    .selected-student-main {
      flex: 1;
      min-width: 0;
    }

    .selected-label {
      display: block;
      margin-bottom: 3px;
      color: #2563eb;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .selected-student-main h3 {
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #172554;
      font-size: 17px;
    }

    .selected-student-main p {
      margin: 3px 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #64748b;
      font-size: 12px;
    }

    .change-button {
      flex-shrink: 0;
      padding: 8px 11px;
      border: 1px solid #bfdbfe;
      border-radius: 9px;
      background: white;
      color: #2563eb;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .access-loading {
      padding: 25px;
      text-align: center;
      color: #64748b;
    }

    .access-section {
      margin-bottom: 22px;
    }

    .access-section:last-child {
      margin-bottom: 0;
    }

    .access-section-title {
      margin-bottom: 9px;
      color: #172554;
      font-size: 14px;
      font-weight: 800;
    }

    .access-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .access-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 13px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
    }

    .access-card-main {
      min-width: 0;
      flex: 1;
    }

    .access-card-main > strong {
      display: block;
      color: #172554;
      font-size: 13px;
    }

    .access-dates {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 15px;
      margin-top: 6px;
      color: #64748b;
      font-size: 10px;
    }

    .access-card-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 6px;
    }

    .status-badge {
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 800;
    }

    .status-active {
      background: #dcfce7;
      color: #166534;
    }

    .status-ended,
    .status-expired {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-scheduled {
      background: #fef3c7;
      color: #92400e;
    }

    .small-button {
      border: none;
      border-radius: 8px;
      padding: 7px 9px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .edit-button {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .end-button {
      background: #fee2e2;
      color: #b91c1c;
    }

    .field-group {
      margin-bottom: 18px;
    }

    .field-group > label {
      display: block;
      margin-bottom: 7px;
      color: #334155;
      font-size: 13px;
      font-weight: 700;
    }

    .form-control {
      width: 100%;
      height: 47px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      outline: none;
      background: white;
      color: #172554;
      font-size: 14px;
    }

    .form-control:focus {
      border-color: #60a5fa;
      box-shadow:
        0 0 0 3px
        rgba(59, 130, 246, 0.1);
    }

    .access-type-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .access-type-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: white;
      text-align: left;
      cursor: pointer;
    }

    .access-type-card:hover {
      border-color: #93c5fd;
    }

    .access-type-card.active {
      border-color: #2563eb;
      background: #eff6ff;
      box-shadow:
        0 0 0 1px #2563eb;
    }

    .type-icon {
      width: 39px;
      height: 39px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: #f1f5f9;
      font-size: 19px;
    }

    .access-type-card.active
      .type-icon {
      background: #dbeafe;
    }

    .access-type-card strong,
    .access-type-card small {
      display: block;
    }

    .access-type-card strong {
      color: #172554;
      font-size: 13px;
    }

    .access-type-card small {
      margin-top: 3px;
      color: #64748b;
      font-size: 10px;
    }

    .date-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .editing-banner {
      padding: 12px;
      margin-bottom: 16px;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      background: #eff6ff;
      color: #1e40af;
      font-size: 12px;
    }

    .editing-banner strong {
      color: #172554;
    }

    .grant-button {
      width: 100%;
      height: 49px;
      border: none;
      border-radius: 11px;
      background: #2563eb;
      color: white;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
    }

    .grant-button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .grant-button:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .cancel-button {
      width: 100%;
      height: 44px;
      margin-top: 9px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: white;
      color: #475569;
      font-weight: 700;
      cursor: pointer;
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

    .future-icon {
      width: 43px;
      height: 43px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #dbeafe;
      font-size: 21px;
    }

    .future-panel h3 {
      margin: 0 0 5px;
      color: #172554;
      font-size: 15px;
    }

    .future-panel p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.55;
    }

    footer {
      padding: 24px 0 10px;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
    }

    @media (max-width: 600px) {
      .access-page {
        padding: 10px;
      }

      .page-header {
        align-items: flex-start;
        flex-direction: column;
        padding: 16px;
        border-radius: 15px;
      }

      .header-left {
        width: 100%;
      }

      .header-icon {
        width: 45px;
        height: 45px;
        border-radius: 12px;
        font-size: 24px;
      }

      .page-header h1 {
        font-size: 19px;
      }

      .page-header p {
        font-size: 12px;
      }

      .back-button {
        width: 100%;
      }

      .panel {
        padding: 16px;
        border-radius: 15px;
      }

      .access-type-grid,
      .date-grid {
        grid-template-columns: 1fr;
      }

      .access-card {
        align-items: flex-start;
        flex-direction: column;
      }

      .access-card-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .selected-student-top {
        align-items: flex-start;
      }

      .change-button {
        padding: 7px 9px;
      }
    }
  `}</style>
</main>

);
}
