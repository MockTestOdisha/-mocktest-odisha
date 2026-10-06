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

  const submittedRef = useRef(
    !!reviewMode
  );

  const claimStartedRef = useRef(false);

  const storageKey =
    "mocktest_html_review_" + slug;

  const [name, setName] = useState(
    studentName || ""
  );

  const [started, setStarted] =
    useState(
      accessType === "paid" ||
        reviewMode
    );

  const [claiming, setClaiming] =
    useState(
      accessType === "free" &&
        !reviewMode
    );

  const [claimError, setClaimError] =
    useState("");

  /*
   * =====================================
   * FREE TEST CLAIM
   * =====================================
   *
   * Claim the browser attempt before
   * allowing the original HTML to start.
   */
  useEffect(() => {
    if (
      accessType !== "free" ||
      reviewMode ||
      claimStartedRef.current
    ) {
      return;
    }

    claimStartedRef.current = true;

    async function claimAttempt() {
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

    claimAttempt();
  }, [
    accessType,
    htmlTestId,
    reviewMode,
  ]);

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
          type:
            "MOCK_TEST_REQUEST_REVIEW_STATE"
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
        typeof renderQuestion ===
        "function"
      ) {
        renderQuestion();
      }

      if (
        typeof updateProgress ===
        "function"
      ) {
        updateProgress();
      }

      if (
        typeof updateTimer ===
        "function"
      ) {
        updateTimer();
      }

      if (
        typeof showResult ===
        "function"
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

      if (
        !state.submissionTimestamp
      ) {
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

    if (
      html.includes("</body>")
    ) {
      return html.replace(
        "</body>",
        bridge + "</body>"
      );
    }

    if (
      html.includes("</html>")
    ) {
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
        iframeRef.current
          ?.contentWindow
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
       * Always preserve the completed
       * state for Review Test.
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
       * Never create another result
       * while viewing a review.
       */
      if (reviewMode) {
        return;
      }

      /*
       * Prevent duplicate submissions
       * from the same completed test.
       */
      if (
        submittedRef.current
      ) {
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

          console.error(
            "HTML result submission failed:",
            data?.error ||
              "Unknown error"
          );

          /*
           * Do not show another popup.
           * The original HTML result screen
           * remains untouched.
           */
        }
      } catch (error) {
        submittedRef.current =
          false;

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
   * FREE TEST CLAIMING SCREEN
   * =====================================
   */
  if (
    accessType === "free" &&
    !reviewMode &&
    claiming
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          background:
            "#f5f7fb",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            background: "#fff",
            padding: "30px",
            borderRadius:
              "12px",
            textAlign:
              "center",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "48px",
            }}
          >
            🔐
          </div>

          <h1>
            Checking Test Access
          </h1>

          <p>
            Please wait while we verify
            your attempt.
          </p>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * CLAIM FAILED
   * =====================================
   */
  if (
    accessType === "free" &&
    !reviewMode &&
    claimError
  ) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          background:
            "#f5f7fb",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#fff",
            padding: "30px",
            borderRadius:
              "12px",
            textAlign:
              "center",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "48px",
            }}
          >
            🚫
          </div>

          <h1>
            Attempt Not Available
          </h1>

          <p>
            {claimError}
          </p>

          <a
            href="/"
            style={{
              display:
                "inline-block",
              marginTop:
                "15px",
              padding:
                "12px 20px",
              background:
                "#6b7280",
              color:
                "#fff",
              borderRadius:
                "6px",
              textDecoration:
                "none",
            }}
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * START SCREEN
   * =====================================
   *
   * Paid tests still ask for no name
   * because the logged-in profile name
   * is already available.
   *
   * Free tests ask for the student's name.
   */
  if (!started) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          background:
            "#f5f7fb",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "450px",
            background: "#fff",
            padding: "30px",
            borderRadius:
              "12px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <h1>
            {title}
          </h1>

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
            style={{
              width: "100%",
              padding: "12px",
              fontSize:
                "16px",
              border:
                "1px solid #ccc",
              borderRadius:
                "6px",
              marginTop:
                "10px",
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

              setStarted(
                true
              );
            }}
            style={{
              width: "100%",
              marginTop:
                "15px",
              padding:
                "12px",
              fontSize:
                "16px",
              background:
                "#2563eb",
              color:
                "#fff",
              border:
                "none",
              borderRadius:
                "6px",
              cursor:
                "pointer",
            }}
          >
            Start Test
          </button>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * OUTSIDE NAVIGATION
   * =====================================
   */
  const leaderboardUrl =
    "/leaderboard?returnTo=" +
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
      <nav
        style={{
          width: "100%",
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          padding:
            "10px 14px",
          background:
            "#111827",
          position:
            "sticky",
          top: 0,
          zIndex:
            1000000,
        }}
      >
        <a
          href="/"
          style={{
            color:
              "#fff",
            textDecoration:
              "none",
            fontWeight:
              "600",
          }}
        >
          ← Home
        </a>

        <a
          href={
            leaderboardUrl
          }
          style={{
            color:
              "#fff",
            textDecoration:
              "none",
            fontWeight:
              "600",
            background:
              "#2563eb",
            padding:
              "8px 14px",
            borderRadius:
              "6px",
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
          display:
            "block",
          width:
            "100%",
          height:
            "calc(100vh - 52px)",
          minHeight:
            "700px",
          border:
            "none",
          margin: 0,
          padding: 0,
        }}
      />
    </main>
  );
}
