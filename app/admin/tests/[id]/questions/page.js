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
  const [errorMessage, setErrorMessage] = useState("");

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

      const { data: questionData, error: questionError } =
        await supabase
          .from("questions")
          .select(
            "id, question_number, question_text, options, correct_answer, marks"
          )
          .eq("test_id", testId)
          .order("question_number", { ascending: true });

      if (questionError) {
        setErrorMessage(questionError.message);
        setLoading(false);
        return;
      }

      setQuestions(questionData || []);
      setLoading(false);
    }

    if (testId) {
      loadData();
    }
  }, [testId]);

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Questions...</h1>
      </main>
    );
  }

  if (errorMessage) {
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
          <h2>Add Questions</h2>

          <p>
            The question creation form will be added in the next step.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>Questions</h2>

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

                  {question.options?.map((option) => (
                    <p key={option}>
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
