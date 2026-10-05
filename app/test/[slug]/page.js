import { createClient } from "@/lib/supabase/client";

export default async function TestPage({ params }) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: test } = await supabase
    .from("tests")
    .select("id, title, description, test_type")
    .eq("slug", slug)
    .single();

  if (!test) {
    return <h1>Test not found</h1>;
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_number, question_text, options, marks")
    .eq("test_id", test.id)
    .order("question_number");

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "30px" }}>
      <h1>{test.title}</h1>
      <p>{test.description}</p>

      <hr />

      {questions?.map((question) => (
        <div key={question.id} style={{ marginBottom: "30px" }}>
          <h3>
            {question.question_number}. {question.question_text}
          </h3>

          {question.options?.map((option) => (
            <label
              key={option}
              style={{ display: "block", margin: "10px 0" }}
            >
              <input type="radio" name={question.id} value={option} />
              {" "}{option}
            </label>
          ))}
        </div>
      ))}

      <button>Submit Test</button>
    </main>
  );
}
