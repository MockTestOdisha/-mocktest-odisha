"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setUserEmail(user.email || "");
      setLoading(false);
    }

    checkAdmin();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "30px",
          background: "#f5f7fb",
        }}
      >
        <h1>Loading Admin Dashboard...</h1>
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
        {/* Header */}
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            padding: "25px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ margin: 0 }}>Mock Test Odisha</h1>

          <p style={{ marginBottom: 0 }}>
            Admin Dashboard
          </p>
        </div>

        {/* Admin Account */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Welcome, Admin</h2>

          <p>
            Logged in as: <strong>{userEmail}</strong>
          </p>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {/* Admin Menu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px",
          }}
        >
          {/* Manage Tests */}
          <div
            onClick={() => router.push("/admin/tests")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>📝 Manage Tests</h3>
            <p>Create and manage mock tests.</p>
          </div>

          {/* Questions */}
          <div
            onClick={() => router.push("/admin/tests")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>❓ Questions</h3>
            <p>
              Choose a test and add or manage its questions.
            </p>
          </div>

          {/* Students */}
          <div
            onClick={() => router.push("/admin/students")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>👨‍🎓 Students</h3>
            <p>Manage student accounts.</p>
          </div>

          {/* Test Access */}
          <div
            onClick={() => router.push("/admin/access")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>🔐 Test Access</h3>
            <p>Give restricted tests to students.</p>
          </div>

          {/* Attempts */}
          <div
            onClick={() => router.push("/admin/attempts")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>📈 Attempts & Results</h3>
            <p>View student attempts and results.</p>
          </div>

          {/* Existing HTML Tests */}
          <div
            onClick={() => router.push("/admin/html-tests")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>📄 HTML Tests</h3>
            <p>Upload complete HTML mock tests.</p>
          </div>

          {/* NEW: HTML Test Categories */}
          <div
            onClick={() => router.push("/admin/html-categories")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h3>🗂️ HTML Test Categories</h3>

            <p>
              Create and manage Free/Paid cards,
              sub-cards, and HTML test organization.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
