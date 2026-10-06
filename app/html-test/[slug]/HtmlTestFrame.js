"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export default function HtmlTestFrame({
  html,
  htmlTestId,
  title,
  accessType,
  attemptMode,
  studentName,
  slug,
  reviewMode,
}) {
  const iframeRef = useRef(null);

  const submittedRef = useRef(!!reviewMode);

  const storageKey =
    "mocktest_html_review_" + slug;

  const [name, setName] = useState(
    studentName || ""
  );

  const [started, setStarted] = useState(
    accessType === "paid" || reviewMode
  );

  const [claiming, setClaiming] = useState(false);

  const [claimError, setClaimError] =
    useState("");

  const [resultSubmitted, setResultSubmitted] =
    useState(!!reviewMode);

  /*
   * =====================================
   * BRIDGE INTO ORIGINAL HTML
   * =====================================
   */
  const htmlWithBridge = useMemo(() => {
    const bridge = `
<script>
(function () {

  var lastSentTimestamp = null;

  function requestReviewState() {
    try {
      window.parent.postMessage(
        {
          type: "MOCK_TEST_REQUEST_REVIEW_STATE"
        },
        "*"
      );
    } catch (error) {
      console.error(
        "Review state request failed:",
        error
      );
    }
  }

  function restoreState(savedState) {
    try {
      if (
        !savedState ||
        !savedState.completed
      ) {
        return;
      }

      if (
        typeof state === "undefined" ||
        !state
      ) {
        return;
      }

      state = savedState;

      if (
        typeof saveState === "function"
      ) {
        saveState();
      }

      if (
        typeof renderQuestion === "function"
      ) {
        renderQuestion();
      }

      if (
        typeof updateProgress === "function"
      ) {
        updateProgress();
      }

      if (
        typeof updateTimer === "function"
      ) {
        updateTimer();
      }

      if (
        typeof showResult === "function"
      ) {
        showResult(false);
      }
    } catch (error) {
      console.error(
        "HTML review restore error:",
        error
      );
    }
  }

  window.addEventListener(
    "message",
    function (event) {
      if (
        event.data?.type !==
        "MOCK_TEST_RESTORE_REVIEW_STATE"
      ) {
        return;
      }

      restoreState(
        event.data.reviewState
      );
    }
  );

  function checkResult() {
    try {
      if (
        typeof state === "undefined" ||
        !state
      ) {
        return;
      }

      if (!state.completed) {
        return;
      }

      if (!state.submissionTimestamp) {
        return;
      }

      var timestamp = String(
        state.submissionTimestamp
      );

      if (
        timestamp ===
        lastSentTimestamp
      ) {
        return;
      }

      lastSentTimestamp = timestamp;

      var totalMarks =
        typeof QUESTIONS !==
          "undefined" &&
        Array.isArray(QUESTIONS)
          ? QUESTIONS.length
          : 0;

      var score = Number(
        state.score || 0
      );

      var percentage =
        totalMarks > 0
          ? (score / totalMarks) * 100
          : 0;

      window.parent.postMessage(
        {
          type:
            "MOCK_TEST_HTML_RESULT",

          score: score,

          totalMarks: totalMarks,

          percentage: percentage,

          submissionTimestamp:
            state.submissionTimestamp,

          reviewState: state
        },
        "*"
      );
    } catch (error) {
      console.error(
        "HTML result bridge error:",
        error
      );
    }
  }

  setTimeout(
    requestReviewState,
    700
  );

  setInterval(
    checkResult,
    500
  );

})();
</script>
`;

    if (html.includes("</body>")) {
      return html.replace(
        "</body>",
        bridge + "</body>"
      );
    }

    if (html.includes("</html>")) {
      return html.replace(
        "</html>",
        bridge + "</html>"
      );
    }

    return html + bridge;
  }, [html]);

  /*
   * =====================================
   * RECEIVE MESSAGES FROM HTML
   * =====================================
   */
  useEffect(() => {
    function handleMessage(event) {
      if (
        event.source !==
        iframeRef.current?.contentWindow
      ) {
        return;
      }

      /*
       * Review state request
       */
      if (
        event.data?.type ===
        "MOCK_TEST_REQUEST_REVIEW_STATE"
      ) {
        if (!reviewMode) {
          return;
        }

        try {
          const savedState =
            sessionStorage.getItem(
              storageKey
            );

          if (!savedState) {
            return;
          }

          const reviewState =
            JSON.parse(savedState);

          if (
            !reviewState ||
            !reviewState.completed
          ) {
            return;
          }

          iframeRef.current
            ?.contentWindow
            ?.postMessage(
              {
                type:
                  "MOCK_TEST_RESTORE_REVIEW_STATE",

                reviewState,
              },
              "*"
            );
        } catch (error) {
          console.error(
            "Could not restore review state:",
            error
          );
        }

        return;
      }

      /*
       * Completed test result
       */
      if (
        event.data?.type !==
        "MOCK_TEST_HTML_RESULT"
      ) {
        return;
      }

      /*
       * Save completed state for
       * Review Test.
       */
      if (event.data?.reviewState) {
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify(
              event.data.reviewState
            )
          );
        } catch (error) {
          console.error(
            "Could not save review state:",
            error
          );
        }
      }

      /*
       * Review mode does not create
       * another submission.
       */
      if (reviewMode) {
        return;
      }

      /*
       * Prevent duplicate submissions.
       */
      if (submittedRef.current) {
        return;
      }

      submittedRef.current = true;

      submitResult(event.data);
    }

    async function submitResult(result) {
      try {
        const response =
          await fetch(
            "/api/html-test/submit",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                htmlTestId,

                studentName:
                  name.trim() ||
                  "Student",

                score:
                  result.score,

                totalMarks:
                  result.totalMarks,

                percentage:
                  result.percentage,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          submittedRef.current =
            false;

          setResultSubmitted(false);

          console.error(
            "HTML result submission failed:",
            data?.error ||
              "Unknown error"
          );

          return;
        }

        /*
         * Only show website navigation
         * after the server successfully
         * saves the result.
         */
        setResultSubmitted(true);
      } catch (error) {
        submittedRef.current =
          false;

        setResultSubmitted(false);

        console.error(
          "HTML result submission failed:",
          error
        );
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [
    htmlTestId,
    name,
    storageKey,
    reviewMode,
  ]);

  /*
   * =====================================
   * START TEST
   * =====================================
   */
  async function handleStartTest() {
    if (!name.trim()) {
      alert(
        "Please enter your name."
      );

      return;
    }

    if (claiming) {
      return;
    }

    setClaimError("");

    /*
     * Paid tests already have access
     * through login.
     */
    if (accessType !== "free") {
      setName(name.trim());
      setStarted(true);

      return;
    }

    /*
     * Free test:
     * claim only after the student
     * presses Start Test.
     */
    setClaiming(true);

    try {
      const response =
        await fetch(
          "/api/html-test/claim",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              htmlTestId,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setClaimError(
          result.error ||
            "Could not verify this test attempt."
        );

        setClaiming(false);

        return;
      }

      if (!result.allowed) {
        setClaimError(
          "You have already used your attempt for this test."
        );

        setClaiming(false);

        return;
      }

      setName(name.trim());

      setClaiming(false);

      setStarted(true);
    } catch (error) {
      console.error(
        "HTML test claim error:",
        error
      );

      setClaimError(
        "Could not connect to the server. Please try again."
      );

      setClaiming(false);
    }
  }

  /*
   * =====================================
   * START SCREEN
   * =====================================
   */
  if (!started) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <h1>{title}</h1>

          <p>
            Please enter your name
            before starting the test.
          </p>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Enter your name"
            disabled={claiming}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              border:
                "1px solid #ccc",
              borderRadius: "6px",
              marginTop: "10px",
            }}
          />

          {claimError && (
            <p
              style={{
                color: "#dc2626",
                marginTop: "12px",
              }}
            >
              {claimError}
            </p>
          )}

          <button
            type="button"
            onClick={
              handleStartTest
            }
            disabled={claiming}
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "12px",
              fontSize: "16px",
              background:
                claiming
                  ? "#9ca3af"
                  : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor:
                claiming
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {claiming
              ? "Checking Test Access..."
              : "Start Test"}
          </button>

          {/* Telegram Community Invite */}
          <div
            style={{
              marginTop: "22px",
              padding: "16px",
              background: "#eff6ff",
              border:
                "1px solid #bfdbfe",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontWeight: "700",
                fontSize: "16px",
                color: "#1e3a8a",
                marginBottom: "6px",
              }}
            >
              ODISHA ASPIRANT WARRIORS
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#374151",
                marginBottom: "12px",
              }}
            >
              Join our Telegram group for
              mock tests & Odisha exam
              updates.
            </div>

            <a
              href="https://t.me/+XgJ5M6y5pW8yNmRl"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 18px",
                background: "#229ED9",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                fontWeight: "700",
              }}
            >
              CLICK TO JOIN
            </a>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * LEADERBOARD URL
   * =====================================
   */
  const leaderboardUrl =
    "/leaderboard?test=" +
    encodeURIComponent(slug) +
    "&returnTo=" +
    encodeURIComponent(
      "/html-test/" +
        slug +
        "?review=1"
    );

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
      {resultSubmitted && (
        <nav
          style={{
            width: "100%",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "#111827",
            position: "sticky",
            top: 0,
            zIndex: 1000000,
          }}
        >
          <a
            href="/"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            ← Home
          </a>

          <a
            href={leaderboardUrl}
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: "600",
              background: "#2563eb",
              padding: "8px 14px",
              borderRadius: "6px",
            }}
          >
            🏆 Leaderboard
          </a>
        </nav>
      )}

      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={htmlWithBridge}
        sandbox="allow-scripts allow-forms allow-modals allow-top-navigation"
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: "100%",
          height: resultSubmitted
            ? "calc(100vh - 52px)"
            : "100vh",
          minHeight: "700px",
          border: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </main>
  );
}
