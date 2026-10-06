import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(
      request.url
    );

    const htmlTestId =
      searchParams.get("htmlTestId");

    if (!htmlTestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing HTML test ID.",
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "get_html_test_leaderboard",
      {
        p_html_test_id: htmlTestId,
      }
    );

    if (error) {
      console.error(
        "Leaderboard lookup failed:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not load leaderboard.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leaderboard: data || [],
    });
  } catch (error) {
    console.error(
      "Leaderboard API error:",
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
