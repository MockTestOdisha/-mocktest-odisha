"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      const supabase = createClient();

      // ---------------------------------------------
      // 1. Make sure the browser still has a session
      // ---------------------------------------------

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Logout session check failed:",
          sessionError
        );

        // The Supabase session is already gone.
        // Still send the user to login.
        window.location.replace("/login");
        return;
      }

      // ---------------------------------------------
      // 2. Release the device session on the server
      // ---------------------------------------------

      const response = await fetch(
        "/api/auth/release-device",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (error) {
        console.error(
          "Could not read logout response:",
          error
        );
      }

      // ---------------------------------------------
      // 3. Check server result
      // ---------------------------------------------

      if (!response.ok || !result?.success) {
        console.error(
          "Device release failed:",
          result
        );

        alert(
          result?.message ||
            "Could not release the device session. Please try again."
        );

        setLoading(false);
        return;
      }

      console.log(
        "DEVICE LOGOUT SUCCESS:",
        result
      );

      // ---------------------------------------------
      // 4. Go to login
      // ---------------------------------------------

      window.location.replace("/login");

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "Something went wrong while logging out. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{
        padding: "9px 13px",
        background: "#dc2626",
        color: "#fff",
        border: "none",
        borderRadius: "7px",
        fontWeight: "700",
        fontSize: "14px",
        cursor: loading
          ? "not-allowed"
          : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? "Logging out..."
        : "Logout"}
    </button>
  );
}
