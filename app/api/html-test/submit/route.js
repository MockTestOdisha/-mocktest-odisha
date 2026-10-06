import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      !studentName ||
      score === undefined ||
      totalMarks === undefined ||
      percentage === undefined
    ) {
      return NextResponse.json(
        {
          error: "Missing required result information.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanStudentName = String(studentName).trim();

    if (!cleanStudentName) {
      return NextResponse.json(
        {
          error: "Student name is required.",
        },
        {
          status: 400,
        }
      );
    }

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
        {
          status: 400,
        }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: test, error: testError } =
      await adminSupabase
        .from("html_tests")
        .select("id, is_active")
        .eq("id", htmlTestId)
        .eq("is_active", true)
        .maybeSingle();

    if (testError) {
      return NextResponse.json(
        {
          error: testError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!test) {
      return NextResponse.json(
        {
          error: "HTML test not found or inactive.",
        },
        {
          status: 404,
        }
      );
    }

    const { data: attempt, error: insertError } =
      await adminSupabase
        .from("html_test_attempts")
        .insert({
          html_test_id: htmlTestId,
          student_name: cleanStudentName,
          score: numericScore,
          total_marks: numericTotalMarks,
          percentage: numericPercentage,
        })
        .select(
          "id, html_test_id, student_name, score, total_marks, percentage, submitted_at"
        )
        .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        attempt,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request.",
      },
      {
        status: 400,
      }
    );
  }
}
