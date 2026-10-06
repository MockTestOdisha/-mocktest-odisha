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

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(
        "Login failed: " + error.message
      );

      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("Login failed.");

      setLoading(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, role, is_paid"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setMessage(
        "Profile not found. Please contact the administrator."
      );

      setLoading(false);
      return;
    }

    /*
     * Admins can use multiple devices.
     */
    if (profile.role === "admin") {
      router.push("/admin");
      return;
    }

    /*
     * Students are restricted to one active device.
     */
    if (profile.role === "student") {
      try {
        const response = await fetch(
          "/api/auth/claim-device",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result =
          await response.json();

        if (!response.ok || !result.success) {
          await supabase.auth.signOut();

          setMessage(
            result.message ||
              "This account is already logged in on another device."
          );

          setLoading(false);
          return;
        }

        router.push("/");
        return;
      } catch (error) {
        console.error(
          "Device claim failed:",
          error
        );

        await supabase.auth.signOut();

        setMessage(
          "Could not verify this device. Please try again."
        );

        setLoading(false);
        return;
      }
    }

    await supabase.auth.signOut();

    setMessage(
      "Your account role is not configured. Please contact the administrator."
    );

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "12px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h1>Login</h1>

        <p>
          Login with your account to access
          Mock Test Odisha.
        </p>

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
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border:
                  "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "16px",
                boxSizing: "border-box",
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
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border:
                  "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "20px",
              color: "#dc2626",
              fontWeight: "bold",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            marginTop: "25px",
          }}
        >
          <a href="/">
            Back to Home
          </a>
        </p>
      </div>
    </main>
  );
}
