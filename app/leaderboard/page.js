import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = createClient();

  const { data: attempts, error } = await supabase
    .from("attempts")
    .select("id, student_name, score, total_marks, percentage, created_at")
    .eq("counts_for_leaderboard", true)
    .order("percentage", { ascending: false })
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Leaderboard</h1>
        <p>Could not load leaderboard.</p>
        <p>{error.message}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "30px" }}>
      <h1>Leaderboard</h1>

      {!attempts || attempts.length === 0 ? (
        <p>No results yet.</p>
      ) : (
        attempts.map((attempt, index) => (
          <div
            key={attempt.id}
            style={{
              padding: "15px",
              marginBottom: "10px",
              background: "#fff",
              borderRadius: "8px",
            }}
          >
            <strong>
              {index + 1}. {attempt.student_name}
            </strong>

            <div>
              Score: {attempt.score} / {attempt.total_marks}
            </div>

            <div>Percentage: {attempt.percentage}%</div>
          </div>
        ))
      )}
    </main>
  );
}
