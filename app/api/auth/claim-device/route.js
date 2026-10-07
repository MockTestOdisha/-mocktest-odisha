"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Prevent duplicate login requests.
  const loginInProgress = useRef(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (loginInProgress.current) {
      return;
    }

    loginInProgress.current = true;
    setMessage("");
    setLoading(true);

    try {
      // --------------------------------------------------
      // 1. LOGIN
      // --------------------------------------------------

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
        return;
      }

      const user = data?.user;

      if (!user) {
        setMessage("Login failed: user not found.");
        return;
      }

      // --------------------------------------------------
      // 2. LOAD PROFILE
      // --------------------------------------------------

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
        console.error(
          "Profile error:",
          profileError
        );

        await supabase.auth.signOut();

        setMessage(
          "Profile not found. Please contact the administrator."
        );

        return;
      }

      // --------------------------------------------------
      // 3. ADMIN LOGIN
      // --------------------------------------------------

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      // --------------------------------------------------
      // 4. STUDENT LOGIN
      // --------------------------------------------------

      if (profile.role === "student") {
        let response;

        try {
          response = await fetch(
            "/api/auth/claim-device",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
            }
          );
        } catch (fetchError) {
          console.error(
            "Device claim fetch error:",
            fetchError
          );

          await supabase.auth.signOut();

          setMessage(
            "Device verification request failed. " +
              (fetchError?.message ||
                "Please try again.")
          );

          return;
        }

        // ------------------------------------------------
        // 5. SAFELY READ API RESPONSE
        // ------------------------------------------------

        let result = null;
        let responseText = "";

        try {
          responseText = await response.text();

          if (responseText) {
            result = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error(
            "Device claim response parse error:",
            parseError
          );

          console.error(
            "Raw device claim response:",
            responseText
          );

          await supabase.auth.signOut();

          setMessage(
            "Device verification returned an invalid response. " +
              "Server status: " +
              response.status
          );

          return;
        }

        // ------------------------------------------------
        // 6. DEVICE CLAIM FAILED
        // ------------------------------------------------

        if (!response.ok || !result?.success) {
          console.error(
            "Device claim rejected:",
            {
              status: response.status,
              result,
            }
          );

          await supabase.auth.signOut();

          if (result?.message) {
            setMessage(
              result.message
            );
          } else {
            setMessage(
              "Device verification failed. " +
                "Server status: " +
                response.status
            );
          }

          return;
        }

        // ------------------------------------------------
        // 7. DEVICE CLAIM SUCCESS
        // ------------------------------------------------

        router.push("/");
        return;
      }

      // --------------------------------------------------
      // 8. UNKNOWN ROLE
      // --------------------------------------------------

      await supabase.auth.signOut();

      setMessage(
        "Your account role is not configured. Please contact the administrator."
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error(
          "Sign out error:",
          signOutError
        );
      }

      setMessage(
        "Login error: " +
          (error?.message ||
            "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
      loginInProgress.current = false;
    }
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
              autoComplete="email"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
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
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
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
              background: loading
                ? "#93c5fd"
                : "#2563eb",
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
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#dc2626",
              fontWeight: "bold",
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
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
