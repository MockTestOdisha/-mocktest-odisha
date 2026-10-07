import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function groupCategories(categories, accessType) {
  return categories
    .filter(
      (category) =>
        category.access_type === accessType &&
        category.parent_id === null &&
        category.is_visible
    )
    .sort((a, b) => a.display_order - b.display_order);
}

function groupTests(tests, accessType) {
  return tests
    .filter(
      (test) =>
        test.access_type === accessType &&
        test.is_active
    )
    .sort((a, b) => {
      const ao = Number(a.display_order || 0);
      const bo = Number(b.display_order || 0);

      if (ao !== bo) return ao - bo;

      return (
        new Date(a.created_at || 0) -
        new Date(b.created_at || 0)
      );
    });
}

/* =========================================================
   CLASSIC TELEGRAM PAPER-PLANE LOGO
   ========================================================= */

function TelegramIcon() {
  return (
    <svg
      className="telegram-logo"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21.7 3.2 18.4 20c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6 10.2-9.2c.4-.4-.1-.6-.6-.2L4.5 12.8l-5.4-1.7c-1.2-.4-1.2-1.2.2-1.7L20.4 2.1c.9-.3 1.7.2 1.3 1.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* =========================================================
   ODISHA EMBLEM AREA
   ========================================================= */

function OdishaEmblem() {
  return (
    <div
      className="odisha-emblem"
      aria-label="Odisha State Emblem"
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />

        <path
          d="M25 61
             C30 57 35 54 39 48
             C43 42 48 35 55 33
             C62 31 69 34 73 39
             C77 44 78 51 76 56
             C74 62 69 66 63 67
             L59 73
             L52 70
             L48 62
             L41 67
             L35 65
             L30 68
             Z"
          fill="currentColor"
        />

        <path
          d="M57 34
             C60 28 66 25 72 27
             C67 30 65 34 65 39"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M38 47
             L28 42
             L24 46
             L36 53"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M43 61 L37 76
             M55 68 L54 80
             M67 63 L73 76"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d="M24 78
             C38 83 61 84 76 78"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* =========================================================
   TEST CARD
   ========================================================= */

function TestCard({ test, user }) {
  const restricted =
    test.test_type === "restricted" ||
    test.access_type === "paid";

  const href = test.is_html
    ? `/html-test/${test.slug}`
    : `/test/${test.slug}`;

  if (restricted && !user) {
    return (
      <Link
        href="/login"
        className="test-card-link"
      >
        <div className="test-card">
          <div className="test-card-top">
            <span className="test-badge paid-badge">
              🔐 PREMIUM
            </span>
          </div>

          <h3>{test.title}</h3>

          {test.description && (
            <p>{test.description}</p>
          )}

          <span className="test-button premium-button">
            🔓 Login to Start
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="test-card-link"
    >
      <div className="test-card">
        <div className="test-card-top">
          <span
            className={
              restricted
                ? "test-badge paid-badge"
                : "test-badge free-badge"
            }
          >
            {restricted
              ? "🔐 PREMIUM"
              : "🔓 FREE"}
          </span>
        </div>

        <h3>{test.title}</h3>

        {test.description && (
          <p>{test.description}</p>
        )}

        <span
          className={
            restricted
              ? "test-button premium-button"
              : "test-button free-button"
          }
        >
          Start Test →
        </span>
      </div>
    </Link>
  );
}

/* =========================================================
   CATEGORY CARD
   ========================================================= */

function CategoryCard({
  category,
  accessType,
}) {
  return (
    <Link
      href={`/html-tests?category_id=${category.id}`}
      className="category-card-link"
    >
      <div
        className={
          accessType === "paid"
            ? "category-card paid-category"
            : "category-card free-category"
        }
      >
        <div className="category-icon">
          {accessType === "paid"
            ? "🔐"
            : "🔓"}
        </div>

        <div className="category-content">
          <h3>{category.name}</h3>

          <p>
            Open to view available mock tests
          </p>
        </div>

        <div className="category-arrow">
          →
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   HOME PAGE
   ========================================================= */

export default async function HomePage() {
  const user = await getUser();

  const service = getServiceClient();

  /* -------------------------------------------------------
     PROFILE
  ------------------------------------------------------- */

  let profile = null;

  if (user) {
    const { data } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    profile = data;
  }

  /* -------------------------------------------------------
     NORMAL TESTS
  ------------------------------------------------------- */

  const { data: normalTests } = await service
    .from("tests")
    .select(
      "id, title, slug, description, test_type, is_active, created_at"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: true,
    });

  /* -------------------------------------------------------
     HTML TESTS

     IMPORTANT:
     Do NOT include "description" here.
     The html_tests table does not use that column.
  ------------------------------------------------------- */

  const {
    data: htmlTests,
    error: htmlTestsError,
  } = await service
    .from("html_tests")
    .select(
      "id, title, slug, access_type, is_active, category_id, display_order, created_at"
    )
    .eq("is_active", true)
    .order("display_order", {
      ascending: true,
    });

  if (htmlTestsError) {
    console.error(
      "HTML tests loading error:",
      htmlTestsError
    );
  }

  /* -------------------------------------------------------
     HTML CATEGORIES
  ------------------------------------------------------- */

  const { data: categories } = await service
    .from("html_test_categories")
    .select(
      "id, name, access_type, parent_id, is_visible, display_order"
    )
    .eq("is_visible", true)
    .order("display_order", {
      ascending: true,
    });

  /* -------------------------------------------------------
     SAFE ARRAYS
  ------------------------------------------------------- */

  const allNormalTests = normalTests || [];
  const allHtmlTests = htmlTests || [];
  const allCategories = categories || [];

  /* -------------------------------------------------------
     ROOT FREE / PAID CATEGORIES
  ------------------------------------------------------- */

  const freeCategories = groupCategories(
    allCategories,
    "free"
  );

  const paidCategories = groupCategories(
    allCategories,
    "paid"
  );

  /* -------------------------------------------------------
     NORMAL TESTS
  ------------------------------------------------------- */

  const freeNormalTests =
    allNormalTests.filter(
      (test) =>
        test.test_type !== "restricted"
    );

  const paidNormalTests =
    allNormalTests.filter(
      (test) =>
        test.test_type === "restricted"
    );

  /* -------------------------------------------------------
     CATEGORIZED HTML TEST IDs
  ------------------------------------------------------- */

  const categorizedHtmlIds = new Set(
    allHtmlTests
      .filter((test) => test.category_id)
      .map((test) => test.id)
  );

  /* -------------------------------------------------------
     FREE / PAID HTML TESTS
  ------------------------------------------------------- */

  const freeHtmlTests = groupTests(
    allHtmlTests,
    "free"
  );

  const paidHtmlTests = groupTests(
    allHtmlTests,
    "paid"
  );

  /* -------------------------------------------------------
     FREE COUNT
  ------------------------------------------------------- */

  const freeTotal =
    freeNormalTests.length +
    freeHtmlTests.length +
    freeCategories.length;

  const freeBannerCount = freeTotal;

  /* -------------------------------------------------------
     STUDENT NAME
  ------------------------------------------------------- */

  const studentName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "Student";

  return (
    <>
      <main className="student-home">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="student-header">
          <div className="header-inner">

            <Link
              href="/"
              className="brand"
            >
              <span className="brand-icon">
                <OdishaEmblem />
              </span>

              <span className="brand-text">
                Mock Test Odisha
              </span>
            </Link>

            <div className="header-right">

              {user ? (
                <>
                  <span className="welcome-name">
                    Hi, {studentName}
                  </span>

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
                </>
              ) : (
                <Link
                  href="/login"
                  className="login-button"
                >
                  Student Login
                </Link>
              )}

            </div>

          </div>
        </header>

        <div className="page-container">

          {/* =================================================
              HERO
          ================================================= */}

          <section className="hero">

            <div className="hero-glow hero-glow-one" />

            <div className="hero-glow hero-glow-two" />

            <div className="hero-content">

              <div className="hero-label">
                🎯 ODISHA EXAM PREPARATION
              </div>

              <h1>
                Prepare smarter.
                <br />
                Practice better.
              </h1>

              <p>
                Practice Odisha competitive exam
                mock tests and improve your
                preparation with every attempt.
              </p>

              <div className="hero-bottom">

                <span className="available-badge">
                  🟢 {freeBannerCount}+
                  {" "}
                  Free Tests Available
                </span>

                {user && (
                  <span className="hero-student">
                    Welcome back, {studentName} 👋
                  </span>
                )}

              </div>

            </div>

            <div className="hero-decoration">

              <div className="hero-ring hero-ring-one" />

              <div className="hero-ring hero-ring-two" />

              <div className="hero-student-icon">
                🎓
              </div>

            </div>

          </section>

          {/* =================================================
              TELEGRAM
          ================================================= */}

          <section className="telegram-card">

            <div className="telegram-icon">
              <TelegramIcon />
            </div>

            <div className="telegram-content">

              <h2>
                Join Odisha Mock Test Community
              </h2>

              <p>
                Get test updates, announcements,
                preparation materials and more.
              </p>

            </div>

            <a
              href="https://t.me/Odishamock21"
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-button"
            >
              Join Telegram →
            </a>

          </section>

          {/* =================================================
              FREE SECTION
          ================================================= */}

          <section className="test-section free-section">

            <div className="section-heading">

              <div>

                <span className="section-kicker free-kicker">
                  🔓 FREE PRACTICE
                </span>

                <h2>
                  Free Mock Tests
                </h2>

                <p>
                  Practice freely and improve your
                  preparation.
                </p>

              </div>

            </div>

            {freeCategories.length > 0 && (
              <div className="category-grid">

                {freeCategories.map(
                  (category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      accessType="free"
                    />
                  )
                )}

              </div>
            )}

            {freeNormalTests.length > 0 && (
              <div className="test-grid">

                {freeNormalTests.map(
                  (test) => (
                    <TestCard
                      key={test.id}
                      test={{
                        ...test,
                        access_type: "free",
                        is_html: false,
                      }}
                      user={user}
                    />
                  )
                )}

              </div>
            )}

            {freeHtmlTests.length > 0 && (
              <div className="test-grid">

                {freeHtmlTests
                  .filter(
                    (test) =>
                      !categorizedHtmlIds.has(
                        test.id
                      ) ||
                      !test.category_id
                  )
                  .map((test) => (
                    <TestCard
                      key={test.id}
                      test={{
                        ...test,
                        is_html: true,
                      }}
                      user={user}
                    />
                  ))}

              </div>
            )}

            {freeCategories.length === 0 &&
              freeNormalTests.length === 0 &&
              freeHtmlTests.length === 0 && (
                <div className="empty-card">
                  No free tests available
                  right now.
                </div>
              )}

          </section>

          {/* =================================================
              PAID SECTION
          ================================================= */}

          <section className="test-section paid-section">

            <div className="section-heading">

              <div>

                <span className="section-kicker paid-kicker">
                  🔐 PREMIUM PRACTICE
                </span>

                <h2>
                  Premium Mock Tests
                </h2>

                <p>
                  Access premium tests for deeper
                  exam preparation.
                </p>

              </div>

            </div>

            {paidCategories.length > 0 && (
              <div className="category-grid">

                {paidCategories.map(
                  (category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      accessType="paid"
                    />
                  )
                )}

              </div>
            )}

            {paidNormalTests.length > 0 && (
              <div className="test-grid">

                {paidNormalTests.map(
                  (test) => (
                    <TestCard
                      key={test.id}
                      test={{
                        ...test,
                        access_type: "paid",
                        is_html: false,
                      }}
                      user={user}
                    />
                  )
                )}

              </div>
            )}

            {paidHtmlTests.length > 0 && (
              <div className="test-grid">

                {paidHtmlTests
                  .filter(
                    (test) =>
                      !test.category_id
                  )
                  .map((test) => (
                    <TestCard
                      key={test.id}
                      test={{
                        ...test,
                        is_html: true,
                      }}
                      user={user}
                    />
                  ))}

              </div>
            )}

            {paidCategories.length === 0 &&
              paidNormalTests.length === 0 &&
              paidHtmlTests.length === 0 && (
                <div className="empty-card">
                  Premium tests will appear
                  here.
                </div>
              )}

          </section>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="student-footer">

          <div>
            © {new Date().getFullYear()}
            {" "}
            Mock Test Odisha
          </div>

          <div>
            Practice • Improve • Succeed
          </div>

        </footer>

      </main>

      {/* ===================================================
          STYLES
      =================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          background: #eef5ff;
          color: #172554;
        }

        a {
          text-decoration: none;
        }

        .student-home {
          min-height: 100vh;

          background:
            linear-gradient(
              180deg,
              #eef5ff 0%,
              #f7f5ff 45%,
              #fff9fb 100%
            );
        }

        /* ================================================
           HEADER
        ================================================= */

        .student-header {
          position: sticky;
          top: 0;
          z-index: 50;

          background:
            rgba(255,255,255,.88);

          backdrop-filter: blur(16px);

          border-bottom:
            1px solid #e4e9f2;
        }

        .header-inner {
          width:
            min(
              1180px,
              calc(100% - 28px)
            );

          margin: auto;

          min-height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;
        }

        .brand {
          display: flex;
          align-items: center;

          gap: 12px;

          min-width: 0;
        }

        .brand-icon {
          width: 48px;
          height: 48px;

          flex: 0 0 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              #fde7ee,
              #f8d7e1
            );

          color: #a04d66;

          border-radius: 9px;

          box-shadow:
            0 7px 18px
            rgba(
              236,
              160,
              180,
              .18
            );
        }

        .odisha-emblem {
          width: 39px;
          height: 39px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .odisha-emblem svg {
          width: 39px;
          height: 39px;
        }

        .brand-text {
          font-size: 20px;
          font-weight: 900;

          letter-spacing: -.5px;

          color: #172554;

          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;

          gap: 12px;
        }

        .welcome-name {
          font-size: 14px;
          font-weight: 800;

          color: #475569;
        }

        .login-button,
        .logout-button {
          border: 0;

          border-radius: 10px;

          padding: 10px 16px;

          background: #173b91;
          color: white;

          font-size: 13px;
          font-weight: 800;

          cursor: pointer;
        }

        .logout-button {
          background: #64748b;
        }

        /* ================================================
           PAGE
        ================================================= */

        .page-container {
          width:
            min(
              1180px,
              calc(100% - 28px)
            );

          margin: auto;

          padding:
            22px 0 45px;
        }

        /* ================================================
           HERO
        ================================================= */

        .hero {
          position: relative;
          overflow: hidden;

          min-height: 310px;

          display: flex;
          align-items: center;

          padding: 42px 44px;

          border-radius: 12px;

          background:
            linear-gradient(
              120deg,
              #101c55 0%,
              #174a9b 48%,
              #6536a5 100%
            );

          box-shadow:
            0 22px 55px
            rgba(
              31,
              57,
              120,
              .25
            );
        }

        .hero-content {
          position: relative;

          z-index: 5;

          max-width: 690px;
        }

        .hero-label {
          display: inline-flex;

          padding:
            8px 13px;

          border-radius: 999px;

          background:
            rgba(
              255,
              255,
              255,
              .12
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .17
            );

          color: #e8f0ff;

          font-size: 11px;
          font-weight: 900;

          letter-spacing: .8px;
        }

        .hero h1 {
          margin:
            16px 0 12px;

          color: white;

          font-size:
            clamp(
              34px,
              5vw,
              56px
            );

          line-height: 1.02;

          letter-spacing: -2px;
        }

        .hero p {
          max-width: 610px;

          margin: 0;

          color: #dce8ff;

          font-size: 15px;

          line-height: 1.7;
        }

        .hero-bottom {
          display: flex;

          flex-wrap: wrap;

          align-items: center;

          gap: 10px;

          margin-top: 24px;
        }

        .available-badge {
          display: inline-flex;

          align-items: center;

          padding:
            9px 13px;

          border-radius: 10px;

          background:
            rgba(
              255,
              255,
              255,
              .13
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .2
            );

          color: white;

          font-size: 12px;

          font-weight: 900;
        }

        .hero-student {
          color: #dce8ff;

          font-size: 13px;

          font-weight: 800;
        }

        .hero-decoration {
          position: absolute;

          right: 38px;
          top: 50%;

          transform:
            translateY(-50%);

          width: 270px;
          height: 270px;
        }

        .hero-ring {
          position: absolute;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .13
            );

          border-radius: 50%;
        }

        .hero-ring-one {
          inset: 12px;
        }

        .hero-ring-two {
          inset: 42px;
        }

        .hero-student-icon {
          position: absolute;

          inset: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 92px;

          filter:
            drop-shadow(
              0 12px 28px
              rgba(0,0,0,.22)
            );
        }

        .hero-glow {
          position: absolute;

          border-radius: 50%;

          filter: blur(3px);

          pointer-events: none;
        }

        .hero-glow-one {
          width: 230px;
          height: 230px;

          right: 120px;
          top: -130px;

          background:
            rgba(
              88,
              140,
              255,
              .25
            );
        }

        .hero-glow-two {
          width: 210px;
          height: 210px;

          right: -60px;
          bottom: -130px;

          background:
            rgba(
              196,
              107,
              255,
              .25
            );
        }

        /* ================================================
           TELEGRAM
        ================================================= */

        .telegram-card {
          margin-top: 22px;

          padding: 18px;

          display: flex;

          align-items: center;

          gap: 15px;

          background: white;

          border:
            1px solid #e7e9f1;

          border-radius: 14px;

          box-shadow:
            0 10px 30px
            rgba(
              30,
              45,
              90,
              .08
            );
        }

        .telegram-icon {
          width: 52px;
          height: 52px;

          flex: 0 0 52px;

          display: flex;

          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              #fde8ee,
              #f8d9e2
            );

          border-radius: 8px;

          color: #229ed9;

          box-shadow:
            0 7px 18px
            rgba(
              236,
              160,
              180,
              .16
            );
        }

        .telegram-logo {
          width: 34px;
          height: 34px;

          display: block;
        }

        .telegram-content {
          flex: 1;

          min-width: 0;
        }

        .telegram-content h2 {
          margin:
            0 0 4px;

          color: #172554;

          font-size: 17px;
        }

        .telegram-content p {
          margin: 0;

          color: #64748b;

          font-size: 13px;

          line-height: 1.5;
        }

        .telegram-button {
          flex: 0 0 auto;

          padding:
            11px 15px;

          border-radius: 9px;

          background: #173b91;

          color: white;

          font-size: 12px;

          font-weight: 900;
        }

        /* ================================================
           SECTIONS
        ================================================= */

        .test-section {
          margin-top: 38px;
        }

        .section-heading {
          display: flex;

          align-items: flex-end;

          justify-content:
            space-between;

          gap: 20px;

          margin-bottom: 17px;
        }

        .section-kicker {
          font-size: 11px;

          font-weight: 900;

          letter-spacing: .8px;
        }

        .free-kicker {
          color: #15803d;
        }

        .paid-kicker {
          color: #b45309;
        }

        .section-heading h2 {
          margin:
            5px 0 4px;

          color: #172554;

          font-size: 28px;

          letter-spacing: -.8px;
        }

        .section-heading p {
          margin: 0;

          color: #64748b;

          font-size: 13px;
        }

        /* ================================================
           CATEGORY GRID
        ================================================= */

        .category-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 14px;

          margin-bottom: 17px;
        }

        .category-card-link {
          color: inherit;
        }

        .category-card {
          min-height: 108px;

          padding: 17px;

          display: flex;

          align-items: center;

          gap: 13px;

          background: white;

          border-radius: 13px;

          border:
            1px solid #e7e9f1;

          box-shadow:
            0 8px 24px
            rgba(
              30,
              45,
              90,
              .06
            );

          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .category-card:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 13px 30px
            rgba(
              30,
              45,
              90,
              .10
            );
        }

        .free-category {
          border-left:
            4px solid #22c55e;
        }

        .paid-category {
          border-left:
            4px solid #f59e0b;
        }

        .category-icon {
          width: 42px;
          height: 42px;

          flex: 0 0 42px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #f4f7fb;

          font-size: 21px;
        }

        .category-content {
          min-width: 0;

          flex: 1;
        }

        .category-content h3 {
          margin:
            0 0 4px;

          color: #172554;

          font-size: 16px;
        }

        .category-content p {
          margin: 0;

          color: #64748b;

          font-size: 12px;

          line-height: 1.4;
        }

        .category-arrow {
          color: #2563eb;

          font-size: 22px;

          font-weight: 900;
        }

        /* ================================================
           TEST GRID
        ================================================= */

        .test-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 14px;
        }

        .test-card-link {
          color: inherit;
        }

        .test-card {
          min-height: 195px;

          padding: 18px;

          display: flex;

          flex-direction: column;

          background: white;

          border:
            1px solid #e6eaf1;

          border-radius: 13px;

          box-shadow:
            0 8px 25px
            rgba(
              30,
              45,
              90,
              .055
            );

          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .test-card:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 14px 34px
            rgba(
              30,
              45,
              90,
              .10
            );
        }

        .test-card-top {
          display: flex;

          justify-content:
            flex-start;
        }

        .test-badge {
          display: inline-flex;

          align-items: center;

          padding:
            6px 9px;

          border-radius: 7px;

          font-size: 10px;

          font-weight: 900;
        }

        .free-badge {
          color: #166534;

          background:
            #dcfce7;
        }

        .paid-badge {
          color: #92400e;

          background:
            #fef3c7;
        }

        .test-card h3 {
          margin:
            14px 0 7px;

          color: #172554;

          font-size: 17px;
        }

        .test-card p {
          margin: 0;

          color: #64748b;

          font-size: 12px;

          line-height: 1.6;

          display: -webkit-box;

          -webkit-line-clamp: 3;

          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .test-button {
          margin-top: auto;

          padding-top: 15px;

          font-size: 12px;

          font-weight: 900;
        }

        .free-button {
          color: #15803d;
        }

        .premium-button {
          color: #b45309;
        }

        /* ================================================
           EMPTY
        ================================================= */

        .empty-card {
          padding: 30px;

          text-align: center;

          background:
            rgba(
              255,
              255,
              255,
              .75
            );

          border:
            1px dashed #cbd5e1;

          border-radius: 13px;

          color: #64748b;

          font-size: 13px;

          font-weight: 700;
        }

        /* ================================================
           FOOTER
        ================================================= */

        .student-footer {
          width:
            min(
              1180px,
              calc(100% - 28px)
            );

          margin: auto;

          padding:
            22px 0 28px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          color: #64748b;

          font-size: 12px;

          border-top:
            1px solid #e2e8f0;
        }

        /* ================================================
           TABLET
        ================================================= */

        @media (max-width: 900px) {

          .hero-decoration {
            opacity: .35;

            right: -40px;
          }

          .category-grid,
          .test-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

        }

        /* ================================================
           MOBILE
        ================================================= */

        @media (max-width: 650px) {

          .header-inner {
            min-height: 68px;
          }

          .brand-icon {
            width: 43px;
            height: 43px;

            flex-basis: 43px;
          }

          .odisha-emblem,
          .odisha-emblem svg {
            width: 34px;
            height: 34px;
          }

          .brand-text {
            font-size: 17px;
          }

          .welcome-name {
            display: none;
          }

          .hero {
            min-height: 340px;

            padding:
              30px 24px;

            border-radius: 10px;
          }

          .hero h1 {
            font-size: 38px;

            letter-spacing: -1.5px;
          }

          .hero p {
            font-size: 14px;
          }

          .hero-decoration {
            right: -105px;

            opacity: .22;
          }

          .telegram-card {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .telegram-content {
            width:
              calc(
                100% - 67px
              );
          }

          .telegram-button {
            width: 100%;

            text-align: center;
          }

          .category-grid,
          .test-grid {
            grid-template-columns: 1fr;
          }

          .section-heading h2 {
            font-size: 24px;
          }

          .student-footer {
            flex-direction: column;

            align-items:
              flex-start;
          }

        }

      `}</style>
    </>
  );
}
