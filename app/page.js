import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const supabase = createClient();

  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>Mock Test Odisha</h1>
      <p>Supabase client is ready.</p>

      <button>
        Start Free Test
      </button>
    </main>
  );
}
