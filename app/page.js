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
.order("created_at", {
ascending: false,
});

const allTests = tests || [];
const allHtmlTests = htmlTests || [];

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

    {/* Telegram */}
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

    {/* No tests */}
    {allTests.length === 0 &&
      allHtmlTests.length === 0 && (
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "10px",
            marginTop: "25px",
          }}
        >
          <p>
            No tests are currently available.
          </p>
        </div>
      )}

    {/* Normal Tests */}
    {allTests.map((test) => {
      const isPaid =
        test.test_type === "restricted";

      return (
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
            <strong>Type:</strong>{" "}
            {isPaid ? "🔴 Paid / Restricted" : "🟢 Free"}
          </p>

          <a
            href={`/test/${test.slug}`}
            style={{
              display: "inline-block",
              marginTop: "10px",
              padding: "12px 20px",
              background: isPaid
                ? "#dc2626"
                : "#2563eb",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            {isPaid
              ? "Open Paid Test"
              : "Start Free Test"}
          </a>

          {isPaid && (
            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                fontSize: "14px",
                color: "#555",
              }}
            >
              Paid students with access can attempt this
              test.
            </p>
          )}
        </div>
      );
    })}

    {/* HTML Tests */}
    {allHtmlTests.map((test) => {
      const isPaid =
        test.access_type === "paid";

      return (
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
            <strong>Type:</strong>{" "}
            {isPaid
              ? "🔴 Paid HTML Test"
              : "🟢 Free HTML Test"}
          </p>

          <a
            href={`/html-test/${test.slug}`}
            style={{
              display: "inline-block",
              marginTop: "10px",
              padding: "12px 20px",
              background: isPaid
                ? "#dc2626"
                : "#2563eb",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            {isPaid
              ? "Open Paid Test"
              : "Start Free Test"}
          </a>

          {isPaid && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "7px",
                fontSize: "14px",
              }}
            >
              <strong>Paid Test Access</strong>

              <p
                style={{
                  margin: "6px 0",
                }}
              >
                Paid students with access can attempt
                this test.
              </p>

              <a
                href="https://t.me/+XgJ5M6y5pW8yNmRl"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#229ED9",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                📢 CLICK TO JOIN TELEGRAM / CONTACT
              </a>
            </div>
          )}
        </div>
      );
    })}
  </div>
</main>

);
}
