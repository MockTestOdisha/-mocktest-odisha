"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ManageStudentsPage() {
const router = useRouter();
const supabase = createClient();

const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState("");

useEffect(() => {
async function loadStudents() {
const {
data: { user },
} = await supabase.auth.getUser();

  if (!user) {
    router.replace("/admin/login");
    return;
  }

  const { data: profile, error: profileError } = await supabase
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_paid, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (error) {
    setErrorMessage(error.message);
    setLoading(false);
    return;
  }

  setStudents(data || []);
  setLoading(false);
}

loadStudents();

}, []);

if (loading) {
return (
<main style={{ padding: "30px" }}>
<h1>Loading Students...</h1>
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
maxWidth: "1000px",
margin: "0 auto",
}}
>
<div
style={{
background: "#fff",
padding: "20px",
borderRadius: "10px",
marginBottom: "20px",
}}
>
<h1>Manage Students</h1>

      <p>
        Create and manage student accounts.
      </p>
    </div>

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

    {students.length === 0 ? (
      <div
        style={{
          background: "#fff",
          padding: "25px",
          borderRadius: "10px",
        }}
      >
        <h2>No students found</h2>

        <p>
          There are currently no student accounts.
        </p>
      </div>
    ) : (
      <div
        style={{
          display: "grid",
          gap: "15px",
        }}
      >
        {students.map((student) => (
          <div
            key={student.id}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #ddd",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {student.full_name || "Unnamed Student"}
            </h2>

            <p>
              <strong>Student ID:</strong>{" "}
              {student.id}
            </p>

            <p>
              <strong>Paid:</strong>{" "}
              {student.is_paid ? "Yes" : "No"}
            </p>

            <p>
              <strong>Created:</strong>{" "}
              {new Date(
                student.created_at
              ).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )}

    <button
      onClick={() => router.push("/admin")}
      style={{
        marginTop: "25px",
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
