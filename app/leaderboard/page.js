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

  /*
   * =====================================
   * SPECIFIC HTML TEST LEADERBOARD
   * =====================================
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
        data: leaderboard,
        error: leaderboardError,
      } = await supabase.rpc(
        "get_html_test_leaderboard",
        {
          p_html_test_id:
            htmlTest.id,
        }
      );

      if (leaderboardError) {
        console.error(
          "HTML leaderboard error:",
          leaderboardError
        );
      }

      const rows =
        leaderboard || [];

      return (
        <main
          style={{
            minHeight: "100vh",
            background: "#f5f7fb",
            padding: "30px 20px",
          }}
        >
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            <h1>
              🏆 {htmlTest.title} - Leaderboard
            </h1>

            {rows.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  padding: "20px",
                  borderRadius: "10px",
                  marginTop: "20px",
                }}
              >
                <p>No results yet.</p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  marginTop: "20px",
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
                      <th style={thStyle}>
                        Rank
                      </th>

                      <th style={thStyle}>
                        Student
                      </th>

                      <th style={thStyle}>
                        Score
                      </th>

                      <th style={thStyle}>
                        Percentage
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(
                      (attempt) => (
                        <tr
                          key={`${attempt.rank}-${attempt.student_name}-${attempt.submitted_at}`}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {Number(
                              attempt.rank
                            ) === 1
                              ? "🥇 1"
                              : Number(
                                  attempt.rank
                                ) === 2
                              ? "🥈 2"
                              : Number(
                                  attempt.rank
                                ) === 3
                              ? "🥉 3"
                              : attempt.rank}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <strong>
                              {
                                attempt.student_name
                              }
                            </strong>
                          </td>

                          <td
                            style={{
                              ...tdStyle,
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
                              ...tdStyle,
                              textAlign:
                                "center",
                              fontWeight:
                                "bold",
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

            {/* Telegram Community Invite */}
            <div
              style={{
                marginTop: "24px",
                padding: "18px",
                background:
                  "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                borderRadius: "8px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "17px",
                  color: "#1e3a8a",
                  marginBottom:
                    "6px",
                }}
              >
                ODISHA ASPIRANT WARRIORS
              </div>

              <div
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  marginBottom:
                    "12px",
                }}
              >
                Join our Telegram
                group for mock
                tests & Odisha exam
                updates.
              </div>

              <a
                href="https://t.me/+XgJ5M6y5pW8yNmRl"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:
                    "inline-block",
                  padding:
                    "10px 18px",
                  background:
                    "#229ED9",
                  color: "#fff",
                  textDecoration:
                    "none",
                  borderRadius:
                    "6px",
                  fontWeight:
                    "700",
                }}
              >
                CLICK TO JOIN
              </a>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap:
                  "wrap",
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
          </div>
        </main>
      );
    }
  }

  /*
   * =====================================
   * ORIGINAL COMBINED LEADERBOARD
   * =====================================
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

  const normalAttempts =
    normalData || [];

  const htmlAttempts =
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
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <h1>
          🏆 Leaderboard
        </h1>

        {combinedAttempts.length ===
        0 ? (
          <p>No results yet.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: "20px",
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
                  <th style={thStyle}>
                    Rank
                  </th>

                  <th style={thStyle}>
                    Student
                  </th>

                  <th style={thStyle}>
                    Test
                  </th>

                  <th style={thStyle}>
                    Score
                  </th>

                  <th style={thStyle}>
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
                          ...tdStyle,
                          textAlign:
                            "center",
                        }}
                      >
                        {index + 1}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          attempt.student_name
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          attempt.test_title
                        }
                      </td>

                      <td
                        style={{
                          ...tdStyle,
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
                          ...tdStyle,
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

        {/* Telegram Community Invite */}
        <div
          style={{
            marginTop: "24px",
            padding: "18px",
            background:
              "#eff6ff",
            border:
              "1px solid #bfdbfe",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: "700",
              fontSize: "17px",
              color: "#1e3a8a",
              marginBottom:
                "6px",
            }}
          >
            ODISHA ASPIRANT WARRIORS
          </div>

          <div
            style={{
              fontSize: "14px",
              color: "#374151",
              marginBottom:
                "12px",
            }}
          >
            Join our Telegram group
            for mock tests & Odisha
            exam updates.
          </div>

          <a
            href="https://t.me/+XgJ5M6y5pW8yNmRl"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:
                "inline-block",
              padding:
                "10px 18px",
              background:
                "#229ED9",
              color: "#fff",
              textDecoration:
                "none",
              borderRadius:
                "6px",
              fontWeight:
                "700",
            }}
          >
            CLICK TO JOIN
          </a>
        </div>

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
      </div>
    </main>
  );
}

const thStyle = {
  padding: "12px",
  border: "1px solid #ddd",
  background: "#f3f4f6",
  textAlign: "left",
};

const tdStyle = {
  padding: "12px",
  border: "1px solid #ddd",
};
