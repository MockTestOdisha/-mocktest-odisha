"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReviewPage({ params }) {
  const searchParams = useSearchParams();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewCount, setReviewCount] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadReview() {
      const resolvedParams = await params;
      const currentSlug = resolvedParams.slug;

      const urlAttemptId = searchParams.get("attempt");

      const storedAttemptId = localStorage.getItem(
        `mocktest_attempt_id_${currentSlug}`
      );

      const attemptId = urlAttemptId || storedAttemptId;

      if (!attemptId) {
        setErrorMessage("No submitted attempt was found.");
        setLoading(false);
        return;
      }

      /*
       * Count this review.
       */
      const { data: newReviewCount, error: reviewError } =
        await supabase.rpc("increment_review_count", {
          p_attempt_id: attemptId,
        });

      if (reviewError) {
        setErrorMessage(
          "Could not record this review: " + reviewError.message
        );
        setLoading(false);
        return;
      }

      if (!newReviewCount || newReviewCount > 10) {
        setErrorMessage(
          "You have reached the maximum of 10 reviews for this test."
        );
        setLoading(false);
        return;
      }

      setReviewCount(newReviewCount);

      /*
       * Load the attempt.
       */
      const { data: attemptData, error: attemptError } = await supabase
        .from("attempts")
        .select(
          "id, test_id, student_name, score, total_marks, percentage, review_count"
        )
        .eq("id", attemptId)
        .single();

      if (attemptError || !attemptData) {
        setErrorMessage("Could not load your submitted result.");
        setLoading(false);
        return;
      }

      setAttempt(attemptData);

      /*
       * Load submitted answers.
       */
      const { data: answerData, error: answerError } = await supabase
        .from("attempt_answers")
        .select(
          `
          id,
          selected_answer,
          is_correct,
          marks_awarded,
          question_id,
          questions (
            question_number,
            question_text,
            options,
            correct_answer,
            marks
          )
        `
        )
        .eq("attempt_id", attemptId)
        .order("created_at");

      if (answerError) {
        setErrorMessage(
          "Could not load your submitted answers: " +
            answerError.message
        );
        setLoading(false);
        return;
      }

      setAnswers(answerData || []);
      setLoading(false);
    }

    loadReview();
  }, [searchParams, params]);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Review...</h1>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
        }}
      >
        <h1>Review</h1>

        <p>{errorMessage}</p>

        <a href="/leaderboard">Back to Leaderboard</a>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <h1>Test Review</h1>

      <p>
        <strong>Student:</strong> {attempt.student_name}
      </p>

      <h2>
        Score: {attempt.score} / {attempt.total_marks}
      </h2>

      <h3>Percentage: {attempt.percentage}%</h3>

      <p>
        Review {reviewCount} of 10
      </p>

      <hr />

      {answers.map((answer) => {
        const question = answer.questions;

        if (!question) {
          return null;
        }

        return (
          <div
            key={answer.id}
            style={{
              background: "#fff",
              padding: "20px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3>
              {question.question_number}.{" "}
              {question.question_text}
            </h3>

            <p>
              <strong>Your answer:</strong>{" "}
              {answer.selected_answer || "Not answered"}
            </p>

            <p>
              <strong>Correct answer:</strong>{" "}
              {question.correct_answer}
            </p>

            <p>
              <strong>Result:</strong>{" "}
              {answer.is_correct
                ? "Correct"
                : "Incorrect"}
            </p>

            <p>
              <strong>Marks:</strong>{" "}
              {answer.marks_awarded} / {question.marks}
            </p>
          </div>
        );
      })}

      <a
        href="/leaderboard"
        style={{
          display: "inline-block",
          marginTop: "10px",
          padding: "10px 16px",
          background: "#2563eb",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Back to Leaderboard
      </a>
    </main>
  );
}
