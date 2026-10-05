import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();
    const testId = body?.testId;

    if (!testId) {
      return NextResponse.json(
        {
          error: "Missing test ID.",
        },
        {
          status: 400,
        }
      );
    }

    let browserToken =
      request.cookies.get(
        "mocktest_free_token"
      )?.value;

    let isNewToken = false;

    /*
     * Create the anonymous browser token on
     * the server if this browser does not
     * already have one.
     */
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

    const { data, error } =
      await supabase.rpc(
        "claim_free_test_attempt",
        {
          p_test_id: testId,
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

    const response =
      NextResponse.json({
        allowed: data === true,
      });

    /*
     * Store the token in an HttpOnly cookie.
     *
     * JavaScript cannot read or modify this
     * cookie.
     */
    if (isNewToken) {
      response.cookies.set(
        "mocktest_free_token",
        browserToken,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
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
