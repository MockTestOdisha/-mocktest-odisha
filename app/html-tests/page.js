import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_URL = "https://t.me/+XgJ5M6y5pW8yNmRl";
export const dynamic = "force-dynamic";

export default async function HtmlTestsPage({ searchParams }) {
  const query = await searchParams;
  const categoryId = query?.category_id || null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: categories, error: categoryError } = await supabase
    .from("html_test_categories")
    .select("id, name, access_type, parent_id, is_visible, display_order")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  if (categoryError) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <h1>Unable to load Mock Tests</h1>
            <p>{categoryError.message}</p>
            <Link href="/" style={styles.homeButton}>Go Home</Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: tests, error: testError } = await supabase
    .from("html_tests")
    .select("id, title, slug, access_type, category_id, is_active, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (testError) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <h1>Unable to load Mock Tests</h1>
            <p>{testError.message}</p>
            <Link href="/" style={styles.homeButton}>Go Home</Link>
          </div>
        </div>
      </main>
    );
  }

  // ROOT DIRECTORY VIEW
  if (!categoryId) {
    const freeCategories = categories.filter((c) => c.access_type === "free" && c.parent_id === null);
    const paidCategories = categories.filter((c) => c.access_type === "paid" && c.parent_id === null);

    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Header />
          <section>
            <SectionTitle icon="🔓" title="FREE MOCK TESTS" color="#15803d" />
            {freeCategories.length === 0 ? (
              <EmptyBox text="No free test categories available." />
            ) : (
              <CategoryGrid categories={freeCategories} />
            )}
          </section>

          <section style={{ marginTop: "35px" }}>
            <SectionTitle icon="🔐" title="PREMIUM MOCK TESTS" color="#b45309" />
            {paidCategories.length === 0 ? (
              <EmptyBox text="No premium test categories available." />
            ) : (
              <CategoryGrid categories={paidCategories} />
            )}
          </section>

          <TelegramBox />
          <div style={styles.bottomHome}>
            <Link href="/" style={styles.homeButton}>← Back to Home</Link>
          </div>
        </div>
      </main>
    );
  }

  // INDIVIDUAL CATEGORY VIEW
  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <Header />
          <div style={styles.errorBox}>
            <h1>Category Not Found</h1>
            <p>This mock test category does not exist or is currently hidden.</p>
            <Link href="/html-tests" style={styles.homeButton}>← Mock Tests</Link>
          </div>
        </div>
      </main>
    );
  }

  const childCategories = categories
    .filter((item) => item.parent_id === category.id && item.is_visible === true)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const categoryTests = tests
    .filter((test) => test.category_id === category.id && test.access_type === category.access_type)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const parentCategory = category.parent_id ? categories.find((item) => item.id === category.parent_id) : null;
  const backUrl = parentCategory ? `/html-tests?category_id=${parentCategory.id}` : "/html-tests";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Header />
        <div style={{ marginBottom: "18px" }}>
          <Link href={backUrl} style={styles.backButton}>← Back</Link>
        </div>

        <div
          style={{
            ...styles.categoryHeader,
            borderColor: category.access_type === "free" ? "#86efac" : "#fcd34d",
            background: category.access_type === "free" ? "#f0fdf4" : "#fffbeb",
          }}
        >
          <div style={{ fontSize: "38px" }}>{category.access_type === "free" ? "🔓" : "🔐"}</div>
          <div>
            <h1 style={{ margin: 0, color: category.access_type === "free" ? "#166534" : "#92400e" }}>
              {category.name}
            </h1>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              {category.access_type === "free" ? "Free Mock Tests" : "Premium Mock Tests"}
            </p>
          </div>
        </div>

        {childCategories.length > 0 && (
          <section style={{ marginTop: "28px" }}>
            <h2 style={styles.sectionHeading}>Test Categories</h2>
            <div style={styles.grid}>
              {childCategories.map((child) => (
                <CategoryCard key={child.id} category={child} />
              ))}
            </div>
          </section>
        )}

        {categoryTests.length > 0 && (
          <section style={{ marginTop: "28px" }}>
            <h2 style={styles.sectionHeading}>Mock Tests</h2>
            <div style={styles.testList}>
              {categoryTests.map((test) => (
                <HtmlTestCard key={test.id} test={test} />
              ))}
            </div>
          </section>
        )}

        {childCategories.length === 0 && categoryTests.length === 0 && (
          <EmptyBox text="No mock tests are available in this category yet." />
        )}

        <TelegramBox />
        <div style={styles.bottomHome}>
          <Link href="/" style={styles.homeButton}>← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header style={styles.header}>
      <Link href="/" style={styles.brand}>
        <span style={styles.brandIcon}>🎓</span>
        <span>Mock Test Odisha</span>
      </Link>
      <p style={styles.headerText}>Mock Test Library</p>
    </header>
  );
}

function SectionTitle({ icon, title, color }) {
  return (
    <div style={styles.sectionTitle}>
      <h1 style={{ margin: 0, color, fontSize: "25px" }}>{icon} {title}</h1>
    </div>
  );
}

function CategoryGrid({ categories }) {
  return (
    <div style={styles.grid}>
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

function CategoryCard({ category }) {
  const isFree = category.access_type === "free";
  return (
    <Link
      href={`/html-tests?category_id=${category.id}`}
      style={{
        ...styles.categoryCard,
        borderColor: isFree ? "#bbf7d0" : "#fde68a",
        background: isFree ? "#f0fdf4" : "#fffbeb",
      }}
    >
      <div style={styles.cardIcon}>{isFree ? "🔓" : "🔐"}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, color: isFree ? "#166534" : "#92400e", fontSize: "19px" }}>
          {category.name}
        </h3>
        <p style={{ margin: "7px 0 0", color: "#6b7280", fontSize: "14px" }}>
          Open category →
        </p>
      </div>
    </Link>
  );
}

function HtmlTestCard({ test }) {
  const isFree = test.access_type !== "paid";
  return (
    <div style={{ ...styles.testCard, borderLeft: isFree ? "5px solid #22c55e" : "5px solid #f59e0b" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: isFree ? "#15803d" : "#b45309", marginBottom: "5px" }}>
          {isFree ? "🔓 FREE TEST" : "🔐 PREMIUM TEST"}
        </div>
        <h3 style={{ margin: 0, color: "#111827", fontSize: "18px" }}>{test.title}</h3>
      </div>
      <Link
        href={`/html-test/${test.slug}`}
        style={{ ...styles.openButton, background: isFree ? "#15803d" : "#b45309" }}
      >
        Attempt Mock
      </Link>
    </div>
  );
}

function EmptyBox({ text }) {
  return <div style={styles.emptyBox}>{text}</div>;
}

function TelegramBox() {
  return (
    <div style={styles.telegram}>
      <div style={{ fontSize: "19px", fontWeight: "bold", color: "#111827" }}>
        📢 ODISHA ASPIRANT WARRIORS
      </div>
      <p style={{ margin: "8px 0", color: "#374151" }}>
        Join our Telegram group for mock tests and Odisha exam updates.
      </p>
      <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={styles.telegramButton}>
        CLICK TO JOIN
      </a>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #f5f9ff 0%, #ffffff 100%)", padding: "20px 14px 50px" },
  container: { width: "100%", maxWidth: "1050px", margin: "0 auto" },
  header: { background: "linear-gradient(135deg, #172554, #2563eb)", color: "#fff", padding: "22px", borderRadius: "14px", marginBottom: "28px", boxShadow: "0 8px 25px rgba(37,99,235,0.15)" },
  brand: { display: "flex", alignItems: "center", gap: "9px", color: "#fff", textDecoration: "none", fontSize: "24px", fontWeight: "800" },
  brandIcon: { fontSize: "27px" },
  headerText: { margin: "7px 0 0", color: "#dbeafe" },
  sectionTitle: { marginBottom: "16px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" },
  categoryCard: { minHeight: "125px", padding: "20px", borderRadius: "14px", border: "1px solid", textDecoration: "none", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", transition: "transform 0.15s ease" },
  cardIcon: { fontSize: "40px" },
  categoryHeader: { display: "flex", alignItems: "center", gap: "16px", padding: "20px", borderRadius: "14px", border: "1px solid", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" },
  sectionHeading: { fontSize: "21px", color: "#1f2937", margin: "0 0 14px" },
  testList: { display: "flex", flexDirection: "column", gap: "12px" },
  testCard: { background: "#fff", padding: "17px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 3px 12px rgba(0,0,0,0.06)" },
  openButton: { color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: "7px", fontWeight: "bold", whiteSpace: "nowrap", fontSize: "14px" },
  emptyBox: { background: "#fff", border: "1px solid #e5e7eb", padding: "22px", borderRadius: "12px", color: "#6b7280", textAlign: "center" },
  telegram: { marginTop: "30px", padding: "20px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px" },
  telegramButton: { display: "inline-block", marginTop: "8px", padding: "11px 18px", background: "#229ED9", color: "#fff", borderRadius: "7px", textDecoration: "none", fontWeight: "bold" },
  bottomHome: { textAlign: "center", marginTop: "25px" },
  homeButton: { display: "inline-block", padding: "10px 18px", background: "#6b7280", color: "#fff", borderRadius: "7px", textDecoration: "none", fontWeight: "bold" },
  backButton: { display: "inline-block", padding: "9px 15px", background: "#2563eb", color: "#fff", borderRadius: "7px", textDecoration: "none", fontWeight: "bold" },
  errorBox: { background: "#fff", padding: "25px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" },
};
