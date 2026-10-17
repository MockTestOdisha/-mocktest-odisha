"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TELEGRAM_URL = "https://t.me/Odishamock21";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw new Error(error.message || "Invalid credentials.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setErrorMsg(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
          padding: "32px 24px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* HEADER BRAND */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M21.928 2.536a1.298 1.298 0 0 0-1.32-.208L2.378 10.02c-.89.363-.884 1.625.01 1.979l4.988 1.977 1.83 5.66c.264.815 1.34.982 1.836.286l2.748-3.864 5.378 3.99c.734.544 1.776.136 1.956-.766l3.328-16.148a1.295 1.295 0 0 0-.524-.598zM9.544 13.43l8.47-5.918c.2-.14.417.118.25.294l-7.054 7.42-.45 2.76-1.216-4.556z"
              fill="#991b1b"
            />
          </svg>
          <span
            style={{
              fontSize: "15px",
              fontWeight: "900",
              color: "#831843",
              letterSpacing: "0.4px",
            }}
          >
            ODISHA ASPIRANT WARRIORS
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "900",
            color: "#0f172a",
            margin: "0 0 6px",
          }}
        >
          Login
        </h1>
        <p
          style={{
            fontSize: "13.5px",
            color: "#64748b",
            margin: "0 0 24px",
            lineHeight: "1.45",
          }}
        >
          Login with your account to access Mock Test Odisha.
        </p>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              User ID
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your User ID"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "800",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* TELEGRAM ASSISTANCE CARD */}
        <div
          style={{
            marginTop: "20px",
            padding: "18px 16px",
            borderRadius: "12px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>
            Don’t have an account?
          </div>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "12.5px",
              fontWeight: "700",
              color: "#0284c7",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            Click here
          </a>

          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#0284c7",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.928 2.536a1.298 1.298 0 0 0-1.32-.208L2.378 10.02c-.89.363-.884 1.625.01 1.979l4.988 1.977 1.83 5.66c.264.815 1.34.982 1.836.286l2.748-3.864 5.378 3.99c.734.544 1.776.136 1.956-.766l3.328-16.148a1.295 1.295 0 0 0-.524-.598zM9.544 13.43l8.47-5.918c.2-.14.417.118.25.294l-7.054 7.42-.45 2.76-1.216-4.556z"
                fill="#ffffff"
              />
            </svg>
            Contact us on Telegram
          </a>
        </div>

        {/* BOTTOM LINKS */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#1d4ed8",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            ← Back to Home
          </Link>
          <form action="/api/auth/release-device" method="POST" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "12px",
                padding: 0,
              }}
            >
              Reset Session
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
