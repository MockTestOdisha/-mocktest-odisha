"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  async function handleLogin(e) {
    e.preventDefault();

    setErrorMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("Login failed.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setErrorMessage("Admin profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      await supabase.auth.signOut();

      setErrorMessage("You do not have admin access.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#fff",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>Admin Login</h1>

        <p style={{ textAlign: "center" }}>
          Mock Test Odisha
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Email</strong>
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Password</strong>
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {errorMessage && (
            <p
              style={{
                color: "#dc2626",
                background: "#fee2e2",
                padding: "10px",
                borderRadius: "6px",
              }}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Logging in..." : "Admin Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
