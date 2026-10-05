import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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
        "id, title, slug, storage_path, is_active"
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

  if (testError || !test) {
    notFound();
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
