"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const QUESTION = "What is your secret verification city/keyword?";

export default function ChangePasswordPage() {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });

  async function handleVerifyQuestion(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", isError: false });

    try {
      const res = await fetch("/api/admin/verify-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: securityAnswer }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Incorrect security answer.");

      setStep(2);
      setMessage({ text: "Security verified! You can now update your password.", isError: false });
    } catch (err) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) return setMessage({ text: "Password must be at least 6 characters.", isError: true });
    if (newPassword !== confirmPassword) return setMessage({ text: "Passwords do not match.", isError: true });

    setLoading(true);
    setMessage({ text: "", isError: false });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ text: "Password updated successfully!", isError: false });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto", background: "#fff", padding: "30px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
        <h1 style={{ fontSize: "20px", margin: "0 0 6px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🔒</span> Change Admin Password
        </h1>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>
          {step === 1 ? "Answer the security question to unlock password change." : "Set a new password for your administrator account."}
        </p>

        {step === 1 ? (
          <form onSubmit={handleVerifyQuestion} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>Security Question</label>
              <div style={{ padding: "10px", marginTop: "5px", background: "#f1f5f9", borderRadius: "8px", fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>
                {QUESTION}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>Your Secret Answer</label>
              <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Enter your answer" required style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ ...btnStyle, background: "#1e293b" }}>
              {loading ? "Verifying..." : "Verify Identity →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" required style={inputStyle} />
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155" }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type new password" required style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ ...btnStyle, background: "#2563eb" }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {message.text && (
          <div style={{ marginTop: "16px", padding: "11px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", background: message.isError ? "#fef2f2" : "#f0fdf4", color: message.isError ? "#dc2626" : "#16a34a", border: `1px solid ${message.isError ? "#fecaca" : "#bbf7d0"}` }}>
            {message.text}
          </div>
        )}

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", marginTop: "5px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", outline: "none" };
const btnStyle = { padding: "11px", marginTop: "6px", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "14px", cursor: "pointer" };
