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
   * STUDENT MESSAGES / ANNOUNCEMENTS
   * ---------------------------------------------------------
   *
   * LOGGED-IN STUDENT:
   * Supabase RLS controls which messages this student can see.
   *
   * LOGGED-OUT VISITOR:
   * Only public messages are requested:
   *
   * target_type = "all"
   * display_location = "home"
   *
   * The RLS policy we created in Supabase also protects this
   * at the database level.
   */
  let studentMessages = [];

  const now = new Date().toISOString();

  if (user) {
    /*
     * -------------------------------------------------------
     * LOGGED-IN STUDENT
     * -------------------------------------------------------
     *
     * Existing RLS policies decide whether the student can
     * see all-student, selected-student, or category messages.
     */
    const { data: messages, error: messageError } =
      await supabase
        .from("student_messages")
        .select(
          "id, title, message, message_type, target_type, display_location, start_at, end_at, created_at"
        )
        .eq("is_active", true)
        .eq("display_location", "home")
        .lte("start_at", now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("start_at", {
          ascending: false,
        });

    if (!messageError) {
      studentMessages = messages || [];
    }
  } else {
    /*
     * -------------------------------------------------------
     * LOGGED-OUT VISITOR
     * -------------------------------------------------------
     *
     * Only public "All Students" homepage messages are
     * requested.
     *
     * Private/selected/category messages are NOT requested.
     */
    const { data: messages, error: messageError } =
      await supabase
        .from("student_messages")
        .select(
          "id, title, message, message_type, target_type, display_location, start_at, end_at, created_at"
        )
        .eq("is_active", true)
        .eq("display_location", "home")
        .in("target_type", ["all", "public"])
        .lte("start_at", now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("start_at", {
          ascending: false,
        });

    if (!messageError) {
      studentMessages = messages || [];
    }
  }

  /*
   * ---------------------------------------------------------
   * NORMAL TESTS
   * ---------------------------------------------------------
   */
  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, title, slug, description, test_type, is_active, created_at"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  /*
   * ---------------------------------------------------------
   * HTML TESTS
   * ---------------------------------------------------------
   */
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: htmlTests } = await adminSupabase
    .from("html_tests")
    .select(
      "id, title, slug, access_type, is_active, category_id, created_at"
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  /*
   * ---------------------------------------------------------
   * HTML TEST CATEGORIES
   * ---------------------------------------------------------
   */
  const { data: categories } = await adminSupabase
    .from("html_test_categories")
    .select(
      "id, name, access_type, parent_id, is_visible, display_order"
    )
    .eq("is_visible", true)
    .order("display_order", {
      ascending: true,
    });

  const allTests = tests || [];
  const allHtmlTests = htmlTests || [];
  const allCategories = categories || [];

  /*
   * ---------------------------------------------------------
   * NORMAL TEST GROUPS
   * ---------------------------------------------------------
   */
  const freeTests = allTests.filter(
    (test) => test.test_type !== "restricted"
  );

  const restrictedTests = allTests.filter(
    (test) => test.test_type === "restricted"
  );

  /*
   * ---------------------------------------------------------
   * HTML TEST GROUPS
   * ---------------------------------------------------------
   */
  const freeHtmlTests = allHtmlTests.filter(
    (test) => test.access_type !== "paid"
  );

  const paidHtmlTests = allHtmlTests.filter(
    (test) => test.access_type === "paid"
  );

  /*
   * ---------------------------------------------------------
   * ROOT HTML CATEGORIES
   * ---------------------------------------------------------
   */
  const freeCategories = allCategories
    .filter(
      (category) =>
        category.access_type === "free" &&
        !category.parent_id
    )
    .sort(
      (a, b) =>
        (a.display_order || 0) -
        (b.display_order || 0)
    );

  const paidCategories = allCategories
    .filter(
      (category) =>
        category.access_type === "paid" &&
        !category.parent_id
    )
    .sort(
      (a, b) =>
        (a.display_order || 0) -
        (b.display_order || 0)
    );

  /*
   * ---------------------------------------------------------
   * COUNTS
   * ---------------------------------------------------------
   */
  const freeTotal =
    freeTests.length + freeHtmlTests.length;

  const paidTotal =
    restrictedTests.length + paidHtmlTests.length;

  const freeBannerCount = freeTotal;

  const totalAvailable =
    freeTotal + paidTotal;

  return (
    <main className="student-home">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .student-home {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #f7f9ff 0%,
              #f8faff 45%,
              #ffffff 100%
            );
          color: #172554;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .student-container {
          width: min(1120px, calc(100% - 30px));
          margin: 0 auto;
        }

        .student-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e5e7eb;
        }

        .header-inner {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #172554;
          text-decoration: none;
          font-weight: 900;
          font-size: 21px;
          letter-spacing: -0.3px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              #f8dce4,
              #f3cbd5
            );

          color: #8f4a5d;

          box-shadow:
            0 8px 20px rgba(236,160,180,0.20);

          font-size: 21px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .welcome-small {
          display: none;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .login-button,
        .logout-button {
          border: none;
          text-decoration: none;
          cursor: pointer;
          border-radius: 11px;
          padding: 10px 15px;
          font-weight: 800;
          font-size: 13px;
        }

        .login-button {
          background: #2563eb;
          color: white;
          box-shadow:
            0 7px 16px rgba(37,99,235,0.22);
        }

        .logout-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .page-content {
          padding: 24px 0 55px;
        }

        /*
         * ---------------------------------------------------
         * HERO BANNER
         * ---------------------------------------------------
         */
        .hero {
          position: relative;
          overflow: hidden;

          border-radius: 12px;

          min-height: 285px;
          padding: 34px 42px;
          color: white;
          background:
            radial-gradient(
              circle at 85% 15%,
              rgba(168,85,247,0.55),
              transparent 34%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(59,130,246,0.55),
              transparent 35%
            ),
            linear-gradient(
              120deg,
              #172554,
              #1d4ed8 48%,
              #6d28d9
            );
          box-shadow:
            0 22px 50px rgba(30,64,175,0.25);
          margin-bottom: 25px;
        }

        .hero::before {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          right: -80px;
          top: -120px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow:
            0 0 0 35px rgba(255,255,255,0.035),
            0 0 0 70px rgba(255,255,255,0.025);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 650px;
        }

        .hero-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.16);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 48px);
          line-height: 1.08;
          letter-spacing: -1.5px;
        }

        .hero-description {
          margin: 14px 0 0;
          color: rgba(255,255,255,0.89);
          font-size: 16px;
          line-height: 1.65;
          max-width: 590px;
        }

        .hero-bottom {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          margin-top: 24px;
        }

        .free-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #1e3a8a;
          padding: 11px 15px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 900;
          box-shadow:
            0 10px 25px rgba(0,0,0,0.14);
        }

        .free-dot {
          width: 9px;
          height: 9px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow:
            0 0 0 4px rgba(34,197,94,0.18);
        }

        .student-greeting {
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          padding: 9px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
        }

        .hero-decoration {
          position: absolute;
          right: 45px;
          bottom: 35px;
          width: 170px;
          height: 170px;
          border-radius: 45% 55% 55% 45%;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.18),
              rgba(255,255,255,0.04)
            );
          transform: rotate(-12deg);
        }

        .hero-decoration::after {
          content: "🎓";
          position: absolute;
          font-size: 76px;
          left: 43px;
          top: 39px;
          transform: rotate(12deg);
          filter:
            drop-shadow(
              0 12px 15px rgba(0,0,0,0.2)
            );
        }

        /*
         * ---------------------------------------------------
         * STUDENT ANNOUNCEMENTS
         * ---------------------------------------------------
         */
        .student-messages-section {
          margin: 0 0 30px;
        }

        .student-messages-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }

        .student-messages-title-wrap {
          min-width: 0;
        }

        .student-messages-kicker {
          display: block;
          margin-bottom: 4px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .student-messages-heading h2 {
          margin: 0;
          color: #172554;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.4px;
        }

        .student-messages-count {
          flex: 0 0 auto;
          min-width: 32px;
          height: 32px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 900;
        }

        .student-messages-list {
          display: grid;
          gap: 12px;
        }

        .student-message-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          box-shadow:
            0 8px 25px rgba(15,23,42,0.06);
        }

        .student-message-icon {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          font-size: 21px;
        }

        .student-message-content {
          min-width: 0;
          flex: 1;
        }

        .student-message-content h3 {
          margin: 0 0 6px;
          color: #172554;
          font-size: 17px;
          line-height: 1.35;
          font-weight: 900;
        }

        .student-message-content p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        /*
         * ---------------------------------------------------
         * STUDENT WELCOME MESSAGE
         * ---------------------------------------------------
         */
        .student-welcome {
          margin-bottom: 25px;
          padding: 14px 17px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          color: #172554;
          font-size: 15px;
          font-weight: 800;
          box-shadow:
            0 5px 18px rgba(15,23,42,0.05);
        }

        /*
         * ---------------------------------------------------
         * TELEGRAM
         * ---------------------------------------------------
         */
        .telegram-card {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              #ffffff,
              #f0f9ff
            );
          border: 1px solid #dbeafe;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow:
            0 8px 25px rgba(15,23,42,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .telegram-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .telegram-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #229ed9;
          box-shadow: none;
        }

        .telegram-logo {
          width: 42px;
          height: 42px;
          display: block;
        }

        .telegram-card h2 {
          margin: 0;
          color: #172554;
          font-size: 17px;
        }

        .telegram-card p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .telegram-button {
          flex: 0 0 auto;
          background: #229ed9;
          color: white;
          padding: 11px 17px;
          border-radius: 11px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          box-shadow:
            0 7px 16px rgba(34,158,217,0.22);
        }

        /*
         * ---------------------------------------------------
         * SECTION
         * ---------------------------------------------------
         */
        .test-section {
          margin-top: 34px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .section-title-wrap h2 {
          margin: 0;
          font-size: 25px;
          color: #172554;
          letter-spacing: -0.5px;
        }

        .section-title-wrap p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .section-count {
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
        }

        .free-count {
          background: #dcfce7;
          color: #166534;
        }

        .paid-count {
          background: #fef3c7;
          color: #92400e;
        }

        /*
         * ---------------------------------------------------
         * CATEGORY CARDS
         * ---------------------------------------------------
         */
        .category-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(240px, 1fr));
          gap: 15px;
        }

        .category-card {
          display: block;
          text-decoration: none;
          padding: 20px;
          border-radius: 18px;
          background: white;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .category-card:hover {
          transform: translateY(-3px);
        }

        .free-category {
          border: 1px solid #bbf7d0;
          box-shadow:
            0 7px 25px rgba(34,197,94,0.07);
        }

        .paid-category {
          border: 1px solid #fde68a;
          box-shadow:
            0 7px 25px rgba(245,158,11,0.07);
        }

        .category-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .category-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .free-icon {
          background: #dcfce7;
        }

        .paid-icon {
          background: #fef3c7;
        }

        .category-arrow {
          color: #64748b;
          font-size: 20px;
          font-weight: 900;
        }

        .category-card h3 {
          margin: 15px 0 5px;
          color: #172554;
          font-size: 18px;
        }

        .category-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .category-label {
          display: inline-block;
          margin-top: 14px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .free-label {
          background: #dcfce7;
          color: #166534;
        }

        .paid-label {
          background: #fef3c7;
          color: #92400e;
        }

        /*
         * ---------------------------------------------------
         * TEST CARDS
         * ---------------------------------------------------
         */
        .test-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(270px, 1fr));
          gap: 15px;
        }

        .test-card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow:
            0 7px 25px rgba(15,23,42,0.045);
        }

        .test-card-free {
          border-color: #bbf7d0;
        }

        .test-card-paid {
          border-color: #fde68a;
        }

        .test-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .test-card h3 {
          margin: 0;
          color: #172554;
          font-size: 18px;
          line-height: 1.35;
        }

        .badge {
          flex: 0 0 auto;
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

        .test-description {
          margin: 10px 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .test-info {
          margin: 10px 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .start-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 7px;
          padding: 12px 15px;
          border-radius: 11px;
          text-decoration: none;
          color: white;
          font-weight: 900;
          font-size: 13px;
        }

        .start-free {
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          box-shadow:
            0 8px 18px rgba(37,99,235,0.18);
        }

        .start-paid {
          background:
            linear-gradient(
              135deg,
              #d97706,
              #b45309
            );
          box-shadow:
            0 8px 18px rgba(217,119,6,0.18);
        }

        .paid-help {
          margin-top: 13px;
          padding: 11px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          color: #92400e;
          font-size: 12px;
          line-height: 1.5;
        }

        .paid-help a {
          color: #229ed9;
          font-weight: 900;
          text-decoration: none;
        }

        /*
         * ---------------------------------------------------
         * EMPTY STATE
         * ---------------------------------------------------
         */
        .empty-state {
          text-align: center;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 35px 20px;
          color: #64748b;
        }

        .empty-state-icon {
          font-size: 38px;
          margin-bottom: 10px;
        }

        .empty-state h2 {
          margin: 0;
          color: #172554;
          font-size: 20px;
        }

        .empty-state p {
          margin: 7px 0 0;
          font-size: 13px;
        }

        /*
         * ---------------------------------------------------
         * FOOTER
         * ---------------------------------------------------
         */
        .footer {
          margin-top: 20px;
          background: #111827;
          color: #cbd5e1;
          padding: 30px 15px;
          text-align: center;
        }

        .footer strong {
          color: white;
          font-size: 18px;
        }

        .footer p {
          margin: 7px 0 0;
          font-size: 12px;
        }

        .footer .copyright {
          margin-top: 10px;
          color: #64748b;
        }

        /*
         * ---------------------------------------------------
         * MOBILE
         * ---------------------------------------------------
         */
        @media (max-width: 700px) {
          .student-container {
            width: min(
              100% - 20px,
              1120px
            );
          }

          .header-inner {
            min-height: 62px;
          }

          .brand {
            font-size: 17px;
          }

          .brand-icon {
            width: 37px;
            height: 37px;
            border-radius: 11px;
            font-size: 18px;
          }

          .welcome-small {
            display: none;
          }

          .login-button,
          .logout-button {
            padding: 8px 11px;
            font-size: 12px;
          }

          .page-content {
            padding-top: 15px;
          }

          .hero {
            min-height: 350px;
            padding: 25px 22px;
            border-radius: 10px;
          }

          .hero h1 {
            font-size: 34px;
          }

          .hero-description {
            font-size: 14px;
          }

          .hero-decoration {
            width: 145px;
            height: 145px;
            right: -20px;
            bottom: 12px;
            opacity: 0.7;
          }

          .hero-decoration::after {
            font-size: 63px;
            left: 38px;
            top: 36px;
          }

          .hero-bottom {
            position: relative;
            z-index: 5;
          }

          .student-greeting {
            font-size: 13px;
            padding: 8px 11px;
          }

          .student-messages-section {
            margin-bottom: 24px;
          }

          .student-messages-heading h2 {
            font-size: 21px;
          }

          .student-message-card {
            padding: 14px;
            border-radius: 15px;
            gap: 11px;
          }

          .student-message-icon {
            flex-basis: 38px;
            width: 38px;
            height: 38px;
            border-radius: 11px;
            font-size: 18px;
          }

          .student-message-content h3 {
            font-size: 15px;
          }

          .student-message-content p {
            font-size: 13px;
          }

          .telegram-card {
            display: block;
            padding: 17px;
          }

          .telegram-left {
            margin-bottom: 14px;
          }

          .telegram-button {
            display: block;
            text-align: center;
            width: 100%;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .section-title-wrap h2 {
            font-size: 22px;
          }

          .category-grid,
          .test-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="student-header">
        <div className="student-container header-inner">
          <a
            href="/"
            className="brand"
          >
            <span className="brand-icon">
              🎓
            </span>

            <span>
              Mock Test Odisha
            </span>
          </a>

          <div className="header-right">
            {user && (
              <span className="welcome-small">
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

      <div className="student-container page-content">

        {/* ===================================================
            HERO
        =================================================== */}
        <section className="hero">
          <div className="hero-content">

            <div className="hero-label">
              ODISHA EXAM PREPARATION
            </div>

            <h1>
              Prepare smarter.
              <br />
              Practice better.
            </h1>

            <p className="hero-description">
              Practice Odisha-focused mock tests,
              improve your preparation and see how
              you perform after every submission.
            </p>

            <div className="hero-bottom">

              <div className="free-count-badge">
                <span className="free-dot" />

                {freeBannerCount}+
                {" "}
                Free Tests Available
              </div>

              {user && (
                <div className="student-greeting">
                  👋 Hi, {studentName || "Student"}
                </div>
              )}

            </div>
          </div>

          <div className="hero-decoration" />
        </section>

        {/* ===================================================
            STUDENT ANNOUNCEMENTS
        =================================================== */}
        {studentMessages.length > 0 && (
          <section className="student-messages-section">

            <div className="student-messages-heading">

              <div className="student-messages-title-wrap">

                <span className="student-messages-kicker">
                  📢 IMPORTANT
                </span>

                <h2>
                  Announcements
                </h2>

              </div>

              <span className="student-messages-count">
                {studentMessages.length}
              </span>

            </div>

            <div className="student-messages-list">

              {studentMessages.map((item) => (
                <article
                  key={item.id}
                  className="student-message-card"
                >

                  <div className="student-message-icon">
                    {item.message_type === "warning"
                      ? "⚠️"
                      : item.message_type === "success"
                      ? "✅"
                      : item.message_type === "info"
                      ? "ℹ️"
                      : "📢"}
                  </div>

                  <div className="student-message-content">

                    <h3>
                      {item.title}
                    </h3>

                    <p>
                      {item.message}
                    </p>

                  </div>

                </article>
              ))}

            </div>

          </section>
        )}

        {/* ===================================================
            TELEGRAM
        =================================================== */}
        <section className="telegram-card">

          <div className="telegram-left">

            <div className="telegram-icon">
              <svg
                className="telegram-logo"
                viewBox="0 0 496 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Telegram"
              >
                <path
                  d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm137.8 169.8-46.8 220.4c-3.5 15.6-12.8 19.4-26 12.1l-72-53.1-34.7 33.4c-3.8 3.8-7 7-14.3 7l5.2-73.8 134.4-121.3c5.8-5.2-1.3-8.1-9-2.9L156.6 273l-70.8-22.1c-15.4-4.8-15.7-15.4 3.2-22.9l276.7-106.7c12.8-4.8 24 3.1 20.1 22.5z"
                  fill="#229ED9"
                />
              </svg>
            </div>

            <div>
              <h2>
                ODISHA ASPIRANT WARRIORS
              </h2>

              <p>
                Join our Telegram community for
                mock tests and Odisha exam updates.
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

        {/* ===================================================
            NO TESTS
        =================================================== */}
        {totalAvailable === 0 && (
          <section className="empty-state">

            <div className="empty-state-icon">
              📝
            </div>

            <h2>
              No tests are currently available.
            </h2>

            <p>
              Please check again later.
            </p>

          </section>
        )}

        {/* ===================================================
            FREE HTML CATEGORIES
        =================================================== */}
        {freeCategories.length > 0 && (
          <TestSection
            title="🟢 Free Mock Tests"
            subtitle="Choose a category and start practicing."
            count={freeTotal}
            countClass="free-count"
          >
            <div className="category-grid">

              {freeCategories.map((category) => (
                <a
                  key={category.id}
                  href={`/html-tests?category_id=${category.id}`}
                  className="category-card free-category"
                >
                  <div className="category-top">

                    <div className="category-icon free-icon">
                      🔓
                    </div>

                    <div className="category-arrow">
                      →
                    </div>

                  </div>

                  <h3>
                    {category.name}
                  </h3>

                  <p>
                    Free mock tests and practice
                    materials.
                  </p>

                  <span className="category-label free-label">
                    FREE
                  </span>
                </a>
              ))}

            </div>
          </TestSection>
        )}

        {/* ===================================================
            PAID HTML CATEGORIES
        =================================================== */}
        {paidCategories.length > 0 && (
          <TestSection
            title="🔐 Premium Mock Tests"
            subtitle="Premium practice for serious preparation."
            count={paidTotal}
            countClass="paid-count"
          >
            <div className="category-grid">

              {paidCategories.map((category) => (
                <a
                  key={category.id}
                  href={`/html-tests?category_id=${category.id}`}
                  className="category-card paid-category"
                >
                  <div className="category-top">

                    <div className="category-icon paid-icon">
                      🔐
                    </div>

                    <div className="category-arrow">
                      →
                    </div>

                  </div>

                  <h3>
                    {category.name}
                  </h3>

                  <p>
                    Premium mock tests with
                    restricted access.
                  </p>

                  <span className="category-label paid-label">
                    PREMIUM
                  </span>
                </a>
              ))}

            </div>
          </TestSection>
        )}

        {/* ===================================================
            NORMAL FREE TESTS
        =================================================== */}
        {freeTests.length > 0 && (
          <TestSection
            title="🟢 Free Tests"
            subtitle="Start practicing immediately."
            count={freeTests.length}
            countClass="free-count"
          >
            <div className="test-grid">

              {freeTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  type="free"
                  href={`/test/${test.slug}`}
                />
              ))}

            </div>
          </TestSection>
        )}

        {/* ===================================================
            NORMAL RESTRICTED TESTS
        =================================================== */}
        {restrictedTests.length > 0 && (
          <TestSection
            title="🔐 Restricted Tests"
            subtitle="Login and valid access are required."
            count={restrictedTests.length}
            countClass="paid-count"
          >
            <div className="test-grid">

              {restrictedTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  type="paid"
                  href={`/test/${test.slug}`}
                  user={user}
                />
              ))}

            </div>
          </TestSection>
        )}

        {/* ===================================================
            FREE HTML TESTS WITHOUT CATEGORY
        =================================================== */}
        {freeHtmlTests.filter(
          (test) => !test.category_id
        ).length > 0 && (
          <TestSection
            title="🟢 Free Interactive Tests"
            subtitle="Interactive HTML mock tests."
            count={
              freeHtmlTests.filter(
                (test) => !test.category_id
              ).length
            }
            countClass="free-count"
          >
            <div className="test-grid">

              {freeHtmlTests
                .filter(
                  (test) => !test.category_id
                )
                .map((test) => (
                  <HtmlTestCard
                    key={test.id}
                    test={test}
                    type="free"
                  />
                ))}

            </div>
          </TestSection>
        )}

        {/* ===================================================
            PAID HTML TESTS WITHOUT CATEGORY
        =================================================== */}
        {paidHtmlTests.filter(
          (test) => !test.category_id
        ).length > 0 && (
          <TestSection
            title="🔐 Premium Interactive Tests"
            subtitle="Premium HTML mock tests."
            count={
              paidHtmlTests.filter(
                (test) => !test.category_id
              ).length
            }
            countClass="paid-count"
          >
            <div className="test-grid">

              {paidHtmlTests
                .filter(
                  (test) => !test.category_id
                )
                .map((test) => (
                  <HtmlTestCard
                    key={test.id}
                    test={test}
                    type="paid"
                    user={user}
                  />
                ))}

            </div>
          </TestSection>
        )}

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="footer">

        <strong>
          Mock Test Odisha
        </strong>

        <p>
          Online mock tests for Odisha students.
        </p>

        <p className="copyright">
          © Mock Test Odisha
        </p>

      </footer>

    </main>
  );
}

/*
 * ===========================================================
 * TEST SECTION
 * ===========================================================
 */
function TestSection({
  title,
  subtitle,
  count,
  countClass,
  children,
}) {
  return (
    <section className="test-section">

      <div className="section-heading">

        <div className="section-title-wrap">

          <h2>
            {title}
          </h2>

          <p>
            {subtitle}
          </p>

        </div>

        {typeof count === "number" && (
          <span
            className={`section-count ${countClass}`}
          >
            {count} {count === 1 ? "Test" : "Tests"}
          </span>
        )}

      </div>

      {children}

    </section>
  );
}

/*
 * ===========================================================
 * NORMAL TEST CARD
 * ===========================================================
 */
function TestCard({
  test,
  type,
  href,
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

      <div className="test-card-top">

        <h3>
          {test.title}
        </h3>

        <span
          className={`badge ${
            isFree
              ? "badge-free"
              : "badge-paid"
          }`}
        >
          {isFree ? "FREE" : "PAID"}
        </span>

      </div>

      {test.description && (
        <p className="test-description">
          {test.description}
        </p>
      )}

      <p className="test-info">
        {isFree
          ? "🟢 Free Test"
          : "🔐 Restricted Test"}
      </p>

      <a
        href={
          !isFree && !user
            ? "/login"
            : href
        }
        className={`start-button ${
          isFree
            ? "start-free"
            : "start-paid"
        }`}
      >
        {!isFree && !user
          ? "🔐 Login to Access"
          : isFree
          ? "▶ Start Free Test"
          : "▶ Open Test"}
      </a>

      {!isFree && (
        <div className="paid-help">
          Valid access is required to
          attempt this test.
        </div>
      )}

    </div>
  );
}

/*
 * ===========================================================
 * HTML TEST CARD
 * ===========================================================
 */
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

      <div className="test-card-top">

        <h3>
          {test.title}
        </h3>

        <span
          className={`badge ${
            isFree
              ? "badge-free"
              : "badge-paid"
          }`}
        >
          {isFree ? "FREE" : "PAID"}
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
        className={`start-button ${
          isFree
            ? "start-free"
            : "start-paid"
        }`}
      >
        {!isFree && !user
          ? "🔐 Login to Access"
          : isFree
          ? "▶ Start Free Test"
          : "▶ Open Premium Test"}
      </a>

      {!isFree && (
        <div className="paid-help">

          <strong>
            Premium Test Access
          </strong>

          <p style={{ margin: "5px 0 8px" }}>
            Valid access is required.
          </p>

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

/*
 * ===========================================================
 * LOGOUT
 * ===========================================================
 */
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
