import { createClient } from "@supabase/supabase-js";
import {
  createClient as createServerClient,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function logout() {
    "use server";

    const supabase =
      await createServerClient();

    /*
     * Release the student's device session
     * before signing out of Supabase.
     *
     * We call the release API from the browser
     * normally, so this server action only handles
     * the Supabase logout here.
     *
     * The actual device release is handled by the
     * logout client component below.
     */

    await supabase.auth.signOut();

    redirect("/login");
  }

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

  const freeTests = allTests.filter(
    (test) =>
      test.test_type !== "restricted"
  );

  const restrictedTests = allTests.filter(
    (test) =>
      test.test_type === "restricted"
  );

  const freeHtmlTests =
    allHtmlTests.filter(
      (test) =>
        test.access_type !== "paid"
    );

  const paidHtmlTests =
    allHtmlTests.filter(
      (test) =>
        test.access_type === "paid"
    );

  const totalAvailable =
    allTests.length +
    allHtmlTests.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#222",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom:
            "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "14px 18px",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              color: "#f87171",
              fontWeight: "800",
              fontSize: "22px",
              whiteSpace: "nowrap",
            }}
          >
            Mock Test Odisha
          </a>

          {user ? (
            <LogoutButton />
          ) : (
            <a
              href="/login"
              style={{
                padding: "9px 13px",
                background: "#2563eb",
                color: "#fff",
                borderRadius: "7px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              Login
            </a>
          )}
        </div>
      </header>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding:
            "25px 18px 45px",
        }}
      >
        {/* Hero */}
        <section
          style={{
            background:
              "linear-gradient(135deg, #1d4ed8, #2563eb)",
            color: "#fff",
            borderRadius: "16px",
            padding: "30px 22px",
            marginBottom: "25px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "14px",
              fontWeight: "700",
              opacity: 0.9,
            }}
          >
            ONLINE MOCK TEST PLATFORM
          </p>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "32px",
              lineHeight: 1.2,
            }}
          >
            Prepare smarter. Practice
            better.
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "16px",
              lineHeight: 1.6,
              maxWidth: "700px",
              opacity: 0.95,
            }}
          >
            Take Odisha-focused mock
            tests, improve your
            preparation and check your
            performance after submission.
          </p>

          {user && (
            <div
              style={{
                marginTop: "18px",
                display: "inline-block",
                background:
                  "rgba(255,255,255,0.15)",
                padding: "9px 13px",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              👋 You are logged in
            </div>
          )}
        </section>

        {/* Telegram */}
        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #dbeafe",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 7px",
              fontSize: "19px",
            }}
          >
            📢 ODISHA ASPIRANT WARRIORS
          </h2>

          <p
            style={{
              margin: "0 0 13px",
              color: "#555",
              fontSize: "14px",
            }}
          >
            Join our Telegram group for
            mock tests and Odisha exam
            updates.
          </p>

          <a
            href="https://t.me/+XgJ5M6y5pW8yNmRl"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "11px 18px",
              background: "#229ED9",
              color: "#fff",
              borderRadius: "7px",
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            JOIN TELEGRAM
          </a>
        </section>

        {/* No tests */}
        {totalAvailable === 0 && (
          <section
            style={{
              background: "#fff",
              padding: "30px 20px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <h2>
              No tests are currently
              available.
            </h2>

            <p
              style={{
                color: "#666",
              }}
            >
              Please check again later.
            </p>
          </section>
        )}

        {/* Free Normal Tests */}
        {freeTests.length > 0 && (
          <TestSection
            title="🟢 Free Mock Tests"
            subtitle="Start practicing immediately. No login is required."
          >
            {freeTests.map((test) => (
              <div
                key={test.id}
                style={cardStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "10px",
                  }}
                >
                  <h3
                    style={titleStyle}
                  >
                    {test.title}
                  </h3>

                  <span
                    style={{
                      background:
                        "#dcfce7",
                      color: "#166534",
                      padding:
                        "5px 8px",
                      borderRadius:
                        "999px",
                      fontSize: "12px",
                      fontWeight:
                        "700",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    FREE
                  </span>
                </div>

                {test.description && (
                  <p
                    style={
                      descriptionStyle
                    }
                  >
                    {test.description}
                  </p>
                )}

                <p
                  style={infoStyle}
                >
                  🟢 Free Test
                </p>

                <a
                  href={`/test/${test.slug}`}
                  style={{
                    ...buttonStyle,
                    background:
                      "#2563eb",
                  }}
                >
                  ▶ Start Free Test
                </a>
              </div>
            ))}
          </TestSection>
        )}

        {/* Restricted Normal Tests */}
        {restrictedTests.length >
          0 && (
          <TestSection
            title="🔒 Paid / Restricted Tests"
            subtitle="Login and valid access are required for these tests."
          >
            {restrictedTests.map(
              (test) => (
                <div
                  key={test.id}
                  style={cardStyle}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "10px",
                    }}
                  >
                    <h3
                      style={
                        titleStyle
                      }
                    >
                      {test.title}
                    </h3>

                    <span
                      style={{
                        background:
                          "#fee2e2",
                        color:
                          "#991b1b",
                        padding:
                          "5px 8px",
                        borderRadius:
                          "999px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      RESTRICTED
                    </span>
                  </div>

                  {test.description && (
                    <p
                      style={
                        descriptionStyle
                      }
                    >
                      {
                        test.description
                      }
                    </p>
                  )}

                  <p
                    style={
                      infoStyle
                    }
                  >
                    🔒 Paid /
                    Restricted
                  </p>

                  <a
                    href={`/test/${test.slug}`}
                    style={{
                      ...buttonStyle,
                      background:
                        "#dc2626",
                    }}
                  >
                    {user
                      ? "▶ Open Restricted Test"
                      : "🔐 Login to Access"}
                  </a>

                  <p
                    style={{
                      margin:
                        "10px 0 0",
                      fontSize:
                        "13px",
                      color:
                        "#666",
                    }}
                  >
                    Valid access is
                    required to
                    attempt this
                    test.
                  </p>
                </div>
              )
            )}
          </TestSection>
        )}

        {/* Free HTML Tests */}
        {freeHtmlTests.length >
          0 && (
          <TestSection
            title="🟢 Free HTML Mock Tests"
            subtitle="Original interactive mock test interfaces."
          >
            {freeHtmlTests.map(
              (test) => (
                <div
                  key={test.id}
                  style={cardStyle}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "10px",
                    }}
                  >
                    <h3
                      style={
                        titleStyle
                      }
                    >
                      {test.title}
                    </h3>

                    <span
                      style={{
                        background:
                          "#dcfce7",
                        color:
                          "#166534",
                        padding:
                          "5px 8px",
                        borderRadius:
                          "999px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      FREE
                    </span>
                  </div>

                  <p
                    style={
                      infoStyle
                    }
                  >
                    🌐 Interactive
                    HTML Test
                  </p>

                  <a
                    href={`/html-test/${test.slug}`}
                    style={{
                      ...buttonStyle,
                      background:
                        "#2563eb",
                    }}
                  >
                    ▶ Start Free Test
                  </a>
                </div>
              )
            )}
          </TestSection>
        )}

        {/* Paid HTML Tests */}
        {paidHtmlTests.length >
          0 && (
          <TestSection
            title="🔒 Paid HTML Mock Tests"
            subtitle="Login and valid access are required."
          >
            {paidHtmlTests.map(
              (test) => (
                <div
                  key={test.id}
                  style={cardStyle}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "10px",
                    }}
                  >
                    <h3
                      style={
                        titleStyle
                      }
                    >
                      {test.title}
                    </h3>

                    <span
                      style={{
                        background:
                          "#fee2e2",
                        color:
                          "#991b1b",
                        padding:
                          "5px 8px",
                        borderRadius:
                          "999px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      PAID
                    </span>
                  </div>

                  <p
                    style={
                      infoStyle
                    }
                  >
                    🌐 Interactive
                    HTML Test
                  </p>

                  <a
                    href={`/html-test/${test.slug}`}
                    style={{
                      ...buttonStyle,
                      background:
                        "#dc2626",
                    }}
                  >
                    {user
                      ? "▶ Open Paid Test"
                      : "🔐 Login to Access"}
                  </a>

                  <div
                    style={{
                      marginTop:
                        "14px",
                      padding:
                        "12px",
                      background:
                        "#fff7ed",
                      border:
                        "1px solid #fed7aa",
                      borderRadius:
                        "8px",
                      fontSize:
                        "13px",
                      color:
                        "#7c2d12",
                    }}
                  >
                    <strong>
                      Paid Test
                      Access
                    </strong>

                    <p
                      style={{
                        margin:
                          "5px 0 8px",
                      }}
                    >
                      Students need
                      valid access
                      to attempt
                      this test.
                    </p>

                    <a
                      href="https://t.me/+XgJ5M6y5pW8yNmRl"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color:
                          "#229ED9",
                        fontWeight:
                          "700",
                        textDecoration:
                          "none",
                      }}
                    >
                      📢 CONTACT /
                      JOIN TELEGRAM
                    </a>
                  </div>
                </div>
              )
            )}
          </TestSection>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "#111827",
          color: "#d1d5db",
          padding:
            "25px 18px",
          textAlign: "center",
        }}
      >
        <strong
          style={{
            color: "#fff",
            fontSize: "17px",
          }}
        >
          Mock Test Odisha
        </strong>

        <p
          style={{
            margin:
              "7px 0 0",
            fontSize: "13px",
          }}
        >
          Online mock tests for
          Odisha students.
        </p>

        <p
          style={{
            margin:
              "10px 0 0",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          © Mock Test Odisha
        </p>
      </footer>
    </main>
  );
}

function LogoutButton() {
  return (
    <form
      action={logoutAction}
    >
      <button
        type="submit"
        style={{
          padding: "9px 13px",
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: "7px",
          fontWeight: "700",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </form>
  );
}

async function logoutAction() {
  "use server";

  const supabase =
    await createServerClient();

  /*
   * Release the device session by
   * calling the database function
   * directly from the server action.
   */
  const { cookies } =
    await import("next/headers");

  const cookieStore =
    await cookies();

  const deviceCookie =
    cookieStore.get(
      "mocktest_student_device"
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user &&
    deviceCookie?.value
  ) {
    const crypto =
      await import("crypto");

    const sessionTokenHash =
      crypto
        .createHash("sha256")
        .update(
          deviceCookie.value
        )
        .digest("hex");

    await supabase.rpc(
      "release_student_device_session",
      {
        p_user_id: user.id,
        p_session_token_hash:
          sessionTokenHash,
      }
    );
  }

  await supabase.auth.signOut();

  cookieStore.set(
    "mocktest_student_device",
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );

  redirect("/login");
}

function TestSection({
  title,
  subtitle,
  children,
}) {
  return (
    <section
      style={{
        marginTop: "30px",
      }}
    >
      <div
        style={{
          marginBottom: "14px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "23px",
            color: "#111827",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin:
              "5px 0 0",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          {subtitle}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "15px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

const cardStyle = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  border:
    "1px solid #e5e7eb",
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.04)",
};

const titleStyle = {
  margin: 0,
  fontSize: "19px",
  lineHeight: 1.35,
  color: "#111827",
};

const descriptionStyle = {
  margin:
    "10px 0",
  color: "#555",
  fontSize: "14px",
  lineHeight: 1.5,
};

const infoStyle = {
  margin:
    "10px 0",
  fontSize: "14px",
  color: "#4b5563",
};

const buttonStyle = {
  display: "inline-block",
  marginTop: "7px",
  padding:
    "11px 16px",
  color: "#fff",
  borderRadius: "7px",
  textDecoration: "none",
  fontWeight: "700",
  fontSize: "14px",
};
