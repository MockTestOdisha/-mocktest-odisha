import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default async function HtmlTestPage({ params }) {
  const { slug } = await params;

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: test, error: testError } =
    await adminSupabase
      .from("html_tests")
      .select(
        "id, title, slug, storage_path, is_active, access_type"
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

  if (testError || !test) {
    notFound();
  }

  /*
   * Free tests are available to everyone.
   * Paid tests require a logged-in student.
   */
  if (test.access_type === "paid") {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f7fb",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "48px" }}>
              🔒
            </div>

            <h1>{test.title}</h1>

            <p>
              This is a paid/restricted test.
            </p>

            <p>
              Please log in with your student account
              to access this test.
            </p>

            <a
              href="/login"
              style={{
                display: "inline-block",
                marginTop: "15px",
                padding: "12px 20px",
                background: "#2563eb",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              Student Login
            </a>
          </div>
        </main>
      );
    }
  }

  const { data: fileData, error: fileError } =
    await adminSupabase.storage
      .from("html-tests")
      .download(test.storage_path);

  if (fileError || !fileData) {
    notFound();
  }

  const html = await fileData.text();

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        background: "#fff",
      }}
    >
      <iframe
        title={test.title}
        srcDoc={html}
        sandbox="allow-scripts allow-forms allow-modals"
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </main>
  );
}
