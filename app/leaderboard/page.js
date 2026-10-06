import { createClient } from "@supabase/supabase-js";

export default async function LeaderboardPage({
  searchParams,
}) {
  const params = await searchParams;

  const testSlug =
    typeof params?.test === "string"
      ? params.test
      : "";

  const returnTo =
    typeof params?.returnTo === "string" &&
    params.returnTo.startsWith("/html-test/")
      ? params.returnTo
      : "/";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let normalAttempts = [];
  let htmlAttempts = [];

  /*
   * If a test slug is supplied, show only
   * that HTML test's leaderboard.
   */
  if (testSlug) {
    const {
      data: htmlTest,
      error: htmlTestError,
    } = await supabase
      .from("html_tests")
      .select("id, title, slug")
      .eq("slug", testSlug)
      .maybeSingle();

    if (htmlTestError) {
      console.error(
        "HTML test lookup error:",
        htmlTestError
      );
    }

    if (htmlTest) {
      const {
        data,
        error,
      } = await supabase
        .from("html_test_attempts")
        .select(
          "student_name, score, total_marks, percentage, submitted_at"
        )
        .eq(
          "html_test_id",
          htmlTest.id
        )
        .eq(
          "counts_for_leaderboard",
          true
        );

      if (error) {
        console.error(
          "HTML leaderboard error:",
          error
        );
      }

      htmlAttempts = data || [];

      const combinedAttempts =
        htmlAttempts.map(
          (attempt) => ({
            ...attempt,
            test_title:
              htmlTest.title ||
              "HTML Test",
          })
        );

      combinedAttempts.sort(
        (a, b) => {
          if (
            Number(b.percentage) !==
            Number(a.percentage)
          ) {
            return (
              Number(b.percentage) -
              Number(a.percentage)
            );
          }

          if (
            Number(b.score) !==
            Number(a.score)
          ) {
            return (
              Number(b.score) -
              Number(a.score)
            );
          }

          return (
            new Date(
              a.submitted_at
            ).getTime() -
            new Date(
              b.submitted_at
            ).getTime()
          );
        }
      );

      return (
        <main
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "30px",
          }}
        >
          <h1>
            {htmlTest.title} - Leaderboard
          </h1>

          {combinedAttempts.length ===
          0 ? (
            <p>No results yet.</p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      Rank
                    </th>

                    <th
                      style={{
                        padding: "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      Student
                    </th>

                    <th
                      style={{
                        padding: "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      Score
                    </th>

                    <th
                      style={{
                        padding: "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      Percentage
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {combinedAttempts.map(
                    (
                      attempt,
                      index
                    ) => (
                      <tr
                        key={`${attempt.student_name}-${attempt.submitted_at}-${index}`}
                      >
                        <td
                          style={{
                            padding:
                              "12px",
                            border:
                              "1px solid #ddd",
                            textAlign:
                              "center",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            padding:
                              "12px",
                            border:
                              "1px solid #ddd",
                          }}
                        >
                          {
                            attempt.student_name
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "12px",
                            border:
                              "1px solid #ddd",
                            textAlign:
                              "center",
                          }}
                        >
                          {
                            attempt.score
                          }{" "}
                          /{" "}
                          {
                            attempt.total_marks
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "12px",
                            border:
                              "1px solid #ddd",
                            textAlign:
                              "center",
                          }}
                        >
                          {Number(
                            attempt.percentage
                          ).toFixed(2)}
                          %
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <a
              href={returnTo}
              style={{
                display:
                  "inline-block",
                padding:
                  "10px 16px",
                background:
                  "#2563eb",
                color: "#fff",
                textDecoration:
                  "none",
                borderRadius:
                  "6px",
              }}
            >
              ← 📖 Review Test
            </a>

            <a
              href="/"
              style={{
                display:
                  "inline-block",
                padding:
                  "10px 16px",
                background:
                  "#6b7280",
                color: "#fff",
                textDecoration:
                  "none",
                borderRadius:
                  "6px",
              }}
            >
              Home
            </a>
          </div>
        </main>
      );
    }
  }

  /*
   * No specific test was supplied.
   * Keep the original combined leaderboard.
   */

  const {
    data: normalData,
    error: normalError,
  } = await supabase
    .from("attempts")
    .select(
      "student_name, score, total_marks, percentage, submitted_at"
    )
    .eq(
      "counts_for_leaderboard",
      true
    );

  const {
    data: htmlData,
    error: htmlError,
  } = await supabase
    .from("html_test_attempts")
    .select(
      "student_name, score, total_marks, percentage, submitted_at, html_tests ( title )"
    )
    .eq(
      "counts_for_leaderboard",
      true
    );

  if (normalError) {
    console.error(
      "Normal leaderboard error:",
      normalError
    );
  }

  if (htmlError) {
    console.error(
      "HTML leaderboard error:",
      htmlError
    );
  }

  normalAttempts =
    normalData || [];

  htmlAttempts =
    htmlData || [];

  const combinedAttempts = [
    ...normalAttempts.map(
      (attempt) => ({
        ...attempt,
        test_title:
          "Normal Test",
      })
    ),

    ...htmlAttempts.map(
      (attempt) => ({
        ...attempt,
        test_title:
          attempt.html_tests
            ?.title ||
          "HTML Test",
      })
    ),
  ];

  combinedAttempts.sort(
    (a, b) => {
      if (
        Number(b.percentage) !==
        Number(a.percentage)
      ) {
        return (
          Number(b.percentage) -
          Number(a.percentage)
        );
      }

      if (
        Number(b.score) !==
        Number(a.score)
      ) {
        return (
          Number(b.score) -
          Number(a.score)
        );
      }

      return (
        new Date(
          a.submitted_at
        ).getTime() -
        new Date(
          b.submitted_at
        ).getTime()
      );
    }
  );

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <h1>Leaderboard</h1>

      {combinedAttempts.length ===
      0 ? (
        <p>No results yet.</p>
      ) : (
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "12px",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  Rank
                </th>

                <th
                  style={{
                    padding: "12px",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  Student
                </th>

                <th
                  style={{
                    padding: "12px",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  Test
                </th>

                <th
                  style={{
                    padding: "12px",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  Score
                </th>

                <th
                  style={{
                    padding: "12px",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  Percentage
                </th>
              </tr>
            </thead>

            <tbody>
              {combinedAttempts.map(
                (
                  attempt,
                  index
                ) => (
                  <tr
                    key={`${attempt.student_name}-${attempt.submitted_at}-${index}`}
                  >
                    <td
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #ddd",
                        textAlign:
                          "center",
                      }}
                    >
                      {index + 1}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      {
                        attempt.student_name
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #ddd",
                      }}
                    >
                      {
                        attempt.test_title
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #ddd",
                        textAlign:
                          "center",
                      }}
                    >
                      {
                        attempt.score
                      }{" "}
                      /{" "}
                      {
                        attempt.total_marks
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #ddd",
                        textAlign:
                          "center",
                      }}
                    >
                      {Number(
                        attempt.percentage
                      ).toFixed(2)}
                      %
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <a
          href={returnTo}
          style={{
            display:
              "inline-block",
            padding:
              "10px 16px",
            background:
              "#2563eb",
            color: "#fff",
            textDecoration:
              "none",
            borderRadius:
              "6px",
          }}
        >
          ← 📖 Review Test
        </a>

        <a
          href="/"
          style={{
            display:
              "inline-block",
            padding:
              "10px 16px",
            background:
              "#6b7280",
            color: "#fff",
            textDecoration:
              "none",
            borderRadius:
              "6px",
          }}
        >
          Home
        </a>
      </div>
    </main>
  );
}
