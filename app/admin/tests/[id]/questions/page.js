"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ManageQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const testId = params.id;

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [marks, setMarks] = useState("1");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select("id, title, slug")
        .eq("id", testId)
        .single();

      if (testError || !testData) {
        setErrorMessage("Test not found.");
        setLoading(false);
        return;
      }

      setTest(testData);

      await loadQuestions();

      setLoading(false);
    }

    async function loadQuestions() {
      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question_number, question_text, options, correct_answer, marks"
        )
        .eq("test_id", testId)
        .order("question_number", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setQuestions(data || []);
    }

    if (testId) {
      loadData();
    }
  }, [testId]);

  async function handleAddQuestion(e) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!questionText.trim()) {
      setErrorMessage("Please enter the question.");
      return;
    }

    if (
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      setErrorMessage("Please enter all four options.");
      return;
    }

    if (!correctAnswer) {
      setErrorMessage("Please select the correct answer.");
      return;
    }

    setSaving(true);

    const nextQuestionNumber =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.question_number)) + 1
        : 1;

    const { error } = await supabase.from("questions").insert({
      test_id: testId,
      question_number: nextQuestionNumber,
      question_text: questionText.trim(),
      options: [
        optionA.trim(),
        optionB.trim(),
        optionC.trim(),
        optionD.trim(),
      ],
      correct_answer: correctAnswer,
      marks: Number(marks) || 1,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("");
    setMarks("1");

    setSuccessMessage(
      `Question ${nextQuestionNumber} added successfully.`
    );

    const { data: updatedQuestions } = await supabase
      .from("questions")
      .select(
        "id, question_number, question_text, options, correct_answer, marks"
      )
      .eq("test_id", testId)
      .order("question_number", { ascending: true });

    setQuestions(updatedQuestions || []);

    setSaving(false);
  }

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Questions...</h1>
      </main>
    );
  }

  if (errorMessage && !test) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Manage Questions</h1>
        <p style={{ color: "#dc2626" }}>{errorMessage}</p>

        <button
          onClick={() => router.push("/admin/tests")}
          style={{
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Tests
        </button>
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
          <h1 style={{ marginTop: 0 }}>Manage Questions</h1>

          <p style={{ marginBottom: 0 }}>
            Test: <strong>{test.title}</strong>
          </p>

          <p style={{ marginBottom: 0 }}>
            Slug: <strong>{test.slug}</strong>
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
          <h2>Add Question</h2>

          <form onSubmit={handleAddQuestion}>
            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Question</strong>
              </label>

              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter question"
                rows="4"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Option A</strong>
              </label>

              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="Option A"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Option B</strong>
              </label>

              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Option B"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Option C</strong>
              </label>

              <input
                type="text"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                placeholder="Option C"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Option D</strong>
              </label>

              <input
                type="text"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                placeholder="Option D"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Correct Answer</strong>
              </label>

              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              >
                <option value="">Select correct answer</option>
                <option value={optionA}>
                  A - {optionA || "Option A"}
                </option>
                <option value={optionB}>
                  B - {optionB || "Option B"}
                </option>
                <option value={optionC}>
                  C - {optionC || "Option C"}
                </option>
                <option value={optionD}>
                  D - {optionD || "Option D"}
                </option>
              </select>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Marks</strong>
              </label>

              <input
                type="number"
                min="0"
                step="0.5"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            {errorMessage && (
              <p
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 20px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "16px",
              }}
            >
              {saving ? "Adding..." : "Add Question"}
            </button>
          </form>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>Questions ({questions.length})</h2>

          {questions.length === 0 ? (
            <p>No questions added yet.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {questions.map((question) => (
                <div
                  key={question.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                  }}
                >
                  <h3>
                    {question.question_number}.{" "}
                    {question.question_text}
                  </h3>

                  {question.options?.map((option, index) => (
                    <p key={option}>
                      <strong>
                        {String.fromCharCode(65 + index)}.
                      </strong>{" "}
                      {option}
                    </p>
                  ))}

                  <p>
                    <strong>Correct Answer:</strong>{" "}
                    {question.correct_answer}
                  </p>

                  <p>
                    <strong>Marks:</strong> {question.marks}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/admin/tests")}
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
          ← Back to Tests
        </button>
      </div>
    </main>
  );
}
