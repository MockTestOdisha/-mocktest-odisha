"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const TELEGRAM_URL = "https://t.me/Odishamock21";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [identifier, setIdentifier] = useState(""); // Can be User ID / Roll Number or Email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const inputVal = identifier.trim();

    try {
      let loginEmail = inputVal;

      // If user typed a User ID / Roll Number instead of an email address
      if (!inputVal.includes("@")) {
        // Query profiles to find the student's email address by their roll_number
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id, roll_number")
          .ilike("roll_number", inputVal)
          .maybeSingle();

        if (profileErr || !profile) {
          throw new Error("Invalid User ID. Please check and try again.");
        }

        // Fetch their auth email using API route helper or check matching email
        const res = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rollNumber: inputVal }),
        });

        const data = await res.json();
        if (!res.ok || !data.email) {
          throw new Error(data.message || "Could not find account for this User ID.");
        }
        loginEmail = data.email;
      }

      // Sign in with the resolved email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) throw error;

      // Check device release / session management if configured
      router.push("/");
      router.refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "20px 16px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "390px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", padding: "28px 24px" }}>
        
        {/* BRAND HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21.928 2.536a1.298 1.298 0 0 0-1.32-.208L2.378 10.02c-.89.363-.884 1.625.01 1.979l4.988 1.977 1.83 5.66c.264.815 1.34.982 1.836.286l2.748-3.864 5.378 3.99c.734.544 1.776.136 1.956-.766l3.328-16.148a1.295 1.295 0 0 0-.524-.598zM9.544 13.43l8.47-5.918c.2-.14.417.118.25.294l-7.054 7.42-.45 2.76-1.216-4.556z" fill="#881337" />
          </svg>
          <span style={{ fontWeight: "900", fontSize: "14px", color: "#881337", letterSpacing: "0.5px" }}>ODISHA ASPIRANT WARRIORS</span>
        </div>

        <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: "900", color: "#0f172a" }}>Login</h1>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
          Login with your account to access Mock Test Odisha.
        </p>

        {errorMsg && (
          <div style={{ marginBottom: "14px", padding: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "12.5px", fontWeight: "600" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
              User ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your User ID"
              required
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px" }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* TELEGRAM SUPPORT CARD */}
        <div style={{ marginTop: "20px", background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: "12.5px", fontWeight: "700", color: "#1e3a8a" }}>Don’t have an account?</p>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: "800", color: "#2563eb", textDecoration: "underline", display: "inline-block", marginBottom: "10px" }}>
            Click here
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#0284c7", color: "#fff", padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: "800", fontSize: "12.5px" }}
          >
            <span>✈️</span> Contact us on Telegram
          </a>
        </div>

        {/* BOTTOM LINKS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", fontSize: "12px" }}>
          <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
            ← Back to Home
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            style={{ background: "none", border: "none", color: "#64748b", textDecoration: "underline", cursor: "pointer", fontSize: "12px", padding: 0 }}
          >
            Reset Session
          </button>
        </div>

      </div>
    </main>
  );
}
