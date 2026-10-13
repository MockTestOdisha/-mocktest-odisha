"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TELEGRAM_URL = "https://t.me/Odishamock21";

export default function HtmlTestFrame({ html, htmlTestId, title, accessType, attemptMode, studentName, slug, reviewMode }) {
  const iframeRef = useRef(null);
  const submittedRef = useRef(!!reviewMode);
  const storageKey = "mocktest_html_review_" + slug;

  const [name, setName] = useState(studentName || "");
  const [started, setStarted] = useState(accessType === "paid" || reviewMode);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [resultSubmitted, setResultSubmitted] = useState(!!reviewMode);

  const htmlWithBridge = useMemo(() => {
    const bridge = `
<script>
(function () {
  var lastSentTimestamp = null;
  function requestReviewState() {
    try { window.parent.postMessage({ type: "MOCK_TEST_REQUEST_REVIEW_STATE" }, "*"); } catch (e) { console.error(e); }
  }
  function restoreState(savedState) {
    try {
      if (!savedState || !savedState.completed || typeof state === "undefined" || !state) return;
      state = savedState;
      if (typeof saveState === "function") saveState();
      if (typeof renderQuestion === "function") renderQuestion();
      if (typeof updateProgress === "function") updateProgress();
      if (typeof updateTimer === "function") updateTimer();
      if (typeof showResult === "function") showResult(false);
    } catch (e) { console.error("HTML review restore error:", e); }
  }
  window.addEventListener("message", function (e) {
    if (e.data?.type === "MOCK_TEST_RESTORE_REVIEW_STATE") restoreState(e.data.reviewState);
  });
  function checkResult() {
    try {
      if (typeof state === "undefined" || !state || !state.completed || !state.submissionTimestamp) return;
      var timestamp = String(state.submissionTimestamp);
      if (timestamp === lastSentTimestamp) return;
      lastSentTimestamp = timestamp;
      var totalMarks = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS.length : 0;
      var score = Number(state.score || 0);
      var percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      window.parent.postMessage({ type: "MOCK_TEST_HTML_RESULT", score: score, totalMarks: totalMarks, percentage: percentage, submissionTimestamp: state.submissionTimestamp, reviewState: state }, "*");
    } catch (e) { console.error("HTML result bridge error:", e); }
  }
  setTimeout(requestReviewState, 700);
  setInterval(checkResult, 500);
})();
</script>
`;
    if (html.includes("</body>")) return html.replace("</body>", bridge + "</body>");
    if (html.includes("</html>")) return html.replace("</html>", bridge + "</html>");
    return html + bridge;
  }, [html]);

  useEffect(() => {
    function handleMessage(event) {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "MOCK_TEST_REQUEST_REVIEW_STATE") {
        if (!reviewMode) return;
        try {
          const savedState = sessionStorage.getItem(storageKey);
          if (!savedState) return;
          const reviewState = JSON.parse(savedState);
          if (reviewState?.completed) {
            iframeRef.current?.contentWindow?.postMessage({ type: "MOCK_TEST_RESTORE_REVIEW_STATE", reviewState }, "*");
          }
        } catch (e) { console.error("Could not restore review state:", e); }
        return;
      }

      if (event.data?.type !== "MOCK_TEST_HTML_RESULT") return;

      if (event.data?.reviewState) {
        try { sessionStorage.setItem(storageKey, JSON.stringify(event.data.reviewState)); } catch (e) {}
      }

      if (reviewMode || submittedRef.current) return;
      submittedRef.current = true;
      submitResult(event.data);
    }

    async function submitResult(result) {
      try {
        const response = await fetch("/api/html-test/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ htmlTestId, studentName: name.trim() || "Student", score: result.score, totalMarks: result.totalMarks, percentage: result.percentage }),
        });
        if (!response.ok) {
          submittedRef.current = false;
          setResultSubmitted(false);
          return;
        }
        setResultSubmitted(true);
      } catch (error) {
        submittedRef.current = false;
        setResultSubmitted(false);
        console.error("HTML result submission error:", error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [htmlTestId, name, storageKey, reviewMode]);

  async function handleStartTest() {
    if (!name.trim()) return alert("Please enter your name.");
    if (claiming) return;
    setClaimError("");

    if (accessType !== "free") {
      setName(name.trim());
      setStarted(true);
      return;
    }

    setClaiming(true);
    try {
      const response = await fetch("/api/html-test/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlTestId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setClaimError(result.error || "Could not verify this test attempt.");
        return;
      }
      if (!result.allowed) {
        setClaimError("You have already used your attempt for this test.");
        return;
      }
      setName(name.trim());
      setStarted(true);
    } catch (error) {
      setClaimError("Could not connect to the server. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (!started) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fb", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "450px", background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "22px", color: "#0f172a" }}>{title}</h1>
          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "14px" }}>Please enter your name before starting the test.</p>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            disabled={claiming}
            style={{ width: "100%", padding: "12px", fontSize: "15px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box", outline: "none" }}
          />

          {claimError && <p style={{ color: "#dc2626", marginTop: "12px", fontSize: "13px" }}>{claimError}</p>}

          <button
            type="button"
            onClick={handleStartTest}
            disabled={claiming}
            style={{ width: "100%", marginTop: "15px", padding: "12px", fontSize: "16px", background: claiming ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: claiming ? "not-allowed" : "pointer", fontWeight: "700" }}
          >
            {claiming ? "Checking Test Access..." : "Start Test"}
          </button>

          {/* Telegram Community Invite */}
          <div style={{ marginTop: "22px", padding: "16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ marginBottom: "6px" }}>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "700", fontSize: "16px", color: "#1e3a8a", textDecoration: "none" }}>
                ODISHA ASPIRANT WARRIORS
              </a>
            </div>
            <div style={{ fontSize: "14px", color: "#374151", marginBottom: "12px" }}>
              Join our Telegram group for mock tests & Odisha exam updates.
            </div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "10px 18px", background: "#229ED9", color: "#fff", textDecoration: "none", borderRadius: "6px", fontWeight: "700", fontSize: "13.5px" }}
            >
              CLICK TO JOIN
            </a>
          </div>
        </div>
      </main>
    );
  }

  const leaderboardUrl = `/leaderboard?test=${encodeURIComponent(slug)}&returnTo=${encodeURIComponent("/html-test/" + slug + "?review=1")}`;

  return (
    <main style={{ width: "100%", minHeight: "100vh", background: "#fff" }}>
      {resultSubmitted && (
        <nav style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#111827", position: "sticky", top: 0, zIndex: 1000000, boxSizing: "border-box" }}>
          <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: "600" }}>← Home</a>
          <a href={leaderboardUrl} style={{ color: "#fff", textDecoration: "none", fontWeight: "600", background: "#2563eb", padding: "8px 14px", borderRadius: "6px" }}>🏆 Leaderboard</a>
        </nav>
      )}

      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={htmlWithBridge}
        sandbox="allow-scripts allow-forms allow-modals allow-top-navigation"
        referrerPolicy="no-referrer"
        style={{ display: "block", width: "100%", height: resultSubmitted ? "calc(100vh - 52px)" : "100vh", minHeight: "700px", border: "none", margin: 0, padding: 0 }}
      />
    </main>
  );
}
