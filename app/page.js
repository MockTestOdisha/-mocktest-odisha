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

  /* -----------------------------
     NORMAL TESTS
  ----------------------------- */

  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, title, slug, description, test_type, is_active, created_at"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  const normalTests = tests || [];

  /* -----------------------------
     QUESTION COUNTS
     Dynamic question count
  ----------------------------- */

  let questionCounts = {};

  if (normalTests.length > 0) {
    const testIds = normalTests.map(
      (test) => test.id
    );

    const { data: questions } = await supabase
      .from("questions")
      .select("id, test_id")
      .in("test_id", testIds);

    (questions || []).forEach((question) => {
      if (!questionCounts[question.test_id]) {
        questionCounts[question.test_id] = 0;
      }

      questionCounts[question.test_id]++;
    });
  }

  /* -----------------------------
     HTML TESTS
  ----------------------------- */

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: htmlTests } = await adminSupabase
    .from("html_tests")
    .select(
      "id, title, slug, access_type, is_active, attempt_mode, created_at"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  const allHtmlTests = htmlTests || [];

  /* -----------------------------
     FREE / PREMIUM
  ----------------------------- */

  const freeNormalTests = normalTests.filter(
    (test) => test.test_type !== "restricted"
  );

  const paidNormalTests = normalTests.filter(
    (test) => test.test_type === "restricted"
  );

  const freeHtmlTests = allHtmlTests.filter(
    (test) => test.access_type !== "paid"
  );

  const paidHtmlTests = allHtmlTests.filter(
    (test) => test.access_type === "paid"
  );

  const freeTests = [
    ...freeNormalTests.map((test) => ({
      ...test,
      source: "normal",
      questionCount:
        questionCounts[test.id] || null,
    })),
    ...freeHtmlTests.map((test) => ({
      ...test,
      source: "html",
      questionCount: null,
    })),
  ];

  const premiumTests = [
    ...paidNormalTests.map((test) => ({
      ...test,
      source: "normal",
      questionCount:
        questionCounts[test.id] || null,
    })),
    ...paidHtmlTests.map((test) => ({
      ...test,
      source: "html",
      questionCount: null,
    })),
  ];

  /* -----------------------------
     5+ / 10+ / 15+
  ----------------------------- */

  const freeCount = freeTests.length;

  const bannerFreeCount =
    freeCount === 0
      ? 0
      : Math.max(
          5,
          Math.ceil(freeCount / 5) * 5
        );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fc",
        color: "#111827",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f8fc;
        }

        a {
          -webkit-tap-highlight-color: transparent;
        }

        .page {
          width: min(700px, calc(100% - 28px));
          margin: 0 auto;
          padding: 24px 0 45px;
        }

        /* -------------------------
           HEADER
        ------------------------- */

        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .logo-image {
          display: block;
          width: 345px;
          max-width: 78%;
          height: auto;
          object-fit: contain;
          object-position: left center;
        }

        .menu-button {
          width: 64px;
          height: 64px;
          border-radius: 17px;
          border: 1px solid #d8dce6;
          background: #fafbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          flex-shrink: 0;
        }

        .menu-inner {
          width: 27px;
          height: 27px;
          border: 2px solid #aab0bc;
          border-radius: 6px;
        }

        /* -------------------------
           WELCOME
        ------------------------- */

        .welcome {
          display: inline-flex;
          align-items: center;
          padding: 7px 17px 8px;
          border-radius: 18px;
          background:
            linear-gradient(
              100deg,
              #dfe9ff,
              #ffe8cf
            );
          margin-bottom: 24px;
        }

        .welcome-text {
          margin: 0;
          color: #080808;
          font-size: 27px;
          line-height: 1.1;
          font-weight: 800;
        }

        /* -------------------------
           HERO
        ------------------------- */

        .hero {
          position: relative;
          min-height: 322px;
          overflow: hidden;
          border-radius: 18px;
          background:
            linear-gradient(
              115deg,
              #0750a9 0%,
              #123b9c 37%,
              #35248e 72%,
              #52259b 100%
            );
          margin-bottom: 36px;
          box-shadow:
            0 12px 30px
            rgba(48, 62, 130, 0.20);
        }

        .hero-glow-one {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid
            rgba(90, 167, 255, 0.18);
          top: -60px;
          left: 45%;
        }

        .hero-glow-two {
          position: absolute;
          width: 175px;
          height: 175px;
          border-radius: 50%;
          border: 2px solid
            rgba(85, 172, 255, 0.16);
          bottom: -90px;
          left: 54%;
        }

        .hero-content {
          position: relative;
          z-index: 4;
          padding: 43px 0 30px 36px;
          width: 61%;
        }

        .hero-title {
          margin: 0;
          color: #fff;
          font-size: 39px;
          line-height: 1.10;
          letter-spacing: -0.7px;
          font-weight: 900;
        }

        .hero-description {
          margin: 13px 0 24px;
          color: #f4f7ff;
          font-size: 18px;
          line-height: 1.45;
        }

        .free-badge {
          display: inline-flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 11px;
          color: #f8ffff;
          font-size: 17px;
          font-weight: 500;
          background:
            linear-gradient(
              135deg,
              rgba(76, 190, 255, 0.35),
              rgba(132, 255, 218, 0.15)
            );
          border: 2px solid
            rgba(107, 231, 255, 0.55);
          box-shadow:
            0 0 17px
            rgba(76, 218, 255, 0.45);
        }

        .hero-image {
          position: absolute;
          right: 0;
          top: 0;
          width: 43%;
          height: 100%;
          object-fit: cover;
          object-position: left center;
        }

        /* -------------------------
           TELEGRAM
        ------------------------- */

        .telegram {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 25px 28px;
          border-radius: 18px;
          background:
            linear-gradient(
              110deg,
              #dff7ff,
              #eef0ff
            );
          border: 1px solid #cbd9ec;
          box-shadow:
            0 10px 27px
            rgba(73, 91, 140, 0.12);
          margin-bottom: 43px;
        }

        .telegram-left {
          min-width: 0;
        }

        .telegram-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 9px;
          color: #080808;
          font-size: 24px;
          font-weight: 900;
        }

        .telegram-icon {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #229ed9;
          color: white;
          font-size: 22px;
          flex-shrink: 0;
        }

        .telegram-description {
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 1.35;
        }

        .join-button {
          flex-shrink: 0;
          padding: 13px 25px;
          border-radius: 28px;
          background: #eef5ff;
          border: 1px solid #a9b8cf;
          color: #172554;
          font-size: 18px;
          font-weight: 800;
          text-decoration: none;
          box-shadow:
            0 7px 13px
            rgba(55, 65, 81, 0.13);
        }

        /* -------------------------
           SECTION TITLES
        ------------------------- */

        .section {
          margin-bottom: 44px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 0 0 20px;
          color: #090909;
          font-size: 31px;
          line-height: 1.15;
          font-weight: 900;
        }

        .green-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #62be42;
          flex-shrink: 0;
        }

        .premium-lock {
          font-size: 28px;
          line-height: 1;
        }

        /* -------------------------
           TEST GRID
        ------------------------- */

        .free-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        /* -------------------------
           TEST CARD
        ------------------------- */

        .test-card {
          background: #fff;
          border: 1px solid #d8dce4;
          border-radius: 18px;
          padding: 20px 21px 20px;
          box-shadow:
            0 9px 20px
            rgba(20, 32, 56, 0.10);
        }

        .premium-card {
          width: 100%;
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .test-title {
          margin: 0;
          color: #090909;
          font-size: 27px;
          line-height: 1.15;
          font-weight: 800;
        }

        .badge {
          flex-shrink: 0;
          padding: 7px 12px;
          border-radius: 18px;
          font-size: 14px;
          font-weight: 800;
        }

        .free-badge-card {
          background: #d9f7e3;
          color: #258249;
        }

        .paid-badge-card {
          background: #faeacb;
          color: #a66b12;
        }

        .test-description {
          margin: 9px 0 11px;
          min-height: 46px;
          color: #161616;
          font-size: 18px;
          line-height: 1.27;
        }

        .info-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 16px;
        }

        .info-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border-radius: 7px;
          background: #edf0f4;
          color: #222;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }

        .interactive-pill {
          background: #edf0f4;
          color: #161616;
        }

        .paid-info {
          background: #faeacb;
          color: #9a6815;
        }

        .start-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 54px;
          border-radius: 10px;
          text-decoration: none;
          color: white;
          font-size: 20px;
          font-weight: 800;
        }

        .free-start {
          background: #0752a9;
          box-shadow:
            0 5px 10px
            rgba(7, 82, 169, 0.18);
        }

        .paid-start {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              #e29b10,
              #d89108
            );
          box-shadow:
            0 5px 10px
            rgba(217, 145, 8, 0.22);
        }

        .paid-start::after {
          content: "✦";
          position: absolute;
          right: 55px;
          font-size: 31px;
          color: rgba(255,255,255,0.35);
        }

        .access-note {
          margin: 13px 0 0;
          color: #111;
          font-size: 17px;
          line-height: 1.3;
        }

        /* -------------------------
           EMPTY
        ------------------------- */

        .empty {
          background: #fff;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          border: 1px solid #ddd;
          margin-bottom: 30px;
        }

        /* -------------------------
           FOOTER
        ------------------------- */

        .footer {
          text-align: center;
          padding: 25px 15px;
          color: #64748b;
          font-size: 12px;
        }

        /* -------------------------
           MOBILE
        ------------------------- */

        @media (max-width: 600px) {

          .page {
            width: calc(100% - 28px);
            padding-top: 18px;
          }

          .top-header {
            margin-bottom: 17px;
          }

          .logo-image {
            width: 330px;
            max-width: 76%;
          }

          .menu-button {
            width: 62px;
            height: 62px;
          }

          .welcome {
            margin-bottom: 24px;
          }

          .welcome-text {
            font-size: 27px;
          }

          .hero {
            min-height: 323px;
            border-radius: 17px;
          }

          .hero-content {
            padding: 43px 0 25px 36px;
            width: 62%;
          }

          .hero-title {
            font-size: 39px;
          }

          .hero-description {
            font-size: 17px;
          }

          .free-badge {
            font-size: 16px;
            padding: 9px 11px;
          }

          .hero-image {
            width: 44%;
          }

          .telegram {
            padding: 24px 28px;
            align-items: center;
          }

          .telegram-title {
            font-size: 22px;
          }

          .telegram-description {
            font-size: 18px;
          }

          .join-button {
            padding: 13px 22px;
            font-size: 17px;
          }

          .section-title {
            font-size: 30px;
          }

          .free-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 22px;
          }

          .test-card {
            padding: 20px 20px 20px;
          }

          .test-title {
            font-size: 27px;
          }

          .test-description {
            font-size: 18px;
          }

          .info-pill {
            font-size: 12px;
            padding: 5px 6px;
          }

          .start-button {
            min-height: 54px;
            font-size: 19px;
          }

          .premium-card {
            padding: 20px 20px;
          }
        }

        @media (max-width: 430px) {

          .page {
            width: calc(100% - 20px);
          }

          .logo-image {
            width: 305px;
          }

          .menu-button {
            width: 55px;
            height: 55px;
            border-radius: 15px;
          }

          .menu-inner {
            width: 23px;
            height: 23px;
          }

          .hero {
            min-height: 320px;
          }

          .hero-content {
            padding-left: 30px;
            width: 65%;
          }

          .hero-title {
            font-size: 34px;
          }

          .hero-description {
            font-size: 15px;
          }

          .hero-image {
            width: 45%;
          }

          .free-badge {
            font-size: 14px;
          }

          .telegram {
            padding: 20px;
          }

          .telegram-title {
            font-size: 18px;
            gap: 8px;
          }

          .telegram-icon {
            width: 34px;
            height: 34px;
            font-size: 18px;
          }

          .telegram-description {
            font-size: 15px;
          }

          .join-button {
            padding: 11px 15px;
            font-size: 15px;
          }

          .section-title {
            font-size: 26px;
          }

          .free-grid {
            gap: 12px;
          }

          .test-card {
            padding: 15px;
          }

          .test-title {
            font-size: 21px;
          }

          .badge {
            font-size: 11px;
            padding: 6px 8px;
          }

          .test-description {
            font-size: 15px;
            min-height: 40px;
          }

          .info-row {
            gap: 3px;
          }

          .info-pill {
            font-size: 10px;
            padding: 4px 5px;
          }

          .start-button {
            min-height: 50px;
            font-size: 16px;
          }

          .access-note {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="page">

        {/* HEADER */}
        <header className="top-header">

          <a href="/">
            <img
              src="/mocktest-odisha-logo.png"
              alt="Mock Test Odisha"
              className="logo-image"
            />
          </a>

          <a
            href={user ? "/profile" : "/login"}
            className="menu-button"
            aria-label="Account"
          >
            <span className="menu-inner" />
          </a>

        </header>

        {/* WELCOME */}
        <div className="welcome">
          <p className="welcome-text">
            👋 Welcome, {studentName || "Student"}
          </p>
        </div>

        {/* HERO */}
        <section className="hero">

          <div className="hero-glow-one" />
          <div className="hero-glow-two" />

          <div className="hero-content">

            <h1 className="hero-title">
              Prepare smarter.
              <br />
              Practice better.
            </h1>

            <p className="hero-description">
              Odisha-focused mock tests to help
              you improve your preparation.
            </p>

            <div className="free-badge">
              {bannerFreeCount > 0
                ? `${bannerFreeCount}+ Free Tests Available`
                : "Free Tests Coming Soon"}
            </div>

          </div>

          <img
            src="/student-banner-illustration-exact.png"
            alt=""
            className="hero-image"
          />

        </section>

        {/* TELEGRAM */}
        <section className="telegram">

          <div className="telegram-left">

            <h2 className="telegram-title">
              <span className="telegram-icon">
                ➤
              </span>

              ODISHA ASPIRANT WARRIORS
            </h2>

            <p className="telegram-description">
              Join our community on Telegram for
              updates & free PDFs.
            </p>

          </div>

          <a
            href="https://t.me/+XgJ5M6y5pW8yNmRl"
            target="_blank"
            rel="noopener noreferrer"
            className="join-button"
          >
            Join Now
          </a>

        </section>

        {/* FREE TESTS */}
        {freeTests.length > 0 && (
          <section className="section">

            <h2 className="section-title">
              <span className="green-dot" />
              Free Mock Tests
            </h2>

            <div className="free-grid">

              {freeTests.map((test) => (
                <TestCard
                  key={`${test.source}-${test.id}`}
                  test={test}
                  type="free"
                />
              ))}

            </div>

          </section>
        )}

        {/* PREMIUM TESTS */}
        {premiumTests.length > 0 && (
          <section className="section">

            <h2 className="section-title">
              <span className="premium-lock">
                🔐
              </span>
              Premium Mock Tests
            </h2>

            <div>

              {premiumTests.map((test) => (
                <div
                  key={`${test.source}-${test.id}`}
                  style={{
                    marginBottom: "18px",
                  }}
                >
                  <TestCard
                    test={test}
                    type="premium"
                    user={user}
                  />
                </div>
              ))}

            </div>

          </section>
        )}

        {/* EMPTY */}
        {freeTests.length === 0 &&
          premiumTests.length === 0 && (
            <div className="empty">

              <h2>
                No tests are currently available.
              </h2>

              <p>
                Please check again later.
              </p>

            </div>
          )}

      </div>

      <footer className="footer">
        Mock Test Odisha ©
      </footer>

    </main>
  );
}


/* =========================================================
   TEST CARD
========================================================= */

function TestCard({
  test,
  type,
  user,
}) {
  const isFree = type === "free";
  const isHtml = test.source === "html";

  const href = isHtml
    ? `/html-test/${test.slug}`
    : `/test/${test.slug}`;

  const needsLogin = !isFree && !user;

  return (
    <article
      className={`test-card ${
        isFree
          ? ""
          : "premium-card"
      }`}
    >

      <div className="card-top">

        <h3 className="test-title">
          {test.title}
        </h3>

        <span
          className={`badge ${
            isFree
              ? "free-badge-card"
              : "paid-badge-card"
          }`}
        >
          {isFree ? "FREE" : "PAID"}
        </span>

      </div>

      <p className="test-description">
        {test.description ||
          (isHtml
            ? "Interactive mock test"
            : "Odisha-focused mock test")}
      </p>

      <div className="info-row">

        {isHtml ? (
          <>
            <span className="info-pill">
              ◷ Self-paced
            </span>

            <span className="info-pill">
              📝 Interactive
            </span>
          </>
        ) : (
          <>
            {test.questionCount && (
              <span className="info-pill">
                📝 {test.questionCount} Qs
              </span>
            )}

            <span className="info-pill interactive-pill">
              ★ Interactive
            </span>
          </>
        )}

        {!isFree && (
          <span className="info-pill paid-info">
            PAID
          </span>
        )}

      </div>

      <a
        href={
          needsLogin
            ? "/login"
            : href
        }
        className={`start-button ${
          isFree
            ? "free-start"
            : "paid-start"
        }`}
      >
        {needsLogin
          ? "🔐 Login to Access"
          : isFree
          ? "Start Free Test  ›"
          : "Unlock Test  🔐"}
      </a>

      {!isFree && (
        <p className="access-note">
          Students need valid access to attempt
          this test. / Contact to Join
        </p>
      )}

    </article>
  );
}
