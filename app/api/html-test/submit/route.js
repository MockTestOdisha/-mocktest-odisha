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
      percentage,
    } = body;

    if (
      !htmlTestId ||
      score === undefined ||
      totalMarks === undefined ||
      percentage === undefined
    ) {
      return NextResponse.json(
        {
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
    const numericPercentage = Number(percentage);

    if (
      !Number.isFinite(numericScore) ||
      !Number.isFinite(numericTotalMarks) ||
      !Number.isFinite(numericPercentage)
    ) {
      return NextResponse.json(
        {
          error: "Invalid result values.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    /*
     * Find the HTML test.
     */
    const { data: test, error: testError } =
      await adminSupabase
        .from("html_tests")
        .select(
          "id, access_type, attempt_mode, is_active"
        )
        .eq("id", htmlTestId)
        .eq("is_active", true)
        .maybeSingle();

    if (testError) {
      return NextResponse.json(
        {
          error: testError.message,
        },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        {
          error:
            "HTML test not found or inactive.",
        },
        { status: 404 }
      );
    }

    /*
     * Find the logged-in student if available.
     */
    const serverSupabase =
      await createServerClient();

    const {
      data: { user },
    } =
      await serverSupabase.auth.getUser();

    /*
     * Paid HTML tests require login.
     */
    if (test.access_type === "paid" && !user) {
      return NextResponse.json(
        {
          error:
            "Student login is required for this test.",
        },
        { status: 401 }
      );
    }

    /*
     * Paid HTML tests require active access.
     */
    if (
      test.access_type === "paid" &&
      user
    ) {
      const { data: access, error: accessError } =
        await adminSupabase
          .from("html_test_access")
          .select(
            "id, start_at, end_at, is_active"
          )
          .eq("html_test_id", htmlTestId)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

      if (accessError) {
        return NextResponse.json(
          {
            error: accessError.message,
          },
          { status: 500 }
        );
      }

      if (!access) {
        return NextResponse.json(
          {
            error:
              "You do not currently have access to this test.",
          },
          { status: 403 }
        );
      }

      const now = new Date();

      if (
        access.start_at &&
        now < new Date(access.start_at)
      ) {
        return NextResponse.json(
          {
            error:
              "Your access to this test has not started yet.",
          },
          { status: 403 }
        );
      }

      if (
        access.end_at &&
        now > new Date(access.end_at)
      ) {
        return NextResponse.json(
          {
            error:
              "Your access to this test has expired.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * For FREE + ONE ATTEMPT:
     * verify the browser token that was
     * previously claimed.
     */
    if (
      test.access_type === "free" &&
      test.attempt_mode === "one"
    ) {
      const browserToken =
        request.cookies.get(
          "mocktest_html_token"
        )?.value;

      if (!browserToken) {
        return NextResponse.json(
          {
            error:
              "This test attempt was not claimed.",
          },
          { status: 403 }
        );
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(browserToken)
        .digest("hex");

      const { data: tokenRecord, error: tokenError } =
        await adminSupabase
          .from("html_test_attempt_tokens")
          .select("id")
          .eq("html_test_id", htmlTestId)
          .eq("token_hash", tokenHash)
          .maybeSingle();

      if (tokenError) {
        return NextResponse.json(
          {
            error: tokenError.message,
          },
          { status: 500 }
        );
      }

      if (!tokenRecord) {
        return NextResponse.json(
          {
            error:
              "This test attempt was not claimed.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * Find previous attempts.
     *
     * Paid tests are tracked per student.
     * Free tests are tracked by student name
     * because they do not require login.
     */
    let previousQuery =
      adminSupabase
        .from("html_test_attempts")
        .select(
          "id, attempt_number, counts_for_leaderboard"
        )
        .eq("html_test_id", htmlTestId);

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
    } = await previousQuery;

    if (previousError) {
      return NextResponse.json(
        {
          error: previousError.message,
        },
        { status: 500 }
      );
    }

    const attempts =
      previousAttempts || [];

    /*
     * One-attempt mode:
     * reject another submission.
     */
    if (
      test.attempt_mode === "one" &&
      attempts.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Only one attempt is allowed for this test.",
        },
        { status: 403 }
      );
    }

    const attemptNumber =
      attempts.length + 1;

    /*
     * Only the first attempt counts
     * on the leaderboard.
     */
    const countsForLeaderboard =
      attemptNumber === 1;

    /*
     * Save the result.
     */
    const { data: attempt, error: insertError } =
      await adminSupabase
        .from("html_test_attempts")
        .insert({
          html_test_id: htmlTestId,
          user_id: user?.id || null,
          student_name: cleanStudentName,
          score: numericScore,
          total_marks: numericTotalMarks,
          percentage: numericPercentage,
          attempt_number: attemptNumber,
          counts_for_leaderboard:
            countsForLeaderboard,
        })
        .select(
          "id, html_test_id, user_id, student_name, score, total_marks, percentage, attempt_number, counts_for_leaderboard, submitted_at"
        )
        .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        attempt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "HTML test submit error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Invalid request.",
      },
      { status: 400 }
    );
  }
}
