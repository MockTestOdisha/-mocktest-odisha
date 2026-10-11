import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_URL = "https://t.me/Odishamock21";
export const dynamic = "force-dynamic";

export default async function HtmlTestsPage({ searchParams }) {
  const query = await searchParams;
  const categoryId = query?.category_id || null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: categories, error: categoryError } = await supabase
    .from("html_test_categories")
    .select("id, name, access_type, parent_id, is_visible, display_order")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  if (categoryError) return <ErrorLayout title="Unable to load Mock Tests" message={categoryError.message} linkHref="/" linkText="Go Home" />;

  const { data: tests, error: testError } = await supabase
    .from("html_tests")
    .select("id, title, slug, access_type, category_id, is_active, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (testError) return <ErrorLayout title="Unable to load Mock Tests" message={testError.message} linkHref="/" linkText="Go Home" />;

  if (!categoryId) {
    const freeCategories = categories.filter((c) => c.access_type === "free" && c.parent_id === null);
    const paidCategories = categories.filter((c) => c.access_type === "paid" && c.parent_id === null);

    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Header />
          <section>
            <SectionTitle icon="🔓" title="FREE MOCK TESTS" color="#166534" count={freeCategories.length} />
            {freeCategories.length === 0 ? <EmptyBox text="No free test categories available right now." /> : <CategoryGrid categories={freeCategories} />}
          </section>
          <section style={{ marginTop: "24px" }}>
            <SectionTitle icon="👑" title="PREMIUM MOCK TESTS" color="#92400e" count={paidCategories.length} />
            {paidCategories.length === 0 ? <EmptyBox text="No premium test categories available right now." /> : <CategoryGrid categories={paidCategories} />}
          </section>
          <TelegramBox />
          <div style={{ textAlign: "center", marginTop: "22px" }}><Link href="/" style={styles.homeBtn}>← Back to Home</Link></div>
        </div>
      </main>
    );
  }

  const category = categories.find((item) => item.id === categoryId);
  if (!category) return <ErrorLayout title="Category Not Found" message="This category is unavailable or hidden." linkHref="/html-tests" linkText="← Mock Tests" />;

  const childCategories = categories.filter((item) => item.parent_id === category.id && item.is_visible).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const categoryTests = tests.filter((test) => test.category_id === category.id && test.access_type === category.access_type).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const parentCategory = category.parent_id ? categories.find((item) => item.id === category.parent_id) : null;
  const backUrl = parentCategory ? `/html-tests?category_id=${parentCategory.id}` : "/html-tests";
  const isFree = category.access_type === "free";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Header />
        <div style={{ marginBottom: "12px" }}><Link href={backUrl} style={styles.backBtn}>← Back</Link></div>

        <div style={{ ...styles.categoryHero, background: isFree ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", borderColor: isFree ? "#bbf7d0" : "#fde68a" }}>
          <div style={{ fontSize: "28px" }}>{isFree ? "🔓" : "👑"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
              <span style={{ ...styles.badge, background: isFree ? "#166534" : "#92400e", color: "#fff" }}>{isFree ? "FREE ACCESS" : "PREMIUM"}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: "18px", color: isFree ? "#14532d" : "#78350f", fontWeight: "800" }}>{category.name}</h1>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: isFree ? "#166534" : "#92400e", opacity: 0.85 }}>{isFree ? "Free Mock Test Series" : "Exclusive Premium Series"}</p>
          </div>
        </div>

        {childCategories.length > 0 && (
          <section style={{ marginTop: "22px" }}>
            <h2 style={styles.sectionHeading}>Test Categories</h2>
            <div style={styles.grid}>{childCategories.map((child) => <CategoryCard key={child.id} category={child} />)}</div>
          </section>
        )}

        {categoryTests.length > 0 && (
          <section style={{ marginTop: "22px" }}>
            <h2 style={styles.sectionHeading}>Mock Tests</h2>
            <div style={styles.testList}>{categoryTests.map((test) => <TestRowCard key={test.id} test={test} />)}</div>
          </section>
        )}

        {childCategories.length === 0 && categoryTests.length === 0 && <EmptyBox text="No mock tests are available in this category yet." />}
        <TelegramBox />
        <div style={{ textAlign: "center", marginTop: "22px" }}><Link href="/" style={styles.homeBtn}>← Back to Home</Link></div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header style={styles.header}>
      <Link href="/" style={styles.brand}><span style={{ fontSize: "22px" }}>🎓</span><span>Mock Test Odisha</span></Link>
      <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#bfdbfe", fontWeight: "500" }}>Mock Test Library</p>
    </header>
  );
}

function SectionTitle({ icon, title, color, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <h2 style={{ margin: 0, color, fontSize: "14px", fontWeight: "800", letterSpacing: "0.5px" }}>{title}</h2>
      </div>
      {count !== undefined && (
        <span style={{ fontSize: "11px", fontWeight: "700", color, background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: "99px" }}>
          {count} {count === 1 ? "Category" : "Categories"}
        </span>
      )}
    </div>
  );
}

function CategoryGrid({ categories }) {
  return <div style={styles.grid}>{categories.map((c) => <CategoryCard key={c.id} category={c} />)}</div>;
}

function CategoryCard({ category }) {
  const isFree = category.access_type === "free";
  return (
    <Link href={`/html-tests?category_id=${category.id}`} style={{ ...styles.categoryCard, background: isFree ? "#fbfdfc" : "#fffdf8", borderColor: isFree ? "#d1fae5" : "#fef08a" }}>
      <div style={{ ...styles.cardIconBox, background: isFree ? "#dcfce7" : "#fef3c7", color: isFree ? "#15803d" : "#b45309" }}>{isFree ? "🔓" : "👑"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...styles.badge, background: isFree ? "#dcfce7" : "#fef3c7", color: isFree ? "#166534" : "#92400e" }}>{isFree ? "FREE" : "PREMIUM"}</span>
        <h3 style={{ margin: "2px 0 0", color: "#1e293b", fontSize: "15px", fontWeight: "700", lineHeight: "1.3" }}>{category.name}</h3>
        <p style={{ margin: "4px 0 0", color: isFree ? "#16a34a" : "#d97706", fontSize: "12px", fontWeight: "600" }}>Explore tests →</p>
      </div>
    </Link>
  );
}

function TestRowCard({ test }) {
  const isFree = test.access_type !== "paid";
  return (
    <div style={{ ...styles.testCard, borderLeft: isFree ? "4px solid #16a34a" : "4px solid #f59e0b" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "10.5px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", background: isFree ? "#dcfce7" : "#fef3c7", color: isFree ? "#15803d" : "#92400e" }}>
          {isFree ? "🔓 FREE" : "👑 PREMIUM"}
        </span>
        <h3 style={{ margin: "3px 0 0", color: "#0f172a", fontSize: "14.5px", fontWeight: "700", lineHeight: "1.35" }}>{test.title}</h3>
      </div>
      <Link href={`/html-test/${test.slug}`} style={{ ...styles.attemptBtn, background: isFree ? "#16a34a" : "#d97706" }}>Attempt Mock</Link>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={styles.emptyBox}>
      <span style={{ fontSize: "20px" }}>📭</span>
      <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "#64748b" }}>{text}</p>
    </div>
  );
}

function TelegramBox() {
  return (
    <div style={styles.telegram}>
      <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>📢 ODISHA ASPIRANT WARRIORS</div>
      <p style={{ margin: "4px 0 10px", color: "#475569", fontSize: "12px", lineHeight: "1.4" }}>Join our Telegram group for real-time exam alerts, syllabus notes, and daily mock test announcements.</p>
      <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={styles.telegramBtn}>CLICK TO JOIN ✈️</a>
    </div>
  );
}

function ErrorLayout({ title, message, linkHref, linkText }) {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Header />
        <div style={styles.errorBox}>
          <h2 style={{ fontSize: "16px", margin: "0 0 6px" }}>{title}</h2>
          <p style={{ fontSize: "12px", color: "#64748b" }}>{message}</p>
          <Link href={linkHref} style={styles.homeBtn}>{linkText}</Link>
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", padding: "16px 12px 40px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  container: { width: "100%", maxWidth: "960px", margin: "0 auto" },
  header: { background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", color: "#fff", padding: "16px 18px", borderRadius: "12px", marginBottom: "18px", boxShadow: "0 4px 14px rgba(37,99,235,0.12)" },
  brand: { display: "flex", alignItems: "center", gap: "8px", color: "#fff", textDecoration: "none", fontSize: "18px", fontWeight: "800" },
  badge: { fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.3px", display: "inline-block" },
  categoryHero: { display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "12px", border: "1px solid", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  sectionHeading: { fontSize: "14.5px", color: "#334155", fontWeight: "800", margin: "0 0 10px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" },
  categoryCard: { padding: "14px", borderRadius: "12px", border: "1px solid", textDecoration: "none", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" },
  cardIconBox: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 },
  testList: { display: "flex", flexDirection: "column", gap: "9px" },
  testCard: { background: "#fff", padding: "13px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.02)" },
  attemptBtn: { color: "#fff", textDecoration: "none", padding: "8px 13px", borderRadius: "6px", fontWeight: "700", whiteSpace: "nowrap", fontSize: "12.5px" },
  emptyBox: { background: "#fff", border: "1px solid #e2e8f0", padding: "18px", borderRadius: "10px", textAlign: "center" },
  telegram: { marginTop: "24px", padding: "15px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px" },
  telegramBtn: { display: "inline-block", padding: "8px 14px", background: "#0284c7", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "700", fontSize: "12px" },
  backBtn: { display: "inline-block", padding: "6px 12px", background: "#1e293b", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "700", fontSize: "12px" },
  homeBtn: { display: "inline-block", padding: "8px 14px", background: "#64748b", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "700", fontSize: "12px" },
  errorBox: { background: "#fff", padding: "20px", borderRadius: "12px", textAlign: "center", border: "1px solid #fecaca" },
};
