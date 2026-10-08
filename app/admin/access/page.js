"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const emptyForm = {
  start_at: "",
  end_at: "",
};

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
}

function statusForStudent(student) {
  if (student.account_status === "suspended") return "Suspended";

  if (
    student.account_status === "expired" ||
    (student.access_expiry_date &&
      new Date(`${student.access_expiry_date}T23:59:59`) < new Date())
  ) {
    return "Expired";
  }

  return "Active";
}

function accessStatus(row) {
  if (!row.is_active) return "Locked";

  const now = new Date();

  if (row.start_at && new Date(row.start_at) > now) return "Scheduled";

  if (row.end_at && new Date(row.end_at) < now) return "Expired";

  return "Active";
}

export default function StudentAccessCommunicationPage() {
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restrictedTests, setRestrictedTests] = useState([]);
  const [paidHtmlTests, setPaidHtmlTests] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAccess, setStudentAccess] = useState([]);
  const [studentHtmlAccess, setStudentHtmlAccess] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);

  const [messages, setMessages] = useState([]);
  const [expiringStudents, setExpiringStudents] = useState([]);
  const [expiringCount, setExpiringCount] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [activeSection, setActiveSection] = useState("student");

  const [accessType, setAccessType] = useState("normal");
  const [selectedTest, setSelectedTest] = useState("");
  const [accessForm, setAccessForm] = useState(emptyForm);

  const [expiryDate, setExpiryDate] = useState("");
  const [newStatus, setNewStatus] = useState("active");

  const [selectedStudents, setSelectedStudents] = useState([]);

  const [bulkTestType, setBulkTestType] = useState("normal");
  const [bulkTestId, setBulkTestId] = useState("");
  const [bulkAction, setBulkAction] = useState("grant");
  const [bulkScope, setBulkScope] = useState("selected");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");

  const [messageForm, setMessageForm] = useState({
    title: "",
    message: "",
    message_type: "announcement",
    target_type: "all",
    target_category_id: "",
    display_location: "home",
    start_at: "",
    end_at: "",
  });

  const [messageRecipients, setMessageRecipients] = useState(null);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const text = search.trim().toLowerCase();

      const matchesSearch =
        !text ||
        String(student.full_name || "").toLowerCase().includes(text) ||
        String(student.student_id || "").toLowerCase().includes(text) ||
        String(student.email || "").toLowerCase().includes(text);

      const effectiveStatus = statusForStudent(student).toLowerCase();

      const matchesStatus =
        !statusFilter ||
        effectiveStatus === statusFilter.toLowerCase();

      const matchesCategory =
        !categoryFilter ||
        String(student.paid_exam_category_id || "") === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [students, search, statusFilter, categoryFilter]);

  async function loadInitial() {
    setLoading(true);
    setError("");

    const [
      studentResult,
      categoryResult,
      restrictedResult,
      htmlResult,
      messageResult,
      expiringResult,
      countResult,
    ] = await Promise.all([
      supabase.rpc("admin_get_students_for_access"),

      supabase
        .from("html_test_categories")
        .select(
          "id, name, access_type, parent_id, is_visible, display_order"
        )
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),

      supabase
        .from("tests")
        .select("id, title, slug, test_type, is_active")
        .eq("test_type", "restricted")
        .eq("is_active", true)
        .order("title", { ascending: true }),

      supabase.rpc("admin_get_paid_html_tests"),

      supabase.rpc("admin_get_student_messages"),

      supabase.rpc("admin_get_expiring_soon_students", {
        p_days: 7,
      }),

      supabase.rpc("admin_get_expiring_soon_count", {
        p_days: 7,
      }),
    ]);

    if (studentResult.error) {
      setError(studentResult.error.message);
    } else {
      setStudents(studentResult.data || []);
    }

    if (!categoryResult.error) {
      setCategories(categoryResult.data || []);
    }

    if (!restrictedResult.error) {
      setRestrictedTests(restrictedResult.data || []);
    }

    if (!htmlResult.error) {
      setPaidHtmlTests(htmlResult.data || []);
    }

    if (!messageResult.error) {
      setMessages(messageResult.data || []);
    }

    if (!expiringResult.error) {
      setExpiringStudents(expiringResult.data || []);
    }

    if (!countResult.error) {
      setExpiringCount(countResult.data || 0);
    }

    setLoading(false);
  }

  async function loadStudent(student) {
    setSelectedStudent(student);
    setError("");
    setSuccess("");

    const [normalResult, htmlResult, summaryResult, activityResult] =
      await Promise.all([
        supabase.rpc("admin_get_student_test_access", {
          p_user_id: student.id,
        }),

        supabase.rpc("admin_get_student_html_test_access", {
          p_user_id: student.id,
        }),

        supabase.rpc("admin_get_student_summary", {
          p_user_id: student.id,
        }),

        supabase.rpc("admin_get_student_activity", {
          p_user_id: student.id,
        }),
      ]);

    if (normalResult.error) {
      setError(normalResult.error.message);
      setStudentAccess([]);
    } else {
      setStudentAccess(normalResult.data || []);
    }

    if (htmlResult.error) {
      setError(htmlResult.error.message);
      setStudentHtmlAccess([]);
    } else {
      setStudentHtmlAccess(htmlResult.data || []);
    }

    if (summaryResult.error) {
      setSummary(null);
    } else {
      setSummary(summaryResult.data?.[0] || null);
    }

    if (activityResult.error) {
      setActivity([]);
    } else {
      setActivity(activityResult.data || []);
    }

    setExpiryDate(student.access_expiry_date || "");
    setNewStatus(student.account_status || "active");
  }

  useEffect(() => {
    loadInitial();
  }, []);

  async function refreshSelectedStudent() {
    if (!selectedStudent) {
      await loadInitial();
      return;
    }

    const currentId = selectedStudent.id;

    await loadInitial();

    const freshStudent = students.find((s) => s.id === currentId);

    if (freshStudent) {
      await loadStudent(freshStudent);
    }
  }

  async function updateExpiry() {
    if (!selectedStudent) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_update_student_expiry",
      {
        p_user_id: selectedStudent.id,
        p_expiry_date: expiryDate || null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Overall access expiry updated.");
      await loadInitial();

      const { data } = await supabase.rpc(
        "admin_get_students_for_access"
      );

      const fresh = (data || []).find(
        (student) => student.id === selectedStudent.id
      );

      if (fresh) {
        await loadStudent(fresh);
      }
    }

    setWorking(false);
  }

  async function endOverallAccess() {
    if (!selectedStudent) return;

    const ok = window.confirm(
      `End overall access for ${selectedStudent.full_name || "this student"} now?\n\nThis will immediately expire the student's overall access.`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_end_student_access_now",
      {
        p_user_id: selectedStudent.id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Overall access ended.");
      await loadInitial();

      const { data } = await supabase.rpc(
        "admin_get_students_for_access"
      );

      const fresh = (data || []).find(
        (student) => student.id === selectedStudent.id
      );

      if (fresh) await loadStudent(fresh);
    }

    setWorking(false);
  }

  async function changeStatus() {
    if (!selectedStudent) return;

    if (newStatus === "suspended") {
      const ok = window.confirm(
        `Suspend ${selectedStudent.full_name || "this student"}?\n\nSuspended students cannot access paid content.`
      );

      if (!ok) return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_set_student_status",
      {
        p_user_id: selectedStudent.id,
        p_status: newStatus,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(`Account status changed to ${newStatus}.`);
      await loadInitial();

      const { data } = await supabase.rpc(
        "admin_get_students_for_access"
      );

      const fresh = (data || []).find(
        (student) => student.id === selectedStudent.id
      );

      if (fresh) await loadStudent(fresh);
    }

    setWorking(false);
  }

  async function restoreAccount() {
    if (!selectedStudent) return;

    const ok = window.confirm(
      `Restore ${selectedStudent.full_name || "this student"}?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_restore_student_account",
      {
        p_user_id: selectedStudent.id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Student account restored.");
      await loadInitial();

      const { data } = await supabase.rpc(
        "admin_get_students_for_access"
      );

      const fresh = (data || []).find(
        (student) => student.id === selectedStudent.id
      );

      if (fresh) await loadStudent(fresh);
    }

    setWorking(false);
  }

  async function grantAccess() {
    if (!selectedStudent || !selectedTest) {
      setError("Select a student and test first.");
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    const payload = {
      p_user_id: selectedStudent.id,
      p_start_at: accessForm.start_at
        ? new Date(accessForm.start_at).toISOString()
        : null,
      p_end_at: accessForm.end_at
        ? new Date(accessForm.end_at).toISOString()
        : null,
    };

    let result;

    if (accessType === "normal") {
      result = await supabase.rpc("admin_grant_test_access", {
        p_test_id: selectedTest,
        ...payload,
      });
    } else {
      result = await supabase.rpc("admin_grant_html_test_access", {
        p_html_test_id: selectedTest,
        ...payload,
      });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess("Test access granted.");
      setSelectedTest("");

      const { data } = await supabase.rpc(
        accessType === "normal"
          ? "admin_get_student_test_access"
          : "admin_get_student_html_test_access",
        {
          p_user_id: selectedStudent.id,
        }
      );

      if (accessType === "normal") {
        setStudentAccess(data || []);
      } else {
        setStudentHtmlAccess(data || []);
      }

      await loadInitial();
    }

    setWorking(false);
  }

  async function endNormalAccess(row) {
    const ok = window.confirm(
      `End access to "${row.test_title}" for this student?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "admin_end_test_access",
      {
        p_test_id: row.test_id,
        p_user_id: selectedStudent.id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Test access ended.");
      await loadStudent(selectedStudent);
    }

    setWorking(false);
  }

  async function endHtmlAccess(row) {
    const ok = window.confirm(
      `End access to "${row.test_title}" for this student?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "admin_end_html_test_access",
      {
        p_html_test_id: row.html_test_id,
        p_user_id: selectedStudent.id,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("HTML test access ended.");
      await loadStudent(selectedStudent);
    }

    setWorking(false);
  }

  function toggleStudent(id) {
    setSelectedStudents((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAllFiltered() {
    setSelectedStudents(filteredStudents.map((student) => student.id));
  }

  function clearSelected() {
    setSelectedStudents([]);
  }

  async function getBulkUserIds() {
    if (bulkScope === "selected") {
      return selectedStudents;
    }

    if (bulkScope === "category") {
      if (!bulkCategory) return [];

      return students
        .filter(
          (student) =>
            String(student.paid_exam_category_id || "") ===
            String(bulkCategory)
        )
        .map((student) => student.id);
    }

    return students.map((student) => student.id);
  }

  async function bulkExpiry() {
    const ids = await getBulkUserIds();

    if (!ids.length) {
      setError("No students selected.");
      return;
    }

    const ok = window.confirm(
      `This will affect ${ids.length} student(s).\n\nChange their overall access expiry to ${
        expiryDate || "No expiry"
      }?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const rpc =
      bulkScope === "category"
        ? supabase.rpc("admin_update_category_expiry", {
            p_category_id: bulkCategory,
            p_expiry_date: expiryDate || null,
          })
        : supabase.rpc("admin_bulk_update_student_expiry", {
            p_user_ids: ids,
            p_expiry_date: expiryDate || null,
          });

    const { error: rpcError } = await rpc;

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(`${ids.length} student(s) updated.`);
      await loadInitial();
    }

    setWorking(false);
  }

  async function bulkStatus() {
    const ids = await getBulkUserIds();

    if (!ids.length) {
      setError("No students selected.");
      return;
    }

    const dangerous = newStatus === "suspended";

    if (dangerous) {
      const ok = window.confirm(
        `This will affect ${ids.length} student(s).\n\nSuspend all selected students?`
      );

      if (!ok) return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    let result;

    if (bulkScope === "category") {
      result = await supabase.rpc("admin_category_student_status", {
        p_category_id: bulkCategory,
        p_status: newStatus,
      });
    } else {
      result = await supabase.rpc("admin_bulk_set_student_status", {
        p_user_ids: ids,
        p_status: newStatus,
      });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(`${ids.length} student(s) updated.`);
      await loadInitial();
    }

    setWorking(false);
  }

  async function bulkRestore() {
    const ids = await getBulkUserIds();

    if (!ids.length) {
      setError("No students selected.");
      return;
    }

    const ok = window.confirm(
      `Restore access status for ${ids.length} student(s)?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_bulk_restore_student_accounts",
      {
        p_user_ids: ids,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(`${ids.length} student(s) restored.`);
      await loadInitial();
    }

    setWorking(false);
  }

  async function bulkEndOverall() {
    const ids = await getBulkUserIds();

    if (!ids.length) {
      setError("No students selected.");
      return;
    }

    const ok = window.confirm(
      `END overall access for ${ids.length} student(s)?\n\nThis action will immediately expire their overall access.`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    let result;

    if (bulkScope === "category") {
      result = await supabase.rpc("admin_end_category_access_now", {
        p_category_id: bulkCategory,
      });
    } else {
      result = await supabase.rpc(
        "admin_bulk_end_student_access_now",
        {
          p_user_ids: ids,
        }
      );
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(`${ids.length} student(s) access ended.`);
      await loadInitial();
    }

    setWorking(false);
  }

  async function bulkTestAccess() {
    const ids = await getBulkUserIds();

    if (!ids.length) {
      setError("No students selected.");
      return;
    }

    if (!bulkTestId) {
      setError("Select a test.");
      return;
    }

    const actionText =
      bulkAction === "grant" ? "give access to" : "remove access from";

    const ok = window.confirm(
      `This will ${actionText} ${ids.length} student(s).\n\nContinue?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    let result;

    if (bulkTestType === "normal") {
      if (bulkAction === "grant") {
        result = await supabase.rpc("admin_bulk_grant_test_access", {
          p_test_id: bulkTestId,
          p_user_ids: ids,
          p_start_at: bulkStart
            ? new Date(bulkStart).toISOString()
            : null,
          p_end_at: bulkEnd
            ? new Date(bulkEnd).toISOString()
            : null,
        });
      } else {
        result = await supabase.rpc("admin_bulk_end_test_access", {
          p_test_id: bulkTestId,
          p_user_ids: ids,
        });
      }
    } else {
      if (bulkAction === "grant") {
        result = await supabase.rpc(
          "admin_bulk_grant_html_test_access",
          {
            p_html_test_id: bulkTestId,
            p_user_ids: ids,
            p_start_at: bulkStart
              ? new Date(bulkStart).toISOString()
              : null,
            p_end_at: bulkEnd
              ? new Date(bulkEnd).toISOString()
              : null,
          }
        );
      } else {
        result = await supabase.rpc(
          "admin_bulk_end_html_test_access",
          {
            p_html_test_id: bulkTestId,
            p_user_ids: ids,
          }
        );
      }
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(
        `${ids.length} student(s) ${
          bulkAction === "grant" ? "granted" : "removed"
        }.`
      );
      await loadInitial();
    }

    setWorking(false);
  }

  async function createMessage() {
    if (!messageForm.title.trim() || !messageForm.message.trim()) {
      setError("Enter a title and message.");
      return;
    }

    let recipientIds = [];

    if (messageForm.target_type === "selected") {
      recipientIds = selectedStudents;

      if (!recipientIds.length) {
        setError("Select at least one student.");
        return;
      }
    }

    if (
      messageForm.target_type === "category" &&
      !messageForm.target_category_id
    ) {
      setError("Select an exam category.");
      return;
    }

    const targetDescription =
      messageForm.target_type === "all"
        ? "all students"
        : messageForm.target_type === "category"
        ? "students in the selected category"
        : `${recipientIds.length} selected student(s)`;

    const ok = window.confirm(
      `Create this message for ${targetDescription}?`
    );

    if (!ok) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc(
      "admin_create_student_message",
      {
        p_title: messageForm.title.trim(),
        p_message: messageForm.message.trim(),
        p_message_type: messageForm.message_type,
        p_target_type: messageForm.target_type,
        p_target_category_id:
          messageForm.target_type === "category"
            ? messageForm.target_category_id
            : null,
        p_display_location: messageForm.display_location,
        p_start_at: messageForm.start_at
          ? new Date(messageForm.start_at).toISOString()
          : new Date().toISOString(),
        p_end_at: messageForm.end_at
          ? new Date(messageForm.end_at).toISOString()
          : null,
        p_user_ids:
          messageForm.target_type === "selected"
            ? recipientIds
            : null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Message created successfully.");

      setMessageForm({
        title: "",
        message: "",
        message_type: "announcement",
        target_type: "all",
        target_category_id: "",
        display_location: "home",
        start_at: "",
        end_at: "",
      });

      const { data } = await supabase.rpc(
        "admin_get_student_messages"
      );

      setMessages(data || []);
    }

    setWorking(false);
  }

  async function deactivateMessage(messageId) {
    const ok = window.confirm(
      "Deactivate this message? Students will no longer see it."
    );

    if (!ok) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "admin_deactivate_student_message",
      {
        p_message_id: messageId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Message deactivated.");

      const { data } = await supabase.rpc(
        "admin_get_student_messages"
      );

      setMessages(data || []);
    }

    setWorking(false);
  }

  async function viewRecipients(messageId) {
    setWorking(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_message_recipients",
      {
        p_message_id: messageId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setMessageRecipients(null);
    } else {
      setMessageRecipients(data || []);
    }

    setWorking(false);
  }

  async function showExpiring() {
    setActiveSection("expiring");

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_expiring_soon_students",
      {
        p_days: 7,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setExpiringStudents(data || []);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-card">
          <div className="spinner" />
          <h2>Loading Student Access & Communication...</h2>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="eyebrow">👥 ADMIN CONTROL CENTER</div>
          <h1>Student Access & Communication</h1>
          <p>
            Manage student accounts, access, tests, messages and activity
            from one place.
          </p>
        </div>

        <a href="/admin" className="back-button">
          ← Dashboard
        </a>
      </header>

      {error && (
        <div className="alert error">
          <strong>⚠️ Error</strong>
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="alert success">
          <strong>✓ Success</strong>
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {expiringCount > 0 && (
        <button
          className="expiring-banner"
          onClick={showExpiring}
        >
          ⚠️ <strong>{expiringCount}</strong> student(s) have access
          expiring within 7 days. Tap to review.
        </button>
      )}

      <nav className="tabs">
        <button
          className={activeSection === "student" ? "tab active" : "tab"}
          onClick={() => setActiveSection("student")}
        >
          🔐 Student Access
        </button>

        <button
          className={activeSection === "bulk" ? "tab active" : "tab"}
          onClick={() => setActiveSection("bulk")}
        >
          👥 Bulk Operations
        </button>

        <button
          className={activeSection === "messages" ? "tab active" : "tab"}
          onClick={() => setActiveSection("messages")}
        >
          📢 Messages
        </button>

        <button
          className={activeSection === "expiring" ? "tab active" : "tab"}
          onClick={showExpiring}
        >
          ⏰ Expiring Soon
        </button>
      </nav>

      {activeSection === "student" && (
        <section className="grid">
          <div className="panel student-panel">
            <div className="panel-title">
              <span className="number">1</span>
              <div>
                <h2>Select Student</h2>
                <p>
                  Search by name, Student ID / Roll Number or email.
                </p>
              </div>
            </div>

            <input
              className="search"
              placeholder="🔎 Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="filters">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories
                  .filter((category) => category.access_type === "paid")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="student-count">
              Showing {filteredStudents.length} of {students.length}
            </div>

            <div className="student-list">
              {filteredStudents.map((student) => {
                const status = statusForStudent(student);

                return (
                  <button
                    key={student.id}
                    className={
                      selectedStudent?.id === student.id
                        ? "student-card selected"
                        : "student-card"
                    }
                    onClick={() => loadStudent(student)}
                  >
                    <div className="student-avatar">
                      {(student.full_name || "S").charAt(0).toUpperCase()}
                    </div>

                    <div className="student-info">
                      <strong>
                        {student.full_name || "Unnamed Student"}
                      </strong>

                      <span>
                        {student.student_id || "No Student ID"} •{" "}
                        {student.email || "No email"}
                      </span>

                      <small>
                        {student.exam_category || "No exam category"}
                      </small>
                    </div>

                    <span className={`status ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </button>
                );
              })}

              {!filteredStudents.length && (
                <div className="empty">
                  No students match the current filters.
                </div>
              )}
            </div>
          </div>

          <div>
            {!selectedStudent ? (
              <div className="panel empty-large">
                <div className="big-icon">👤</div>
                <h2>Select a student</h2>
                <p>
                  Select a student from the list to manage their
                  complete access and communication settings.
                </p>
              </div>
            ) : (
              <>
                <div className="panel">
                  <div className="panel-title">
                    <span className="number">2</span>
                    <div>
                      <h2>Student Profile</h2>
                      <p>Complete account and access information.</p>
                    </div>
                  </div>

                  <div className="profile-grid">
                    <div>
                      <label>Name</label>
                      <strong>
                        {selectedStudent.full_name || "Not set"}
                      </strong>
                    </div>

                    <div>
                      <label>Student ID</label>
                      <strong>
                        {selectedStudent.student_id || "Not set"}
                      </strong>
                    </div>

                    <div>
                      <label>Email</label>
                      <strong>
                        {selectedStudent.email || "Not set"}
                      </strong>
                    </div>

                    <div>
                      <label>Exam Category</label>
                      <strong>
                        {selectedStudent.exam_category || "Not set"}
                      </strong>
                    </div>

                    <div>
                      <label>Account Status</label>
                      <span
                        className={`status ${statusForStudent(
                          selectedStudent
                        ).toLowerCase()}`}
                      >
                        {statusForStudent(selectedStudent)}
                      </span>
                    </div>

                    <div>
                      <label>Overall Access Until</label>
                      <strong>
                        {formatDateOnly(
                          selectedStudent.access_expiry_date
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <span className="number">3</span>
                    <div>
                      <h2>Overall Access Control</h2>
                      <p>
                        This controls the student's overall paid
                        access. It is separate from individual tests.
                      </p>
                    </div>
                  </div>

                  <div className="control-row">
                    <div className="field">
                      <label>Access Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) =>
                          setExpiryDate(e.target.value)
                        }
                      />
                    </div>

                    <button
                      className="primary"
                      disabled={working}
                      onClick={updateExpiry}
                    >
                      ✓ Update Expiry
                    </button>

                    <button
                      className="danger"
                      disabled={working}
                      onClick={endOverallAccess}
                    >
                      ⛔ End Access Now
                    </button>
                  </div>

                  <div className="control-row">
                    <div className="field">
                      <label>Account Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) =>
                          setNewStatus(e.target.value)
                        }
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <button
                      className="secondary"
                      disabled={working}
                      onClick={changeStatus}
                    >
                      Change Status
                    </button>

                    {(selectedStudent.account_status ===
                      "suspended" ||
                      selectedStudent.account_status ===
                        "expired") && (
                      <button
                        className="primary"
                        disabled={working}
                        onClick={restoreAccount}
                      >
                        ↻ Restore Account
                      </button>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <span className="number">4</span>
                    <div>
                      <h2>Student Summary</h2>
                      <p>Current account and test summary.</p>
                    </div>
                  </div>

                  <div className="stats">
                    <div className="stat">
                      <strong>
                        {summary?.tests_available ?? 0}
                      </strong>
                      <span>Tests Available</span>
                    </div>

                    <div className="stat">
                      <strong>
                        {summary?.tests_attempted ?? 0}
                      </strong>
                      <span>Tests Attempted</span>
                    </div>

                    <div className="stat">
                      <strong>
                        {summary?.average_score
                          ? `${Number(
                              summary.average_score
                            ).toFixed(1)}%`
                          : "0%"}
                      </strong>
                      <span>Average Score</span>
                    </div>

                    <div className="stat">
                      <strong>
                        {summary?.last_attempt
                          ? formatDate(summary.last_attempt)
                          : "Never"}
                      </strong>
                      <span>Last Attempt</span>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <span className="number">5</span>
                    <div>
                      <h2>Current Test Access</h2>
                      <p>
                        Review, extend or end this student's test
                        access.
                      </p>
                    </div>
                  </div>

                  <h3>📝 Restricted Tests</h3>

                  {studentAccess.length === 0 ? (
                    <div className="empty">
                      No restricted-test access found.
                    </div>
                  ) : (
                    <div className="access-list">
                      {studentAccess.map((row) => (
                        <div className="access-card" key={row.access_id}>
                          <div>
                            <strong>{row.test_title}</strong>

                            <span
                              className={`status ${accessStatus(
                                row
                              ).toLowerCase()}`}
                            >
                              {accessStatus(row)}
                            </span>

                            <small>
                              Start: {formatDate(row.start_at)}
                            </small>

                            <small>
                              End: {formatDate(row.end_at)}
                            </small>
                          </div>

                          {row.is_active && (
                            <button
                              className="danger small"
                              disabled={working}
                              onClick={() =>
                                endNormalAccess(row)
                              }
                            >
                              End
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <h3>🌐 Paid HTML Tests</h3>

                  {studentHtmlAccess.length === 0 ? (
                    <div className="empty">
                      No paid HTML-test access found.
                    </div>
                  ) : (
                    <div className="access-list">
                      {studentHtmlAccess.map((row) => (
                        <div className="access-card" key={row.access_id}>
                          <div>
                            <strong>{row.test_title}</strong>

                            <span
                              className={`status ${accessStatus(
                                row
                              ).toLowerCase()}`}
                            >
                              {accessStatus(row)}
                            </span>

                            <small>
                              Start: {formatDate(row.start_at)}
                            </small>

                            <small>
                              End: {formatDate(row.end_at)}
                            </small>
                          </div>

                          {row.is_active && (
                            <button
                              className="danger small"
                              disabled={working}
                              onClick={() =>
                                endHtmlAccess(row)
                              }
                            >
                              End
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <span className="number">6</span>
                    <div>
                      <h2>Give Test Access</h2>
                      <p>
                        Give this student access to a restricted
                        test or paid HTML test.
                      </p>
                    </div>
                  </div>

                  <div className="type-switch">
                    <button
                      className={
                        accessType === "normal" ? "active" : ""
                      }
                      onClick={() => {
                        setAccessType("normal");
                        setSelectedTest("");
                      }}
                    >
                      📝 Normal Test
                    </button>

                    <button
                      className={
                        accessType === "html" ? "active" : ""
                      }
                      onClick={() => {
                        setAccessType("html");
                        setSelectedTest("");
                      }}
                    >
                      🌐 Paid HTML Test
                    </button>
                  </div>

                  <div className="field">
                    <label>
                      {accessType === "normal"
                        ? "Restricted Test"
                        : "Paid HTML Test"}
                    </label>

                    <select
                      value={selectedTest}
                      onChange={(e) =>
                        setSelectedTest(e.target.value)
                      }
                    >
                      <option value="">Select a test</option>

                      {accessType === "normal"
                        ? restrictedTests.map((test) => (
                            <option key={test.id} value={test.id}>
                              {test.title}
                            </option>
                          ))
                        : paidHtmlTests.map((test) => (
                            <option key={test.id} value={test.id}>
                              {test.title}
                            </option>
                          ))}
                    </select>
                  </div>

                  {accessType === "normal" &&
                    restrictedTests.length === 0 && (
                      <div className="warning">
                        ⚠️ No active restricted tests are available.
                      </div>
                    )}

                  <div className="date-grid">
                    <div className="field">
                      <label>Access Start</label>
                      <input
                        type="datetime-local"
                        value={accessForm.start_at}
                        onChange={(e) =>
                          setAccessForm({
                            ...accessForm,
                            start_at: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Access End</label>
                      <input
                        type="datetime-local"
                        value={accessForm.end_at}
                        onChange={(e) =>
                          setAccessForm({
                            ...accessForm,
                            end_at: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <button
                    className="primary wide"
                    disabled={working || !selectedTest}
                    onClick={grantAccess}
                  >
                    ✓ Give Access
                  </button>
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <span className="number">7</span>
                    <div>
                      <h2>Activity History</h2>
                      <p>
                        Account changes and access actions performed
                        by administrators.
                      </p>
                    </div>
                  </div>

                  {activity.length === 0 ? (
                    <div className="empty">
                      No activity recorded yet.
                    </div>
                  ) : (
                    <div className="timeline">
                      {activity.map((item) => (
                        <div className="timeline-item" key={item.id}>
                          <div className="timeline-dot">•</div>

                          <div>
                            <strong>{item.description}</strong>

                            <span>
                              {item.activity_type} •{" "}
                              {formatDate(item.created_at)}
                            </span>

                            <small>
                              By: {item.actor_name || "System"}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {activeSection === "bulk" && (
        <section className="bulk-layout">
          <div className="panel">
            <div className="panel-title">
              <span className="number">1</span>
              <div>
                <h2>Bulk Student Selection</h2>
                <p>Select students or operate on an entire category.</p>
              </div>
            </div>

            <div className="bulk-buttons">
              <button
                className="secondary"
                onClick={selectAllFiltered}
              >
                Select All
              </button>

              <button
                className="secondary"
                onClick={clearSelected}
              >
                Clear
              </button>
            </div>

            <div className="bulk-count">
              {selectedStudents.length} student(s) selected
            </div>

            <div className="student-list compact">
              {filteredStudents.map((student) => (
                <label className="check-student" key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />

                  <span>
                    <strong>
                      {student.full_name || "Unnamed"}
                    </strong>

                    <small>
                      {student.student_id || "No ID"} •{" "}
                      {student.email || "No email"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="panel">
              <div className="panel-title">
                <span className="number">2</span>
                <div>
                  <h2>Operation Scope</h2>
                  <p>Choose who the operation affects.</p>
                </div>
              </div>

              <div className="scope-grid">
                <label className="radio-card">
                  <input
                    type="radio"
                    checked={bulkScope === "selected"}
                    onChange={() => setBulkScope("selected")}
                  />
                  <span>
                    <strong>Selected Students</strong>
                    <small>
                      {selectedStudents.length} selected
                    </small>
                  </span>
                </label>

                <label className="radio-card">
                  <input
                    type="radio"
                    checked={bulkScope === "category"}
                    onChange={() => setBulkScope("category")}
                  />
                  <span>
                    <strong>Entire Category</strong>
                    <small>All students in category</small>
                  </span>
                </label>

                <label className="radio-card">
                  <input
                    type="radio"
                    checked={bulkScope === "all"}
                    onChange={() => setBulkScope("all")}
                  />
                  <span>
                    <strong>All Students</strong>
                    <small>{students.length} students</small>
                  </span>
                </label>
              </div>

              {bulkScope === "category" && (
                <div className="field">
                  <label>Exam Category</label>

                  <select
                    value={bulkCategory}
                    onChange={(e) =>
                      setBulkCategory(e.target.value)
                    }
                  >
                    <option value="">Select category</option>

                    {categories
                      .filter(
                        (category) =>
                          category.access_type === "paid"
                      )
                      .map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-title">
                <span className="number">3</span>
                <div>
                  <h2>Overall Access Operation</h2>
                  <p>Change expiry or account status.</p>
                </div>
              </div>

              <div className="field">
                <label>New Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) =>
                    setExpiryDate(e.target.value)
                  }
                />
              </div>

              <div className="action-row">
                <button
                  className="primary"
                  disabled={working}
                  onClick={bulkExpiry}
                >
                  📅 Change / Extend Expiry
                </button>

                <button
                  className="danger"
                  disabled={working}
                  onClick={bulkEndOverall}
                >
                  ⛔ End Access Now
                </button>
              </div>

              <div className="field">
                <label>Status</label>

                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value)
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
             
