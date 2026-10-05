import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();

    const testId = body?.testId;
    const browserToken = body?.browserToken;

    if (!testId || !browserToken) {
      return NextResponse.json(
        {
          error: "Missing test ID or browser token.",
        },
        {
          status: 400,
        }
      );
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

    return NextResponse.json({
      allowed: data === true,
    });
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
