"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminAttemptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.id;

  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!attemptId) {
      return;
    }

    async function loadAttempt() {
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

      const { data: attemptData, error: attemptError } =
        await supabase
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
          .eq("id", attemptId)
          .single();

      if (attemptError || !attemptData) {
        setErrorMessage(
          attemptError?.message ||
            "Attempt not found."
        );
        setLoading(false);
        return;
      }

      const { data: answerData, error: answerError } =
        await supabase
          .from("attempt_answers")
          .select(
            `
            id,
            attempt_id,
            question_id,
            selected_answer,
            is_correct,
            marks_awarded,
            created_at,
            questions (
              id,
              question_number,
              question_text,
              options,
              correct_answer
            )
          `
          )
          .eq("attempt_id", attemptId)
          .order("created_at", {
            ascending: true,
          });

      if (answerError) {
        setErrorMessage(
          answerError.message ||
            "Could not load submitted answers."
        );
        setLoading(false);
        return;
      }

      setAttempt(attemptData);
      setAnswers(answerData || []);
      setLoading(false);
    }

    loadAttempt();
  }, [attemptId]);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Attempt Details</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (errorMessage) {
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
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h1>Attempt Details</h1>
            <p>{errorMessage}</p>
          </div>

          <button
            onClick={() =>
              router.push("/admin/attempts")
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
            ← Back to Attempts
          </button>
        </div>
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
          maxWidth: "1000px",
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
            Attempt Details
          </h1>

          <p style={{ marginBottom: 0 }}>
            Detailed student result and submitted answers.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Student Information</h2>

          <p>
            <strong>Student:</strong>{" "}
            {attempt.student_name}
          </p>

          <p>
            <strong>Test:</strong>{" "}
            {attempt.tests?.title ||
              "Unknown Test"}
          </p>

          <p>
            <strong>Type:</strong>{" "}
            {attempt.tests?.test_type === "free"
              ? "🟢 Free"
              : "🔒 Restricted"}
          </p>

          <p>
            <strong>Attempt Number:</strong>{" "}
            {attempt.attempt_number}
          </p>

          <p>
            <strong>Score:</strong>{" "}
            {attempt.score} / {attempt.total_marks}
          </p>

          <p>
            <strong>Percentage:</strong>{" "}
            {attempt.percentage}%
          </p>

          <p>
            <strong>Leaderboard:</strong>{" "}
            {attempt.counts_for_leaderboard
              ? "Yes"
              : "No"}
          </p>

          <p>
            <strong>Reviews:</strong>{" "}
            {attempt.review_count}
          </p>

          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(
              attempt.submitted_at
            ).toLocaleString()}
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>
            Submitted Answers ({answers.length})
          </h2>

          {answers.length === 0 ? (
            <p>
              No submitted answers were found for this
              attempt.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "20px",
              }}
            >
              {answers.map((answer, index) => {
                const question =
                  answer.questions;

                return (
                  <div
                    key={answer.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                        }}
                      >
                        Question{" "}
                        {question?.question_number ||
                          index + 1}
                      </h3>

                      {answer.is_correct ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                          }}
                        >
                          ✓ Correct
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                          }}
                        >
                          ✗ Incorrect
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: "17px",
                        lineHeight: 1.6,
                        fontWeight: "bold",
                      }}
                    >
                      {question?.question_text ||
                        "Question text unavailable."}
                    </p>

                    {question?.options && (
                      <div
                        style={{
                          marginBottom: "15px",
                        }}
                      >
                        {Object.entries(
                          question.options
                        ).map(
                          ([key, value]) => {
                            const isSelected =
                              String(
                                answer.selected_answer
                              ).trim() ===
                              String(key).trim();

                            const isCorrect =
                              String(
                                question.correct_answer
                              ).trim() ===
                              String(key).trim();

                            return (
                              <div
                                key={key}
                                style={{
                                  padding: "10px",
                                  marginBottom:
                                    "8px",
                                  borderRadius:
                                    "6px",
                                  border:
                                    isCorrect
                                      ? "2px solid #16a34a"
                                      : isSelected
                                      ? "2px solid #dc2626"
                                      : "1px solid #ddd",
                                  background:
                                    isCorrect
                                      ? "#f0fdf4"
                                      : isSelected
                                      ? "#fef2f2"
                                      : "#fff",
                                }}
                              >
                                <strong>
                                  {key}.
                                </strong>{" "}
                                {String(value)}

                                {isCorrect && (
                                  <span
                                    style={{
                                      marginLeft:
                                        "8px",
                                      color:
                                        "#166534",
                                      fontWeight:
                                        "bold",
                                    }}
                                  >
                                    ✓ Correct Answer
                                  </span>
                                )}

                                {isSelected &&
                                  !isCorrect && (
                                    <span
                                      style={{
                                        marginLeft:
                                          "8px",
                                        color:
                                          "#991b1b",
                                        fontWeight:
                                          "bold",
                                      }}
                                    >
                                      ← Student Answer
                                    </span>
                                  )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    <p>
                      <strong>
                        Student selected:
                      </strong>{" "}
                      {answer.selected_answer ||
                        "No answer"}
                    </p>

                    <p>
                      <strong>
                        Correct answer:
                      </strong>{" "}
                      {question?.correct_answer ||
                        "Unavailable"}
                    </p>

                    <p>
                      <strong>
                        Marks awarded:
                      </strong>{" "}
                      {answer.marks_awarded}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() =>
            router.push("/admin/attempts")
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
          ← Back to Attempts
        </button>
      </div>
    </main>
  );
}
