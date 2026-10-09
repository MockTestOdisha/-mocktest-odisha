"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const loginInProgress = useRef(false);
  const isDeviceError = searchParams.get("error") === "device";

  // --------------------------------------------------
  // CHECK EXISTING LOGIN SESSION
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      // If redirected here due to a device conflict, break the loop immediately
      if (isDeviceError) {
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        if (!cancelled) {
          setMessage(
            "This account is active on another device. Please log in here to switch or try again."
          );
          setCheckingSession(false);
        }
        return;
      }

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (!cancelled) setCheckingSession(false);
          return;
        }

        // If user is already authenticated without error, go home
        if (!cancelled) {
          router.replace("/");
        }
      } catch (err) {
        console.error("Session check error:", err);
        if (!cancelled) setCheckingSession(false);
      }
    }

    checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, isDeviceError]);

  // --------------------------------------------------
  // MANUAL SESSION CLEAR
  // --------------------------------------------------
  async function handleResetSession() {
    setLoading(true);
    try {
      await fetch("/api/auth/release-device", { method: "POST" });
      await supabase.auth.signOut();
    } catch (_) {}
    setCheckingSession(false);
    setLoading(false);
    setMessage("Session cleared. Please enter your credentials.");
  }

  // --------------------------------------------------
  // LOGIN SUBMIT
  // --------------------------------------------------
  async function handleLogin(e) {
    e.preventDefault();
    if (loginInProgress.current) return;

    loginInProgress.current = true;
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("Login failed: " + error.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        setMessage("Login failed: user not found.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, is_paid")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage("Profile not found. Please contact the administrator.");
        return;
      }

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      if (profile.role === "student") {
        let response;
        try {
          response = await fetch("/api/auth/claim-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });
        } catch (fetchError) {
          await supabase.auth.signOut();
          setMessage("Device verification request failed. Please try again.");
          return;
        }

        let result = null;
        try {
          const text = await response.text();
          if (text) result = JSON.parse(text);
        } catch (_) {}

        if (!response.ok || !result?.success) {
          await supabase.auth.signOut();
          setMessage(
            result?.message ||
              "This account is currently logged in on another device. Please log out from that device first."
          );
          return;
        }

        router.push("/");
        return;
      }

      await supabase.auth.signOut();
      setMessage("Your account role is not configured.");
    } catch (err) {
      console.error("Login error:", err);
      try {
        await supabase.auth.signOut();
      } catch (_) {}
      setMessage(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      loginInProgress.current = false;
    }
  }

  // --------------------------------------------------
  // CHECKING VIEW
  // --------------------------------------------------
  if (checkingSession) {
    return (
      <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: "460px",
            margin: "0 auto",
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "20px" }}>Checking login...</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>
            Please wait while we verify your session.
          </p>
          <button
            onClick={handleResetSession}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              padding: "9px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              color: "#334155",
            }}
          >
            Clear Session & Show Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: "460px",
          margin: "0 auto",
          background: "#fff",
          padding: "32px",
          borderRadius: "14px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ margin: "0 0 6px", fontSize: "24px" }}>Login</h1>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
          Login with your account to access Mock Test Odisha.
        </p>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
              style={{
                width: "100%",
                padding: "11px 12px",
                marginTop: "6px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                padding: "11px 12px",
                marginTop: "6px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              marginTop: "6px",
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "13.5px",
              fontWeight: "600",
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
          <a href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
            ← Back to Home
          </a>
          <button
            type="button"
            onClick={handleResetSession}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              textDecoration: "underline",
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            Reset Session
          </button>
        </div>
      </div>
    </main>
  );
}
