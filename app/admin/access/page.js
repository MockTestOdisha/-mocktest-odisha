"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function toInputDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function statusForStudent(student) {
  if (!student) return "Unknown";

  if (student.access_expiry_date) {
    const expiry = new Date(`${student.access_expiry_date}T23:59:59`);

    if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
      return "Expired";
    }
  }

  if (student.is_paid) return "Active";

  return "Student";
}

export default function AdminAccessPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [normalAccess, setNormalAccess] = useState([]);
  const [htmlAccess, setHtmlAccess] = useState([]);

  const [restrictedTests, setRestrictedTests] = useState([]);
  const [paidHtmlTests, setPaidHtmlTests] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedHtmlTestId, setSelectedHtmlTestId] = useState("");
  const [accessType, setAccessType] = useState("normal");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [bulkScope, setBulkScope] = useState("all");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkTestId, setBulkTestId] = useState("");
  const [bulkHtmlTestId, setBulkHtmlTestId] = useState("");
  const [bulkAccessType, setBulkAccessType] = useState("normal");
  const [bulkStartAt, setBulkStartAt] = useState("");
  const [bulkEndAt, setBulkEndAt] = useState("");

  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageTarget, setMessageTarget] = useState("all");
  const [messageSelected, setMessageSelected] = useState([]);
  const [messageStartAt, setMessageStartAt] = useState("");
  const [messageEndAt, setMessageEndAt] = useState("");

  const [activeSection, setActiveSection] = useState("student");

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const [
        studentsResult,
        testsResult,
        htmlResult,
        categoriesResult,
      ] = await Promise.all([
        supabase.rpc("admin_get_students_for_access"),

        supabase
          .from("tests")
          .select("id,title,test_type,is_active")
          .eq("test_type", "restricted")
          .eq("is_active", true)
          .order("title"),

        supabase.rpc("admin_get_paid_html_tests"),

        supabase
          .from("html_test_categories")
          .select(
            "id,name,access_type,parent_id,is_visible,display_order"
          )
          .eq("is_visible", true)
          .order("display_order")
          .order("name"),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (testsResult.error) throw testsResult.error;
      if (htmlResult.error) throw htmlResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setStudents(studentsResult.data || []);
      setRestrictedTests(testsResult.data || []);
      setPaidHtmlTests(htmlResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load Student Access & Communication.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return students;

    return students.filter((student) => {
      const name = String(student.full_name || "").toLowerCase();
      const studentId = String(student.student_id || "").toLowerCase();
      const email = String(student.email || "").toLowerCase();

      return (
        name.includes(q) ||
        studentId.includes(q) ||
        email.includes(q)
      );
    });
  }, [students, search]);

  const selectedStudentNormalAccess = useMemo(
    () => normalAccess || [],
    [normalAccess]
  );

  const selectedStudentHtmlAccess = useMemo(
    () => htmlAccess || [],
    [htmlAccess]
  );

  const bulkStudents = useMemo(() => {
    if (bulkScope === "all") {
      return students;
    }

    if (bulkScope === "category") {
      return students.filter(
        (student) =>
          String(student.paid_exam_category_id || "") ===
          String(bulkCategory || "")
      );
    }

    if (bulkScope === "selected") {
      return students.filter((student) =>
        bulkSelected.includes(student.id)
      );
    }

    return [];
  }, [students, bulkScope, bulkCategory, bulkSelected]);

  const messageRecipients = useMemo(() => {
    if (messageTarget === "all") {
      return students;
    }

    return students.filter((student) =>
      messageSelected.includes(student.id)
    );
  }, [students, messageTarget, messageSelected]);

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

      if (normalResult.error) throw normalResult.error;
      if (htmlResult.error) throw htmlResult.error;

      setNormalAccess(normalResult.data || []);
      setHtmlAccess(htmlResult.data || []);
    } catch (err) {
      console.error(err);
      setNormalAccess([]);
      setHtmlAccess([]);
      setError(err.message || "Failed to load student access.");
    }
  }

  function clearStudent() {
    setSelectedStudent(null);
    setNormalAccess([]);
    setHtmlAccess([]);
    setMessage("");
    setError("");
  }

  async function refreshSelectedStudent() {
    if (!selectedStudent) return;

    await selectStudent(selectedStudent);
    await loadPage();
  }

  async function grantIndividualAccess(event) {
    event.preventDefault();

    if (!selectedStudent) {
      setError("Select a student first.");
      return;
    }

    if (accessType === "normal" && !selectedTestId) {
      setError("Select a Normal Test.");
      return;
    }

    if (accessType === "html" && !selectedHtmlTestId) {
      setError("Select an HTML Test.");
      return;
    }

    if (!startAt || !endAt) {
      setError("Please select both Access Start and Access End.");
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Invalid access dates.");
      return;
    }

    if (end <= start) {
      setError("Access End must be after Access Start.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (accessType === "normal") {
        const { error: grantError } = await supabase.rpc(
          "admin_grant_test_access",
          {
            p_user_id: selectedStudent.id,
            p_test_id: selectedTestId,
            p_start_at: start.toISOString(),
            p_end_at: end.toISOString(),
          }
        );

        if (grantError) throw grantError;
      } else {
        const { error: grantError } = await supabase.rpc(
          "admin_grant_html_test_access",
          {
            p_user_id: selectedStudent.id,
            p_html_test_id: selectedHtmlTestId,
            p_start_at: start.toISOString(),
            p_end_at: end.toISOString(),
          }
        );

        if (grantError) throw grantError;
      }

      setMessage("Access granted successfully.");

      await refreshSelectedStudent();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to grant access.");
    } finally {
      setSaving(false);
    }
  }

  async function endNormalAccess(access) {
    const testName =
      access.test_title ||
      access.title ||
      access.test_name ||
      "this test";

    if (
      !window.confirm(
        `End access to "${testName}" for ${
          selectedStudent?.full_name || "this student"
        }?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: endError } = await supabase.rpc(
        "admin_end_test_access",
        {
          p_access_id: access.id,
        }
      );

      if (endError) throw endError;

      setMessage("Normal Test access ended.");
      await refreshSelectedStudent();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to end access.");
    } finally {
      setSaving(false);
    }
  }

  async function endHtmlAccess(access) {
    const testName =
      access.html_test_title ||
      access.test_title ||
      access.title ||
      "this HTML test";

    if (
      !window.confirm(
        `End access to "${testName}" for ${
          selectedStudent?.full_name || "this student"
        }?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: endError } = await supabase.rpc(
        "admin_end_html_test_access",
        {
          p_access_id: access.id,
        }
      );

      if (endError) throw endError;

      setMessage("HTML Test access ended.");
      await refreshSelectedStudent();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to end HTML access.");
    } finally {
      setSaving(false);
    }
  }

  async function grantBulkAccess(event) {
    event.preventDefault();

    if (!bulkStudents.length) {
      setError("No students match the selected target.");
      return;
    }

    if (bulkAccessType === "normal" && !bulkTestId) {
      setError("Select a Normal Test.");
      return;
    }

    if (bulkAccessType === "html" && !bulkHtmlTestId) {
      setError("Select an HTML Test.");
      return;
    }

    if (!bulkStartAt || !bulkEndAt) {
      setError("Please select both bulk Access Start and Access End.");
      return;
    }

    const start = new Date(bulkStartAt);
    const end = new Date(bulkEndAt);

    if (end <= start) {
      setError("Bulk Access End must be after Access Start.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let successCount = 0;
      let failureCount = 0;
      let firstError = null;

      for (const student of bulkStudents) {
        try {
          if (bulkAccessType === "normal") {
            const { error: grantError } = await supabase.rpc(
              "admin_grant_test_access",
              {
                p_user_id: student.id,
                p_test_id: bulkTestId,
                p_start_at: start.toISOString(),
                p_end_at: end.toISOString(),
              }
            );

            if (grantError) throw grantError;
          } else {
            const { error: grantError } = await supabase.rpc(
              "admin_grant_html_test_access",
              {
                p_user_id: student.id,
                p_html_test_id: bulkHtmlTestId,
                p_start_at: start.toISOString(),
                p_end_at: end.toISOString(),
              }
            );

            if (grantError) throw grantError;
          }

          successCount += 1;
        } catch (err) {
          failureCount += 1;

          if (!firstError) {
            firstError = err;
          }
        }
      }

      if (failureCount) {
        setMessage(
          `Access granted to ${successCount} student(s). ${failureCount} failed.`
        );

        if (firstError) {
          setError(firstError.message || "Some grants failed.");
        }
      } else {
        setMessage(
          `Access granted successfully to ${successCount} student(s).`
        );
      }

      await loadPage();

      if (selectedStudent) {
        await selectStudent(selectedStudent);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Bulk access failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggleBulkStudent(studentId) {
    setBulkSelected((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleMessageStudent(studentId) {
    setMessageSelected((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function publishMessage(event) {
    event.preventDefault();

    if (!messageTitle.trim()) {
      setError("Enter a message title.");
      return;
    }

    if (!messageBody.trim()) {
      setError("Enter the message.");
      return;
    }

    if (
      messageTarget === "selected" &&
      messageSelected.length === 0
    ) {
      setError("Select at least one student.");
      return;
    }

    if (messageStartAt && messageEndAt) {
      const start = new Date(messageStartAt);
      const end = new Date(messageEndAt);

      if (end <= start) {
        setError("Message end time must be after the start time.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Admin session not found.");
      }

      const recipients =
        messageTarget === "selected"
          ? messageSelected
          : null;

      const { error: insertError } = await supabase
        .from("student_messages")
        .insert({
          title: messageTitle.trim(),
          message: messageBody.trim(),
          message_type: "announcement",
          target_type: messageTarget,
          target_student_ids: recipients,
          target_category_id: null,
          display_location: "home",
          start_at: messageStartAt
            ? new Date(messageStartAt).toISOString()
            : new Date().toISOString(),
          end_at: messageEndAt
            ? new Date(messageEndAt).toISOString()
            : null,
          is_active: true,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setMessage("Message published successfully.");

      setMessageTitle("");
      setMessageBody("");
      setMessageTarget("all");
      setMessageSelected([]);
      setMessageStartAt("");
      setMessageEndAt("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to publish message.");
    } finally {
      setSaving(false);
    }
  }

  function manageSubscription() {
    if (!selectedStudent) return;

    setMessage(
      "Subscription management is handled through the student's profile/category settings."
    );
  }

  function viewTestHistory() {
    if (!selectedStudent) return;

    setActiveSection("student");
    setMessage(
      "Test history is available from Attempts & Results. The student's access records are shown below."
    );
  }

  function suspendAccess() {
    if (!selectedStudent) return;

    setError(
      "Suspend Access is not available yet because the profiles table has no suspension field."
    );
  }

  async function endAllAccess() {
    if (!selectedStudent) return;

    const total =
      selectedStudentNormalAccess.length +
      selectedStudentHtmlAccess.length;

    if (!total) {
      setMessage("This student has no active access records.");
      return;
    }

    if (
      !window.confirm(
        `End all ${total} access record(s) for ${selectedStudent.full_name}?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      for (const access of selectedStudentNormalAccess) {
        await supabase.rpc("admin_end_test_access", {
          p_access_id: access.id,
        });
      }

      for (const access of selectedStudentHtmlAccess) {
        await supabase.rpc("admin_end_html_test_access", {
          p_access_id: access.id,
        });
      }

      setMessage("All student access has been ended.");

      await refreshSelectedStudent();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to end all access.");
    } finally {
      setSaving(false);
    }
  }

  const selectedStatus = statusForStudent(selectedStudent);

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f7fb;
        }

        .page {
          min-height: 100vh;
          padding: 24px;
          background: #f5f7fb;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .header {
          background: #ffffff;
          border: 1px solid #e5e9f2;
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 18px;
          box-shadow: 0 8px 30px rgba(20, 32, 56, 0.05);
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #667085;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.2;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #667085;
          font-size: 14px;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .tab {
          border: 1px solid #dce2ec;
          background: #ffffff;
          color: #344054;
          border-radius: 12px;
          padding: 13px 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
        }

        .tab.active {
          background: #172033;
          color: #ffffff;
          border-color: #172033;
        }

        .notice {
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 600;
        }

        .success {
          background: #ecfdf3;
          border: 1px solid #a7f3d0;
          color: #047857;
        }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .section {
          background: #ffffff;
          border: 1px solid #e5e9f2;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
          box-shadow: 0 8px 30px rgba(20, 32, 56, 0.04);
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .sectionHeader h2 {
          margin: 0;
          font-size: 19px;
        }

        .sectionHeader p {
          margin: 5px 0 0;
          color: #667085;
          font-size: 13px;
        }

        .searchBox {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #d8dee9;
          border-radius: 10px;
          background: #ffffff;
          color: #172033;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #667085;
          box-shadow: 0 0 0 3px rgba(102, 112, 133, 0.08);
        }

        textarea {
          min-height: 130px;
          resize: vertical;
        }

        .studentList {
          display: grid;
          gap: 8px;
          max-height: 330px;
          overflow-y: auto;
        }

        .studentItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #e5e9f2;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          background: #ffffff;
        }

        .studentItem:hover {
          background: #f8fafc;
        }

        .studentItem.selected {
          border-color: #172033;
          background: #f8fafc;
        }

        .studentInfo strong {
          display: block;
          font-size: 14px;
          margin-bottom: 3px;
        }

        .studentInfo span {
          display: block;
          color: #667085;
          font-size: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          background: #eef2f6;
          color: #475467;
        }

        .profileCard {
          border: 1px solid #dce2ec;
          border-radius: 15px;
          padding: 17px;
          margin-top: 18px;
          background: #fbfcfe;
        }

        .profileTop {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .profileTop h3 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .profileTop p {
          margin: 0;
          color: #667085;
          font-size: 13px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .stat {
          border: 1px solid #e5e9f2;
          border-radius: 11px;
          padding: 12px;
          background: #ffffff;
        }

        .stat span {
          display: block;
          color: #667085;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .stat strong {
          display: block;
          font-size: 13px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        button {
          border: 0;
          border-radius: 10px;
          padding: 10px 13px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .primary {
          background: #172033;
          color: #ffffff;
        }

        .secondary {
          background: #eef2f6;
          color: #344054;
        }

        .danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .accessRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border: 1px solid #e5e9f2;
          border-radius: 12px;
          padding: 13px;
          margin-bottom: 9px;
          background: #ffffff;
        }

        .accessRow strong {
          font-size: 13px;
          display: block;
          margin-bottom: 4px;
        }

        .accessRow small {
          color: #667085;
          font-size: 11px;
        }

        .accessRows {
          margin-top: 14px;
        }

        .empty {
          border: 1px dashed #d8dee9;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          color: #667085;
          font-size: 13px;
        }

        .checkList {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          max-height: 320px;
          overflow-y: auto;
          border: 1px solid #e5e9f2;
          border-radius: 12px;
          padding: 10px;
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #eef1f5;
          border-radius: 9px;
          padding: 9px;
          background: #ffffff;
          font-size: 12px;
        }

        .check input {
          width: auto;
        }

        .count {
          color: #667085;
          font-size: 12px;
          font-weight: 700;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #667085;
        }

        @media (max-width: 850px) {
          .page {
            padding: 12px;
          }

          .tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .checkList {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .header,
          .section {
            padding: 15px;
            border-radius: 14px;
          }

          h1 {
            font-size: 23px;
          }

          .tabs {
            grid-template-columns: 1fr 1fr;
          }

          .grid {
            grid-template-columns: 1fr 1fr;
          }

          .profileTop {
            flex-direction: column;
          }

          .accessRow {
            align-items: flex-start;
            flex-direction: column;
          }

          .searchBox {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container">
        <header className="header">
          <p className="eyebrow">ADMIN CONTROL CENTER</p>
          <h1>Student Access & Communication</h1>
          <p className="subtitle">
            Manage student access, bulk permissions and student messages.
          </p>
        </header>

        <div className="tabs">
          <button
            className={`tab ${
              activeSection === "student" ? "active" : ""
            }`}
            onClick={() => setActiveSection("student")}
          >
            🔎 Search & Select Student
          </button>

          <button
            className={`tab ${
              activeSection === "access" ? "active" : ""
            }`}
            onClick={() => setActiveSection("access")}
          >
            📚 Test / Mock Access
          </button>

          <button
            className={`tab ${
              activeSection === "bulk" ? "active" : ""
            }`}
            onClick={() => setActiveSection("bulk")}
          >
            👥 Give Access to Everyone
          </button>

          <button
            className={`tab ${
              activeSection === "messages" ? "active" : ""
            }`}
            onClick={() => setActiveSection("messages")}
          >
            📢 Messages
          </button>
        </div>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        {loading ? (
          <div className="section loading">
            Loading Student Access & Communication...
          </div>
        ) : (
          <>
            {activeSection === "student" && (
              <section className="section">
                <div className="sectionHeader">
                  <div>
                    <h2>🔎 Search & Select Student</h2>
                    <p>
                      Search by student name, Student ID or email.
                    </p>
                  </div>

                  <span className="count">
                    {students.length} student(s)
                  </span>
                </div>

                <div className="searchBox">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search Name / Student ID / Email..."
                  />

                  {selectedStudent && (
                    <button
                      className="secondary"
                      onClick={clearStudent}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="studentList">
                  {filteredStudents.length === 0 ? (
                    <div className="empty">
                      No students found.
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`studentItem ${
                          selectedStudent?.id === student.id
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => selectStudent(student)}
                      >
                        <div className="studentInfo">
                          <strong>
                            {student.full_name || "Unnamed Student"}
                          </strong>

                          <span>
                            ID:{" "}
                            {student.student_id ||
                              "Not available"}
                          </span>

                          <span>
                            {student.email || "Email unavailable"}
                          </span>
                        </div>

                        <span className="badge">
                          {statusForStudent(student)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {selectedStudent && (
                  <div className="profileCard">
                    <div className="profileTop">
                      <div>
                        <h3>
                          {selectedStudent.full_name ||
                            "Unnamed Student"}
                        </h3>

                        <p>
                          {selectedStudent.email ||
                            "Email unavailable"}
                        </p>
                      </div>

                      <span className="badge">
                        {selectedStatus}
                      </span>
                    </div>

                    <div className="grid">
                      <div className="stat">
                       
