import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, title, slug, description, test_type, is_active"
    )
    .eq("is_active", true)
    .eq("test_type", "free")
    .order("created_at", {
      ascending: false,
    });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1>Mock Test Odisha</h1>

        <p>Choose a test to begin.</p>

        {(!tests || tests.length === 0) && (
          <div
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "10px",
              marginTop: "25px",
            }}
          >
            <p>No free tests are currently available.</p>
          </div>
        )}

        {tests &&
          tests.map((test) => (
            <div
              key={test.id}
              style={{
                background: "#fff",
                padding: "20px",
                marginTop: "15px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                textAlign: "left",
              }}
            >
              <h2>{test.title}</h2>

              {test.description && (
                <p>{test.description}</p>
              )}

              <p>
                <strong>Type:</strong> Free
              </p>

              <a
                href={`/test/${test.slug}`}
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  padding: "12px 20px",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: "6px",
                  textDecoration: "none",
                }}
              >
                Start Free Test
              </a>
            </div>
          ))}
      </div>
    </main>
  );
}
