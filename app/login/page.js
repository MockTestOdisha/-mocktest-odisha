"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Login failed: " + error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("Login failed.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, is_paid")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setMessage("Student profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role !== "student") {
      await supabase.auth.signOut();
      setMessage("This login is only for students.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <main
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <h1>Student Login</h1>

      <p>Login to access your assigned restricted tests.</p>

      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginTop: "25px",
        }}
      >
        <div>
          <label>
            <strong>Email</strong>
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
            }}
          />
        </div>

        <div>
          <label>
            <strong>Password</strong>
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && (
        <p
          style={{
            marginTop: "20px",
            color: "red",
          }}
        >
          {message}
        </p>
      )}

      <p style={{ marginTop: "25px" }}>
        <a href="/">Back to Home</a>
      </p>
    </main>
  );
}
