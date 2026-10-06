import crypto from "crypto";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function verifyStudentDevice() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false,
      allowed: false,
      user: null,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      authenticated: true,
      allowed: false,
      user,
      profile: null,
    };
  }

  // Admins are allowed on multiple devices.
  if (profile.role === "admin") {
    return {
      authenticated: true,
      allowed: true,
      user,
      profile,
    };
  }

  // Only students are subject to the device restriction.
  if (profile.role !== "student") {
    return {
      authenticated: true,
      allowed: false,
      user,
      profile,
    };
  }

  const cookieStore = await cookies();

  const deviceCookie = cookieStore.get(
    "mocktest_student_device"
  );

  if (!deviceCookie?.value) {
    return {
      authenticated: true,
      allowed: false,
      user,
      profile,
    };
  }

  const sessionTokenHash =
    crypto
      .createHash("sha256")
      .update(deviceCookie.value)
      .digest("hex");

  const {
    data: verified,
    error: verifyError,
  } = await supabase.rpc(
    "verify_student_device_session",
    {
      p_user_id: user.id,
      p_session_token_hash:
        sessionTokenHash,
    }
  );

  if (verifyError) {
    console.error(
      "Device verification error:",
      verifyError
    );

    return {
      authenticated: true,
      allowed: false,
      user,
      profile,
    };
  }

  return {
    authenticated: true,
    allowed: verified === true,
    user,
    profile,
  };
}
