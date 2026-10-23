import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets, so the session cookie
     * stays fresh everywhere the app actually renders. Also skips the
     * Android app-link file and web manifest, which must always load.
     */
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff)$).*)",
  ],
};
