"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAttemptsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [htmlAttempts, setHtmlAttempts] = useState([]);
  const [htmlTests, setHtmlTests] = useState([]);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadAttempts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
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

      // Load normal test attempts
      const {
        data: normalAttempts,
        error: normalError,
      } = await supabase
        .from("attempts")
        .select(
          `
          id,
          user_id,
          student_name,
          score,
          total_marks,
          percentage,
          attempt_number,
          counts_for_leaderboard,
          review_count,
          submitted_at,
          tests (
            id,
            title,
            test_type,
            slug
          )
        `
        )
        .order("submitted_at", {
          ascending: false,
        });

      if (normalError) {
        setErrorMessage(
          "Could not load normal test attempts: " +
            normalError.message
        );
        setLoading(false);
        return;
      }

      // Load HTML test attempts
      const {
        data: htmlAttemptData,
        error: htmlAttemptError,
      } = await supabase.rpc(
        "admin_get_html_attempts"
      );

      if (htmlAttemptError) {
        setErrorMessage(
          "Could not load HTML test attempts: " +
            htmlAttemptError.message
        );
        setLoading(false);
        return;
      }

      // Load HTML test names using the admin RPC
      const {
        data: htmlTestData,
        error: htmlTestError,
      } = await supabase.rpc(
        "admin_get_paid_html_tests"
      );

      if (htmlTestError) {
        setErrorMessage(
          "Could not load HTML test information: " +
            htmlTestError.message
        );
        setLoading(false);
        return;
      }

      setAttempts(normalAttempts || []);
      setHtmlAttempts(
        htmlAttemptData || []
      );
      setHtmlTests(htmlTestData || []);
      setLoading(false);
    }

    loadAttempts();
  }, []);

  function openNormalAttempt(attemptId) {
    router.push(
      `/admin/attempts/${attemptId}`
    );
  }

  const htmlTestMap = {};

  htmlTests.forEach((test) => {
    htmlTestMap[test.id] = test;
  });

  const totalAttempts =
    attempts.length +
    htmlAttempts.length;

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
          maxWidth: "1400px",
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

        {/* NORMAL TEST ATTEMPTS */}

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            overflowX: "auto",
            marginBottom: "25px",
          }}
        >
          <h2>
            📝 Normal Test Attempts:{" "}
            {attempts.length}
          </h2>

          {attempts.length === 0 ? (
            <p>
              No normal test attempts found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "1200px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>
                    Student
                  </th>

                  <th style={thStyle}>
                    Test
                  </th>

                  <th style={thStyle}>
                    Type
                  </th>

                  <th style={thStyle}>
                    Score
                  </th>

                  <th style={thStyle}>
                    Percentage
                  </th>

                  <th style={thStyle}>
                    Attempt
                  </th>

                  <th style={thStyle}>
                    Leaderboard
                  </th>

                  <th style={thStyle}>
                    Reviews
                  </th>

                  <th style={thStyle}>
                    Submitted
                  </th>

                  <th style={thStyle}>
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {attempts.map(
                  (attempt) => (
                    <tr
                      key={
                        attempt.id
                      }
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            attempt.student_name
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {attempt
                          .tests
                          ?.title ||
                          "Unknown Test"}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {attempt
                          .tests
                          ?.test_type ===
                        "free" ? (
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "5px 9px",
                              background:
                                "#dcfce7",
                              color:
                                "#166534",
                              borderRadius:
                                "999px",
                              fontSize:
                                "13px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🟢 Free
                          </span>
                        ) : (
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "5px 9px",
                              background:
                                "#fef3c7",
                              color:
                                "#92400e",
                              borderRadius:
                                "999px",
                              fontSize:
                                "13px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🔒 Restricted
                          </span>
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            attempt.score
                          }
                        </strong>{" "}
                        /{" "}
                        {
                          attempt.total_marks
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            attempt.percentage
                          }
                          %
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          attempt.attempt_number
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {attempt.counts_for_leaderboard ? (
                          <span
                            style={{
                              color:
                                "#166534",
                              fontWeight:
                                "bold",
                            }}
                          >
                            Yes
                          </span>
                        ) : (
                          <span
                            style={{
                              color:
                                "#991b1b",
                              fontWeight:
                                "bold",
                            }}
                          >
                            No
                          </span>
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          attempt.review_count
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {new Date(
                          attempt.submitted_at
                        ).toLocaleString()}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <button
                          onClick={() =>
                            openNormalAttempt(
                              attempt.id
                            )
                          }
                          style={{
                            padding:
                              "8px 12px",
                            background:
                              "#2563eb",
                            color:
                              "#fff",
                            border:
                              "none",
                            borderRadius:
                              "6px",
                            cursor:
                              "pointer",
                            fontWeight:
                              "bold",
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* HTML TEST ATTEMPTS */}

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            overflowX: "auto",
          }}
        >
          <h2>
            🌐 HTML Test Attempts:{" "}
            {htmlAttempts.length}
          </h2>

          {htmlAttempts.length ===
          0 ? (
            <p>
              No HTML test attempts found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "1100px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>
                    Student
                  </th>

                  <th style={thStyle}>
                    Test
                  </th>

                  <th style={thStyle}>
                    Type
                  </th>

                  <th style={thStyle}>
                    Score
                  </th>

                  <th style={thStyle}>
                    Percentage
                  </th>

                  <th style={thStyle}>
                    Attempt
                  </th>

                  <th style={thStyle}>
                    Leaderboard
                  </th>

                  <th style={thStyle}>
                    Submitted
                  </th>
                </tr>
              </thead>

              <tbody>
                {htmlAttempts.map(
                  (attempt) => {
                    const test =
                      htmlTestMap[
                        attempt
                          .html_test_id
                      ];

                    return (
                      <tr
                        key={
                          attempt.id
                        }
                      >
                        <td
                          style={
                            tdStyle
                          }
                        >
                          <strong>
                            {
                              attempt.student_name
                            }
                          </strong>
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {test?.title ||
                            "HTML Test"}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "5px 9px",
                              background:
                                "#dbeafe",
                              color:
                                "#1e40af",
                              borderRadius:
                                "999px",
                              fontSize:
                                "13px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🌐 HTML
                          </span>
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <strong>
                            {
                              attempt.score
                            }
                          </strong>{" "}
                          /{" "}
                          {
                            attempt.total_marks
                          }
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <strong>
                            {
                              attempt.percentage
                            }
                            %
                          </strong>
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {
                            attempt.attempt_number
                          }
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {attempt.counts_for_leaderboard ? (
                            <span
                              style={{
                                color:
                                  "#166534",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              Yes
                            </span>
                          ) : (
                            <span
                              style={{
                                color:
                                  "#991b1b",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              No
                            </span>
                          )}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {new Date(
                            attempt.submitted_at
                          ).toLocaleString()}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            marginTop: "20px",
          }}
        >
          <strong>
            Total Attempts:{" "}
            {totalAttempts}
          </strong>
        </div>

        <button
          onClick={() =>
            router.push("/admin")
          }
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
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};
