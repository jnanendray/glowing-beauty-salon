import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands here after a Google OAuth redirect or an email magic-link
 * click. Exchanges the one-time `code` for a real session (stored in
 * cookies by the server client), then sends the customer on to
 * wherever they were headed — the homepage by default.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only ever redirect to a path on this site — never "//other.com"
  // or "@other.com", which would turn sign-in into an open redirect.
  const rawNext = searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing or invalid code — send them back to try again.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
