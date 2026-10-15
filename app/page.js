import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const TELEGRAM_URL = "https://t.me/Odishamock21";

// Helper to render bold (**...**), colors ([red]...[/red]), and blinking ([blink]...[/blink])
function FormattedAnnouncement({ text }) {
  if (!text) return null;

  const colorMap = {
    red: "#ef4444",
    blue: "#2563eb",
    green: "#16a34a",
    purple: "#9333ea",
    orange: "#ea580c",
    gold: "#d97706",
    yellow: "#eab308",
  };

  let formatted = String(text)
    // 1. Escape basic HTML characters to avoid XSS
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Parse [blink]...[/blink]
  formatted = formatted.replace(
    /[blink]([\s\S]*?)\[\/blink\]/gi,
    '<span class="blink-text">$1</span>'
  );

  // 3. Parse **bold**
  formatted = formatted.replace(
    /\*\*(.*?)\*\*/g,
    '<strong style="font-weight: 800; color: inherit;">$1</strong>'
  );

  // 4. Parse color tags with !important so styles are never overridden
  Object.entries(colorMap).forEach(([colorName, hex]) => {
    const regex = new RegExp(`\\[${colorName}\\]([\\s\\S]*?)\\[\\/${colorName}\\]`, "gi");
    formatted = formatted.replace(
      regex,
      `<span style="color: ${hex} !important; font-weight: 700;">$1</span>`
    );
  });

  // 5. Convert standard linebreaks into clean <br /> tags
  formatted = formatted.replace(/\n/g, "<br />");

  return (
    <div
      style={{ fontSize: "13.5px", lineHeight: "1.65", color: "#334155" }}
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let studentName = "";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    studentName = profile?.full_name || "";
  }

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let studentMessages = [];
  const now = new Date().toISOString();

  try {
    const targetFilter = user ? `target_type.eq.all,target_type.eq.public,target_student_ids.cs.{${user.id}}` : "target_type.eq.all,target_type.eq.public";
    const { data: messages } = await adminSupabase
      .from("student_messages")
      .select("id, title, message, message_type, target_type, display_location, start_at, end_at, created_at")
      .eq("is_active", true)
      .eq("display_location", "home")
      .or(targetFilter)
      .lte("start_at", now)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order("start_at", { ascending: false });
    studentMessages = messages || [];
  } catch (err) {
    console.error("Failed to load announcements:", err);
  }

  const [{ data: tests }, { data: htmlTests }, { data: categories }] = await Promise.all([
    supabase.from("tests").select("id, title, slug, description, test_type, is_active, created_at").eq("is_active", true).order("created_at", { ascending: false }),
    adminSupabase.from("html_tests").select("id, title, slug, access_type, is_active, category_id, created_at").eq("is_active", true).order("created_at", { ascending: false }),
    adminSupabase.from("html_test_categories").select("id, name, access_type, parent_id, is_visible, display_order").eq("is_visible", true).order("display_order", { ascending: true })
  ]);

  const allTests = tests || [];
  const allHtmlTests = htmlTests || [];
  const allCategories = categories || [];

  const freeTests = allTests.filter((t) => t.test_type !== "restricted");
  const restrictedTests = allTests.filter((t) => t.test_type === "restricted");
  const freeHtmlTests = allHtmlTests.filter((t) => t.access_type !== "paid");
  const paidHtmlTests = allHtmlTests.filter((t) => t.access_type === "paid");

  const freeCategories = allCategories.filter((c) => c.access_type === "free" && !c.parent_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const paidCategories = allCategories.filter((c) => c.access_type === "paid" && !c.parent_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const freeTotal = freeTests.length + freeHtmlTests.length;
  const paidTotal = restrictedTests.length + paidHtmlTests.length;
  const totalAvailable = freeTotal + paidTotal;

  return (
    <main className="student-home">
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        .student-home { min-height: 100vh; background: #f8faff; color: #172554; font-family: Arial, sans-serif; }
        .container { width: min(1120px, calc(100% - 24px)); margin: 0 auto; }
        .header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #e5e7eb; }
        .header-inner { min-height: 64px; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 8px; color: #172554; text-decoration: none; font-weight: 900; font-size: 19px; }
        .login-btn, .logout-btn { border: 0; cursor: pointer; border-radius: 8px; padding: 8px 14px; font-weight: 800; font-size: 13px; text-decoration: none; }
        .login-btn { background: #2563eb; color: #fff; }
        .logout-btn { background: #fee2e2; color: #b91c1c; }
        .page-content { padding: 20px 0 50px; }
        .hero { border-radius: 14px; padding: 28px 24px; color: #fff; background: linear-gradient(130deg, #172554 0%, #1d4ed8 55%, #6d28d9 100%); margin-bottom: 24px; box-shadow: 0 16px 36px rgba(30,64,175,0.2); }
        .hero-tag { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.15); font-size: 11px; font-weight: 800; margin-bottom: 12px; }
        .hero-title-link { color: #fff; text-decoration: none; display: block; }
        .hero-title-link:hover { opacity: 0.95; }
        .hero h1 { margin: 0; font-size: clamp(26px, 4.5vw, 42px); line-height: 1.15; }
        .hero p { margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5; max-width: 540px; }
        .hero-meta { display: flex; gap: 10px; margin-top: 18px; align-items: center; flex-wrap: wrap; }
        .free-pill { background: #fff; color: #1e3a8a; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .user-pill { background: rgba(255,255,255,0.15); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
        
        /* TEXT BLINK ANIMATION */
        @keyframes textBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        .blink-text {
          animation: textBlink 1.2s infinite ease-in-out;
          display: inline;
        }

        /* CARD BORDER & HEADING COLOR-SHIFT ANIMATION */
        @keyframes pulseBorder {
          0% { border-color: #3b82f6; box-shadow: 0 0 12px rgba(59, 130, 246, 0.25); }
          33% { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.25); }
          66% { border-color: #8b5cf6; box-shadow: 0 0 12px rgba(139, 92, 246, 0.25); }
          100% { border-color: #3b82f6; box-shadow: 0 0 12px rgba(59, 130, 246, 0.25); }
        }
        @keyframes rainbowText {
          0% { color: #1d4ed8; }
          33% { color: #dc2626; }
          66% { color: #7c3aed; }
          100% { color: #1d4ed8; }
        }

        .msg-sec { margin-bottom: 24px; }
        .msg-title { margin: 0 0 10px; font-size: 18px; font-weight: 900; animation: rainbowText 3s infinite linear; }
        .msg-card { background: #fff; border: 2px solid #3b82f6; border-radius: 12px; padding: 18px; margin-bottom: 12px; animation: pulseBorder 4s infinite ease-in-out; }
        .msg-card h3 { margin: 0 0 8px; font-size: 16px; color: #0f172a; font-weight: 800; }

        .tg-card { background: linear-gradient(135deg, #e0f2fe 0%, #eff6ff 45%, #ede9fe 100%); border: 1px solid #93c5fd; border-radius: 14px; padding: 18px 20px; margin-bottom: 26px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.12); }
        .tg-btn { background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #fff; padding: 11px 20px; border-radius: 9px; text-decoration: none; font-size: 13px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28); }
        .sec-head { display: flex; align-items: baseline; justify-content: space-between; margin: 30px 0 12px; }
        .sec-head h2 { margin: 0; font-size: 21px; color: #172554; }
        .sec-badge { font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; }
        .badge-free-sec { background: #dcfce7; color: #166534; }
        .badge-purp-sec { background: #f3e8ff; color: #6b21a8; }
        .cat-scroll { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 4px 2px 16px; }
        .cat-scroll::-webkit-scrollbar { height: 4px; }
        .cat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .cat-card { flex: 0 0 280px; scroll-snap-align: start; text-decoration: none; padding: 18px; border-radius: 12px; border: 1.5px solid; display: flex; flex-direction: column; justify-content: space-between; min-height: 150px; }
        .cat-free { background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%); border-color: #bbf7d0; box-shadow: 0 6px 20px rgba(34,197,94,0.08); }
        .cat-free h3 { color: #14532d; margin: 12px 0 4px; font-size: 18px; }
        .cat-free .cat-tag { background: #15803d; color: #fff; }
        .cat-paid { background: linear-gradient(145deg, #ffffff 0%, #faf5ff 100%); border-color: #e9d5ff; box-shadow: 0 6px 20px rgba(168,85,247,0.08); }
        .cat-paid h3 { color: #581c87; margin: 12px 0 4px; font-size: 18px; }
        .cat-paid .cat-tag { background: #7e22ce; color: #fff; }
        .cat-top { display: flex; justify-content: space-between; font-size: 20px; font-weight: 800; }
        .cat-card p { margin: 0; color: #64748b; font-size: 12.5px; line-height: 1.4; }
        .cat-tag { font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; width: fit-content; margin-top: 12px; }
        .grid-tests { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
        .t-card { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid #e5e7eb; box-shadow: 0 4px 16px rgba(15,23,42,0.04); }
        .t-free { border-color: #bbf7d0; }
        .t-paid { border-color: #e9d5ff; }
        .t-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .t-top h3 { margin: 0; font-size: 16px; color: #172554; }
        .t-badge { font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px; }
        .tb-free { background: #dcfce7; color: #166534; }
        .tb-paid { background: #f3e8ff; color: #6b21a8; }
        .t-btn { display: block; text-align: center; margin-top: 14px; padding: 10px; border-radius: 8px; text-decoration: none; color: #fff; font-size: 12.5px; font-weight: 800; }
        .t-btn-free { background: #2563eb; }
        .t-btn-paid { background: #7e22ce; }
        .footer { margin-top: 35px; background: #111827; color: #94a3b8; padding: 24px 14px; text-align: center; font-size: 12px; }
        @media (max-width: 650px) {
          .cat-card { flex: 0 0 82%; }
          .tg-card { flex-direction: column; text-align: center; }
          .tg-btn { width: 100%; }
        }
      `}</style>

      <header className="header">
        <div className="container header-inner">
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="brand">
            <span>🎓</span><span>Mock Test Odisha</span>
          </a>
          <div>
            {user ? (
              <form action="/api/auth/release-device" method="POST"><button type="submit" className="logout-btn">Logout</button></form>
            ) : (
              <a href="/login" className="login-btn">Login</a>
            )}
          </div>
        </div>
      </header>

      <div className="container page-content">
        <section className="hero">
          <span className="hero-tag">ODISHA EXAM PREPARATION</span>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hero-title-link">
            <h1>Prepare smarter.<br />Practice better.</h1>
          </a>
          <p>Practice Odisha-focused mock tests, improve your preparation and analyze results after every attempt.</p>
          <div className="hero-meta">
            <a href="#free-tests-section" className="free-pill">
              {freeTotal}+ Free Tests Available ↓
            </a>
            {user && <span className="user-pill">👋 Hi, {studentName || "Student"}</span>}
          </div>
        </section>

        {studentMessages.length > 0 && (
          <section className="msg-sec">
            <h2 className="msg-title">📢 Announcements ({studentMessages.length})</h2>
            {studentMessages.map((m) => (
              <div key={m.id} className="msg-card">
                <h3>{m.title}</h3>
                <FormattedAnnouncement text={m.message} />
              </div>
            ))}
          </section>
        )}

        <section className="tg-card">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path
                d="M21.928 2.536a1.298 1.298 0 0 0-1.32-.208L2.378 10.02c-.89.363-.884 1.625.01 1.979l4.988 1.977 1.83 5.66c.264.815 1.34.982 1.836.286l2.748-3.864 5.378 3.99c.734.544 1.776.136 1.956-.766l3.328-16.148a1.295 1.295 0 0 0-.524-.598zM9.544 13.43l8.47-5.918c.2-.14.417.118.25.294l-7.054 7.42-.45 2.76-1.216-4.556z"
                fill="#0284c7"
              />
            </svg>
            <div>
              <strong style={{ fontSize: "15px", color: "#0f172a", display: "block", letterSpacing: "0.2px" }}>
                ODISHA ASPIRANT WARRIORS
              </strong>
              <p style={{ margin: "2px 0 0", color: "#334155", fontSize: "12.5px" }}>
                Join Telegram for free quizzes and study materials
              </p>
            </div>
          </div>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="tg-btn">
            Click here to join telegram
          </a>
        </section>

        {totalAvailable === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
            <h3>No tests are currently available.</h3>
          </div>
        )}

        {freeCategories.length > 0 && (
          <section id="free-tests-section">
            <div className="sec-head">
              <h2>🟢 Free Mock Tests</h2>
              <span className="sec-badge badge-free-sec">{freeTotal} Tests</span>
            </div>
            <div className="cat-scroll">
              {freeCategories.map((c) => (
                <a key={c.id} href={`/html-tests?category_id=${c.id}`} className="cat-card cat-free">
                  <div className="cat-top"><span>🔓</span><span>→</span></div>
                  <div>
                    <h3>{c.name}</h3>
                    <p>Free interactive tests & study notes.</p>
                  </div>
                  <span className="cat-tag">FREE</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {paidCategories.length > 0 && (
          <section>
            <div className="sec-head">
              <h2>🟣 Premium Mock Tests</h2>
              <span className="sec-badge badge-purp-sec">{paidTotal} Tests</span>
            </div>
            <div className="cat-scroll">
              {paidCategories.map((c) => (
                <a key={c.id} href={`/html-tests?category_id=${c.id}`} className="cat-card cat-paid">
                  <div className="cat-top"><span>🔐</span><span>→</span></div>
                  <div>
                    <h3>{c.name}</h3>
                    <p>Premium tests with comprehensive solutions.</p>
                  </div>
                  <span className="cat-tag">PREMIUM</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {freeTests.length > 0 && (
          <section id={freeCategories.length === 0 ? "free-tests-section" : undefined}>
            <div className="sec-head">
              <h2>🟢 Free Tests</h2>
              <span className="sec-badge badge-free-sec">{freeTests.length} Tests</span>
            </div>
            <div className="grid-tests">
              {freeTests.map((t) => (
                <div key={t.id} className="t-card t-free">
                  <div className="t-top">
                    <h3>{t.title}</h3>
                    <span className="t-badge tb-free">FREE</span>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "12px" }}>🟢 Free Test</p>
                  <a href={`/test/${t.slug}`} className="t-btn t-btn-free">▶ Start Free Test</a>
                </div>
              ))}
            </div>
          </section>
        )}

        {restrictedTests.length > 0 && (
          <section>
            <div className="sec-head">
              <h2>🟣 Restricted Tests</h2>
              <span className="sec-badge badge-purp-sec">{restrictedTests.length} Tests</span>
            </div>
            <div className="grid-tests">
              {restrictedTests.map((t) => (
                <div key={t.id} className="t-card t-paid">
                  <div className="t-top">
                    <h3>{t.title}</h3>
                    <span className="t-badge tb-paid">PAID</span>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "12px" }}>🟣 Restricted Test</p>
                  <a href={!user ? "/login" : `/test/${t.slug}`} className="t-btn t-btn-paid">
                    {!user ? "🔐 Login to Access" : "▶ Open Test"}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {freeHtmlTests.filter((t) => !t.category_id).length > 0 && (
          <section>
            <div className="sec-head">
              <h2>🟢 Interactive HTML Tests</h2>
              <span className="sec-badge badge-free-sec">{freeHtmlTests.filter((t) => !t.category_id).length} Tests</span>
            </div>
            <div className="grid-tests">
              {freeHtmlTests.filter((t) => !t.category_id).map((t) => (
                <div key={t.id} className="t-card t-free">
                  <div className="t-top">
                    <h3>{t.title}</h3>
                    <span className="t-badge tb-free">FREE</span>
                  </div>
                  <a href={`/html-test/${t.slug}`} className="t-btn t-btn-free">▶ Start Free Test</a>
                </div>
              ))}
            </div>
          </section>
        )}

        {paidHtmlTests.filter((t) => !t.category_id).length > 0 && (
          <section>
            <div className="sec-head">
              <h2>🟣 Premium Interactive Tests</h2>
              <span className="sec-badge badge-purp-sec">{paidHtmlTests.filter((t) => !t.category_id).length} Tests</span>
            </div>
            <div className="grid-tests">
              {paidHtmlTests.filter((t) => !t.category_id).map((t) => (
                <div key={t.id} className="t-card t-paid">
                  <div className="t-top">
                    <h3>{t.title}</h3>
                    <span className="t-badge tb-paid">PAID</span>
                  </div>
                  <a href={!user ? "/login" : `/html-test/${t.slug}`} className="t-btn t-btn-paid">
                    {!user ? "🔐 Login to Access" : "▶ Open Premium Test"}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="footer">
        <strong>Mock Test Odisha</strong>
        <p style={{ margin: "6px 0 0" }}>Online mock tests for Odisha competitive exams.</p>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>© Mock Test Odisha</p>
      </footer>
    </main>
  );
}
