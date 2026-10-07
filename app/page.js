import { createClient } from "@supabase/supabase-js";
import {
  createClient as createServerClient,
} from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let studentName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    studentName = profile?.full_name || "";
  }

  /*
   * ---------------------------------------------------------
   * EXISTING NORMAL TEST QUERY
   * ---------------------------------------------------------
   */
  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, title, slug, description, test_type, is_active"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  /*
   * ---------------------------------------------------------
   * EXISTING HTML TEST QUERY
   * ---------------------------------------------------------
   */
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

  /*
   * FREE / PAID
   */
  const freeTests = allTests.filter(
    (test) => test.test_type !== "restricted"
  );

  const restrictedTests = allTests.filter(
    (test) => test.test_type === "restricted"
  );

  const freeHtmlTests = allHtmlTests.filter(
    (test) => test.access_type !== "paid"
  );

  const paidHtmlTests = allHtmlTests.filter(
    (test) => test.access_type === "paid"
  );

  /*
   * ---------------------------------------------------------
   * BANNER COUNT
   *
   * 1-5   => 5+
   * 6-10  => 10+
   * 11-15 => 15+
   * 16-20 => 20+
   * ---------------------------------------------------------
   */
  const totalFreeTests =
    freeTests.length + freeHtmlTests.length;

  const bannerFreeCount =
    totalFreeTests > 0
      ? Math.max(
          5,
          Math.ceil(totalFreeTests / 5) * 5
        )
      : 0;

  const totalAvailable =
    allTests.length + allHtmlTests.length;

  return (
    <main className="home-page">
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f7fb;
        }

        .home-page {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #f7f9ff 0%,
              #f5f7fb 100%
            );
          color: #111827;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .container {
          width: min(
            1100px,
            calc(100% - 30px)
          );
          margin: 0 auto;
        }

        /* =================================================
           HEADER
        ================================================= */

        .header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(
            255,
            255,
            255,
            0.96
          );
          backdrop-filter: blur(10px);
          border-bottom:
            1px solid #e5e7eb;
        }

        .header-inner {
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .brand {
          text-decoration: none;
          color: #172554;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .student-name {
          display: none;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .login-button,
        .logout-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 14px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }

        .login-button {
          background: #2563eb;
          color: #fff;
        }

        .logout-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        /* =================================================
           MAIN
        ================================================= */

        .main {
          padding: 25px 0 50px;
        }

        /* =================================================
           HERO
        ================================================= */

        .hero {
          position: relative;
          overflow: hidden;
          color: white;
          border-radius: 20px;
          padding: 38px 35px;
          margin-bottom: 25px;
          background:
            radial-gradient(
              circle at 90% 15%,
              rgba(139,92,246,0.45),
              transparent 32%
            ),
            radial-gradient(
              circle at 10% 100%,
              rgba(59,130,246,0.4),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #172554,
              #1d4ed8 52%,
              #6d28d9
            );
          box-shadow:
            0 18px 45px
            rgba(37,99,235,0.22);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 760px;
        }

        .hero-label {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          background:
            rgba(255,255,255,0.13);
          border:
            1px solid
            rgba(255,255,255,0.16);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
        }

        .hero h1 {
          margin: 0;
          font-size: 43px;
          line-height: 1.08;
          letter-spacing: -1.2px;
        }

        .hero-text {
          margin: 13px 0 0;
          max-width: 650px;
          color:
            rgba(255,255,255,0.9);
          font-size: 16px;
          line-height: 1.6;
        }

        .hero-bottom {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 22px;
        }

        .free-count {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 11px;
          background: rgba(
            255,
            255,
            255,
            0.96
          );
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 900;
          box-shadow:
            0 8px 20px
            rgba(0,0,0,0.12);
        }

        .free-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px
            rgba(34,197,94,0.18);
        }

        .welcome {
          display: inline-flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 11px;
          background:
            rgba(255,255,255,0.12);
          border:
            1px solid
            rgba(255,255,255,0.16);
          color: white;
          font-size: 13px;
          font-weight: 800;
        }

        /* decorative circles */

        .hero::before {
          content: "";
          position: absolute;
          width: 250px;
          height: 250px;
          right: -80px;
          top: -130px;
          border-radius: 50%;
          border:
            1px solid
            rgba(255,255,255,0.13);
          box-shadow:
            0 0 0 35px
            rgba(255,255,255,0.025),
            0 0 0 70px
            rgba(255,255,255,0.018);
        }

        .hero::after {
          content: "🎓";
          position: absolute;
          right: 45px;
          bottom: 25px;
          font-size: 75px;
          opacity: 0.16;
          transform: rotate(-8deg);
        }

        /* =================================================
           TELEGRAM
        ================================================= */

        .telegram {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 19px 21px;
          margin-bottom: 30px;
          border-radius: 16px;
          background:
            linear-gradient(
              110deg,
              #effaff,
              #f4f1ff
            );
          border:
            1px solid #dbeafe;
          box-shadow:
            0 7px 22px
            rgba(15,23,42,0.05);
        }

        .telegram-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .telegram-icon {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #229ed9;
          color: white;
          font-size: 22px;
          box-shadow:
            0 7px 17px
            rgba(34,158,217,0.2);
        }

        .telegram h2 {
          margin: 0;
          color: #172554;
          font-size: 18px;
        }

        .telegram p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .telegram-button {
          flex-shrink: 0;
          padding: 10px 17px;
          border-radius: 10px;
          background: #229ed9;
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        /* =================================================
           SECTIONS
        ================================================= */

        .section {
          margin-top: 32px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }

        .section-heading h2 {
          margin: 0;
          color: #172554;
          font-size: 25px;
          letter-spacing: -0.5px;
        }

        .section-heading p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .section-count {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .count-free {
          background: #dcfce7;
          color: #166534;
        }

        .count-paid {
          background: #fef3c7;
          color: #92400e;
        }

        /* =================================================
           CARDS
        ================================================= */

        .test-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(280px, 1fr)
            );
          gap: 15px;
        }

        .test-card {
          background: #fff;
          border-radius: 16px;
          padding: 19px;
          border: 1px solid #e5e7eb;
          box-shadow:
            0 6px 20px
            rgba(15,23,42,0.045);
        }

        .test-card-free {
          border-color: #bbf7d0;
        }

        .test-card-paid {
          border-color: #fde68a;
        }

        .test-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .test-title {
          margin: 0;
          color: #172554;
          font-size: 19px;
          line-height: 1.35;
        }

        .badge {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .badge-free {
          background: #dcfce7;
          color: #166534;
        }

        .badge-paid {
          background: #fef3c7;
          color: #92400e;
        }

        .description {
          margin: 9px 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .test-info {
          margin: 10px 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 8px;
          padding: 11px 15px;
          border-radius: 10px;
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .button-blue {
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          box-shadow:
            0 7px 16px
            rgba(37,99,235,0.16);
        }

        .button-red {
          background:
            linear-gradient(
              135deg,
              #dc2626,
              #b91c1c
            );
          box-shadow:
            0 7px 16px
            rgba(220,38,38,0.14);
        }

        .button-gold {
          background:
            linear-gradient(
              135deg,
              #d97706,
              #b45309
            );
        }

        .paid-note {
          margin-top: 11px;
          padding: 10px;
          border-radius: 9px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 12px;
          line-height: 1.45;
        }

        .paid-note a {
          color: #229ed9;
          text-decoration: none;
          font-weight: 900;
        }

        /* =================================================
           EMPTY
        ================================================= */

        .empty {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          color: #64748b;
        }

        .empty h2 {
          margin: 0;
          color: #172554;
        }

        /* =================================================
           FOOTER
        ================================================= */

        .footer {
          margin-top: 25px;
          padding: 28px 15px;
          text-align: center;
          background: #111827;
          color: #cbd5e1;
        }

        .footer strong {
          color: white;
          font-size: 17px;
        }

        .footer p {
          margin: 7px 0 0;
          font-size: 12px;
        }

        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 700px) {

          .container {
            width:
              calc(100% - 20px);
          }

          .main {
            padding-top: 15px;
          }

          .brand {
            font-size: 18px;
          }

          .student-name {
            display: block;
          }

          .hero {
            padding: 29px 22px;
            border-radius: 18px;
          }

          .hero h1 {
            font-size: 34px;
          }

          .hero-text {
            font-size: 14px;
          }

          .hero::after {
            right: 20px;
            bottom: 20px;
            font-size: 55px;
          }

          .telegram {
            display: block;
          }

          .telegram-left {
            margin-bottom: 14px;
          }

          .telegram-button {
            display: block;
            width: 100%;
            text-align: center;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .test-grid {
            grid-template-columns: 1fr;
          }
        }

      `}</style>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="header">

        <div className="container header-inner">

          <a
            href="/"
            className="brand"
          >
            Mock Test Odisha
          </a>

          <div className="header-right">

            {user && (
              <span className="student-name">
                👋 {studentName || "Student"}
              </span>
            )}

            {user ? (
              <LogoutButton />
            ) : (
              <a
                href="/login"
                className="login-button"
              >
                Login
              </a>
            )}

          </div>

        </div>

      </header>

      <div className="container main">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero">

          <div className="hero-content">

            <div className="hero-label">
              🎯 ONLINE MOCK TEST PLATFORM
            </div>

            <h1>
              Prepare smarter.
              <br />
              Practice better.
            </h1>

            <p className="hero-text">
              Take Odisha-focused mock tests,
              improve your preparation and check
              your performance after submission.
            </p>

            <div className="hero-bottom">

              <div className="free-count">

                <span className="free-dot" />

                {bannerFreeCount > 0
                  ? `${bannerFreeCount}+ Free Tests Available`
                  : "Free Tests Coming Soon"}

              </div>

              {user && (
                <div className="welcome">
                  👋 Hi, {studentName || "Student"}
                </div>
              )}

            </div>

          </div>

        </section>

        {/* =================================================
            TELEGRAM
        ================================================= */}

        <section className="telegram">

          <div className="telegram-left">

            <div className="telegram-icon">
              ✈️
            </div>

            <div>

              <h2>
                ODISHA ASPIRANT WARRIORS
              </h2>

              <p>
                Join our Telegram group for mock
                tests and Odisha exam updates.
              </p>

            </div>

          </div>

          <a
            href="https://t.me/+XgJ5M6y5pW8yNmRl"
            target="_blank"
            rel="noopener noreferrer"
            className="telegram-button"
          >
            JOIN TELEGRAM
          </a>

        </section>

        {/* =================================================
            EMPTY
        ================================================= */}

        {totalAvailable === 0 && (
          <div className="empty">

            <h2>
              No tests are currently available.
            </h2>

            <p>
              Please check again later.
            </p>

          </div>
        )}

        {/* =================================================
            FREE NORMAL TESTS
        ================================================= */}

        {freeTests.length > 0 && (
          <section className="section">

            <div className="section-heading">

              <div>

                <h2>
                  🟢 Free Mock Tests
                </h2>

                <p>
                  Start practicing immediately.
                  No login is required.
                </p>

              </div>

              <span className="section-count count-free">
                {freeTests.length}
                {" "}
                {freeTests.length === 1
                  ? "Test"
                  : "Tests"}
              </span>

            </div>

            <div className="test-grid">

              {freeTests.map((test) => (
                <NormalTestCard
                  key={test.id}
                  test={test}
                  type="free"
                />
              ))}

            </div>

          </section>
        )}

        {/* =================================================
            RESTRICTED NORMAL TESTS
        ================================================= */}

        {restrictedTests.length > 0 && (
          <section className="section">

            <div className="section-heading">

              <div>

                <h2>
                  🔒 Paid / Restricted Tests
                </h2>

                <p>
                  Login and valid access are required.
                </p>

              </div>

              <span className="section-count count-paid">
                {restrictedTests.length}
                {" "}
                {restrictedTests.length === 1
                  ? "Test"
                  : "Tests"}
              </span>

            </div>

            <div className="test-grid">

              {restrictedTests.map((test) => (
                <NormalTestCard
                  key={test.id}
                  test={test}
                  type="paid"
                  user={user}
                />
              ))}

            </div>

          </section>
        )}

        {/* =================================================
            FREE HTML TESTS
        ================================================= */}

        {freeHtmlTests.length > 0 && (
          <section className="section">

            <div className="section-heading">

              <div>

                <h2>
                  🟢 Free HTML Mock Tests
                </h2>

                <p>
                  Original interactive mock test
                  interfaces.
                </p>

              </div>

              <span className="section-count count-free">
                {freeHtmlTests.length}
                {" "}
                {freeHtmlTests.length === 1
                  ? "Test"
                  : "Tests"}
              </span>

            </div>

            <div className="test-grid">

              {freeHtmlTests.map((test) => (
                <HtmlTestCard
                  key={test.id}
                  test={test}
                  type="free"
                />
              ))}

            </div>

          </section>
        )}

        {/* =================================================
            PAID HTML TESTS
        ================================================= */}

        {paidHtmlTests.length > 0 && (
          <section className="section">

            <div className="section-heading">

              <div>

                <h2>
                  🔒 Paid HTML Mock Tests
                </h2>

                <p>
                  Login and valid access are required.
                </p>

              </div>

              <span className="section-count count-paid">
                {paidHtmlTests.length}
                {" "}
                {paidHtmlTests.length === 1
                  ? "Test"
                  : "Tests"}
              </span>

            </div>

            <div className="test-grid">

              {paidHtmlTests.map((test) => (
                <HtmlTestCard
                  key={test.id}
                  test={test}
                  type="paid"
                  user={user}
                />
              ))}

            </div>

          </section>
        )}

      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">

        <strong>
          Mock Test Odisha
        </strong>

        <p>
          Online mock tests for Odisha students.
        </p>

        <p>
          © Mock Test Odisha
        </p>

      </footer>

    </main>
  );
}


/* =========================================================
   NORMAL TEST CARD
========================================================= */

function NormalTestCard({
  test,
  type,
  user,
}) {
  const isFree = type === "free";

  return (
    <div
      className={`test-card ${
        isFree
          ? "test-card-free"
          : "test-card-paid"
      }`}
    >

      <div className="test-top">

        <h3 className="test-title">
          {test.title}
        </h3>

        <span
          className={`badge ${
            isFree
              ? "badge-free"
              : "badge-paid"
          }`}
        >
          {isFree
            ? "FREE"
            : "RESTRICTED"}
        </span>

      </div>

      {test.description && (
        <p className="description">
          {test.description}
        </p>
      )}

      <p className="test-info">
        {isFree
          ? "🟢 Free Test"
          : "🔒 Paid / Restricted"}
      </p>

      <a
        href={
          !isFree && !user
            ? "/login"
            : `/test/${test.slug}`
        }
        className={`button ${
          isFree
            ? "button-blue"
            : "button-red"
        }`}
      >
        {!isFree && !user
          ? "🔐 Login to Access"
          : isFree
          ? "▶ Start Free Test"
          : "▶ Open Restricted Test"}
      </a>

      {!isFree && (
        <div className="paid-note">
          Valid access is required to attempt
          this test.
        </div>
      )}

    </div>
  );
}


/* =========================================================
   HTML TEST CARD
========================================================= */

function HtmlTestCard({
  test,
  type,
  user,
}) {
  const isFree = type === "free";

  return (
    <div
      className={`test-card ${
        isFree
          ? "test-card-free"
          : "test-card-paid"
      }`}
    >

      <div className="test-top">

        <h3 className="test-title">
          {test.title}
        </h3>

        <span
          className={`badge ${
            isFree
              ? "badge-free"
              : "badge-paid"
          }`}
        >
          {isFree
            ? "FREE"
            : "PAID"}
        </span>

      </div>

      <p className="test-info">
        🌐 Interactive HTML Test
      </p>

      <a
        href={
          !isFree && !user
            ? "/login"
            : `/html-test/${test.slug}`
        }
        className={`button ${
          isFree
            ? "button-blue"
            : "button-gold"
        }`}
      >
        {!isFree && !user
          ? "🔐 Login to Access"
          : isFree
          ? "▶ Start Free Test"
          : "▶ Open Paid Test"}
      </a>

      {!isFree && (
        <div className="paid-note">

          <strong>
            Paid Test Access
          </strong>

          <div>
            Students need valid access to
            attempt this test.
          </div>

          <a
            href="https://t.me/+XgJ5M6y5pW8yNmRl"
            target="_blank"
            rel="noopener noreferrer"
          >
            📢 CONTACT / JOIN TELEGRAM
          </a>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   LOGOUT
========================================================= */

function LogoutButton() {
  return (
    <form
      action="/api/auth/release-device"
      method="POST"
    >
      <button
        type="submit"
        className="logout-button"
      >
        Logout
      </button>
    </form>
  );
}
