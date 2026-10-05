"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAttemptsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAttempts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("attempts")
        .select(
          `
          id,
          test_id,
          user_id,
          student_name,
          score,
          total_marks,
          percentage,
          attempt_number,
          counts_for_leaderboard,
          review_count,
          submitted_at
        `
        )
        .order("submitted_at", {
          ascending: false,
        });

      if (error) {
        setErrorMessage(
          error.message || "Could not load attempts."
        );
        setLoading(false);
        return;
      }

      setAttempts(data || []);
      setLoading(false);
    }

    loadAttempts();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Attempts & Results</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            Attempts & Results
          </h1>

          <p style={{ marginBottom: 0 }}>
            View student test attempts and results.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            overflowX: "auto",
          }}
        >
          <h2>
            Total Attempts: {attempts.length}
          </h2>

          {attempts.length === 0 ? (
            <p>No attempts found.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Test ID</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Percentage</th>
                  <th style={thStyle}>Attempt</th>
                  <th style={thStyle}>
                    Leaderboard
                  </th>
                  <th style={thStyle}>
                    Reviews
                  </th>
                  <th style={thStyle}>
                    Submitted
                  </th>
                </tr>
              </thead>

              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td style={tdStyle}>
                      {attempt.student_name}
                    </td>

                    <td style={tdStyle}>
                      {attempt.test_id}
                    </td>

                    <td style={tdStyle}>
                      {attempt.score} /{" "}
                      {attempt.total_marks}
                    </td>

                    <td style={tdStyle}>
                      {attempt.percentage}%
                    </td>

                    <td style={tdStyle}>
                      {attempt.attempt_number}
                    </td>

                    <td style={tdStyle}>
                      {attempt.counts_for_leaderboard
                        ? "Yes"
                        : "No"}
                    </td>

                    <td style={tdStyle}>
                      {attempt.review_count}
                    </td>

                    <td style={tdStyle}>
                      {new Date(
                        attempt.submitted_at
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <button
          onClick={() => router.push("/admin")}
          style={{
            marginTop: "20px",
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    </main>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "2px solid #ddd",
  background: "#f3f4f6",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #ddd",
};
