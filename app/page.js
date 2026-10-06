import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerClient();

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

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: htmlTests } = await adminSupabase
    .from("html_tests")
    .select(
      "id, title, slug, access_type, is_active"
    )
    .eq("is_active", true)
    .eq("access_type", "free")
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

        <a
          href="https://t.me/+XgJ5M6y5pW8yNmRl"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: "10px",
            marginBottom: "15px",
            padding: "14px 22px",
            background: "#229ED9",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          📢 ODISHA ASPIRANT WARRIORS
          <br />
          <span
            style={{
              fontSize: "14px",
              fontWeight: "normal",
            }}
          >
            Click to Join • Mock Tests • Odisha Exam Updates
          </span>
        </a>

        {(!tests || tests.length === 0) &&
          (!htmlTests || htmlTests.length === 0) && (
            <div
              style={{
                background: "#fff",
                padding: "25px",
                borderRadius: "10px",
                marginTop: "25px",
              }}
            >
              <p>
                No free tests are currently available.
              </p>
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
                <strong>Type:</strong> 🟢 Free
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

        {htmlTests &&
          htmlTests.map((test) => (
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

              <p>
                <strong>Type:</strong> 🟢 Free HTML Test
              </p>

              <a
                href={`/html-test/${test.slug}`}
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
