import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      htmlTestId,
      studentName,
      score,
      totalMarks,
    } = body;

    if (
      !htmlTestId ||
      score === undefined ||
      totalMarks === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required result information.",
        },
        { status: 400 }
      );
    }

    const cleanStudentName =
      String(studentName || "").trim() ||
      "Student";

    const numericScore = Number(score);
    const numericTotalMarks = Number(totalMarks);

    if (
      !Number.isFinite(numericScore) ||
      !Number.isFinite(numericTotalMarks) ||
      numericTotalMarks <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid result values.",
        },
        { status: 400 }
      );
    }

    /*
      Percentage is always calculated from the secured score.

      Formula:

      Percentage =
        (Score / Total Marks) × 100

      Negative scores are displayed as 0%,
      because percentage cannot be negative.

      Maximum percentage is also limited to 100%.
    */
    const calculatedPercentage = Math.min(
      100,
      Math.max(
        0,
        (numericScore / numericTotalMarks) * 100
      )
    );

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      data: test,
      error: testError,
    } =
      await adminSupabase
        .from("html_tests")
        .select(
          "id, title, access_type, attempt_mode, is_active"
        )
        .eq("id", htmlTestId)
        .eq("is_active", true)
        .maybeSingle();

    if (testError) {
      console.error(
        "HTML test lookup failed:",
        testError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not verify the HTML test.",
        },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          error:
            "HTML test not found or inactive.",
        },
        { status: 404 }
      );
    }

    const serverSupabase =
      await createServerClient();

    const {
      data: { user },
    } =
      await serverSupabase.auth.getUser();

    if (
      test.access_type === "paid" &&
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Student login is required for this test.",
        },
        { status: 401 }
      );
    }

    if (
      test.access_type === "paid" &&
      user
    ) {
      const {
        data: access,
        error: accessError,
      } =
        await adminSupabase
          .from("html_test_access")
          .select(
            "id, start_at, end_at, is_active"
          )
          .eq(
            "html_test_id",
            htmlTestId
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();

      if (accessError) {
        console.error(
          "HTML paid access lookup failed:",
          accessError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Could not verify test access.",
          },
          { status: 500 }
        );
      }

      if (!access) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You do not currently have access to this test.",
          },
          { status: 403 }
        );
      }

      const now = new Date();

      if (
        access.start_at &&
        now <
          new Date(
            access.start_at
          )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your access to this test has not started yet.",
          },
          { status: 403 }
        );
      }

      if (
        access.end_at &&
        now >
          new Date(
            access.end_at
          )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your access period for this test has expired.",
          },
          { status: 403 }
        );
      }
    }

    if (
      test.access_type === "free" &&
      test.attempt_mode === "one"
    ) {
      const browserToken =
        request.cookies.get(
          "mocktest_html_token"
        )?.value;

      if (!browserToken) {
        console.error(
          "HTML submit rejected: mocktest_html_token missing."
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "This test attempt was not claimed.",
          },
          { status: 403 }
        );
      }

      const tokenHash =
        crypto
          .createHash("sha256")
          .update(browserToken)
          .digest("hex");

      const {
        data: tokenRecord,
        error: tokenError,
      } =
        await adminSupabase
          .from(
            "html_test_attempt_tokens"
          )
          .select("id")
          .eq(
            "html_test_id",
            htmlTestId
          )
          .eq(
            "token_hash",
            tokenHash
          )
          .maybeSingle();

      if (tokenError) {
        console.error(
          "HTML attempt token lookup failed:",
          tokenError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Could not verify your test attempt.",
          },
          { status: 500 }
        );
      }

      if (!tokenRecord) {
        console.error(
          "HTML submit rejected: token was not found for this test."
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "This test attempt was not claimed.",
          },
          { status: 403 }
        );
      }
    }

    let previousQuery =
      adminSupabase
        .from("html_test_attempts")
        .select(
          "id, attempt_number, counts_for_leaderboard"
        )
        .eq(
          "html_test_id",
          htmlTestId
        );

    if (user) {
      previousQuery =
        previousQuery.eq(
          "user_id",
          user.id
        );
    } else {
      previousQuery =
        previousQuery.eq(
          "student_name",
          cleanStudentName
        );
    }

    const {
      data: previousAttempts,
      error: previousError,
    } =
      await previousQuery;

    if (previousError) {
      console.error(
        "Previous HTML attempts lookup failed:",
        previousError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not check previous attempts.",
        },
        { status: 500 }
      );
    }

    const attempts =
      previousAttempts || [];

    if (
      test.attempt_mode === "one" &&
      attempts.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only one attempt is allowed for this test.",
        },
        { status: 403 }
      );
    }

    const attemptNumber =
      attempts.length + 1;

    const countsForLeaderboard =
      attemptNumber === 1;

    const {
      data: attempt,
      error: insertError
    } =
      await adminSupabase
        .from("html_test_attempts")
        .insert({
          html_test_id:
            htmlTestId,

          user_id:
            user?.id || null,

          student_name:
            cleanStudentName,

          score:
            numericScore,

          total_marks:
            numericTotalMarks,

          percentage:
            calculatedPercentage,

          attempt_number:
            attemptNumber,

          counts_for_leaderboard:
            countsForLeaderboard,
        })
        .select(
          "id, html_test_id, user_id, student_name, score, total_marks, percentage, submitted_at, attempt_number, counts_for_leaderboard"
        )
        .single();

    if (insertError) {
      console.error(
        "HTML result INSERT failed:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            insertError.message ||
            "Could not save your result.",
        },
        { status: 500 }
      );
    }

    console.log(
      "HTML test result saved successfully:",
      {
        attemptId:
          attempt.id,
        htmlTestId:
          htmlTestId,
        studentName:
          cleanStudentName,
        score:
          numericScore,
        totalMarks:
          numericTotalMarks,
        percentage:
          calculatedPercentage,
        attemptNumber:
          attemptNumber,
        countsForLeaderboard:
          countsForLeaderboard,
      }
    );

    return NextResponse.json(
      {
        success: true,
        attempt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "HTML test submit unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Invalid request.",
      },
      { status: 400 }
    );
  }
}
