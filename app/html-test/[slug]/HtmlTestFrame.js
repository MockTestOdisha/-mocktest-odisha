"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function HtmlTestFrame({
  html,
  htmlTestId,
  title,
  accessType,
  studentName,
}) {
  const iframeRef = useRef(null);
  const submittedRef = useRef(false);

  const [name, setName] = useState(studentName || "");
  const [started, setStarted] = useState(
    accessType === "paid"
  );
  const [message, setMessage] = useState("");

  const htmlWithBridge = useMemo(() => {
    const bridge = `
<script>
(function () {
  var lastSent = null;

  function sendResult() {
    try {
      var keys = Object.keys(localStorage);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (key.indexOf("testState_") !== 0) {
          continue;
        }

        var raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        var state;

        try {
          state = JSON.parse(raw);
        } catch (e) {
          continue;
        }

        if (!state || !state.completed) {
          continue;
        }

        if (!state.submissionTimestamp) {
          continue;
        }

        var timestamp =
          String(state.submissionTimestamp);

        if (timestamp === lastSent) {
          continue;
        }

        lastSent = timestamp;

        var totalMarks =
          Number(
            state.totalMarks ||
            state.total_marks ||
            0
          );

        if (!totalMarks) {
          totalMarks =
            Number(
              document.body.innerText
                .match(/Total Marks[^0-9]*([0-9.]+)/i)?.[1] ||
              0
            );
        }

        var score = Number(state.score || 0);

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

            percentage: percentage
          },
          "*"
        );

        return;
      }
    } catch (e) {
      console.error(
        "HTML result bridge error:",
        e
      );
    }
  }

  setInterval(sendResult, 500);

  window.addEventListener(
    "load",
    function () {
      setTimeout(sendResult, 1000);
    }
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

      if (
        event.data?.type !==
        "MOCK_TEST_HTML_RESULT"
      ) {
        return;
      }

      if (submittedRef.current) {
        return;
      }

      submittedRef.current = true;

      submitResult(event.data);
    }

    async function submitResult(result) {
      try {
        setMessage(
          "Submitting your result..."
        );

        const response = await fetch(
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
                name.trim() || "Student",
              score: result.score,
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
          throw new Error(
            data?.error ||
              "Unable to submit result."
          );
        }

        setMessage(
          "Result submitted successfully."
        );

        console.log(
          "HTML test result saved:",
          data
        );
      } catch (error) {
        console.error(
          "HTML result submission failed:",
          error
        );

        submittedRef.current = false;

        setMessage(
          "Your result could not be submitted."
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
  }, [htmlTestId, name]);

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

              setName(name.trim());
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

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        background: "#fff",
        position: "relative",
      }}
    >
      {message && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: 999999,
            background: "#fff",
            padding: "10px 15px",
            borderRadius: "8px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.2)",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}

      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={htmlWithBridge}
        sandbox="allow-scripts allow-forms allow-modals"
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </main>
  );
}
