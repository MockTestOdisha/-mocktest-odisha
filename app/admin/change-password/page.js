"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    async function verifyAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    verifyAdmin();
  }, [router, supabase]);

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setStatus({ text: "", type: "" });

    if (newPassword.length < 6) {
      setStatus({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setStatus({ text: error.message, type: "error" });
      } else {
        setStatus({ text: "Admin password updated successfully!", type: "success" });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setStatus({ text: "An error occurred: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8faff", padding: "40px 16px" }}>
        <p style={{ textAlign: "center", color: "#64748b" }}>Verifying admin session...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8faff", padding: "40px 16px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto", background: "#fff", padding: "30px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,23,42,0.05)" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "22px", color: "#1e293b" }}>🔒 Change Admin Password</h1>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          Set a new password for your administrator account.
        </p>

        {status.text && (
          <div style={{
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
            fontWeight: "600",
            background: status.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: status.type === "success" ? "#166534" : "#dc2626",
            border: `1px solid ${status.type === "success" ? "#bbf7d0" : "#fecaca"}`
          }}>
            {status.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 chars)"
              required
              style={{ width: "100%", padding: "11px", marginTop: "6px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              style={{ width: "100%", padding: "11px", marginTop: "6px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              marginTop: "6px",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            style={{ background: "transparent", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
          >
            ← Back to Admin Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
