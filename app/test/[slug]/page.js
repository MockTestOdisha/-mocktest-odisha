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

  const supabase = createClient();

  useEffect(() => {
    async function loadTest() {
      const resolvedParams = await params;
      const currentSlug = resolvedParams.slug;

      setSlug(currentSlug);

      const { data: testData } = await supabase
        .from("tests")
        .select("id, title, description, test_type")
        .eq("slug", currentSlug)
        .single();

      if (!testData) {
        return;
      }

      setTest(testData);

      const { data: questionData } = await supabase
        .from("questions")
        .select(
          "id, question_number, question_text, options, correct_answer, marks"
        )
        .eq("test_id", testData.id)
        .order("question_number");

      setQuestions(questionData || []);

      const attemptKey = `mocktest_attempt_${currentSlug}`;

      if (localStorage.getItem(attemptKey) === "true") {
        setAlreadyAttempted(true);
      }
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
    if (alreadyAttempted) {
      alert("You have already attempted this test.");
      return;
    }

    if (!studentName.trim()) {
      alert("Please enter your name.");
      return;
    }

    let score = 0;
    let totalMarks = 0;

    questions.forEach((question) => {
      const marks = Number(question.marks || 0);

      totalMarks += marks;

      if (answers[question.id] === question.correct_answer) {
        score += marks;
      }
    });

    const percentage =
      totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .insert({
        test_id: test.id,
        student_name: studentName.trim(),
        score,
        total_marks: totalMarks,
        percentage,
        attempt_number: 1,
        counts_for_leaderboard: true,
        review_count: 0,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attemptError) {
      alert("Could not save your result: " + attemptError.message);
      return;
    }

    const answerRows = questions.map((question) => {
      const selectedAnswer = answers[question.id] || null;

      const isCorrect =
        selectedAnswer !== null &&
        selectedAnswer === question.correct_answer;

      const marksAwarded = isCorrect ? Number(question.marks || 0) : 0;

      return {
        attempt_id: attempt.id,
        question_id: question.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
      };
    });

    if (answerRows.length > 0) {
      const { error: answersError } = await supabase
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

    localStorage.setItem(`mocktest_attempt_${slug}`, "true");
    localStorage.setItem(`mocktest_attempt_id_${slug}`, attempt.id);

    setAlreadyAttempted(true);

    setResult({
      attemptId: attempt.id,
      score,
      totalMarks,
      percentage,
    });

    setSubmitted(true);
  }

  if (!test) {
    return <h1 style={{ padding: "30px" }}>Test not found</h1>;
  }

  if (alreadyAttempted && !submitted) {
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

        <h2>You have already attempted this test.</h2>

        <p>Free tests allow only one attempt.</p>
      </main>
    );
  }

  if (submitted && result) {
    const reviewUrl =
      `/review/${slug}?attempt=` +
      encodeURIComponent(result.attemptId);

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
          Score: {result.score} / {result.totalMarks}
        </h2>

        <h3>Percentage: {result.percentage}%</h3>

        <p>Thank you, {studentName}.</p>

        <p>Your answers have been saved for review.</p>

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

      <hr />

      <div style={{ marginBottom: "25px" }}>
        <label>
          <strong>Your Name</strong>
        </label>

        <br />

        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
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
        <div key={question.id} style={{ marginBottom: "30px" }}>
          <h3>
            {question.question_number}. {question.question_text}
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
                checked={answers[question.id] === option}
                onChange={() => handleAnswer(question.id, option)}
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
