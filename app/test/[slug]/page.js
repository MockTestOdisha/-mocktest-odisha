"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestPage({ params }) {
  const [slug, setSlug] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [studentName, setStudentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadTest() {
      const resolvedParams = await params;
      const currentSlug = resolvedParams.slug;

      setSlug(currentSlug);

      const { data: testData, error: testError } =
        await supabase
          .from("tests")
          .select(
            "id, title, description, test_type"
          )
          .eq("slug", currentSlug)
          .single();

      if (testError || !testData) {
        setCheckingAccess(false);
        return;
      }

      setTest(testData);

      /*
       * FREE TEST
       */
      if (testData.test_type === "free") {
        const {
          data: questionData,
          error: questionError,
        } = await supabase
          .from("questions")
          .select(
            "id, question_number, question_text, options, correct_answer, marks"
          )
          .eq("test_id", testData.id)
          .order("question_number");

        if (questionError) {
          setAccessAllowed(false);
          setAccessMessage(
            "Could not load questions: " +
              questionError.message
          );
          setCheckingAccess(false);
          return;
        }

        setQuestions(questionData || []);

        const attemptKey =
          `mocktest_attempt_${currentSlug}`;

        if (
          localStorage.getItem(attemptKey) === "true"
        ) {
          setAlreadyAttempted(true);
        }

        setCheckingAccess(false);
        return;
      }

      /*
       * RESTRICTED TEST
       *
       * Get authenticated student.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setCurrentUser(null);
        setAccessAllowed(false);
        setAccessMessage(
          "Student login is required to access this restricted test."
        );
        setCheckingAccess(false);
        return;
      }

      setCurrentUser(user);

      /*
       * Check restricted-test access.
       */
      const {
        data: hasAccess,
        error: accessError,
      } = await supabase.rpc("check_test_access", {
        p_test_id: testData.id,
      });

      if (accessError) {
        setAccessAllowed(false);
        setAccessMessage(
          "Could not check test access: " +
            accessError.message
        );
        setCheckingAccess(false);
        return;
      }

      if (!hasAccess) {
        setAccessAllowed(false);
        setAccessMessage(
          "You do not currently have access to this restricted test."
        );
        setCheckingAccess(false);
        return;
      }

      /*
       * Access is valid.
       * Load questions.
       */
      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("questions")
        .select(
          "id, question_number, question_text, options, correct_answer, marks"
        )
        .eq("test_id", testData.id)
        .order("question_number");

      if (questionError) {
        setAccessAllowed(false);
        setAccessMessage(
          "Could not load questions: " +
            questionError.message
        );
        setCheckingAccess(false);
        return;
      }

      setQuestions(questionData || []);
      setCheckingAccess(false);
    }

    loadTest();
  }, []);

  function handleAnswer(questionId, answer) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  }

  async function handleSubmit() {
    if (!test) {
      return;
    }

    /*
     * FREE TEST
     */
    if (test.test_type === "free") {
      if (alreadyAttempted) {
        alert(
          "You have already attempted this test."
        );
        return;
      }

      if (!studentName.trim()) {
        alert("Please enter your name.");
        return;
      }
    }

    /*
     * RESTRICTED TEST
     */
    if (test.test_type === "restricted") {
      if (!accessAllowed) {
        alert(
          "You do not currently have access to this test."
        );
        return;
      }

      if (!studentName.trim()) {
        alert("Please enter your name.");
        return;
      }

      /*
       * Verify the current login again immediately
       * before submitting.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert(
          "Your student login session has expired. Please log in again."
        );
        return;
      }

      setCurrentUser(user);
    }

    /*
     * Calculate score.
     */
    let score = 0;
    let totalMarks = 0;

    questions.forEach((question) => {
      const marks = Number(question.marks || 0);

      totalMarks += marks;

      if (
        answers[question.id] ===
        question.correct_answer
      ) {
        score += marks;
      }
    });

    const percentage =
      totalMarks > 0
        ? Math.round((score / totalMarks) * 100)
        : 0;

    /*
     * Create the attempt.
     *
     * RESTRICTED:
     * The secure database function automatically
     * determines attempt number and leaderboard status.
     *
     * FREE:
     * The normal attempts insert is used.
     */
    let attempt = null;
    let attemptError = null;

    if (test.test_type === "restricted") {
      const {
        data: attemptId,
        error,
      } = await supabase.rpc(
        "submit_restricted_attempt",
        {
          p_test_id: test.id,
          p_student_name:
            studentName.trim(),
          p_score: score,
          p_total_marks: totalMarks,
          p_percentage: percentage,
        }
      );

      attemptError = error;

      if (attemptId) {
        attempt = {
          id: attemptId,
        };
      }
    } else {
      /*
       * FREE TEST
       */
      const {
        data,
        error,
      } = await supabase
        .from("attempts")
        .insert({
          test_id: test.id,
          user_id: null,
          student_name:
            studentName.trim(),
          score,
          total_marks: totalMarks,
          percentage,
          attempt_number: 1,
          counts_for_leaderboard: true,
          review_count: 0,
          submitted_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();

      attempt = data;
      attemptError = error;
    }

    if (attemptError) {
      alert(
        "Could not save your result: " +
          attemptError.message
      );
      return;
    }

    if (!attempt?.id) {
      alert(
        "Could not save your result because no attempt ID was returned."
      );
      return;
    }

    /*
     * Save submitted answers.
     */
    const answerRows = questions.map((question) => {
      const selectedAnswer =
        answers[question.id] || null;

      const isCorrect =
        selectedAnswer !== null &&
        selectedAnswer ===
          question.correct_answer;

      const marksAwarded = isCorrect
        ? Number(question.marks || 0)
        : 0;

      return {
        attempt_id: attempt.id,
        question_id: question.id,
        selected_answer:
          selectedAnswer,
        is_correct: isCorrect,
        marks_awarded:
          marksAwarded,
      };
    });

    if (answerRows.length > 0) {
      const {
        error: answersError,
      } = await supabase
        .from("attempt_answers")
        .insert(answerRows);

      if (answersError) {
        alert(
          "Your result was saved, but your answers could not be saved: " +
            answersError.message
        );
        return;
      }
    }

    /*
     * Only free tests use the browser
     * one-attempt marker.
     *
     * Restricted tests can be attempted
     * multiple times.
     */
    if (test.test_type === "free") {
      localStorage.setItem(
        `mocktest_attempt_${slug}`,
        "true"
      );

      localStorage.setItem(
        `mocktest_attempt_id_${slug}`,
        attempt.id
      );

      setAlreadyAttempted(true);
    }

    /*
     * Show result.
     */
    setResult({
      attemptId: attempt.id,
      score,
      totalMarks,
      percentage,
    });

    setSubmitted(true);
  }

  /*
   * Loading
   */
  if (checkingAccess) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Test...</h1>
      </main>
    );
  }

  /*
   * Test not found
   */
  if (!test) {
    return (
      <h1 style={{ padding: "30px" }}>
        Test not found
      </h1>
    );
  }

  /*
   * Restricted access denied
   */
  if (
    test.test_type === "restricted" &&
    !accessAllowed
  ) {
    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
          textAlign: "center",
        }}
      >
        <h1>{test.title}</h1>

        <h2>Restricted Test 🔒</h2>

        <p>{accessMessage}</p>

        {!currentUser && (
          <a
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 20px",
              background: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Student Login
          </a>
        )}

        <br />

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "15px",
            padding: "10px 18px",
            background: "#6b7280",
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

  /*
   * FREE TEST — ALREADY ATTEMPTED
   */
  if (
    test.test_type === "free" &&
    alreadyAttempted &&
    !submitted
  ) {
    const storedAttemptId =
      localStorage.getItem(
        `mocktest_attempt_id_${slug}`
      );

    const reviewUrl = storedAttemptId
      ? `/review/${slug}?attempt=${encodeURIComponent(
          storedAttemptId
        )}`
      : null;

    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
          textAlign: "center",
        }}
      >
        <h1>{test.title}</h1>

        <h2>
          You have already attempted this test.
        </h2>

        <p>
          Free tests allow only one attempt.
        </p>

        {reviewUrl && (
          <a
            href={reviewUrl}
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 20px",
              background: "#16a34a",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Review My Answers
          </a>
        )}
      </main>
    );
  }

  /*
   * SUBMITTED RESULT
   */
  if (submitted && result) {
    const reviewUrl =
      `/review/${slug}?attempt=` +
      encodeURIComponent(
        result.attemptId
      );

    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
          textAlign: "center",
        }}
      >
        <h1>Test Submitted</h1>

        <h2>
          Score: {result.score} /{" "}
          {result.totalMarks}
        </h2>

        <h3>
          Percentage: {result.percentage}%
        </h3>

        <p>
          Thank you, {studentName}.
        </p>

        <p>
          Your answers have been saved for review.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            marginTop: "25px",
          }}
        >
          <a
            href={reviewUrl}
            style={{
              display: "inline-block",
              padding: "12px 20px",
              background: "#16a34a",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            Review My Answers
          </a>

          <a
            href="/leaderboard"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              background: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            View Leaderboard
          </a>
        </div>
      </main>
    );
  }

  /*
   * TEST QUESTIONS
   */
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <h1>{test.title}</h1>

      <p>{test.description}</p>

      {test.test_type === "restricted" && (
        <p
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "12px",
            borderRadius: "6px",
            fontWeight: "bold",
          }}
        >
          🔒 Restricted Test — You have
          access to this test.
        </p>
      )}

      <hr />

      <div style={{ marginBottom: "25px" }}>
        <label>
          <strong>Your Name</strong>
        </label>

        <br />

        <input
          type="text"
          value={studentName}
          onChange={(e) =>
            setStudentName(e.target.value)
          }
          placeholder="Enter your name"
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "10px",
            marginTop: "8px",
          }}
        />
      </div>

      {questions.map((question) => (
        <div
          key={question.id}
          style={{ marginBottom: "30px" }}
        >
          <h3>
            {question.question_number}.{" "}
            {question.question_text}
          </h3>

          {question.options?.map((option) => (
            <label
              key={option}
              style={{
                display: "block",
                margin: "10px 0",
              }}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={
                  answers[question.id] ===
                  option
                }
                onChange={() =>
                  handleAnswer(
                    question.id,
                    option
                  )
                }
              />

              {" "}

              {option}
            </label>
          ))}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        style={{
          padding: "12px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Submit Test
      </button>
    </main>
  );
}
