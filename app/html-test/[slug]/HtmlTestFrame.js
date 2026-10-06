"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function HtmlTestFrame({
  html,
  htmlTestId,
  title,
  accessType,
  studentName,
  slug,
}) {
  const iframeRef = useRef(null);
  const submittedRef = useRef(false);

  const storageKey =
    "mocktest_html_review_" + slug;

  const [name, setName] = useState(
    studentName || ""
  );

  const [started, setStarted] = useState(
    accessType === "paid"
  );

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

      var timestamp =
        String(
          state.submissionTimestamp
        );

      if (
        timestamp ===
        lastSentTimestamp
      ) {
        return;
      }

      lastSentTimestamp =
        timestamp;

      var totalMarks =
        typeof QUESTIONS !==
          "undefined" &&
        Array.isArray(QUESTIONS)
          ? QUESTIONS.length
          : 0;

      var score =
        Number(
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

          score:
            score,

          totalMarks:
            totalMarks,

          percentage:
            percentage,

          submissionTimestamp:
            state.submissionTimestamp,

          reviewState:
            state
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

  /*
   * Ask the parent page for a previously
   * saved completed test state.
   */
  setTimeout(
    requestReviewState,
    500
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

  useEffect(() => {
    function handleMessage(event) {
      if (
        event.source !==
        iframeRef.current?.contentWindow
      ) {
        return;
      }

      /*
       * The iframe is asking for the saved
       * completed test state.
       */
      if (
        event.data?.type ===
        "MOCK_TEST_REQUEST_REVIEW_STATE"
      ) {
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

          iframeRef.current?.contentWindow?.postMessage(
            {
              type:
                "MOCK_TEST_RESTORE_REVIEW_STATE",

              reviewState:
                reviewState
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
       * Normal completed-test result.
       */
      if (
        event.data?.type !==
        "MOCK_TEST_HTML_RESULT"
      ) {
        return;
      }

      /*
       * Save the completed state in the
       * parent page's sessionStorage.
       */
      if (
        event.data?.reviewState
      ) {
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
       * Do not submit the same result
       * more than once during this page visit.
       */
      if (
        submittedRef.current
      ) {
        return;
      }

      submittedRef.current =
        true;

      submitResult(
        event.data
      );
    }

    async function submitResult(
      result
    ) {
      try {
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
      } catch (error) {
        console.error(
          "HTML result submission failed:",
          error
        );

        submittedRef.current =
          false;
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
  ]);

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
            Please enter your name before
            starting the test.
          </p>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Enter your name"
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

          <button
            type="button"
            onClick={() => {
              if (!name.trim()) {
                alert(
                  "Please enter your name."
                );
                return;
              }

              setName(
                name.trim()
              );

              setStarted(true);
            }}
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "12px",
              fontSize: "16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Start Test
          </button>
        </div>
      </main>
    );
  }

  const leaderboardUrl =
    "/leaderboard?returnTo=" +
    encodeURIComponent(
      "/html-test/" + slug
    );

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
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

      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={htmlWithBridge}
        sandbox="allow-scripts allow-forms allow-modals"
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: "100%",
          height:
            "calc(100vh - 52px)",
          minHeight: "700px",
          border: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </main>
  );
}
