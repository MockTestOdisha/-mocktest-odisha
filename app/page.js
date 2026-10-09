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
   * ADMIN SUPABASE CLIENT (Bypass RLS for Public Homepage Data)
   * ---------------------------------------------------------
   */
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  /*
   * ---------------------------------------------------------
   * STUDENT MESSAGES / ANNOUNCEMENTS
   * ---------------------------------------------------------
   */
  let studentMessages = [];
  const now = new Date().toISOString();

  try {
    if (user) {
      const { data: messages, error: messageError } = await adminSupabase
        .from("student_messages")
        .select(
          "id, title, message, message_type, target_type, display_location, start_at, end_at, created_at"
        )
        .eq("is_active", true)
        .eq("display_location", "home")
        .or(`target_type.eq.all,target_type.eq.public,target_student_ids.cs.{${user.id}}`)
        .lte("start_at", now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("start_at", {
          ascending: false,
        });

      if (!messageError) {
        studentMessages = messages || [];
      }
    } else {
      const { data: messages, error: messageError } = await adminSupabase
        .from("student_messages")
        .select(
          "id, title, message, message_type, target_type, display_location, start_at, end_at, created_at"
        )
        .eq("is_active", true)
        .eq("display_location", "home")
        .or("target_type.eq.all,target_type.eq.public")
        .lte("start_at", now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("start_at", {
          ascending: false,
        });

      if (!messageError) {
        studentMessages = messages || [];
      }
    }
  } catch (err) {
    console.error("Failed to load announcements:", err);
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

  const freeTests = allTests.filter((test) => test.test_type !== "restricted");
  const restrictedTests = allTests.filter((test) => test.test_type === "restricted");

  const freeHtmlTests = allHtmlTests.filter((test) => test.access_type !== "paid");
  const paidHtmlTests = allHtmlTests.filter((test) => test.access_type === "paid");

  const freeCategories = allCategories
    .filter((c) => c.access_type === "free" && !c.parent_id)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const paidCategories = allCategories
    .filter((c) => c.access_type === "paid" && !c.parent_id)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const freeTotal = freeTests.length + freeHtmlTests.length;
  const paidTotal = restrictedTests.length + paidHtmlTests.length;
  const freeBannerCount = freeTotal;
  const totalAvailable = freeTotal + paidTotal;

  return (
    <main className="student-home">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }

        .student-home {
          min-height: 100vh;
          background: linear-gradient(180deg, #f7f9ff 0%, #f8faff 45%, #ffffff 100%);
          color: #172554;
          font-family: Arial, Helvetica, sans-serif;
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
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8dce4, #f3cbd5);
          color: #8f4a5d;
          box-shadow: 0 8px 20px rgba(236,160,180,0.20);
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
          border-radius: 10px;
          padding: 10px 15px;
          font-weight: 800;
          font-size: 13px;
        }

        .login-button {
          background: #2563eb;
          color: white;
          box-shadow: 0 7px 16px rgba(37,99,235,0.22);
        }

        .logout-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .page-content { padding: 24px 0 55px; }

        /* HERO BANNER */
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          min-height: 285px;
          padding: 34px 42px;
          color: white;
          background:
            radial-gradient(circle at 85% 15%, rgba(168,85,247,0.55), transparent 34%),
            radial-gradient(circle at 10% 90%, rgba(59,130,246,0.55), transparent 35%),
            linear-gradient(120deg, #172554, #1d4ed8 48%, #6d28d9);
          box-shadow: 0 22px 50px rgba(30,64,175,0.25);
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
          box-shadow: 0 0 0 35px rgba(255,255,255,0.035), 0 0 0 70px rgba(255,255,255,0.025);
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
          border-radius: 10px;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 10px 25px rgba(0,0,0,0.14);
        }

        .free-dot {
          width: 9px;
          height: 9px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(34,197,94,0.18);
        }

        .student-greeting {
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          padding: 9px 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
        }

        .hero-decoration {
          position: absolute;
          right: 45px;
          bottom: 35px;
          width: 170px;
          height: 170px;
          border-radius: 45% 55% 55% 45%;
          background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
          transform: rotate(-12deg);
        }

        .hero-decoration::after {
          content: "🎓";
          position: absolute;
          font-size: 76px;
          left: 43px;
          top: 39px;
          transform: rotate(12deg);
          filter: drop-shadow(0 12px 15px rgba(0,0,0,0.2));
        }

        /* ANNOUNCEMENTS */
        .student-messages-section { margin: 0 0 30px; }
        .student-messages-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }
        .student-messages-title-wrap { min-width: 0; }
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
        .student-messages-list { display: grid; gap: 12px; }
        .student-message-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          box-shadow: 0 8px 25px rgba(15,23,42,0.06);
        }
        .student-message-icon {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          font-size: 21px;
        }
        .student-message-content { min-width: 0; flex: 1; }
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

        /* TELEGRAM */
        .telegram-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #ffffff, #f0f9ff);
          border: 1px solid #dbeafe;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 8px 25px rgba(15,23,42,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .telegram-left { display: flex; align-items: center; gap: 14px; }
        .telegram-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #229ed9;
        }
        .telegram-logo { width: 42px; height: 42px; display: block; }
        .telegram-card h2 { margin: 0; color: #172554; font-size: 17px; }
        .telegram-card p { margin: 5px 0 0; color: #64748b; font-size: 13px; line-height: 1.5; }
        .telegram-button {
          flex: 0 0 auto;
          background: #229ed9;
          color: white;
          padding: 11px 17px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 7px 16px rgba(34,158,217,0.22);
        }

        /* SECTION */
        .test-section { margin-top: 34px; }
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
        .section-title-wrap p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
        .section-count {
          padding: 6px 11px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 900;
        }
        .free-count { background: #dcfce7; color: #166534; }
        .purple-count { background: #f3e8ff; color: #6b21a8; }

        /* RECTANGULAR SWIPEABLE CARDS */
        .category-grid {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 6px 4px 18px 4px;
          margin: 0 -4px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .category-grid::-webkit-scrollbar { height: 4px; }
        .category-grid::-webkit-scrollbar-track { background: transparent; }
        .category-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .category-rect-card {
          flex: 0 0 290px;
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-decoration: none;
          padding: 22px 20px;
          border-radius: 12px;
          border-width: 1.5px;
          border-style: solid;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .category-rect-card:hover { transform: translateY(-3px); }

        /* Soft Mint Green for Free */
        .card-soft-green {
          background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
          border-color: #bbf7d0;
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.08);
        }

        .card-soft-green .category-icon { background: #dcfce7; }
        .card-soft-green .category-arrow { color: #16a34a; }
        .card-soft-green h3 { color: #14532d; }
        .card-soft-green .category-rect-label { background: #15803d; color: #ffffff; }

        /* Soft Lavender Purple for Premium */
        .card-soft-purple {
          background: linear-gradient(145deg, #ffffff 0%, #faf5ff 100%);
          border-color: #e9d5ff;
          box-shadow: 0 8px 24px rgba(168, 85, 247, 0.08);
        }

        .card-soft-purple .category-icon { background: #f3e8ff; }
        .card-soft-purple .category-arrow { color: #9333ea; }
        .card-soft-purple h3 { color: #581c87; }
        .card-soft-purple .category-rect-label { background: #7e22ce; color: #ffffff; }

        .category-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .category-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .category-arrow {
          font-size: 20px;
          font-weight: 900;
          transition: transform 0.15s ease;
        }

        .category-rect-card:hover .category-arrow {
          transform: translateX(3px);
        }

        .category-rect-card h3 {
          margin: 16px 0 5px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .category-rect-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .category-rect-label {
          display: inline-block;
          margin-top: 16px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.5px;
          width: fit-content;
        }

        /* TEST CARDS */
        .test-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
          gap: 15px;
        }

        .test-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 7px 25px rgba(15,23,42,0.045);
        }

        .test-card-free { border-color: #bbf7d0; }
        .test-card-paid { border-color: #e9d5ff; }

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
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 900;
        }

        .badge-free { background: #dcfce7; color: #166534; }
        .badge-paid { background: #f3e8ff; color: #6b21a8; }

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
          border-radius: 10px;
          text-decoration: none;
          color: white;
          font-weight: 900;
          font-size: 13px;
        }

        .start-free {
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          box-shadow: 0 8px 18px rgba(37,99,235,0.18);
        }

        .start-paid {
          background: linear-gradient(135deg, #7e22ce, #9333ea);
          box-shadow: 0 8px 18px rgba(126,34,206,0.18);
        }

        .paid-
