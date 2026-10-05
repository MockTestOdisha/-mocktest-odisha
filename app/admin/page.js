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
      <main style={{ padding: "30px" }}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px",
          }}
        >
          <div
            onClick={() => router.push("/admin/tests")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <h3>📝 Manage Tests</h3>
            <p>Create and manage mock tests.</p>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>❓ Questions</h3>
            <p>Add and manage questions.</p>
          </div>

          <div
            onClick={() => router.push("/admin/students")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <h3>👨‍🎓 Students</h3>
            <p>Manage student accounts.</p>
          </div>

          <div
            onClick={() => router.push("/admin/access")}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <h3>🔐 Test Access</h3>
            <p>Give restricted tests to students.</p>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>📈 Attempts & Results</h3>
            <p>View student attempts and results.</p>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>📄 HTML Tests</h3>
            <p>Upload complete HTML mock tests.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
