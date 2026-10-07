"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
  }

  return (
    <form
      method="POST"
      action="/api/auth/release-device"
      onSubmit={handleSubmit}
      style={{
        margin: 0,
      }}
    >
      <button
        type="submit"
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
    </form>
  );
}
