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
      totalMarks += Number(question.marks || 0);

      if (answers[question.id] === question.correct_answer) {
        score += Number(question.marks || 0);
      }
    });

    const percentage =
      totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const { error } = await supabase.from("attempts").insert({
      test_id: test.id,
      student_name: studentName.trim(),
      score,
      total_marks: totalMarks,
      percentage,
      attempt_number: 1,
      counts_for_leaderboard: true,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      alert("Could not save your result: " + error.message);
      return;
    }

    localStorage.setItem(`mocktest_attempt_${slug}`, "true");

    setAlreadyAttempted(true);

    setResult({
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

        <p>
          Free tests allow only one attempt.
        </p>
      </main>
    );
  }

  if (submitted && result) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "30px" }}>
        <h1>Test Submitted</h1>

        <h2>
          Score: {result.score} / {result.totalMarks}
        </h2>

        <h3>Percentage: {result.percentage}%</h3>

        <p>Thank you, {studentName}.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "30px" }}>
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
              style={{ display: "block", margin: "10px 0" }}
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

      <button onClick={handleSubmit}>Submit Test</button>
    </main>
  );
}
