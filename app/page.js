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
          color: #2
