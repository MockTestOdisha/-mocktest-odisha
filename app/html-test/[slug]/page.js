import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import HtmlTestFrame from "./HtmlTestFrame";

const TELEGRAM_URL = "https://t.me/Odishamock21";

function TelegramContactBox() {
  return (
    <div style={{ marginTop: "25px", padding: "18px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px" }}>
      <div style={{ marginBottom: "6px" }}>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "bold", fontSize: "18px", color: "#883a48", textDecoration: "none" }}>
          📢 ODISHA ASPIRANT WARRIORS
        </a>
      </div>
      <p style={{ margin: "8px 0", color: "#374151", fontSize: "14px" }}>
        Join our Telegram group for mock tests & Odisha exam updates.
      </p>
      <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "8px", padding: "11px 18px", background: "#229ED9", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "bold", fontSize: "13.5px" }}>
        CLICK TO JOIN
      </a>
      <p style={{ marginTop: "14px", marginBottom: "0", fontWeight: "bold", color: "#b45309", fontSize: "13px" }}>⚠️ Facing an issue?</p>
      <p style={{ marginTop: "5px", marginBottom: "0", color: "#374151", fontSize: "13px" }}>Contact us on Telegram for paid test access or any problem.</p>
    </div>
  );
}

function PaidAccessLayout({ icon, title, children, showLogin = false }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fb", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "500px", background: "#fff", padding: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "48px" }}>{icon}</div>
        <h1 style={{ margin: "10px 0", fontSize: "22px" }}>{title}</h1>
        {children}
        {showLogin && (
          <a href="/login" style={{ display: "inline-block", marginTop: "15px", padding: "12px 20px", background: "#2563eb", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }}>
            Student Login
          </a>
        )}
        <TelegramContactBox />
        <a href="/" style={{ display: "inline-block", marginTop: "15px", padding: "10px 18px", background: "#6b7280", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>
          Go Home
        </a>
      </div>
    </main>
  );
}

export default async function HtmlTestPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const reviewMode = query?.review === "1";

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: test, error: testError } = await adminSupabase
    .from("html_tests")
    .select("id, title, slug, storage_path, is_active, access_type, attempt_mode")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (testError || !test) notFound();

  let studentName = "";

  if (test.access_type === "paid") {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return (
        <PaidAccessLayout icon="🔒" title={test.title} showLogin={true}>
          <p>This is a paid/restricted test.</p>
          <p>Please log in with your student account to access this test.</p>
        </PaidAccessLayout>
      );
    }

    const { data: access, error: accessError } = await supabase
      .from("html_test_access")
      .select("id, html_test_id, user_id, start_at, end_at, is_active")
      .eq("html_test_id", test.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (accessError || !access) {
      return (
        <PaidAccessLayout icon="🔒" title="Access Required">
          <p>You do not currently have access to this paid test.</p>
          <p>Please contact us on Telegram to get access.</p>
        </PaidAccessLayout>
      );
    }

    const now = new Date();
    if (access.start_at && now < new Date(access.start_at)) {
      return (
        <PaidAccessLayout icon="⏳" title="Test Not Started">
          <p>Your access to this test has not started yet.</p>
          <p>If you believe this is an issue, please contact us.</p>
        </PaidAccessLayout>
      );
    }

    if (access.end_at && now > new Date(access.end_at)) {
      return (
        <PaidAccessLayout icon="⏰" title="Access Expired">
          <p>Your access period for this test has expired.</p>
          <p>If you need help, please contact us on Telegram.</p>
        </PaidAccessLayout>
      );
    }

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    studentName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Student";
  }

  const { data: fileData, error: fileError } = await adminSupabase.storage
    .from("html-tests")
    .download(test.storage_path);

  if (fileError || !fileData) notFound();

  const html = await fileData.text();

  return (
    <HtmlTestFrame
      html={html}
      htmlTestId={test.id}
      title={test.title}
      accessType={test.access_type}
      attemptMode={test.attempt_mode || "one"}
      studentName={studentName}
      slug={slug}
      reviewMode={reviewMode}
    />
  );
}
