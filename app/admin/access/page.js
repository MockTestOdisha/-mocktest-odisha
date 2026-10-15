"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    const expiry = new Date(student.access_expiry_date);
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
  const [paidHtmlFolders, setPaidHtmlFolders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [accessType, setAccessType] = useState("normal");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [bulkScope, setBulkScope] = useState("all");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkTestId, setBulkTestId] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState("");
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
        .select("id,title,message,message_type,target_type,target_student_ids,target_category_id,display_location,start_at,end_at,is_active,created_by,created_at,updated_at")
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;
      setExistingMessages(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const [studentsResult, testsResult, categoriesResult] = await Promise.all([
        supabase.rpc("admin_get_students_for_access"),
        supabase
          .from("tests")
          .select("id,title,test_type,is_active")
          .eq("test_type", "restricted")
          .eq("is_active", true)
          .order("title"),
        supabase
          .from("html_test_categories")
          .select("id,name,access_type,parent_id,is_visible,display_order")
          .eq("is_visible", true)
          .order("display_order")
          .order("name"),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (testsResult.error) throw testsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const allCats = categoriesResult.data || [];
      const mainPaid = allCats.filter((c) => c.access_type === "paid" && c.parent_id === null);

      setStudents(studentsResult.data || []);
      setRestrictedTests(testsResult.data || []);
      setCategories(allCats);
      setPaidHtmlFolders(mainPaid);

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
      return name.includes(q) || studentId.includes(q) || email.includes(q);
    });
  }, [students, search]);

  const selectedStudentNormalAccess = useMemo(() => normalAccess || [], [normalAccess]);
  const selectedStudentHtmlAccess = useMemo(() => htmlAccess || [], [htmlAccess]);

  const bulkStudents = useMemo(() => {
    if (bulkScope === "all") return students;
    if (bulkScope === "category") {
      return students.filter(
        (student) => String(student.paid_exam_category_id || "") === String(bulkCategory || "")
      );
    }
    if (bulkScope === "selected") {
      return students.filter((student) => bulkSelected.includes(student.id));
    }
    return [];
  }, [students, bulkScope, bulkCategory, bulkSelected]);

  const messageRecipients = useMemo(() => {
    if (messageTarget === "all") return students;
    return students.filter((student) => messageSelected.includes(student.id));
  }, [students, messageTarget, messageSelected]);

  async function selectStudent(student) {
    setSelectedStudent(student);
    setMessage("");
    setError("");

    try {
      const [normalResult, htmlResult] = await Promise.all
