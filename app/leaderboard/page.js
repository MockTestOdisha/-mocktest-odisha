"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LeaderboardPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadLeaderboard() {
      const { data, error } = await supabase
        .from("attempts")
        .select(
          "student_name, score, total_marks, percentage, submitted_at"
        )
        .eq("counts_for_leaderboard", true)
        .order("percentage", { ascending: false })
        .order("score", { ascending: false })
        .order("submitted_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setAttempts(data || []);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Leaderboard</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <h1>Leaderboard</h1>

      {attempts.length === 0 ? (
        <p>No results yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Rank
                </th>

                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Student
                </th>

                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Score
                </th>

                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Percentage
                </th>
              </tr>
            </thead>

            <tbody>
              {attempts.map((attempt, index) => (
                <tr key={`${attempt.student_name}-${index}`}>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                    }}
                  >
                    {attempt.student_name}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                    }}
                  >
                    {attempt.score} / {attempt.total_marks}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                    }}
                  >
                    {attempt.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: "20px",
          padding: "10px 16px",
          background: "#2563eb",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Back to Home
      </a>
    </main>
  );
}
