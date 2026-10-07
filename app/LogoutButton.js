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
      style={{ margin: 0 }}
    >
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          background: "#dc2626",
          color: "#fff",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}
