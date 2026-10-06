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

    // --------------------------------------------------
    // 1. Validate submitted result
    // --------------------------------------------------

    if (
      !htmlTestId ||
      score === undefined ||
      totalMarks === undefined ||
      percentage === undefined
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
    const numericPercentage = Number(percentage);

    if (
      !Number.isFinite(numericScore) ||
      !Number.isFinite(numericTotalMarks) ||
      !Number.isFinite(numericPercentage)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid result values.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2. Service-role Supabase client
    // --------------------------------------------------

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // --------------------------------------------------
    // 3. Find active HTML test
    // --------------------------------------------------

    const {
      data: test,
      error: testError,
    } = await adminSupabase
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

    // --------------------------------------------------
    // 4. Get logged-in user if available
    // --------------------------------------------------

    const serverSupabase =
      await createServerClient();

    const {
      data: { user },
    } =
      await serverSupabase.auth.getUser();

    // --------------------------------------------------
    // 5. Paid HTML tests require login
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 6. Verify paid HTML test access
    // --------------------------------------------------

    if (
      test.access_type === "paid" &&
      user
    ) {
      const {
        data: access,
        error: accessError,
      } = await adminSupabase
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
              "Your access to this test has expired.",
          },
          { status: 403 }
        );
      }
    }

    // --------------------------------------------------
    // 7. FREE ONE-ATTEMPT TEST
    //
    // Verify the same browser token that was
    // created by /api/html-test/claim
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 8. Find previous attempts
    //
    // Logged-in students:
    //     tracked by user_id
    //
    // Free tests without login:
    //     tracked by student_name
    // --------------------------------------------------

    let previousQuery =
      adminSupabase
        .from(
          "html_test_attempts"
        )
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

    // --------------------------------------------------
    // 9. Enforce one-attempt mode
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 10. Calculate attempt number
    // --------------------------------------------------

    const attemptNumber =
      attempts.length + 1;

    // --------------------------------------------------
    // 11. Only first attempt counts on leaderboard
    // --------------------------------------------------

    const countsForLeaderboard =
      attemptNumber === 1;

    // --------------------------------------------------
    // 12. Save result
    // --------------------------------------------------

    const {
      data: attempt,
      error: insertError,
    } =
      await adminSupabase
        .from(
          "html_test_attempts"
        )
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
            numericPercentage,

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

    // --------------------------------------------------
    // 13. Success
    // --------------------------------------------------

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
          numericPercentage,
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
