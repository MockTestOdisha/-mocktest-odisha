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

function statusForStudent(student) {
if (!student) return "Unknown";

if (student.access_expiry_date) {
const expiry = new Date("${student.access_expiry_date}T23:59:59");

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

const [existingMessages, setExistingMessages] = useState([]);
const [messagesLoading, setMessagesLoading] = useState(false);

const [activeSection, setActiveSection] = useState("student");

async function loadMessages() {
setMessagesLoading(true);

try {
  const { data, error: messagesError } = await supabase
    .from("student_messages")
    .select(
      "id,title,message,message_type,target_type,target_student_ids,target_category_id,display_location,start_at,end_at,is_active,created_by,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (messagesError) throw messagesError;

  setExistingMessages(data || []);
} catch (err) {
  console.error(err);
  setError(err.message || "Failed to load existing messages.");
} finally {
  setMessagesLoading(false);
}

}

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
      .select("id,name,access_type,parent_id,is_visible,display_order")
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

  await loadMessages();
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
if (bulkScope === "all") return students;

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
if (messageTarget === "all") return students;

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
    { p_access_id: access.id }
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
    { p_access_id: access.id }
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

if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
  setError("Invalid bulk access dates.");
  return;
}

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
      if (!firstError) firstError = err;
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

if (!["all", "selected"].includes(messageTarget)) {
  setError("Choose All Logged-in Students or Selected Students.");
  return;
}

if (messageTarget === "selected" && messageSelected.length === 0) {
  setError("Select at least one student.");
  return;
}

if (messageStartAt && messageEndAt) {
  const start = new Date(messageStartAt);
  const end = new Date(messageEndAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    setError("Invalid message dates.");
    return;
  }

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
  if (!user) throw new Error("Admin session not found.");

  const recipients =
    messageTarget === "selected" ? messageSelected : null;

  const startAtValue = messageStartAt
    ? new Date(messageStartAt).toISOString()
    : new Date().toISOString();

  const endAtValue = messageEndAt
    ? new Date(messageEndAt).toISOString()
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
      start_at: startAtValue,
      end_at: endAtValue,
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

  await loadMessages();
} catch (err) {
  console.error(err);
  setError(err.message || "Failed to publish message.");
} finally {
  setSaving(false);
}

}

async function deleteMessage(messageId) {
const confirmed = window.confirm(
"Delete this message permanently?\n\nThis cannot be undone."
);

if (!confirmed) return;

setSaving(true);
setError("");
setMessage("");

try {
  const { error: deleteError } = await supabase
    .from("student_messages")
    .delete()
    .eq("id", messageId);

  if (deleteError) throw deleteError;

  setMessage("Message deleted successfully.");
  await loadMessages();
} catch (err) {
  console.error(err);
  setError(err.message || "Failed to delete message.");
} finally {
  setSaving(false);
}

}

async function toggleMessageActive(messageItem) {
setSaving(true);
setError("");
setMessage("");

try {
  const { error: updateError } = await supabase
    .from("student_messages")
    .update({
      is_active: !messageItem.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageItem.id);

  if (updateError) throw updateError;

  setMessage(
    messageItem.is_active
      ? "Message hidden successfully."
      : "Message published successfully."
  );

  await loadMessages();
} catch (err) {
  console.error(err);
  setError(err.message || "Failed to update message.");
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
    const { error: endError } = await supabase.rpc(
      "admin_end_test_access",
      { p_access_id: access.id }
    );

    if (endError) throw endError;
  }

  for (const access of selectedStudentHtmlAccess) {
    const { error: endError } = await supabase.rpc(
      "admin_end_html_test_access",
      { p_access_id: access.id }
    );

    if (endError) throw endError;
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

const subscriptionName =
selectedStudent?.paid_exam_category_name ||
selectedStudent?.paid_exam_category ||
selectedStudent?.paid_exam_category_id ||
"No active subscription";

const normalCount = selectedStudentNormalAccess.length;
const htmlCount = selectedStudentHtmlAccess.length;
const totalAvailable = normalCount + htmlCount;

return (
<main className="page">
<style>{`
* { box-sizing: border-box; }

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

    h1 { margin: 0; font-size: 28px; line-height: 1.2; }

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

    .sectionHeader h2 { margin: 0; font-size: 19px; }

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

    input, select, textarea {
      width: 100%;
      border: 1px solid #d8dee9;
      border-radius: 10px;
      background: #ffffff;
      color: #172033;
      padding: 11px 12px;
      font-size: 14px;
      outline: none;
    }

    input:focus, select:focus, textarea:focus {
      border-color: #667085;
      box-shadow: 0 0 0 3px rgba(102, 112, 133, 0.08);
    }

    textarea { min-height: 130px; resize: vertical; }

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

    .studentItem:hover { background: #f8fafc; }

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

    .profileTop h3 { margin: 0 0 5px; font-size: 20px; }

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

    .stat strong { display: block; font-size: 13px; }

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

    button:disabled { opacity: 0.55; cursor: not-allowed; }

    .primary { background: #172033; color: #ffffff; }
    .secondary { background: #eef2f6; color: #344054; }
    .danger { background: #fee2e2; color: #b91c1c; }

    .formGrid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }

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
      display: block;
      line-height: 1.5;
    }

    .accessRows { margin-top: 14px; }
    .subheading { margin: 22px 0 10px; font-size: 15px; }

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

    .check input { width: auto; }
    .count { color: #667085; font-size: 12px; font-weight: 700; }

    .helper {
      color: #667085;
      font-size: 12px;
      margin-top: 5px;
      line-height: 1.5;
    }

    .messageText { white-space: pre-wrap; line-height: 1.5; margin-top: 5px; }

    .messageActions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      flex-shrink: 0;
    }

    .loading { padding: 40px; text-align: center; color: #667085; }

    @media (max-width: 850px) {
      .page { padding: 12px; }
      .tabs { grid-template-columns: repeat(2, 1fr); }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .formGrid { grid-template-columns: 1fr; }
      .field.full { grid-column: auto; }
      .checkList { grid-template-columns: 1fr; }
    }

    @media (max-width: 560px) {
      .header, .section { padding: 15px; border-radius: 14px; }
      h1 { font-size: 23px; }
      .tabs { grid-template-columns: 1fr 1fr; }
      .grid { grid-template-columns: 1fr 1fr; }
      .profileTop { flex-direction: column; }
      .accessRow { align-items: flex-start; flex-direction: column; }
      .searchBox { flex-direction: column; }
      .messageActions { width: 100%; }
      .messageActions button { flex: 1; }
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
        className={`tab ${activeSection === "student" ? "active" : ""}`}
        onClick={() => {
          setActiveSection("student");
          setMessage("");
          setError("");
        }}
      >
        🔎 Search & Select Student
      </button>

      <button
        className={`tab ${activeSection === "access" ? "active" : ""}`}
        onClick={() => {
          setActiveSection("access");
          setMessage("");
          setError("");
        }}
      >
        📚 Test / Mock Access
      </button>

      <button
        className={`tab ${activeSection === "bulk" ? "active" : ""}`}
        onClick={() => {
          setActiveSection("bulk");
          setMessage("");
          setError("");
        }}
      >
        👥 Give Access to Everyone
      </button>

      <button
        className={`tab ${activeSection === "messages" ? "active" : ""}`}
        onClick={() => {
          setActiveSection("messages");
          setMessage("");
          setError("");
          loadMessages();
        }}
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
                <p>Search by student name, Student ID or email.</p>
              </div>
              <span className="count">{students.length} student(s)</span>
            </div>

            <div className="searchBox">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Name / Student ID / Email..."
              />

              {selectedStudent && (
                <button type="button" className="secondary" onClick={clearStudent}>
                  Clear
                </button>
              )}
            </div>

            <div className="studentList">
              {filteredStudents.length === 0 ? (
                <div className="empty">No students found.</div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`studentItem ${
                      selectedStudent?.id === student.id ? "selected" : ""
                    }`}
                    onClick={() => selectStudent(student)}
                  >
                    <div className="studentInfo">
                      <strong>{student.full_name || "Unnamed Student"}</strong>
                      <span>ID: {student.student_id || "Not available"}</span>
                      <span>{student.email || "Email unavailable"}</span>
                    </div>
                    <span className="badge">{statusForStudent(student)}</span>
                  </div>
                ))
              )}
            </div>

            {selectedStudent && (
              <div className="profileCard">
                <div className="profileTop">
                  <div>
                    <h3>{selectedStudent.full_name || "Unnamed Student"}</h3>
                    <p>{selectedStudent.email || "Email unavailable"}</p>
                  </div>
                  <span className="badge">{selectedStatus}</span>
                </div>

                <div className="grid">
                  <div className="stat">
                    <span>Student ID</span>
                    <strong>{selectedStudent.student_id || "—"}</strong>
                  </div>
                  <div className="stat">
                    <span>Email</span>
                    <strong>{selectedStudent.email || "—"}</strong>
                  </div>
                  <div className="stat">
                    <span>Current Subscription</span>
                    <strong>{subscriptionName}</strong>
                  </div>
                  <div className="stat">
                    <span>Subscription Status</span>
                    <strong>{selectedStatus}</strong>
                  </div>
                  <div className="stat">
                    <span>Access Until</span>
                    <strong>{formatDate(selectedStudent.access_expiry_date)}</strong>
                  </div>
                  <div className="stat">
                    <span>Tests Available</span>
                    <strong>{totalAvailable}</strong>
                  </div>
                  <div className="stat">
                    <span>Tests Attempted</span>
                    <strong>—</strong>
                  </div>
                  <div className="stat">
                    <span>Last Activity</span>
                    <strong>—</strong>
                  </div>
                </div>

                <div className="actions">
                  <button type="button" className="primary" onClick={manageSubscription}>
                    Manage Subscription
                  </button>
                  <button type="button" className="secondary" onClick={viewTestHistory}>
                    View Test History
                  </button>
                  <button type="button" className="secondary" onClick={suspendAccess}>
                    Suspend Access
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={endAllAccess}
                    disabled={saving || totalAvailable === 0}
                  >
                    End Access
                  </button>
                </div>

                <div className="subheading">Current Normal Mock Access</div>
                <div className="accessRows">
                  {selectedStudentNormalAccess.length === 0 ? (
                    <div className="empty">No active Normal Mock access.</div>
                  ) : (
                    selectedStudentNormalAccess.map((access) => (
                      <div className="accessRow" key={access.id}>
                        <div>
                          <strong>
                            {access.test_title || access.title || access.test_name || "Normal Test"}
                          </strong>
                          <small>
                            Start: {formatDateTime(access.start_at || access.starts_at)}
                            {" • "}
                            End: {formatDateTime(access.end_at || access.ends_at)}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="danger"
                          disabled={saving}
                          onClick={() => endNormalAccess(access)}
                        >
                          End Access
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="subheading">Current HTML Mock Access</div>
                <div className="accessRows">
                  {selectedStudentHtmlAccess.length === 0 ? (
                    <div className="empty">No active HTML Mock access.</div>
                  ) : (
                    selectedStudentHtmlAccess.map((access) => (
                      <div className="accessRow" key={access.id}>
                        <div>
                          <strong>
                            {access.html_test_title || access.test_title || access.title || "HTML Test"}
                          </strong>
                          <small>
                            Start: {formatDateTime(access.start_at || access.starts_at)}
                            {" • "}
                            End: {formatDateTime(access.end_at || access.ends_at)}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="danger"
                          disabled={saving}
                          onClick={() => endHtmlAccess(access)}
                        >
                          End Access
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "access" && (
          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>📚 Test / Mock Access</h2>
                <p>Give additional access without removing the student's existing access.</p>
              </div>
            </div>

            {!selectedStudent ? (
              <div className="empty">
                Select a student first from <strong>Search & Select Student</strong>.
              </div>
            ) : (
              <>
                <div className="profileCard">
                  <div className="profileTop">
                    <div>
                      <h3>{selectedStudent.full_name || "Unnamed Student"}</h3>
                      <p>
                        Current subscription: <strong>{subscriptionName}</strong>
                      </p>
                    </div>
                    <span className="badge">{selectedStatus}</span>
                  </div>
                </div>

                <form className="formGrid" onSubmit={grantIndividualAccess}>
                  <div className="field">
                    <label>Access Type</label>
                    <select
                      value={accessType}
                      onChange={(event) => setAccessType(event.target.value)}
                    >
                      <option value="normal">Individual Normal Mock</option>
                      <option value="html">Individual HTML Mock</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Current Subscription</label>
                    <input value={subscriptionName} readOnly />
                  </div>

                  {accessType === "normal" ? (
                    <div className="field full">
                      <label>Select Normal Mock</label>
                      <select
                        value={selectedTestId}
                        onChange={(event) => setSelectedTestId(event.target.value)}
                      >
                        <option value="">Select a Normal Mock</option>
                        {restrictedTests.map((test) => (
                          <option key={test.id} value={test.id}>{test.title}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="field full">
                      <label>Select HTML Mock</label>
                      <select
                        value={selectedHtmlTestId}
                        onChange={(event) => setSelectedHtmlTestId(event.target.value)}
                      >
                        <option value="">Select an HTML Mock</option>
                        {paidHtmlTests.map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.title || test.name || "HTML Test"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label>Access Start</label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(event) => setStartAt(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Access End</label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(event) => setEndAt(event.target.value)}
                    />
                  </div>

                  <div className="field full">
                    <button type="submit" className="primary" disabled={saving}>
                      {saving ? "Granting Access..." : "Grant Access"}
                    </button>
                  </div>
                </form>

                <div className="subheading">Existing Access</div>
                <div className="accessRows">
                  {normalCount === 0 && htmlCount === 0 ? (
                    <div className="empty">No active individual access records.</div>
                  ) : (
                    <>
                      {selectedStudentNormalAccess.map((access) => (
                        <div className="accessRow" key={`normal-${access.id}`}>
                          <div>
                            <strong>
                              📄 {access.test_title || access.title || access.test_name || "Normal Mock"}
                            </strong>
                            <small>
                              Normal Mock • {formatDateTime(access.start_at || access.starts_at)}
                              {" → "}
                              {formatDateTime(access.end_at || access.ends_at)}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="danger"
                            disabled={saving}
                            onClick={() => endNormalAccess(access)}
                          >
                            End
                          </button>
                        </div>
                      ))}

                      {selectedStudentHtmlAccess.map((access) => (
                        <div className="accessRow" key={`html-${access.id}`}>
                          <div>
                            <strong>
                              🌐 {access.html_test_title || access.test_title || access.title || "HTML Mock"}
                            </strong>
                            <small>
                              HTML Mock • {formatDateTime(access.start_at || access.starts_at)}
                              {" → "}
                              {formatDateTime(access.end_at || access.ends_at)}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="danger"
                            disabled={saving}
                            onClick={() => endHtmlAccess(access)}
                          >
                            End
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {activeSection === "bulk" && (
          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>👥 Give Access to Everyone</h2>
                <p>
                  Give a Normal Mock or HTML Mock to one, selected, all, or category-matched students.
                </p>
              </div>
              <span className="count">{bulkStudents.length} matching student(s)</span>
            </div>

            <form className="formGrid" onSubmit={grantBulkAccess}>
              <div className="field">
                <label>Target Students</label>
                <select
                  value={bulkScope}
                  onChange={(event) => {
                    setBulkScope(event.target.value);
                    if (event.target.value !== "selected") setBulkSelected([]);
                  }}
                >
                  <option value="all">All Students</option>
                  <option value="category">Students with a particular subscription</option>
                  <option value="selected">Selected Students</option>
                </select>
              </div>

              <div className="field">
                <label>Access Type</label>
                <select
                  value={bulkAccessType}
                  onChange={(event) => setBulkAccessType(event.target.value)}
                >
                  <option value="normal">Normal Mock</option>
                  <option value="html">HTML Mock</option>
                </select>
              </div>

              {bulkScope === "category" && (
                <div className="field full">
                  <label>Student Subscription / Category</label>
                  <select
                    value={bulkCategory}
                    onChange={(event) => setBulkCategory(event.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <div className="helper">
                    This matches the student's current paid exam category.
                  </div>
                </div>
              )}

              {bulkScope === "selected" && (
                <div className="field full">
                  <label>Select Students</label>
                  <div className="checkList">
                    {students.map((student) => (
                      <label className="check" key={student.id}>
                        <input
                          type="checkbox"
                          checked={bulkSelected.includes(student.id)}
                          onChange={() => toggleBulkStudent(student.id)}
                        />
                        <span>
                          <strong>{student.full_name || "Unnamed"}</strong>
                          <br />
                          {student.student_id || student.email || "No ID"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {bulkAccessType === "normal" ? (
                <div className="field full">
                  <label>Normal Mock</label>
                  <select
                    value={bulkTestId}
                    onChange={(event) => setBulkTestId(event.target.value)}
                  >
                    <option value="">Select a Normal Mock</option>
                    {restrictedTests.map((test) => (
                      <option key={test.id} value={test.id}>{test.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field full">
                  <label>HTML Mock</label>
                  <select
                    value={bulkHtmlTestId}
                    onChange={(event) => setBulkHtmlTestId(event.target.value)}
                  >
                    <option value="">Select an HTML Mock</option>
                    {paidHtmlTests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title || test.name || "HTML Test"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Access Start</label>
                <input
                  type="datetime-local"
                  value={bulkStartAt}
                  onChange={(event) => setBulkStartAt(event.target.value)}
                />
              </div>

              <div className="field">
                <label>Access End</label>
                <input
                  type="datetime-local"
                  value={bulkEndAt}
                  onChange={(event) => setBulkEndAt(event.target.value)}
                />
              </div>

              <div className="field full">
                <div className="helper">
                  <strong>{bulkStudents.length}</strong> student(s) will receive this access.
                </div>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Granting Access..." : "Grant Access to Matching Students"}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeSection === "messages" && (
          <section className="section">
            <div className="sectionHeader">
              <div>
                <h2>📢 Messages</h2>
                <p>
                  Publish and manage messages for all logged-in students or selected students.
                </p>
              </div>
            </div>

            <form className="formGrid" onSubmit={publishMessage}>
              <div className="field full">
                <label>Message Title</label>
                <input
                  value={messageTitle}
                  onChange={(event) => setMessageTitle(event.target.value)}
                  placeholder="Example: Happy Diwali 🎉"
                />
              </div>

              <div className="field full">
                <label>Message</label>
                <textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Write the message users should see..."
                />
              </div>

              <div className="field">
                <label>Send To</label>
                <select
                  value={messageTarget}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMessageTarget(value);

                    if (value !== "selected") {
                      setMessageSelected([]);
                    }
                  }}
                >
                  <option value="all">All Logged-in Students</option>
                  <option value="selected">Selected Students</option>
                </select>
              </div>

              <div className="field">
                <label>Recipients</label>
                <input
                  value={
                    messageTarget === "all"
                      ? `${students.length} students`
                      : `${messageSelected.length} students`
                  }
                  readOnly
                />
              </div>

              {messageTarget === "selected" && (
                <div className="field full">
                  <label>Select Students</label>
                  <div className="checkList">
                    {students.map((student) => (
                      <label className="check" key={student.id}>
                        <input
                          type="checkbox"
                          checked={messageSelected.includes(student.id)}
                          onChange={() => toggleMessageStudent(student.id)}
                        />
                        <span>
                          <strong>{student.full_name || "Unnamed"}</strong>
                          <br />
                          {student.student_id || student.email || "No ID"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="field">
                <label>Publish From</label>
                <input
                  type="datetime-local"
                  value={messageStartAt}
                  onChange={(event) => setMessageStartAt(event.target.value)}
                />
                <div className="helper">Leave empty to publish immediately.</div>
              </div>

              <div className="field">
                <label>End / Hide After</label>
                <input
                  type="datetime-local"
                  value={messageEndAt}
                  onChange={(event) => setMessageEndAt(event.target.value)}
                />
                <div className="helper">Leave empty for no automatic end time.</div>
              </div>

              <div className="field full">
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Publishing..." : "Publish Message"}
                </button>
              </div>
            </form>

            <div className="profileCard">
              <div className="sectionHeader">
                <div>
                  <h2>Message Recipient Preview</h2>
                  <p>These are the recipients selected by the current target option.</p>
                </div>
                <span className="count">
                  {messageTarget === "all"
                    ? `${students.length} recipient(s)`
                    : `${messageSelected.length} recipient(s)`}
                </span>
              </div>

              {messageRecipients.length === 0 ? (
                <div className="empty">No recipients selected.</div>
              ) : (
                <div className="checkList">
                  {messageRecipients.map((student) => (
                    <div className="check" key={student.id}>
                      <span>
                        <strong>{student.full_name || "Unnamed Student"}</strong>
                        <br />
                        {student.student_id || student.email || "No ID"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profileCard">
              <div className="sectionHeader">
                <div>
                  <h2>📋 Existing Messages</h2>
                  <p>Manage messages that have already been published.</p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={loadMessages}
                  disabled={messagesLoading || saving}
                >
                  {messagesLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {messagesLoading ? (
                <div className="empty">Loading existing messages...</div>
              ) : existingMessages.length === 0 ? (
                <div className="empty">No messages have been published yet.</div>
              ) : (
                <div className="accessRows">
                  {existingMessages.map((item) => (
                    <div className="accessRow" key={item.id}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>📢 {item.title || "Untitled Message"}</strong>
                        <small className="messageText">{item.message || ""}</small>
                        <small>
                          Target:{" "}
                          {item.target_type === "public"
                            ? "🌐 Logged-out / Public Users"
                            : item.target_type === "all"
                            ? "All Logged-in Students"
                            : `${item.target_student_ids?.length || 0} Selected Student(s)`}
                          {" • "}
                          Published: {formatDateTime(item.start_at)}
                          {" • "}
                          Status: {item.is_active ? "Active" : "Hidden"}
                        </small>
                        {item.end_at && (
                          <small>End / Hide After: {formatDateTime(item.end_at)}</small>
                        )}
                      </div>

                      <div className="messageActions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={saving}
                          onClick={() => toggleMessageActive(item)}
                        >
                          {item.is_active ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={saving}
                          onClick={() => deleteMessage(item.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </>
    )}
  </div>
</main>

);
}
