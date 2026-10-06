import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();

    const htmlTestId = body?.htmlTestId;

    if (!htmlTestId) {
      return NextResponse.json(
        {
          error: "Missing HTML test ID.",
        },
        {
          status: 400,
        }
      );
    }

    let browserToken =
      request.cookies.get("mocktest_html_token")?.value;

    let isNewToken = false;

    if (!browserToken) {
      browserToken = crypto.randomUUID();
      isNewToken = true;
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(browserToken)
      .digest("hex");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.rpc(
      "claim_free_html_test_attempt",
      {
        p_html_test_id: htmlTestId,
        p_token_hash: tokenHash,
      }
    );

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const response = NextResponse.json({
      allowed: data === true,
    });

    if (isNewToken) {
      response.cookies.set(
        "mocktest_html_token",
        browserToken,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        }
      );
    }

    return response;
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
