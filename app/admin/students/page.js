"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ManageStudentsPage() {
const router = useRouter();
const supabase = createClient();

const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(true);
const [creating, setCreating] = useState(false);

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [isPaid, setIsPaid] = useState(false);

const [message, setMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");

async function loadStudents() {
const { data, error } = await supabase.rpc(
"admin_get_students"
);

if (error) {
  setErrorMessage(error.message);
  return;
}

setStudents(data || []);

}

useEffect(() => {
async function checkAdmin() {
const {
data: { user },
} = await supabase.auth.getUser();

  if (!user) {
    router.replace("/admin/login");
    return;
  }

  const { data: profile, error: profileError } =
    await supabase
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

  await loadStudents();
  setLoading(false);
}

checkAdmin();

}, []);

async function handleCreateStudent(e) {
e.preventDefault();

setMessage("");
setErrorMessage("");

if (!fullName.trim()) {
  setErrorMessage(
    "Please enter the student's full name."
  );
  return;
}

if (!email.trim()) {
  setErrorMessage(
    "Please enter the student's email."
  );
  return;
}

if (password.length < 6) {
  setErrorMessage(
    "Password must be at least 6 characters."
  );
  return;
}

setCreating(true);

const { error } = await supabase.rpc(
  "admin_create_student",
  {
    p_email: email.trim(),
    p_password: password,
    p_full_name: fullName.trim(),
    p_is_paid: isPaid,
  }
);

if (error) {
  setErrorMessage(error.message);
  setCreating(false);
  return;
}

setMessage(
  "Student account created successfully."
);

setFullName("");
setEmail("");
setPassword("");
setIsPaid(false);

await loadStudents();

setCreating(false);

}

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

    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        marginBottom: "20px",
      }}
    >
      <h2>Create New Student</h2>

      <form onSubmit={handleCreateStudent}>
        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Full Name</strong>
          </label>

          <input
            type="text"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="Student full name"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Email</strong>
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="student@example.com"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Password</strong>
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Minimum 6 characters"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) =>
                setIsPaid(e.target.checked)
              }
            />

            {" "}

            <strong>Paid Student</strong>
          </label>
        </div>

        {message && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "15px",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "15px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          style={{
            padding: "12px 18px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: creating
              ? "not-allowed"
              : "pointer",
            fontSize: "16px",
          }}
        >
          {creating
            ? "Creating Student..."
            : "Create Student"}
        </button>
      </form>
    </div>

    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
      }}
    >
      <h2>Student Accounts</h2>

      {students.length === 0 ? (
        <p>No students found.</p>
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
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {student.full_name ||
                  "Unnamed Student"}
              </h3>

              <p>
                <strong>Student ID:</strong>{" "}
                {student.id}
              </p>

              <p>
                <strong>Account Type:</strong>{" "}
                {student.is_paid
                  ? "Paid"
                  : "Free"}
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
    </div>

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
