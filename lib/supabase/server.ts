import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers and
 * Server Actions. Reads/writes the auth session via cookies, so a
 * signed-in user's session is available on the server too.
 *
 * Still uses the public anon key only — admin-only server work (if
 * ever needed) should use a separate client built from
 * SUPABASE_SERVICE_ROLE_KEY, which must stay a server-only env var
 * (no NEXT_PUBLIC_ prefix) and is never imported into client code.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context
            // (e.g. during static rendering) — safe to ignore since
            // the middleware below refreshes the session on requests.
          }
        },
      },
    }
  );
}
