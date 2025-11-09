/**
 * Auth Callback Route
 * Handles email confirmation and OAuth callbacks from Supabase
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createServerClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully confirmed - redirect to dashboard with success flag
      return NextResponse.redirect(`${origin}/dashboard?verified=true`);
    } else {
      // Log the error for debugging
      console.error("Auth callback error:", error);
      // Redirect with error message
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // If no code, redirect to home page
  console.error("Auth callback: No code provided");
  return NextResponse.redirect(`${origin}/`);
}
