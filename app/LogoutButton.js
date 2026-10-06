"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      // First release the one-device lock.
      const response = await fetch(
        "/api/auth/release-device",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error(
          "Device release failed:",
          result
        );

        alert(
          result.message ||
            "Could not release the device session. Please try again."
        );

        setLoading(false);
        return;
      }

      // Then sign out of Supabase.
      const supabase = createClient();

      await supabase.auth.signOut();

      // Finally return to login.
      window.location.href = "/login";
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
