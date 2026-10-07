"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/release-device",
        {
          method: "POST",
          cache: "no-store",
          credentials: "include",
        }
      );

      if (!response.ok) {
        let result = null;

        try {
          result = await response.json();
        } catch {}

        console.error(
          "Logout failed:",
          result
        );

        alert(
          result?.message ||
            "Could not logout. Please try again."
        );

        setLoading(false);
        return;
      }

      // Logout was successful.
      // Navigate using the browser itself.
      window.location.assign("/login");

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
